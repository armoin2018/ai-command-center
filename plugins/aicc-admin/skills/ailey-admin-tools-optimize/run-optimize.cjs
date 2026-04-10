#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');

const skillDir = path.resolve(__dirname);
const args = process.argv.slice(2);
const target = args[0] || 'instructions';

try {
  execSync(`npm run optimize ${target}`, { cwd: skillDir, stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
