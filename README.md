# esm-pkg

一个将若干 npm 包打成单个浏览器 ESM 文件的小工具。

适合这类场景：

- 把 `react`、`react-dom` 合并成一个 `react-all.js`
- 把 `antd` 打成单文件，但把 `react` 相关依赖外部化
- 把 `@ant-design/icons` 打成单文件，但把 `react` 相关依赖外部化
- 把 `clsx` 打成单文件，并直接在浏览器里用默认导入
- 把 `lucide-react` 打成单文件，并在静态页面中渲染 React 图标组件
- 把 `htm` 打成单文件，并用于不依赖 Babel 的 React 示例
- 单独下载并聚合 `shadcn/ui` 全部源码组件与 `cn`
- 在静态 HTML 里直接通过 `type="module"` 和 `importmap` 使用产物

## 特性

- 根路径使用声明式配置
- 一次命令构建全部 bundle
- 多个库会合并默认导出和命名导出
- 单模块 bundle 会保留原包的默认导出形态
- `exclude` 会转成 external，不打进当前产物
- 自动生成 `examples/index.html` 使用的数据文件
- 对 React 相关包做了两条自动补入规则：
  - 声明 `react` 时，自动补入 `react/jsx-runtime` 和 `react/jsx-dev-runtime`
  - 声明 `react-dom` 时，自动补入 `react-dom/client`

## 安装

```bash
pnpm install
```

## 构建

```bash
pnpm build
```

构建后会生成：

- `dist/*.js`
- `dist/*.min.js`
- `dist/*.js.map`
- `dist/*.min.js.map`
- `examples/index.generated.js`

## 配置

配置文件为根目录的 `esm-pkg.config.mjs`。

当前示例：

```js
export default [
  {
    modules: ["react", "react-dom"],
    exclude: [],
    outFile: "dist/react-all.js"
  },
  {
    modules: ["antd"],
    exclude: ["react", "react-dom"],
    outFile: "dist/antd.js"
  },
  {
    modules: ["@ant-design/icons"],
    exclude: ["react", "react-dom"],
    outFile: "dist/ant-design-icons.js"
  },
  {
    modules: ["clsx"],
    exclude: [],
    outFile: "dist/clsx.js"
  },
  {
    modules: ["lucide-react"],
    exclude: ["react"],
    outFile: "dist/lucide-react.js"
  },
  {
    modules: ["htm"],
    exclude: [],
    outFile: "dist/htm.js"
  }
];
```

### 字段说明

- `modules`: 要打进当前 bundle 的包列表
- `exclude`: 不打包、保留为外部依赖的包列表
- `outFile`: 输出文件路径

### 合并规则

对一个 bundle 中声明的多个库，工具会生成一个聚合 ESM 入口：

- 默认导出：把各个库的默认导出按对象方式合并成一个默认导出对象
- 命名导出：把所有库的命名导出平铺导出

如果 bundle 里只声明了一个库，则默认导出保持和原包一致。
例如 `htm` 仍然可以直接这样使用：

```js
import htm from "./dist/htm.js";

const html = htm.bind(React.createElement);
```

例如：

```js
import ReactAll, { createElement, createRoot, jsx } from "./dist/react-all.js";
```

其中：

- `ReactAll` 是聚合后的默认导出对象
- `createElement`、`createRoot`、`jsx` 是平铺后的命名导出

## `exclude` 规则

`exclude` 中的包会作为外部依赖保留在输出里，不会被打进当前文件。

例如：

```js
{
  modules: ["antd"],
  exclude: ["react", "react-dom"],
  outFile: "dist/antd.js"
}
```

这会让 `antd.js` 依赖外部的：

- `react`
- `react-dom`
- `react-dom/client`
- `react/jsx-runtime`
- `react/jsx-dev-runtime`

其中后两项通常通过 `react` 聚合包来承接。

## 浏览器使用

### React 聚合包

```html
<script type="module">
  import ReactAll, {
    createElement,
    createRoot,
    useState
  } from "../dist/react-all.js";

  console.log(ReactAll, createElement, createRoot, useState);
</script>
```

### Antd 聚合包

因为 `antd.js` 外部化了 React 相关依赖，所以浏览器里通常要配 `importmap`：

```html
<script type="importmap">
  {
    "imports": {
      "react": "../dist/react-all.js",
      "react-dom": "../dist/react-all.js",
      "react-dom/client": "../dist/react-all.js",
      "react/jsx-runtime": "../dist/react-all.js",
      "react/jsx-dev-runtime": "../dist/react-all.js"
    }
  }
</script>
```

然后再正常导入：

```html
<script type="module">
  import { Button } from "../dist/antd.js";
  import { createElement, createRoot } from "../dist/react-all.js";

  console.log(Button, createElement, createRoot);
</script>
```

## examples

`examples/` 下可以放静态 HTML 示例页。

当前目录中：

- `examples/react-all.html`
- `examples/antd.html`
- `examples/ant-design-icons.html`
- `examples/htm-react.html`
- `examples/clsx.html`
- `examples/lucide-react.html`
- `examples/index.html`

其中 `examples/index.html` 本身不写死页面路径，它会导入 `examples/index.generated.js` 来渲染列表。

这个文件由构建脚本自动扫描 `examples/` 目录生成：

- 扫描所有 `.html`
- 自动跳过 `index.html`
- 读取每个 HTML 的 `<title>` 作为展示标题

所以新增示例页后，只需要重新执行：

```bash
pnpm build
```

另外，`shadcn/ui` 不走根配置文件。构建脚本会在首次构建时单独创建一个临时工作目录，下载官方 CLI 生成的全部组件源码，检查运行时导出名是否冲突，再额外产出 `dist/shadcn.js` 和 `dist/shadcn.min.js`。

## 本地查看示例

需要通过静态服务器打开，不能直接双击本地文件。

例如：

```bash
python -m http.server 4173
```

然后访问：

- `http://127.0.0.1:4173/examples/index.html`

## 目录结构

```text
.
|-- dist/
|-- examples/
|   |-- ant-design-icons.html
|   |-- antd.html
|   |-- htm-react.html
|   |-- index.generated.js
|   |-- index.html
|   `-- react-all.html
|-- scripts/
|   `-- build-all.mjs
|-- esm-pkg.config.mjs
|-- package.json
`-- README.md
```
