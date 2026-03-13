import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const projectRoot = process.cwd();
const configPath = path.resolve(projectRoot, "esm-pkg.config.mjs");
const examplesDir = path.resolve(projectRoot, "examples");
const reactDomExtras = ["react-dom/client"];
const reactRuntimeExtras = ["react/jsx-runtime", "react/jsx-dev-runtime"];

function unique(items) {
  return [...new Set(items)];
}

function sanitizeIdentifier(input) {
  const camel = input
    .replace(/(^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, __, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());

  const normalized = camel.replace(/[^a-zA-Z0-9_$]/g, "");
  const value = normalized || "bundle";
  return /^[0-9]/.test(value) ? `pkg${value}` : value;
}

function isValidIdentifier(input) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(input);
}

function isObjectLike(value) {
  return value !== null && (typeof value === "object" || typeof value === "function");
}

function expandModules(modules) {
  const expanded = [...modules];

  if (modules.includes("react-dom")) {
    expanded.push(...reactDomExtras);
  }

  if (modules.includes("react")) {
    expanded.push(...reactRuntimeExtras);
  }

  return unique(expanded);
}

function expandExternals(externals) {
  return unique(
    externals.flatMap((specifier) => {
      if (!specifier.includes("/")) {
        return [specifier, `${specifier}/*`];
      }
      return [specifier, `${specifier}/*`];
    })
  );
}

function buildEntrySource(specifiers, exportMap, defaultAliases) {
  const imports = specifiers
    .map((specifier, index) => `import * as __mod${index} from ${JSON.stringify(specifier)};`)
    .join("\n");

  const moduleRefs = specifiers.map((_, index) => `__mod${index}`);
  const defaultKeyLine = 'const __defaultKey = "default";';
  const defaultRefs = specifiers
    .map(
      (_, index) =>
        `const __default${index} = __defaultKey in __mod${index} ? __mod${index}[__defaultKey] : undefined;`
    )
    .join("\n");
  const namedExports = [...exportMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([exportName, ref]) => `export const ${exportName} = ${ref};`)
    .join("\n");

  return `${imports}
${defaultKeyLine}
${defaultRefs}

const __modules = [${moduleRefs.join(", ")}];
const __defaults = [${specifiers.map((_, index) => `__default${index}`).join(", ")}];
const __namedMerged = Object.assign(
  {},
  ...__modules.map((mod) => {
    const next = {};
    for (const key of Object.keys(mod)) {
      if (key !== "default") {
        next[key] = mod[key];
      }
    }
    return next;
  })
);

const __defaultMerged = Object.assign(
  {},
  ...__defaults
    .filter((value) => value !== undefined && value !== null && (typeof value === "object" || typeof value === "function"))
);

const __merged = Object.assign({}, __defaultMerged, __namedMerged);

${defaultAliases
  .map(({ exportName, ref }) => `if (${ref} !== undefined) __merged.${exportName} = ${ref};`)
  .join("\n")}

export default __merged;
${namedExports}
`;
}

async function loadConfig() {
  const loaded = await import(pathToFileURL(configPath).href);
  const config = loaded.default;

  if (!Array.isArray(config) || config.length === 0) {
    throw new Error("esm-pkg.config.mjs must export a non-empty array.");
  }

  return config;
}

async function resolveModuleInfo(specifier) {
  const namespace = await import(specifier);
  const namedExports = Object.keys(namespace).filter(
    (key) => key !== "default" && key !== "__esModule"
  );
  return {
    specifier,
    namespace,
    namedExports
  };
}

async function generateExamplesManifest() {
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

  const output = `export default ${JSON.stringify(manifest, null, 2)};\n`;
  await fs.writeFile(path.join(examplesDir, "examples.generated.js"), output);
}

async function buildBundle(bundleConfig) {
  const modules = expandModules(bundleConfig.modules ?? []);
  const outFile = bundleConfig.outFile;
  const exclude = bundleConfig.exclude ?? [];

  if (modules.length === 0) {
    throw new Error(`Bundle ${outFile ?? "<unknown>"} must declare at least one module.`);
  }

  if (!outFile) {
    throw new Error(`Bundle ${modules.join(", ")} is missing outFile.`);
  }

  const moduleInfos = await Promise.all(modules.map((specifier) => resolveModuleInfo(specifier)));
  const exportMap = new Map();
  const defaultAliases = [];
  const usedDefaultAliases = new Set();

  for (let index = 0; index < moduleInfos.length; index += 1) {
    const info = moduleInfos[index];
    const ref = `__mod${index}`;

    for (const exportName of info.namedExports) {
      if (isValidIdentifier(exportName)) {
        exportMap.set(exportName, `${ref}[${JSON.stringify(exportName)}]`);
      }
    }

    let alias = `${sanitizeIdentifier(info.specifier)}Default`;
    while (usedDefaultAliases.has(alias) || exportMap.has(alias)) {
      alias = `${alias}Value`;
    }
    usedDefaultAliases.add(alias);
    defaultAliases.push({
      exportName: alias,
      ref: `__default${index}`
    });
  }

  const source = buildEntrySource(modules, exportMap, defaultAliases);
  const sourceFile = path.resolve(projectRoot, ".esm-pkg", `${sanitizeIdentifier(outFile)}.entry.mjs`);
  const absoluteOutFile = path.resolve(projectRoot, outFile);

  await fs.mkdir(path.dirname(sourceFile), { recursive: true });
  await fs.mkdir(path.dirname(absoluteOutFile), { recursive: true });
  await fs.writeFile(sourceFile, source);

  await build({
    absWorkingDir: projectRoot,
    bundle: true,
    entryPoints: [sourceFile],
    external: expandExternals(exclude),
    format: "esm",
    legalComments: "none",
    outfile: absoluteOutFile,
    platform: "browser",
    sourcemap: true,
    target: ["es2020"]
  });

  return {
    modules,
    outFile
  };
}

async function main() {
  const config = await loadConfig();
  const results = [];

  await generateExamplesManifest();

  for (const bundleConfig of config) {
    const result = await buildBundle(bundleConfig);
    results.push(result);
  }

  for (const result of results) {
    console.log(`built ${result.outFile} <- ${result.modules.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
