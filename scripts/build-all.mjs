import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildStandardBundle } from "./build-standard-bundle.mjs";
import { buildShadcnBundle } from "./build-shadcn.mjs";
import { generateExamplesIndex } from "./generate-examples-index.mjs";
import { syncExampleVendorFiles } from "./sync-example-vendor.mjs";

const projectRoot = process.cwd();
const configPath = path.resolve(projectRoot, "esm-pkg.config.mjs");

async function loadConfig() {
  const loaded = await import(pathToFileURL(configPath).href);
  const config = loaded.default;

  if (!Array.isArray(config) || config.length === 0) {
    throw new Error("esm-pkg.config.mjs must export a non-empty array.");
  }

  return config;
}

async function main() {
  const config = await loadConfig();
  const results = [];

  for (const bundleConfig of config) {
    const result = await buildStandardBundle(projectRoot, bundleConfig);
    results.push(result);
  }

  results.push(await buildShadcnBundle(projectRoot));
  await syncExampleVendorFiles(projectRoot);
  await generateExamplesIndex(projectRoot);

  for (const result of results) {
    console.log(`built ${result.outFile} <- ${result.modules.join(", ")}`);
    console.log(`built ${result.minifiedOutFile} <- ${result.modules.join(", ")} (min)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
