#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-youtube
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-youtube",
  "env": [
    [
      "YOUTUBE_CLIENT_ID",
      "Google OAuth client ID"
    ],
    [
      "YOUTUBE_CLIENT_SECRET",
      "Google OAuth client secret"
    ],
    [
      "YOUTUBE_REFRESH_TOKEN",
      "Google OAuth refresh token"
    ]
  ]
});
