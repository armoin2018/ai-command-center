#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-threads
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-threads",
  "env": [
    [
      "THREADS_APP_ID",
      "Threads/Meta application ID"
    ],
    [
      "THREADS_APP_SECRET",
      "Threads/Meta application secret"
    ],
    [
      "THREADS_ACCESS_TOKEN",
      "Threads API access token"
    ]
  ]
});
