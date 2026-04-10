#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-calendly
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-calendly",
  "env": [
    [
      "CALENDLY_ACCESS_TOKEN",
      "Calendly personal access token (or use OAuth)"
    ]
  ]
});
