#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'OpenAI Image & Video AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['OPENAI_API_KEY'],
  outputDirs: ['output'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
});
