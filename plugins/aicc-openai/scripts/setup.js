#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-openai
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-openai",
  "env": [
    [
      "OPENAI_API_KEY",
      "OpenAI API key from platform.openai.com"
    ]
  ]
});
