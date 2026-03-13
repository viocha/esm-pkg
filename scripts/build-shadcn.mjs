import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const workspaceParentName = ".shadcn-workdir";
const workspaceProjectName = "shadcn-bundle";
const shadcnOutFile = "dist/shadcn.js";
const packageManager = "pnpm@10.18.0";
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function normalizePath(input) {
	return input.replace(/\\/g, "/");
}

function getMimeType(filePath) {
	if (filePath.endsWith(".woff2")) {
		return "font/woff2";
	}

	return "application/octet-stream";
}

async function inlineCssFileUrls(cssSource, baseDir) {
	const matches = [...cssSource.matchAll(/url\((\.\/files\/[^)]+)\)/g)];
	let result = cssSource;

	for (const match of matches) {
		const relativeUrl = match[1];
		const fontFile = path.join(baseDir, relativeUrl.replace("./", ""));
		const fontData = await fs.readFile(fontFile);
		const dataUrl = `url(data:${getMimeType(fontFile)};base64,${fontData.toString("base64")})`;
		result = result.replace(match[0], dataUrl);
	}

	return result;
}

async function loadTailwindNodeApi(workspaceRoot) {
	const tailwindNodePath = path.join(
		workspaceRoot,
		"node_modules",
		"@tailwindcss",
		"node",
		"dist",
		"index.mjs"
	);
	const tailwindOxidePath = path.join(
		workspaceRoot,
		"node_modules",
		"@tailwindcss",
		"oxide",
		"index.js"
	);

	const [tailwindNodeApi, tailwindOxideApi] = await Promise.all([
		import(pathToFileURL(tailwindNodePath).href),
		import(pathToFileURL(tailwindOxidePath).href)
	]);

	return {
		Scanner: tailwindOxideApi.Scanner,
		compile: tailwindNodeApi.compile
	};
}

function getMinifiedOutFile(outFile) {
	const ext = path.extname(outFile);
	if (!ext) {
		return `${outFile}.min`;
	}

	return `${outFile.slice(0, -ext.length)}.min${ext}`;
}

async function exists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
  }
}

async function updatePackageManager(packageJsonFile) {
  const packageJson = JSON.parse(await fs.readFile(packageJsonFile, "utf8"));

  if (packageJson.packageManager === packageManager) {
    return;
  }

  packageJson.packageManager = packageManager;
  await fs.writeFile(`${packageJsonFile}`, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function runCommand(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: "inherit"
    });

		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}.`));
		});
	});
}

async function ensureShadcnWorkspace(projectRoot) {
  const workspaceParent = path.resolve(projectRoot, workspaceParentName);
  const workspaceRoot = path.join(workspaceParent, workspaceProjectName);
  const workspacePackageJson = path.join(workspaceRoot, "package.json");
  const sentinelComponent = path.join(workspaceRoot, "src", "components", "ui", "sidebar.tsx");
  const workspacePackageLock = path.join(workspaceRoot, "package-lock.json");
  const workspacePnpmLock = path.join(workspaceRoot, "pnpm-lock.yaml");
  const tailwindNodeModule = path.join(
    workspaceRoot,
    "node_modules",
    "@tailwindcss",
    "node",
    "dist",
    "index.mjs"
  );
  const tailwindOxideModule = path.join(
    workspaceRoot,
    "node_modules",
    "@tailwindcss",
    "oxide",
    "index.js"
  );

  await fs.mkdir(workspaceParent, { recursive: true });

  if (!(await exists(workspacePackageJson))) {
    await runCommand(
      pnpmCommand,
      [
        "dlx",
        "shadcn@latest",
        "init",
        "-t",
        "vite",
				"-b",
				"radix",
				"-p",
				"nova",
				"-y",
				"--no-monorepo",
				"--css-variables",
				"--no-rtl",
				"-n",
        workspaceProjectName,
        "--cwd",
        workspaceParent
      ],
      projectRoot
    );
  }

  await updatePackageManager(workspacePackageJson);

  if (!(await exists(sentinelComponent))) {
    await runCommand(
      pnpmCommand,
      ["dlx", "shadcn@latest", "add", "--all", "-y", "--cwd", workspaceRoot],
      projectRoot
    );
  }

  if (!(await exists(workspacePnpmLock)) || (await exists(workspacePackageLock))) {
    await runCommand(pnpmCommand, ["install"], workspaceRoot);
  }

  if (!(await exists(tailwindNodeModule)) || !(await exists(tailwindOxideModule))) {
    await runCommand(
      pnpmCommand,
      ["add", "-D", "@tailwindcss/node", "@tailwindcss/oxide"],
      workspaceRoot
    );
  }

  await fs.rm(workspacePackageLock, { force: true });

  return workspaceRoot;
}

function createShadcnStyleRuntimeSource(inlinedGeistCss, resolvedCss) {
	const combinedCss = `${inlinedGeistCss}\n\n${resolvedCss}`;

	return `if (typeof document !== "undefined" && !document.querySelector('style[data-shadcn-tailwind-runtime="true"]')) {
  const style = document.createElement("style");
  style.type = "text/css";
  style.setAttribute("data-shadcn-tailwind-runtime", "true");
  style.textContent = ${JSON.stringify(combinedCss)};
  (document.head || document.documentElement).appendChild(style);
}
`;
}

async function createShadcnStyleRuntime(projectRoot, workspaceRoot) {
	const examplesVendorDir = path.resolve(projectRoot, "examples", "vendor");
	const geistSourceDir = path.join(
		workspaceRoot,
		"node_modules",
		"@fontsource-variable",
		"geist"
	);
	const sourceCssFile = path.join(workspaceRoot, "src", "index.css");

	await fs.mkdir(examplesVendorDir, { recursive: true });
	await fs.rm(path.join(examplesVendorDir, "geist"), { force: true, recursive: true });
	await fs.rm(path.join(examplesVendorDir, "shadcn-tailwind.runtime.js"), { force: true });

	const [{ compile, Scanner }, sourceCss, geistCss] = await Promise.all([
		loadTailwindNodeApi(workspaceRoot),
		fs.readFile(sourceCssFile, "utf8"),
		fs.readFile(path.join(geistSourceDir, "index.css"), "utf8")
	]);

	const inlinedGeistCss = await inlineCssFileUrls(geistCss, geistSourceDir);
	const compiledSourceCss = sourceCss.replace(
		/^\s*@import\s+["']@fontsource-variable\/geist["'];?\s*$/m,
		""
	);
	const compiler = await compile(compiledSourceCss, {
		base: workspaceRoot,
		from: sourceCssFile,
		onDependency() { }
	});
	const scanner = new Scanner({
		sources: [
			{
				base: path.join(workspaceRoot, "src", "components"),
				pattern: "**/*.{ts,tsx}",
				negated: false
			},
			{
				base: path.join(workspaceRoot, "src", "lib"),
				pattern: "**/*.{ts,tsx}",
				negated: false
			}
		]
	});
	const resolvedCss = compiler.build(scanner.scan());

	return createShadcnStyleRuntimeSource(inlinedGeistCss, resolvedCss);
}

function extractRuntimeExports(source) {
	const names = new Set();

	for (const match of source.matchAll(/export\s+(?:const|let|var|function|class|enum)\s+([A-Za-z0-9_$]+)/g)) {
		names.add(match[1]);
	}

	for (const match of source.matchAll(/export\s*\{([^}]+)\}/gs)) {
		const parts = match[1].split(",");
		for (const part of parts) {
			const cleaned = part.trim();
			if (!cleaned || /^type\b/.test(cleaned)) {
				continue;
			}

			const pieces = cleaned.split(/\s+as\s+/i).map((value) => value.trim()).filter(Boolean);
			const exportName = pieces[pieces.length - 1];
			if (exportName && exportName !== "default") {
				names.add(exportName);
			}
		}
	}

	return [...names].sort((left, right) => left.localeCompare(right));
}

async function collectShadcnExports(workspaceRoot) {
	const sourceRoot = path.join(workspaceRoot, "src");
	const utilsFile = path.join(sourceRoot, "lib", "utils.ts");
	const extraExportFiles = [
		path.join(sourceRoot, "hooks", "use-mobile.ts"),
		path.join(sourceRoot, "components", "theme-provider.tsx")
	];
	const uiDir = path.join(sourceRoot, "components", "ui");
	const componentFiles = (await fs.readdir(uiDir))
		.filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
		.sort((left, right) => left.localeCompare(right))
		.map((name) => path.join(uiDir, name));
	const files = [utilsFile, ...extraExportFiles, ...componentFiles];
	const exportsByFile = [];
	const refsByExportName = new Map();

	for (const file of files) {
		const source = await fs.readFile(file, "utf8");
		const exportNames = extractRuntimeExports(source);
		exportsByFile.push({
			file,
			exportNames
		});

		for (const exportName of exportNames) {
			const refs = refsByExportName.get(exportName) ?? [];
			refs.push(normalizePath(path.relative(sourceRoot, file)));
			refsByExportName.set(exportName, refs);
		}
	}

	const conflicts = [...refsByExportName.entries()].filter(([, refs]) => refs.length > 1);
	if (conflicts.length > 0) {
		const details = conflicts
			.map(([name, refs]) => `${name}: ${refs.join(", ")}`)
			.join("\n");
		throw new Error(`shadcn runtime exports have conflicts:\n${details}`);
	}

	return exportsByFile.filter((entry) => entry.exportNames.length > 0);
}

function createEntrySource(exportsByFile, sourceFile, sideEffectFiles = []) {
	const sourceDir = path.dirname(sourceFile);

	const sideEffectImports = sideEffectFiles
		.map((file) => {
			const relativeSpecifier = normalizePath(path.relative(sourceDir, file));
			const specifier = relativeSpecifier.startsWith(".") ? relativeSpecifier : `./${relativeSpecifier}`;
			return `import ${JSON.stringify(specifier)};`;
		})
		.join("\n");

	return `${sideEffectImports ? `${sideEffectImports}\n\n` : ""}${exportsByFile
		.map(({ file, exportNames }) => {
			const relativeSpecifier = normalizePath(path.relative(sourceDir, file));
			const specifier = relativeSpecifier.startsWith(".") ? relativeSpecifier : `./${relativeSpecifier}`;
			return `export { ${exportNames.join(", ")} } from ${JSON.stringify(specifier)};`;
		})
		.join("\n")}\n`;
}

function createReactShimSource() {
	return `import React from "react";
export * from "react";
export default React;
`;
}

function createReactShimPlugin(reactShimFile) {
	return {
		name: "shadcn-react-external-shim",
		setup(buildContext) {
			buildContext.onResolve({ filter: /^react$/ }, (args) => {
				if (path.resolve(args.importer) === reactShimFile) {
					return null;
				}

				return {
					path: reactShimFile
				};
			});
		}
	};
}

export async function buildShadcnBundle(projectRoot) {
	const workspaceRoot = await ensureShadcnWorkspace(projectRoot);
	const styleRuntimeSource = await createShadcnStyleRuntime(projectRoot, workspaceRoot);
	const exportsByFile = await collectShadcnExports(workspaceRoot);
	const sourceFile = path.resolve(projectRoot, ".esm-pkg", "shadcn.entry.ts");
	const reactShimFile = path.resolve(projectRoot, ".esm-pkg", "shadcn.react-shim.mjs");
	const styleRuntimeFile = path.resolve(projectRoot, ".esm-pkg", "shadcn.style-runtime.mjs");
	const outFile = shadcnOutFile;
	const minifiedOutFile = getMinifiedOutFile(outFile);
	const absoluteOutFile = path.resolve(projectRoot, outFile);
	const absoluteMinifiedOutFile = path.resolve(projectRoot, minifiedOutFile);
	const source = createEntrySource(exportsByFile, sourceFile, [styleRuntimeFile]);
	const reactShimSource = createReactShimSource();

	await fs.mkdir(path.dirname(sourceFile), { recursive: true });
	await fs.mkdir(path.dirname(absoluteOutFile), { recursive: true });
	await fs.mkdir(path.dirname(absoluteMinifiedOutFile), { recursive: true });
	await fs.writeFile(sourceFile, source);
	await fs.writeFile(reactShimFile, reactShimSource);
	await fs.writeFile(styleRuntimeFile, styleRuntimeSource);

	const sharedBuildOptions = {
		absWorkingDir: workspaceRoot,
		bundle: true,
		entryPoints: [sourceFile],
		external: ["react", "react-dom"],
		format: "esm",
		jsx: "automatic",
		legalComments: "none",
		platform: "browser",
		// Keep React imports on an ESM shim so shadcn's CJS-heavy dependency chain
		// does not leave browser-incompatible require("react") calls in the final bundle.
		plugins: [createReactShimPlugin(reactShimFile)],
		sourcemap: true,
		target: ["es2020"],
		tsconfig: path.join(workspaceRoot, "tsconfig.json")
	};

	await build({
		...sharedBuildOptions,
		outfile: absoluteOutFile
	});

	await build({
		...sharedBuildOptions,
		minify: true,
		outfile: absoluteMinifiedOutFile
	});

	return {
		modules: ["shadcn"],
		outFile,
		minifiedOutFile
	};
}

const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFile = fileURLToPath(import.meta.url);

if (entryFile === currentFile) {
	buildShadcnBundle(process.cwd()).catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
