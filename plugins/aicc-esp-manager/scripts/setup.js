#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-esp-manager
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-esp-manager",
  "env": [
    [
      "ESP_SERIAL_PORT",
      "Serial port for ESP device (e.g. /dev/tty.usbserial-0001 or COM3)"
    ]
  ],
  "sys": [
    [
      "python3",
      {
        "mac": "brew install python3",
        "linux": "sudo apt install python3",
        "win": "winget install Python.Python.3"
      }
    ]
  ],
  "pip": [
    [
      "esptool",
      "pip install esptool"
    ]
  ]
});
