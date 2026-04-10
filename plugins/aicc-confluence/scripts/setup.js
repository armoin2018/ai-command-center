#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-confluence
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-confluence",
  "env": [
    [
      "ATLASSIAN_URL",
      "Atlassian instance URL (e.g. https://yoursite.atlassian.net)"
    ],
    [
      "ATLASSIAN_USER",
      "Atlassian account email"
    ],
    [
      "ATLASSIAN_APIKEY",
      "Atlassian API token"
    ]
  ]
});
