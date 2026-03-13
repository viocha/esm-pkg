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
var __modules = [clsx_exports];
var __defaults = [__default0];
var __namedMerged = Object.assign(
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
var __defaultMerged = Object.assign(
  {},
  ...__defaults.filter((value) => value !== void 0 && value !== null && (typeof value === "object" || typeof value === "function"))
);
var __merged = Object.assign({}, __defaultMerged, __namedMerged);
var __singleDefault = __defaults[0];
if (__default0 !== void 0) __merged.clsxDefault = __default0;
var __defaultExport = __singleDefault !== void 0 && __singleDefault !== null && (typeof __singleDefault === "object" || typeof __singleDefault === "function") ? Object.assign(__singleDefault, __namedMerged) : __singleDefault !== void 0 ? __singleDefault : __merged;
var distClsxJs_entry_default = __defaultExport;
var clsx2 = clsx;
export {
  clsx2 as clsx,
  distClsxJs_entry_default as default
};
//# sourceMappingURL=clsx.js.map
