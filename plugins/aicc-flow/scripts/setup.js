#!/usr/bin/env node
/**
 * Cross-platform setup script for aicc-flow
 * Copies flow diagrams into workspace .github/ai-ley/flows/
 */
const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

function findWorkspaceRoot() {
  let dir = PLUGIN_ROOT;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.github'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return 0;
  let count = 0;
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      count += copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    count++;
  }
  return count;
}

const ws = findWorkspaceRoot();
if (ws) {
  let total = 0;
  // Copy flow diagrams
  total += copyRecursive(path.join(PLUGIN_ROOT, 'flows'), path.join(ws, '.github', 'ai-ley', 'flows'));
  if (total > 0) console.log(`  ✅ Installed ${total} Flow resource(s) into workspace`);
} else {
  console.log('  ⚠️  Could not locate workspace root — skipping resource install');
}
