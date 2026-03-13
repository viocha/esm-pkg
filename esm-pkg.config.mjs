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
