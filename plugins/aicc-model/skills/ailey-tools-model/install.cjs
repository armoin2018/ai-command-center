#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'AI-ley Tools Model Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['ENABLE_API_RENDERING'],
  outputDirs: ['templates', 'output', 'logs', '.cache'],
  buildVerify: ['dist/index.js'],
  npmPackageChecks: ['axios', 'chalk', 'commander', 'js-yaml'],
});
