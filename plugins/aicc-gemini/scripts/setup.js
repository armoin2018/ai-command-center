#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-gemini
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-gemini",
  "env": [
    [
      "GOOGLE_API_KEY",
      "Google AI API key for Gemini/Imagen/Veo"
    ]
  ]
});
