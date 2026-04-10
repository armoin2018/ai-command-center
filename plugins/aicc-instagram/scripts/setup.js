#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-instagram
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-instagram",
  "env": [
    [
      "INSTAGRAM_ACCESS_TOKEN",
      "Instagram Graph API access token"
    ],
    [
      "INSTAGRAM_ACCOUNT_ID",
      "Instagram business/creator account ID"
    ]
  ]
});
