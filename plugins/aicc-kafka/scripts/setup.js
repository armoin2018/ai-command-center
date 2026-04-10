#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-kafka
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-kafka",
  "env": [
    [
      "KAFKA_BOOTSTRAP_SERVERS",
      "Kafka broker addresses (e.g. localhost:9092)"
    ],
    [
      "KAFKA_CLIENT_ID",
      "Kafka client identifier"
    ]
  ]
});
