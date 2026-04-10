#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-twitter
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-twitter",
  "env": [
    [
      "TWITTER_API_KEY",
      "X/Twitter API key"
    ],
    [
      "TWITTER_API_SECRET",
      "X/Twitter API secret"
    ],
    [
      "TWITTER_ACCESS_TOKEN",
      "X/Twitter access token"
    ],
    [
      "TWITTER_ACCESS_TOKEN_SECRET",
      "X/Twitter access token secret"
    ]
  ]
});
