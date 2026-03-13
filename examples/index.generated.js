export default {
  "examples": [
    {
      "file": "./ant-design-icons.html",
      "title": "ant-design-icons.esm.js"
    },
    {
      "file": "./antd.html",
      "title": "antd.esm.js"
    },
    {
      "file": "./htm-react.html",
      "title": "htm + react without babel"
    },
    {
      "file": "./react-all.html",
      "title": "react-all.esm.js"
    }
  ],
  "bundles": [
    {
      "name": "react-all",
      "esm": {
        "file": "../dist/react-all.esm.js",
        "size": 1099383,
        "sizeText": "1.05 MB"
      },
      "min": {
        "file": "../dist/react-all.esm.min.js",
        "size": 195668,
        "sizeText": "191.08 KB"
      }
    },
    {
      "name": "antd",
      "esm": {
        "file": "../dist/antd.esm.js",
        "size": 3584049,
        "sizeText": "3.42 MB"
      },
      "min": {
        "file": "../dist/antd.esm.min.js",
        "size": 1513007,
        "sizeText": "1.44 MB"
      }
    },
    {
      "name": "ant-design-icons",
      "esm": {
        "file": "../dist/ant-design-icons.esm.js",
        "size": 1785383,
        "sizeText": "1.70 MB"
      },
      "min": {
        "file": "../dist/ant-design-icons.esm.min.js",
        "size": 1050812,
        "sizeText": "1.00 MB"
      }
    },
    {
      "name": "htm",
      "esm": {
        "file": "../dist/htm.esm.js",
        "size": 3356,
        "sizeText": "3.28 KB"
      },
      "min": {
        "file": "../dist/htm.esm.min.js",
        "size": 1776,
        "sizeText": "1.73 KB"
      }
    }
  ]
};
