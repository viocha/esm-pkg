import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
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
