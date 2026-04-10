#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-gamma
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-gamma",
  "env": [
    [
      "GAMMA_API_KEY",
      "Gamma API key from gamma.app"
    ]
  ]
});
