#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-twilio
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-twilio",
  "env": [
    [
      "TWILIO_ACCOUNT_SID",
      "Twilio account SID"
    ],
    [
      "TWILIO_API_KEY",
      "Twilio API key"
    ],
    [
      "TWILIO_API_SECRET",
      "Twilio API secret"
    ]
  ]
});
