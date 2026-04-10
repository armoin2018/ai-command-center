#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Mailchimp AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['MAILCHIMP_API_KEY', 'MAILCHIMP_SERVER_PREFIX'],
  buildVerify: ['dist/index.js'],
});
