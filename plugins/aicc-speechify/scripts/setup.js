#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-speechify
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-speechify",
  "env": [
    [
      "SPEECHIFY_API_KEY",
      "Speechify API key from speechify.com"
    ]
  ]
});
