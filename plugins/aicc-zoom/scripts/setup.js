#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-zoom
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-zoom",
  "env": [
    [
      "ZOOM_ACCOUNT_SID",
      "Zoom account ID"
    ],
    [
      "ZOOM_CLIENT_ID",
      "Zoom OAuth client ID"
    ],
    [
      "ZOOM_CLIENT_SECRET",
      "Zoom OAuth client secret"
    ]
  ]
});
