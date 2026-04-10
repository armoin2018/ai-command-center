#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-timetap
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-timetap",
  "env": [
    [
      "TIMETAP_API_KEY",
      "TimeTap API key"
    ],
    [
      "TIMETAP_PRIVATE_KEY",
      "TimeTap private key for signature"
    ]
  ]
});
