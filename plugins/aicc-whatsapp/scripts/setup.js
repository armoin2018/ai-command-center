#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-whatsapp
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-whatsapp",
  "env": [
    [
      "WHATSAPP_PHONE_ID",
      "WhatsApp phone number ID"
    ],
    [
      "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "WhatsApp Business account ID"
    ],
    [
      "WHATSAPP_ACCESS_TOKEN",
      "WhatsApp API access token"
    ]
  ]
});
