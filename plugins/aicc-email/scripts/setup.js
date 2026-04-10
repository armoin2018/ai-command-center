#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-email
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-email",
  "env": [
    [
      "EMAIL_USER",
      "Email address"
    ],
    [
      "EMAIL_PASSWORD",
      "Email password or app password"
    ],
    [
      "SMTP_HOST",
      "SMTP server hostname"
    ],
    [
      "SMTP_PORT",
      "SMTP port (usually 587)"
    ],
    [
      "IMAP_HOST",
      "IMAP server hostname"
    ],
    [
      "IMAP_PORT",
      "IMAP port (usually 993)"
    ]
  ]
});
