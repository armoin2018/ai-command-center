#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Zoom AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
  buildVerify: ['dist/index.js'],
});
