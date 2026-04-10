#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Amazon SP-API AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: [
    'AMAZON_CLIENT_ID', 'AMAZON_CLIENT_SECRET', 'AMAZON_REFRESH_TOKEN',
    'AMAZON_ACCESS_KEY_ID', 'AMAZON_SECRET_ACCESS_KEY',
    'AMAZON_SELLER_ID', 'AMAZON_MARKETPLACE_ID',
  ],
  outputDirs: ['output'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
});
