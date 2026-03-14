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
    modules: ["@mui/icons-material"],
    exclude: ["react"],
    outFile: "dist/mui-icons-material.js"
  },
  {
    modules: ["@primer/octicons-react"],
    exclude: ["react"],
    outFile: "dist/primer-octicons-react.js"
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
    modules: ["@mui/material"],
    exclude: ["react", "react-dom"],
    outFile: "dist/mui-material.js"
  },
  {
    modules: ["@primer/react"],
    exclude: ["react", "react-dom"],
    cssFiles: ["@primer/primitives/dist/css/functional/themes/light.css"],
    outFile: "dist/primer-react.js"
  },
  {
    modules: ["htm"],
    exclude: [],
    outFile: "dist/htm.js"
  }
];
