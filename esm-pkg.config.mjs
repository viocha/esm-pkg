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
