#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');
const { execSync } = require('child_process');

install({
  name: 'AI-ley Web Crawler Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  outputDirs: ['crawled', 'downloads', 'logs'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
  npmPackageChecks: ['puppeteer', 'cheerio', 'p-queue'],
  postInstall: async (ctx) => {
    ctx.log.section('Browser Setup');
    ctx.log.step('Downloading Chromium for Puppeteer...');
    try {
      execSync('npx puppeteer browsers install chrome', { cwd: ctx.cwd, stdio: 'pipe' });
      ctx.log.ok('Chromium downloaded');
    } catch (e) {
      ctx.log.warn('Could not download Chromium — Puppeteer may use system Chrome');
    }
  },
});
