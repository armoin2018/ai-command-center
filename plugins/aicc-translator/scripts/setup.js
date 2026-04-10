#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-translator
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-translator",
  "env": [
    [
      "DEFAULT_SOURCE_LANG",
      "Default source language (e.g. en)"
    ],
    [
      "DEFAULT_TARGET_LANG",
      "Default target language (e.g. es)"
    ]
  ],
  "sys": [
    [
      "python3",
      {
        "mac": "brew install python3",
        "linux": "sudo apt install python3",
        "win": "winget install Python.Python.3"
      }
    ]
  ],
  "pip": [
    [
      "argostranslate",
      "pip install argostranslate"
    ]
  ]
});
