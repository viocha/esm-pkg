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
  },
  {
    modules: ["clsx"],
    exclude: [],
    outFile: "dist/clsx.esm.js"
  },
  {
    modules: ["lucide-react"],
    exclude: ["react"],
    outFile: "dist/lucide-react.esm.js"
  },
  {
    modules: ["htm"],
    exclude: [],
    outFile: "dist/htm.esm.js"
  }
];
