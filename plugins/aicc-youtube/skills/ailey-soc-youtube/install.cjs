#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'YouTube AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
});
