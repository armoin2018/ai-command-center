#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-mailchimp
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-mailchimp",
  "env": [
    [
      "MAILCHIMP_API_KEY",
      "Mailchimp API key (format: key-us1)"
    ],
    [
      "MAILCHIMP_SERVER_PREFIX",
      "Mailchimp server prefix (e.g. us1)"
    ]
  ]
});
