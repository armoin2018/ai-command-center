#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-discord
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-discord",
  "env": [
    [
      "DISCORD_BOT_TOKEN",
      "Discord bot token from Developer Portal"
    ],
    [
      "DISCORD_CLIENT_ID",
      "Discord application client ID"
    ]
  ]
});
