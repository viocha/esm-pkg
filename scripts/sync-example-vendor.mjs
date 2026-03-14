import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const vendorSources = [
  {
    packageName: "@babel/standalone",
    sourceDir: ["node_modules", "@babel", "standalone"],
    includeFiles: ["babel.js", "babel.js.map", "babel.min.js", "babel.min.js.map"],
    targetDir: ["examples", "vendor"]
  },
  {
    packageName: "@tailwindcss/browser",
    sourceDir: ["node_modules", "@tailwindcss", "browser", "dist"],
    includeFiles: ["index.global.js"],
    targetDir: ["examples", "vendor"],
    rename: {
      "index.global.js": "tailwindcss-browser.js"
    }
  }
];

export async function syncExampleVendorFiles(projectRoot = process.cwd()) {
  const copiedFiles = [];

  for (const vendorSource of vendorSources) {
    const sourceDir = path.resolve(projectRoot, ...vendorSource.sourceDir);
    const targetDir = path.resolve(projectRoot, ...vendorSource.targetDir);

    await fs.mkdir(targetDir, { recursive: true });

    for (const fileName of vendorSource.includeFiles) {
      const sourceFile = path.join(sourceDir, fileName);
      const targetFileName = vendorSource.rename?.[fileName] ?? fileName;
      const targetFile = path.join(targetDir, targetFileName);

      await fs.copyFile(sourceFile, targetFile);
      copiedFiles.push({
        packageName: vendorSource.packageName,
        targetFile: path.relative(projectRoot, targetFile).replace(/\\/g, "/")
      });
    }
  }

  return copiedFiles;
}

const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFile = fileURLToPath(import.meta.url);

if (entryFile === currentFile) {
  syncExampleVendorFiles().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
