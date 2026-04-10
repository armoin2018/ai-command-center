#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-salesforce
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-salesforce",
  "env": [
    [
      "SALESFORCE_CLIENT_ID",
      "Salesforce Connected App client ID"
    ],
    [
      "SALESFORCE_CLIENT_SECRET",
      "Salesforce Connected App client secret"
    ],
    [
      "SALESFORCE_LOGIN_URL",
      "Salesforce login URL (e.g. https://login.salesforce.com)"
    ]
  ]
});
