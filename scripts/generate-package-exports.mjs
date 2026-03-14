import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const shadcnBundle = {
  name: "shadcn",
  outFile: "dist/shadcn.js"
};

function getMinifiedOutFile(outFile) {
  const ext = path.extname(outFile);
  if (!ext) {
    return `${outFile}.min`;
  }

  return `${outFile.slice(0, -ext.length)}.min${ext}`;
}

async function loadConfig(configPath) {
  const loaded = await import(pathToFileURL(configPath).href);
  const config = loaded.default;

  if (!Array.isArray(config) || config.length === 0) {
    throw new Error("esm-pkg.config.mjs must export a non-empty array.");
  }

  return config;
}

function createGeneratedExports(config) {
  const bundleDefinitions = [
    ...config.map((bundleConfig) => ({
      name: path.basename(bundleConfig.outFile).replace(/\.js$/, ""),
      outFile: bundleConfig.outFile
    })),
    shadcnBundle
  ];

  return Object.fromEntries(
    bundleDefinitions.map((bundle) => [`./${bundle.name}`, `./${getMinifiedOutFile(bundle.outFile)}`])
  );
}

export async function generatePackageExports(projectRoot = process.cwd()) {
  const configPath = path.resolve(projectRoot, "esm-pkg.config.mjs");
  const packageJsonFile = path.resolve(projectRoot, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonFile, "utf8"));
  const config = await loadConfig(configPath);

  packageJson.exports = createGeneratedExports(config);
  await fs.writeFile(packageJsonFile, `${JSON.stringify(packageJson, null, 2)}\n`);

  return packageJson.exports;
}

const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFile = fileURLToPath(import.meta.url);

if (entryFile === currentFile) {
  generatePackageExports().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
