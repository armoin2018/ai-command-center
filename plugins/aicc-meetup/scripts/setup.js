#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-meetup
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-meetup",
  "env": [
    [
      "MEETUP_CLIENT_ID",
      "Meetup OAuth client ID"
    ],
    [
      "MEETUP_CLIENT_SECRET",
      "Meetup OAuth client secret"
    ],
    [
      "MEETUP_ACCESS_TOKEN",
      "Meetup API access token"
    ]
  ]
});
