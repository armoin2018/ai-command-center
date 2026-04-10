#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-tiktok
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-tiktok",
  "env": [
    [
      "TIKTOK_CLIENT_KEY",
      "TikTok application client key"
    ],
    [
      "TIKTOK_CLIENT_SECRET",
      "TikTok application client secret"
    ],
    [
      "TIKTOK_ACCESS_TOKEN",
      "TikTok OAuth access token"
    ]
  ]
});
