#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Google Gemini AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['GEMINI_API_KEY', 'GEMINI_ACCOUNT_TYPE'],
  outputDirs: ['output'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
});
