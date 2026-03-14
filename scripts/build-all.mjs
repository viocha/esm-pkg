import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildStandardBundle } from "./build-standard-bundle.mjs";
import { buildShadcnBundle } from "./build-shadcn.mjs";
import { generateExamplesIndex } from "./generate-examples-index.mjs";
import { generatePackageExports } from "./generate-package-exports.mjs";
import { syncExampleVendorFiles } from "./sync-example-vendor.mjs";

const projectRoot = process.cwd();
const configPath = path.resolve(projectRoot, "esm-pkg.config.mjs");
const defaultBuildConcurrency = Math.max(1, os.availableParallelism() - 1);

function getBuildConcurrency() {
  const rawValue = process.env.BUILD_CONCURRENCY;
  const parsedValue = Number.parseInt(rawValue ?? "", 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : defaultBuildConcurrency;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const taskCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: taskCount }, () => runNext()));
  return results;
}

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
  const results = await mapWithConcurrency(config, getBuildConcurrency(), async (bundleConfig) => {
    const result = await buildStandardBundle(projectRoot, bundleConfig);
    console.log(`built ${result.outFile} <- ${result.modules.join(", ")}`);
    console.log(`built ${result.minifiedOutFile} <- ${result.modules.join(", ")} (min)`);
    return result;
  });
  const shadcnResult = await buildShadcnBundle(projectRoot);
  console.log(`built ${shadcnResult.outFile} <- ${shadcnResult.modules.join(", ")}`);
  console.log(`built ${shadcnResult.minifiedOutFile} <- ${shadcnResult.modules.join(", ")} (min)`);
  results.push(shadcnResult);
  await syncExampleVendorFiles(projectRoot);
  await generatePackageExports(projectRoot);
  await generateExamplesIndex(projectRoot);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
