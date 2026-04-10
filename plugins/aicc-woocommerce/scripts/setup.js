#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-woocommerce
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-woocommerce",
  "env": [
    [
      "WOOCOMMERCE_URL",
      "WooCommerce store URL"
    ],
    [
      "WOOCOMMERCE_KEY",
      "WooCommerce REST API consumer key"
    ],
    [
      "WOOCOMMERCE_SECRET",
      "WooCommerce REST API consumer secret"
    ]
  ]
});
