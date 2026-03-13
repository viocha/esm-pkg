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
  }
];
