import os from "node:os";
import { defineConfig } from "@playwright/test";

function getPlaywrightWorkers() {
  const rawValue = process.env.PLAYWRIGHT_WORKERS;
  const parsedValue = Number.parseInt(rawValue ?? "", 10);

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return Math.max(1, os.availableParallelism() - 1);
}

export default defineConfig({
  fullyParallel: true,
  testDir: "./tests",
  timeout: 30_000,
  workers: getPlaywrightWorkers(),
  use: {
    baseURL: "http://127.0.0.1:4173"
  },
  webServer: {
    command: "node ./scripts/serve-static.mjs",
    port: 4173,
    reuseExistingServer: true,
    timeout: 30_000
  }
});
