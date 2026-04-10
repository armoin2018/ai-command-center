#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'WooCommerce AI-ley Skill',
  nodeVersion: 18,
  npmVersion: 9,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['WOOCOMMERCE_STORE_URL', 'WOOCOMMERCE_COM_EMAIL'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
});
