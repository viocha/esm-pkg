# esm-pkg

一个将若干 npm 包打成单个浏览器 ESM 文件的小工具。

适合这类场景：

- 把 `react`、`react-dom` 合并成一个 `react-all.esm.js`
- 把 `antd` 打成单文件，但把 `react` 相关依赖外部化
- 把 `@ant-design/icons` 打成单文件，但把 `react` 相关依赖外部化
- 在静态 HTML 里直接通过 `type="module"` 和 `importmap` 使用产物

## 特性

- 根路径使用声明式配置
- 一次命令构建全部 bundle
- 多个库会合并默认导出和命名导出
- `exclude` 会转成 external，不打进当前产物
- 自动生成 `examples/index.html` 使用的数据文件
- 对 React 相关包做了两条自动补入规则：
  - 声明 `react` 时，自动补入 `react/jsx-runtime` 和 `react/jsx-dev-runtime`
  - 声明 `react-dom` 时，自动补入 `react-dom/client`

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

构建后会生成：

- `dist/*.esm.js`
- `dist/*.esm.min.js`
- `dist/*.esm.js.map`
- `dist/*.esm.min.js.map`
- `examples/index.generated.js`

## 配置

配置文件为根目录的 `esm-pkg.config.mjs`。

当前示例：

```js
export default [
  {
    modules: ["react", "react-dom"],
    exclude: [],
    outFile: "dist/react-all.esm.js"
  },
  {
    modules: ["antd"],
    exclude: ["react", "react-dom"],
    outFile: "dist/antd.esm.js"
  },
  {
    modules: ["@ant-design/icons"],
    exclude: ["react", "react-dom"],
    outFile: "dist/ant-design-icons.esm.js"
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

例如：

```js
import ReactAll, { createElement, createRoot, jsx } from "./dist/react-all.esm.js";
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
  outFile: "dist/antd.esm.js"
}
```

这会让 `antd.esm.js` 依赖外部的：

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
  } from "../dist/react-all.esm.js";

  console.log(ReactAll, createElement, createRoot, useState);
</script>
```

### Antd 聚合包

因为 `antd.esm.js` 外部化了 React 相关依赖，所以浏览器里通常要配 `importmap`：

```html
<script type="importmap">
  {
    "imports": {
      "react": "../dist/react-all.esm.js",
      "react-dom": "../dist/react-all.esm.js",
      "react-dom/client": "../dist/react-all.esm.js",
      "react/jsx-runtime": "../dist/react-all.esm.js",
      "react/jsx-dev-runtime": "../dist/react-all.esm.js"
    }
  }
</script>
```

然后再正常导入：

```html
<script type="module">
  import { Button } from "../dist/antd.esm.js";
  import { createElement, createRoot } from "../dist/react-all.esm.js";

  console.log(Button, createElement, createRoot);
</script>
```

## examples

`examples/` 下可以放静态 HTML 示例页。

当前目录中：

- `examples/react-all.html`
- `examples/antd.html`
- `examples/ant-design-icons.html`
- `examples/index.html`

其中 `examples/index.html` 本身不写死页面路径，它会导入 `examples/index.generated.js` 来渲染列表。

这个文件由构建脚本自动扫描 `examples/` 目录生成：

- 扫描所有 `.html`
- 自动跳过 `index.html`
- 读取每个 HTML 的 `<title>` 作为展示标题

所以新增示例页后，只需要重新执行：

```bash
npm run build
```

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
|   |-- index.generated.js
|   |-- index.html
|   `-- react-all.html
|-- scripts/
|   `-- build-all.mjs
|-- esm-pkg.config.mjs
|-- package.json
`-- README.md
```
