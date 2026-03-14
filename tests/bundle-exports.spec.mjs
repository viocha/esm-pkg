import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const configPath = path.resolve(projectRoot, "esm-pkg.config.mjs");
const shadcnEntryPath = path.resolve(projectRoot, ".esm-pkg", "shadcn.entry.ts");
const serverOrigin = "http://127.0.0.1:4173";
const reactDomExtras = ["react-dom/client"];
const reactRuntimeExtras = ["react/jsx-runtime", "react/jsx-dev-runtime"];
const baseImportMap = {
  imports: {
    react: `${serverOrigin}/dist/react-all.js`,
    "react-dom": `${serverOrigin}/dist/react-all.js`,
    "react-dom/client": `${serverOrigin}/dist/react-all.js`,
    "react/jsx-runtime": `${serverOrigin}/dist/react-all.js`,
    "react/jsx-dev-runtime": `${serverOrigin}/dist/react-all.js`
  }
};
const bundleConfig = (await import(pathToFileURL(configPath).href)).default;

function unique(items) {
  return [...new Set(items)];
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

function getMinifiedOutFile(outFile) {
  const ext = path.extname(outFile);
  if (!ext) {
    return `${outFile}.min`;
  }

  return `${outFile.slice(0, -ext.length)}.min${ext}`;
}

function isValidIdentifier(input) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(input);
}

async function getModuleNamedExports(specifier) {
  let namespace;

  try {
    namespace = await import(specifier);
  } catch (error) {
    if (error?.code === "ERR_UNKNOWN_FILE_EXTENSION" && /(?:^|[\\/])[^\\/]+\.css$/.test(error.message)) {
      return null;
    }

    throw error;
  }

  return Object.keys(namespace)
    .filter((key) => key !== "default" && key !== "__esModule" && isValidIdentifier(key))
    .sort((left, right) => left.localeCompare(right));
}

async function getShadcnExpectedExports() {
  const source = await fs.readFile(shadcnEntryPath, "utf8");
  const names = new Set();

  for (const match of source.matchAll(/export\s*\{\s*([^}]+)\s*\}\s*from\s*["'][^"']+["']/g)) {
    const exportList = match[1].split(",");
    for (const exportItem of exportList) {
      const normalized = exportItem.trim().replace(/\s+as\s+.*/, "");
      if (normalized) {
        names.add(normalized);
      }
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}

async function getExpectedExports(bundle) {
  if (bundle.name === "shadcn") {
    return getShadcnExpectedExports();
  }

  const exportGroups = await Promise.all(expandModules(bundle.modules).map((specifier) => getModuleNamedExports(specifier)));
  if (exportGroups.some((value) => value === null)) {
    return null;
  }
  return unique(exportGroups.flat()).sort((left, right) => left.localeCompare(right));
}

async function getBundleDefinitions() {
  return [
    ...bundleConfig.map((bundle) => ({
      name: path.basename(bundle.outFile).replace(/\.js$/, ""),
      modules: bundle.modules,
      esmPath: `${serverOrigin}/${bundle.outFile.replace(/\\/g, "/")}`,
      minPath: `${serverOrigin}/${getMinifiedOutFile(bundle.outFile).replace(/\\/g, "/")}`
    })),
    {
      name: "shadcn",
      modules: [],
      esmPath: `${serverOrigin}/dist/shadcn.js`,
      minPath: `${serverOrigin}/dist/shadcn.min.js`
    }
  ];
}

const bundleDefinitions = await getBundleDefinitions();

for (const bundle of bundleDefinitions) {
  test.describe(`${bundle.name} export surface`, () => {
    for (const [label, filePath] of [
      ["esm", bundle.esmPath],
      ["min", bundle.minPath]
    ]) {
      test(`${label} bundle exports all expected members`, async ({ page }) => {
        const expectedExports = await getExpectedExports(bundle);

        await page.goto(`${serverOrigin}/examples/index.html`);
        await page.setContent(
          `<!doctype html><html><head><script type="importmap">${JSON.stringify(baseImportMap)}</script></head><body></body></html>`
        );

        const actual = await page.evaluate(async (modulePath) => {
          const namespace = await import(modulePath);
          return {
            hasDefault: Object.prototype.hasOwnProperty.call(namespace, "default"),
            exportNames: Object.keys(namespace)
              .filter((key) => key !== "default" && key !== "__esModule")
              .sort((left, right) => left.localeCompare(right))
          };
        }, filePath);

        const missing = expectedExports?.filter((name) => !actual.exportNames.includes(name)) ?? [];

        if (bundle.name !== "shadcn") {
          expect(actual.hasDefault, `${bundle.name} ${label} should expose default export`).toBe(true);
        }
        if (expectedExports !== null) {
          expect(
            missing,
            `${bundle.name} ${label} is missing exports: ${missing.join(", ")}`
          ).toEqual([]);
        }
      });
    }
  });
}
