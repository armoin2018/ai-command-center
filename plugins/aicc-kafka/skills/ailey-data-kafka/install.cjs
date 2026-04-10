#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'Apache Kafka AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: false,
  envSetup: true,
});
