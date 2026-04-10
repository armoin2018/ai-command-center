#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'WordPress AI-ley Skill',
  nodeVersion: 18,
  npmVersion: 9,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: [
    'WORDPRESS_COM_CLIENT_ID', 'WORDPRESS_COM_CLIENT_SECRET',
    'WORDPRESS_SITE_URL', 'WORDPRESS_APP_USERNAME', 'WORDPRESS_APP_PASSWORD',
  ],
});
