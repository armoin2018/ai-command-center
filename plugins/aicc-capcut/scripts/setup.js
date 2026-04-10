#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-capcut
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-capcut",
  "env": [
    [
      "CAPCUT_API_KEY",
      "CapCut API key"
    ],
    [
      "CAPCUT_API_SECRET",
      "CapCut API secret"
    ],
    [
      "CAPCUT_ACCESS_TOKEN",
      "CapCut access token"
    ]
  ]
});
