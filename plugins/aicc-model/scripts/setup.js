#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-model
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-model",
  "env": [
    [
      "PLANTUML_SERVER_URL",
      "PlantUML server URL (optional)"
    ],
    [
      "MERMAID_INK_URL",
      "Mermaid.ink render URL (optional)"
    ]
  ]
});
