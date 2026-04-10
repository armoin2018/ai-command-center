#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Salesforce CRM AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  outputDirs: ['.oauth', 'exports', 'logs', 'certs'],
  buildVerify: ['dist/index.js'],
  npmPackageChecks: ['jsforce', 'axios'],
});
