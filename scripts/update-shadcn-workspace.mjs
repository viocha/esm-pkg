import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceDirName = "shadcn-workspace";

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command, args, cwd, options = {}) {
  const { captureOutput = false } = options;

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: captureOutput ? "pipe" : "inherit"
    });

    if (captureOutput) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}.`));
    });
  });
}

function hasPendingShadcnChanges(output) {
  const allFilesSkipped = /Files \((\d+)\)\s*=\1 skip/i.test(output);
  return !allFilesSkipped;
}

export async function updateShadcnWorkspace(projectRoot = process.cwd()) {
  const workspaceRoot = path.resolve(projectRoot, workspaceDirName);
  const workspacePackageJson = path.join(workspaceRoot, "package.json");
  const workspacePnpmLock = path.join(workspaceRoot, "pnpm-lock.yaml");
  const shadcnCliBin = path.join(workspaceRoot, "node_modules", ".bin", process.platform === "win32" ? "shadcn.CMD" : "shadcn");
  const tailwindNodeModule = path.join(workspaceRoot, "node_modules", "@tailwindcss", "node", "dist", "index.mjs");
  const tailwindOxideModule = path.join(workspaceRoot, "node_modules", "@tailwindcss", "oxide", "index.js");

  if (!(await exists(workspacePackageJson))) {
    await runCommand(
      "pnpm",
      [
        "dlx", "shadcn@latest", "init", "-t", "vite", "-b", "radix", "-p", "nova", "-y",
        "--no-monorepo", "--css-variables", "--no-rtl", "-n", workspaceDirName, "--cwd", projectRoot
      ],
      projectRoot
    );
  }

  if (!(await exists(workspacePnpmLock)) || !(await exists(shadcnCliBin))) {
    await runCommand("pnpm", ["install"], workspaceRoot);
  }

  if (!(await exists(tailwindNodeModule)) || !(await exists(tailwindOxideModule))) {
    await runCommand("pnpm", ["add", "-D", "@tailwindcss/node", "@tailwindcss/oxide"], workspaceRoot);
  }

  const dryRunResult = await runCommand(
    "pnpm",
    ["exec", "shadcn", "add", "--all", "-y", "--dry-run"],
    workspaceRoot,
    { captureOutput: true }
  );
  const dryRunOutput = `${dryRunResult.stdout}\n${dryRunResult.stderr}`;

  if (!hasPendingShadcnChanges(dryRunOutput)) {
    console.log("shadcn workspace is already up to date.");
    return workspaceRoot;
  }

  await runCommand("pnpm", ["exec", "shadcn", "add", "--all", "-y"], workspaceRoot);

  return workspaceRoot;
}

const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFile = fileURLToPath(import.meta.url);

if (entryFile === currentFile) {
  updateShadcnWorkspace().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
