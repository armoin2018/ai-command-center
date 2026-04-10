#!/usr/bin/env node
/**
 * Cross-platform setup script for aicc-business
 * Copies personas, instructions, and agents into workspace .github/ai-ley/
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
  // Copy persona categories into their respective directories
  const personaDirs = ['business', 'finance', 'c-suite', 'analyst'];
  for (const dir of personaDirs) {
    const src = path.join(PLUGIN_ROOT, 'personas', dir);
    const dest = path.join(ws, '.github', 'ai-ley', 'personas', dir);
    total += copyRecursive(src, dest);
  }
  // Copy instructions
  total += copyRecursive(path.join(PLUGIN_ROOT, 'instructions'), path.join(ws, '.github', 'ai-ley', 'instructions'));
  // Copy agents
  const agentNames = ['ailey-entrepreneur.agent.md', 'ailey-leader-panel.agent.md', 'ailey-patent-reviewer.agent.md'];
  for (const name of agentNames) {
    const src = path.join(PLUGIN_ROOT, 'agents', name);
    const dest = path.join(ws, '.github', 'agents', name);
    if (fs.existsSync(src)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      total++;
    }
  }
  if (total > 0) console.log(`  ✅ Installed ${total} Business resource(s) into workspace`);
} else {
  console.log('  ⚠️  Could not locate workspace root — skipping resource install');
}
