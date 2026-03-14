import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const shadcnBundle = {
  name: "shadcn",
  displayModules: ["shadcn/ui"],
  outFile: "dist/shadcn.js",
  minifiedOutFile: "dist/shadcn.min.js"
};
const exampleRuntimePackages = ["@babel/standalone", "@tailwindcss/browser"];

function unique(items) {
  return [...new Set(items)];
}

function getMinifiedOutFile(outFile) {
  const ext = path.extname(outFile);
  if (!ext) {
    return `${outFile}.min`;
  }

  return `${outFile.slice(0, -ext.length)}.min${ext}`;
}

function getPackageRootSpecifier(specifier) {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return name ? `${scope}/${name}` : specifier;
  }

  const [name] = specifier.split("/");
  return name;
}

function normalizeDeclaredVersion(version) {
  return typeof version === "string" ? version.replace(/^[~^]/, "") : null;
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

async function loadConfig(configPath) {
  const loaded = await import(pathToFileURL(configPath).href);
  const config = loaded.default;

  if (!Array.isArray(config) || config.length === 0) {
    throw new Error("esm-pkg.config.mjs must export a non-empty array.");
  }

  return config;
}

async function resolveInstalledPackageVersion(projectRoot, packageJson, packageName) {
  if (packageName === "shadcn/ui") {
    return null;
  }

  const packageFile = path.resolve(projectRoot, "node_modules", ...packageName.split("/"), "package.json");

  try {
    const installedPackageJson = JSON.parse(await fs.readFile(packageFile, "utf8"));
    return installedPackageJson.version ?? null;
  } catch {
    return (
      normalizeDeclaredVersion(packageJson.dependencies?.[packageName]) ??
      normalizeDeclaredVersion(packageJson.devDependencies?.[packageName]) ??
      normalizeDeclaredVersion(packageJson.peerDependencies?.[packageName]) ??
      normalizeDeclaredVersion(packageJson.optionalDependencies?.[packageName]) ??
      null
    );
  }
}

async function collectExamples(examplesDir) {
  const entries = await fs.readdir(examplesDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && entry.name !== "index.html")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const manifest = [];

  for (const fileName of htmlFiles) {
    const filePath = path.join(examplesDir, fileName);
    const content = await fs.readFile(filePath, "utf8");
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);

    manifest.push({
      file: `./${fileName}`,
      title: titleMatch?.[1]?.trim() || fileName
    });
  }

  return manifest;
}

function createBundleDefinitions(config) {
  return [
    ...config.map((bundleConfig) => ({
      name: path.basename(bundleConfig.outFile).replace(/\.js$/, ""),
      displayModules: unique(bundleConfig.modules ?? []),
      outFile: bundleConfig.outFile,
      minifiedOutFile: getMinifiedOutFile(bundleConfig.outFile)
    })),
    shadcnBundle
  ];
}

export async function generateExamplesIndex(projectRoot = process.cwd()) {
  const configPath = path.resolve(projectRoot, "esm-pkg.config.mjs");
  const packageJsonFile = path.resolve(projectRoot, "package.json");
  const examplesDir = path.resolve(projectRoot, "examples");
  const indexDataFile = path.join(examplesDir, "index.generated.js");
  const packageJson = JSON.parse(await fs.readFile(packageJsonFile, "utf8"));
  const config = await loadConfig(configPath);
  const examples = await collectExamples(examplesDir);
  const bundles = [];
  const bundleDefinitions = createBundleDefinitions(config);
  const versionCache = new Map();

  async function getPackageVersionInfo(specifier) {
    const packageName = specifier === "shadcn/ui" ? specifier : getPackageRootSpecifier(specifier);

    if (!versionCache.has(packageName)) {
      versionCache.set(
        packageName,
        resolveInstalledPackageVersion(projectRoot, packageJson, packageName).then((version) =>
          version ? { name: packageName, version } : { name: packageName }
        )
      );
    }

    return versionCache.get(packageName);
  }

  for (const bundle of bundleDefinitions) {
    const normalStat = await fs.stat(path.resolve(projectRoot, bundle.outFile));
    const minifiedStat = await fs.stat(path.resolve(projectRoot, bundle.minifiedOutFile));
    const packageVersions = await Promise.all(
      unique(bundle.displayModules).map((specifier) => getPackageVersionInfo(specifier))
    );

    bundles.push({
      name: bundle.name,
      packageVersions,
      esm: {
        file: `../${bundle.outFile.replace(/\\/g, "/")}`,
        size: normalStat.size,
        sizeText: formatFileSize(normalStat.size)
      },
      min: {
        file: `../${bundle.minifiedOutFile.replace(/\\/g, "/")}`,
        size: minifiedStat.size,
        sizeText: formatFileSize(minifiedStat.size)
      }
    });
  }

  bundles.sort((left, right) => left.name.localeCompare(right.name));
  const runtimePackages = await Promise.all(
    exampleRuntimePackages.map((packageName) => getPackageVersionInfo(packageName))
  );

  const output = `export default ${JSON.stringify(
    {
      package: {
        name: packageJson.name,
        version: packageJson.version
      },
      exampleRuntimePackages: runtimePackages,
      examples,
      bundles
    },
    null,
    2
  )};\n`;

  await fs.writeFile(indexDataFile, output);
}

const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFile = fileURLToPath(import.meta.url);

if (entryFile === currentFile) {
  generateExamplesIndex().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
