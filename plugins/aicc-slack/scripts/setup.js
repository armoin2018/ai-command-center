#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-slack
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-slack",
  "env": [
    [
      "SLACK_BOT_TOKEN",
      "Slack bot token (xoxb-...)"
    ],
    [
      "SLACK_SIGNING_SECRET",
      "Slack app signing secret"
    ]
  ]
});
