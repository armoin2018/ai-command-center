#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-canva
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-canva",
  "env": [
    [
      "CANVA_CLIENT_ID",
      "Canva OAuth client ID"
    ],
    [
      "CANVA_CLIENT_SECRET",
      "Canva OAuth client secret"
    ],
    [
      "CANVA_ACCESS_TOKEN",
      "Canva OAuth access token"
    ]
  ]
});
