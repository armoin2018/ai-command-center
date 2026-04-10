#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Meetup AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['MEETUP_CLIENT_ID', 'MEETUP_CLIENT_SECRET', 'MEETUP_REDIRECT_URI'],
});
