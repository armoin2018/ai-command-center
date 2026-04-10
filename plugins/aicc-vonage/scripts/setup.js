#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-vonage
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-vonage",
  "env": [
    [
      "VONAGE_API_KEY",
      "Vonage API key"
    ],
    [
      "VONAGE_API_SECRET",
      "Vonage API secret"
    ]
  ]
});
