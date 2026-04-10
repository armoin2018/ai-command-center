#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'CapCut AI-ley Skill',
  nodeVersion: 18,
  npmVersion: 9,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['CAPCUT_API_KEY', 'CAPCUT_API_SECRET', 'CAPCUT_ACCESS_TOKEN', 'CAPCUT_USER_ID'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
});
