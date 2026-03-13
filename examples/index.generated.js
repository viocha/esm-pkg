export default {
  "package": {
    "name": "@viocha/esm-pkg",
    "version": "1.0.0"
  },
  "examples": [
    {
      "file": "./ant-design-icons.html",
      "title": "ant-design-icons.min.js"
    },
    {
      "file": "./antd.html",
      "title": "antd.min.js"
    },
    {
      "file": "./clsx.html",
      "title": "clsx.min.js"
    },
    {
      "file": "./htm-react.html",
      "title": "htm + react without babel"
    },
    {
      "file": "./lucide-react.html",
      "title": "lucide-react.min.js"
    },
    {
      "file": "./react-all.html",
      "title": "react-all.min.js"
    },
    {
      "file": "./shadcn.html",
      "title": "shadcn.min.js"
    }
  ],
  "bundles": [
    {
      "name": "ant-design-icons",
      "packageVersions": [
        {
          "name": "@ant-design/icons",
          "version": "6.1.0"
        }
      ],
      "esm": {
        "file": "../dist/ant-design-icons.js",
        "size": 1959421,
        "sizeText": "1.87 MB"
      },
      "min": {
        "file": "../dist/ant-design-icons.min.js",
        "size": 1050808,
        "sizeText": "1.00 MB"
      }
    },
    {
      "name": "antd",
      "packageVersions": [
        {
          "name": "antd",
          "version": "6.3.2"
        }
      ],
      "esm": {
        "file": "../dist/antd.js",
        "size": 3715704,
        "sizeText": "3.54 MB"
      },
      "min": {
        "file": "../dist/antd.min.js",
        "size": 1513003,
        "sizeText": "1.44 MB"
      }
    },
    {
      "name": "clsx",
      "packageVersions": [
        {
          "name": "clsx",
          "version": "2.1.1"
        }
      ],
      "esm": {
        "file": "../dist/clsx.js",
        "size": 2068,
        "sizeText": "2.02 KB"
      },
      "min": {
        "file": "../dist/clsx.min.js",
        "size": 972,
        "sizeText": "972 B"
      }
    },
    {
      "name": "htm",
      "packageVersions": [
        {
          "name": "htm",
          "version": "3.1.1"
        }
      ],
      "esm": {
        "file": "../dist/htm.js",
        "size": 3372,
        "sizeText": "3.29 KB"
      },
      "min": {
        "file": "../dist/htm.min.js",
        "size": 1772,
        "sizeText": "1.73 KB"
      }
    },
    {
      "name": "lucide-react",
      "packageVersions": [
        {
          "name": "lucide-react",
          "version": "0.577.0"
        }
      ],
      "esm": {
        "file": "../dist/lucide-react.js",
        "size": 1447321,
        "sizeText": "1.38 MB"
      },
      "min": {
        "file": "../dist/lucide-react.min.js",
        "size": 795407,
        "sizeText": "776.76 KB"
      }
    },
    {
      "name": "react-all",
      "packageVersions": [
        {
          "name": "react",
          "version": "19.2.4"
        },
        {
          "name": "react-dom",
          "version": "19.2.4"
        }
      ],
      "esm": {
        "file": "../dist/react-all.js",
        "size": 1100290,
        "sizeText": "1.05 MB"
      },
      "min": {
        "file": "../dist/react-all.min.js",
        "size": 195664,
        "sizeText": "191.08 KB"
      }
    },
    {
      "name": "shadcn",
      "packageVersions": [
        {
          "name": "shadcn/ui"
        }
      ],
      "esm": {
        "file": "../dist/shadcn.js",
        "size": 2104508,
        "sizeText": "2.01 MB"
      },
      "min": {
        "file": "../dist/shadcn.min.js",
        "size": 1025360,
        "sizeText": "1001.33 KB"
      }
    }
  ]
};
