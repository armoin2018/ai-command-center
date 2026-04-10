#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Etsy AI-ley Skill',
  nodeVersion: 18,
  npmVersion: 9,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['ETSY_API_KEY', 'ETSY_API_SECRET', 'ETSY_ACCESS_TOKEN', 'ETSY_SHOP_ID'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
});
