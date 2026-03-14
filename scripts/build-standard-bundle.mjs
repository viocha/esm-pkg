import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { build } from "esbuild";

const reactDomExtras = ["react-dom/client"];
const reactRuntimeExtras = ["react/jsx-runtime", "react/jsx-dev-runtime"];
const require = createRequire(import.meta.url);
const transientWriteErrorCodes = new Set(["UNKNOWN", "EBUSY", "EPERM"]);

function unique(items) {
  return [...new Set(items)];
}

function getPackageRootSpecifier(specifier) {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return name ? `${scope}/${name}` : specifier;
  }

  const [name] = specifier.split("/");
  return name;
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

function getMinifiedOutFile(outFile) {
  const ext = path.extname(outFile);
  if (!ext) {
    return `${outFile}.min`;
  }

  return `${outFile.slice(0, -ext.length)}.min${ext}`;
}

function getCssSidecarFiles(outFile) {
  const ext = path.extname(outFile);
  const stem = ext ? outFile.slice(0, -ext.length) : outFile;
  return [`${stem}.css`, `${stem}.css.map`];
}

function normalizePath(input) {
  return input.replace(/\\/g, "/");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeFileWithRetry(filePath, contents, maxAttempts = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.writeFile(filePath, contents);
      return;
    } catch (error) {
      lastError = error;

      if (!transientWriteErrorCodes.has(error?.code) || attempt === maxAttempts) {
        throw error;
      }

      await sleep(50 * attempt);
    }
  }

  throw lastError;
}

function createCssRuntimeSource(cssSource, runtimeId) {
  return `if (typeof document !== "undefined" && !document.querySelector('style[data-esm-pkg-css="${runtimeId}"]')) {
  const style = document.createElement("style");
  style.type = "text/css";
  style.setAttribute("data-esm-pkg-css", ${JSON.stringify(runtimeId)});
  style.textContent = ${JSON.stringify(cssSource)};
  (document.head || document.documentElement).appendChild(style);
}
`;
}

function createExternalShimSource(specifier) {
  return `import * as __namespace from ${JSON.stringify(specifier)};
const __defaultKey = "default";
const __defaultValue = __defaultKey in __namespace ? __namespace[__defaultKey] : undefined;

export * from ${JSON.stringify(specifier)};
export default __defaultValue !== undefined ? __defaultValue : __namespace;
`;
}

function createExternalShimPlugin(shimFilesBySpecifier) {
  const shimEntries = Object.entries(shimFilesBySpecifier);

  return {
    name: "standard-bundle-external-shims",
    setup(buildContext) {
      for (const [specifier, shimFile] of shimEntries) {
        const filter = new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

        buildContext.onResolve({ filter }, (args) => {
          if (path.resolve(args.importer) === shimFile) {
            return null;
          }

          return {
            path: shimFile
          };
        });
      }
    }
  };
}

function buildSingleModuleEntrySource(specifier, defaultAlias, sideEffectFiles = []) {
  const sideEffectImports = sideEffectFiles
    .map((sideEffectFile) => `import ${JSON.stringify(sideEffectFile)};`)
    .join("\n");

  return `${sideEffectImports ? `${sideEffectImports}\n` : ""}import * as __mod0 from ${JSON.stringify(specifier)};
const __defaultKey = "default";
const __default0 = __defaultKey in __mod0 ? __mod0[__defaultKey] : undefined;
const __namedMerged = {};

for (const key of Object.keys(__mod0)) {
  if (key !== "default") {
    __namedMerged[key] = __mod0[key];
  }
}

const __defaultExport =
  __default0 !== undefined && __default0 !== null && (typeof __default0 === "object" || typeof __default0 === "function")
    ? Object.assign(__default0, __namedMerged)
    : (__default0 !== undefined ? __default0 : __namedMerged);

export * from ${JSON.stringify(specifier)};
export default __defaultExport;
export const ${defaultAlias} = __default0;
`;
}

function buildEntrySource(specifiers, exportMap, defaultAliases, sideEffectFiles = []) {
  const sideEffectImports = sideEffectFiles
    .map((specifier) => `import ${JSON.stringify(specifier)};`)
    .join("\n");
  const imports = specifiers
    .map((specifier, index) => `import * as __mod${index} from ${JSON.stringify(specifier)};`)
    .join("\n");

  const moduleRefs = specifiers.map((_, index) => `__mod${index}`);
  const hasSingleModule = specifiers.length === 1;
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

  return `${sideEffectImports ? `${sideEffectImports}\n` : ""}${imports}
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
const __singleDefault = __defaults[0];

${defaultAliases
  .map(({ exportName, ref }) => `if (${ref} !== undefined) __merged.${exportName} = ${ref};`)
  .join("\n")}

const __defaultExport = ${
  hasSingleModule
    ? `(__singleDefault !== undefined && __singleDefault !== null && (typeof __singleDefault === "object" || typeof __singleDefault === "function"))
  ? Object.assign(__singleDefault, __namedMerged)
  : (__singleDefault !== undefined ? __singleDefault : __merged)`
    : "__merged"
};

export default __defaultExport;
${namedExports}
`;
}

async function resolveModuleInfo(specifier) {
  const namespace = await import(specifier);
  const namedExports = Object.keys(namespace).filter(
    (key) => key !== "default" && key !== "__esModule"
  );
  return {
    specifier,
    namedExports
  };
}

function resolveCssFile(projectRoot, specifier) {
  return require.resolve(specifier, {
    paths: [projectRoot]
  });
}

async function resolvePackageJsonFile(projectRoot, specifier) {
  const packageName = getPackageRootSpecifier(specifier);

  try {
    return require.resolve(`${packageName}/package.json`, {
      paths: [projectRoot]
    });
  } catch (error) {
    if (error?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED" && error?.code !== "MODULE_NOT_FOUND") {
      throw error;
    }
  }

  const resolvedEntryFile = require.resolve(packageName, {
    paths: [projectRoot]
  });
  let currentDir = path.dirname(resolvedEntryFile);

  while (true) {
    const packageJsonFile = path.join(currentDir, "package.json");

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonFile, "utf8"));
      if (packageJson.name === packageName) {
        return packageJsonFile;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Could not locate package.json for ${packageName} from ${resolvedEntryFile}.`);
    }
    currentDir = parentDir;
  }
}

async function warnOnUnusedExcludes(projectRoot, declaredModules, exclude, outFile) {
  const moduleRoots = unique(declaredModules.map((specifier) => getPackageRootSpecifier(specifier)));
  const excludeRoots = unique(exclude.map((specifier) => getPackageRootSpecifier(specifier)));
  if (moduleRoots.length === 0 || excludeRoots.length === 0) {
    return;
  }

  const peerDependencySets = await Promise.all(
    moduleRoots.map(async (moduleName) => {
      try {
        const packageJsonFile = await resolvePackageJsonFile(projectRoot, moduleName);
        const packageJson = JSON.parse(await fs.readFile(packageJsonFile, "utf8"));
        return new Set(Object.keys(packageJson.peerDependencies ?? {}));
      } catch {
        return new Set();
      }
    })
  );
  const allPeerDependencies = new Set(peerDependencySets.flatMap((peerDependencies) => [...peerDependencies]));

  for (const excludeName of excludeRoots) {
    if (!allPeerDependencies.has(excludeName)) {
      console.warn(
        `[WARNING] ${outFile}: exclude "${excludeName}" is not declared in the combined peerDependencies of modules ${moduleRoots.join(", ")}.`
      );
    }
  }
}

async function loadConfiguredCss(projectRoot, cssFiles) {
  const cssSources = await Promise.all(
    cssFiles.map(async (specifier) => {
      const cssFile = resolveCssFile(projectRoot, specifier);
      return fs.readFile(cssFile, "utf8");
    })
  );

  return cssSources.join("\n\n");
}

function collectBuildCss(buildResult) {
  return buildResult.outputFiles
    .filter((outputFile) => outputFile.path.endsWith(".css"))
    .map((outputFile) => outputFile.text)
    .join("\n\n");
}

async function writeNonCssOutputs(buildResult) {
  const outputFiles = buildResult.outputFiles.filter(
    (outputFile) => !outputFile.path.endsWith(".css") && !outputFile.path.endsWith(".css.map")
  );

  for (const outputFile of outputFiles) {
    await fs.mkdir(path.dirname(outputFile.path), { recursive: true });
    await writeFileWithRetry(outputFile.path, outputFile.contents);
  }
}

async function removeFilesIfPresent(projectRoot, files) {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.unlink(path.resolve(projectRoot, file));
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    })
  );
}

export async function buildStandardBundle(projectRoot, bundleConfig) {
  const declaredModules = unique(bundleConfig.modules ?? []);
  const modules = expandModules(declaredModules);
  const outFile = bundleConfig.outFile;
  const exclude = bundleConfig.exclude ?? [];
  const cssFiles = unique(bundleConfig.cssFiles ?? []);
  const excludeRoots = unique(exclude.filter((specifier) => !specifier.includes("/")));

  if (modules.length === 0) {
    throw new Error(`Bundle ${outFile ?? "<unknown>"} must declare at least one module.`);
  }

  if (!outFile) {
    throw new Error(`Bundle ${modules.join(", ")} is missing outFile.`);
  }

  await warnOnUnusedExcludes(projectRoot, declaredModules, exclude, outFile);

  const exportMap = new Map();
  const defaultAliases = [];
  const usedDefaultAliases = new Set();
  if (modules.length > 1) {
    const moduleInfos = await Promise.all(modules.map((specifier) => resolveModuleInfo(specifier)));

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
  }
  const sourceFile = path.resolve(projectRoot, ".esm-pkg", `${sanitizeIdentifier(outFile)}.entry.mjs`);
  const cssRuntimeFile = path.resolve(projectRoot, ".esm-pkg", `${sanitizeIdentifier(outFile)}.style-runtime.mjs`);
  const shimFilesBySpecifier = Object.fromEntries(
    excludeRoots.map((specifier) => [
      specifier,
      path.resolve(
        projectRoot,
        ".esm-pkg",
        `${sanitizeIdentifier(outFile)}.${sanitizeIdentifier(specifier)}-shim.mjs`
      )
    ])
  );
  const absoluteOutFile = path.resolve(projectRoot, outFile);
  const minifiedOutFile = getMinifiedOutFile(outFile);
  const absoluteMinifiedOutFile = path.resolve(projectRoot, minifiedOutFile);
  const cssRuntimeSpecifier = normalizePath(path.relative(path.dirname(sourceFile), cssRuntimeFile));
  const shouldInlineCss = cssFiles.length > 0;
  const sideEffectImports = shouldInlineCss
    ? [cssRuntimeSpecifier.startsWith(".") ? cssRuntimeSpecifier : `./${cssRuntimeSpecifier}`]
    : [];
  const entrySource =
    modules.length === 1
      ? buildSingleModuleEntrySource(
          modules[0],
          `${sanitizeIdentifier(modules[0])}Default`,
          sideEffectImports
        )
      : buildEntrySource(modules, exportMap, defaultAliases, sideEffectImports);

  await fs.mkdir(path.dirname(sourceFile), { recursive: true });
  await fs.mkdir(path.dirname(absoluteOutFile), { recursive: true });
  await fs.mkdir(path.dirname(absoluteMinifiedOutFile), { recursive: true });
  await fs.writeFile(sourceFile, entrySource);
  await Promise.all(
    Object.entries(shimFilesBySpecifier).map(([specifier, shimFile]) =>
      fs.writeFile(shimFile, createExternalShimSource(specifier))
    )
  );

  const configuredCss = shouldInlineCss ? await loadConfiguredCss(projectRoot, cssFiles) : "";

  if (shouldInlineCss) {
    await fs.writeFile(cssRuntimeFile, createCssRuntimeSource(configuredCss, sanitizeIdentifier(outFile)));
  }

  const sharedBuildOptions = {
    absWorkingDir: projectRoot,
    bundle: true,
    entryPoints: [sourceFile],
    external: expandExternals(exclude),
    format: "esm",
    legalComments: "none",
    platform: "browser",
    plugins: Object.keys(shimFilesBySpecifier).length > 0 ? [createExternalShimPlugin(shimFilesBySpecifier)] : [],
    sourcemap: true,
    target: ["es2020"],
    write: false
  };

  if (shouldInlineCss) {
    const cssProbeResult = await build({
      ...sharedBuildOptions,
      outfile: absoluteOutFile
    });
    const emittedCss = collectBuildCss(cssProbeResult);
    const combinedCss = [configuredCss, emittedCss].filter(Boolean).join("\n\n");
    await fs.writeFile(cssRuntimeFile, createCssRuntimeSource(combinedCss, sanitizeIdentifier(outFile)));
  }

  const regularBuildResult = await build({
    ...sharedBuildOptions,
    outfile: absoluteOutFile
  });
  await writeNonCssOutputs(regularBuildResult);

  const minifiedBuildResult = await build({
    ...sharedBuildOptions,
    minify: true,
    outfile: absoluteMinifiedOutFile
  });
  await writeNonCssOutputs(minifiedBuildResult);

  if (shouldInlineCss) {
    await removeFilesIfPresent(projectRoot, [
      ...getCssSidecarFiles(outFile),
      ...getCssSidecarFiles(minifiedOutFile)
    ]);
  }

  return {
    modules,
    outFile,
    minifiedOutFile
  };
}
