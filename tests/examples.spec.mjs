import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const examplesDir = path.join(projectRoot, "examples");
const exampleFiles = (await fs.readdir(examplesDir))
  .filter((file) => file.endsWith(".html"))
  .sort((left, right) => left.localeCompare(right));

for (const exampleFile of exampleFiles) {
  test(`${exampleFile} loads without js errors`, async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    const response = await page.goto(`/examples/${exampleFile}`);

    expect(response?.ok(), `expected successful response for ${exampleFile}`).toBeTruthy();
    await expect(page).toHaveTitle(/.+/);

    if (exampleFile === "index.html") {
      await expect(page.locator("#example-list li")).toHaveCount(exampleFiles.length - 1);
    } else {
      await expect(page.locator("#app")).not.toBeEmpty();
    }

    expect(pageErrors, `page errors in ${exampleFile}`).toEqual([]);
    expect(consoleErrors, `console errors in ${exampleFile}`).toEqual([]);
  });
}
