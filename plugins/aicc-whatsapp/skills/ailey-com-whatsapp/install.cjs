#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'WhatsApp Business API AI-ley Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID'],
  buildVerify: ['dist/index.js'],
});
