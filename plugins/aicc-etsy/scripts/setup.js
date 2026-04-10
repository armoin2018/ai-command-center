#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-etsy
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-etsy",
  "env": [
    [
      "ETSY_API_KEY",
      "Etsy API key"
    ],
    [
      "ETSY_API_SECRET",
      "Etsy API secret"
    ],
    [
      "ETSY_ACCESS_TOKEN",
      "Etsy OAuth access token"
    ],
    [
      "ETSY_SHOP_ID",
      "Your Etsy shop ID"
    ]
  ]
});
