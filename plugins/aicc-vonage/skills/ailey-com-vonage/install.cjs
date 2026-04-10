#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Vonage AI-ley Skill',
  nodeVersion: 18,
  npmVersion: 9,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['VONAGE_API_KEY', 'VONAGE_API_SECRET'],
});
