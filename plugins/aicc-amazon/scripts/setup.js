#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-amazon
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-amazon",
  "env": [
    [
      "AMAZON_CLIENT_ID",
      "Amazon SP-API OAuth client ID"
    ],
    [
      "AMAZON_CLIENT_SECRET",
      "Amazon SP-API OAuth client secret"
    ],
    [
      "AMAZON_REFRESH_TOKEN",
      "Amazon SP-API refresh token"
    ],
    [
      "AMAZON_SELLER_ID",
      "Your Amazon Seller ID"
    ]
  ]
});
