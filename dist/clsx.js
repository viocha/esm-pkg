var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
var clsx_exports = {};
__export(clsx_exports, {
  clsx: () => clsx,
  default: () => clsx_default
});
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
var clsx_default = clsx;

// .esm-pkg/distClsxJs.entry.mjs
var __defaultKey = "default";
var __default0 = __defaultKey in clsx_exports ? clsx_exports[__defaultKey] : void 0;
var __namedMerged = {};
for (const key of Object.keys(clsx_exports)) {
  if (key !== "default") {
    __namedMerged[key] = clsx_exports[key];
  }
}
var __defaultExport = __default0 !== void 0 && __default0 !== null && (typeof __default0 === "object" || typeof __default0 === "function") ? Object.assign(__default0, __namedMerged) : __default0 !== void 0 ? __default0 : __namedMerged;
var distClsxJs_entry_default = __defaultExport;
var clsxDefault = __default0;
export {
  clsx,
  clsxDefault,
  distClsxJs_entry_default as default
};
//# sourceMappingURL=clsx.js.map
