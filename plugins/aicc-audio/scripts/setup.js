#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-audio
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-audio",
  "env": [
    [
      "OPENAI_API_KEY",
      "OpenAI API key (for Whisper transcription)"
    ]
  ],
  "sys": [
    [
      "ffmpeg",
      {
        "mac": "brew install ffmpeg",
        "linux": "sudo apt install ffmpeg",
        "win": "winget install Gyan.FFmpeg"
      }
    ]
  ]
});
