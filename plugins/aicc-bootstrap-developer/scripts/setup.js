#!/usr/bin/env node
/**
 * Cross-platform setup script for aicc-bootstrap-developer
 * Copies personas, instructions, and agent into workspace .github/ai-ley/
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
  total += copyRecursive(path.join(PLUGIN_ROOT, 'personas'), path.join(ws, '.github', 'ai-ley', 'personas', 'experts'));
  total += copyRecursive(path.join(PLUGIN_ROOT, 'instructions'), path.join(ws, '.github', 'ai-ley', 'instructions'));
  const agentSrc = path.join(PLUGIN_ROOT, 'agents', 'ailey-bootstrap-developer.agent.md');
  const agentDest = path.join(ws, '.github', 'agents', 'ailey-bootstrap-developer.agent.md');
  if (fs.existsSync(agentSrc)) {
    const agentDir = path.dirname(agentDest);
    if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });
    fs.copyFileSync(agentSrc, agentDest);
    total++;
  }
  if (total > 0) console.log(`  ✅ Installed ${total} Bootstrap Developer resource(s) into workspace`);
} else {
  console.log('  ⚠️  Could not locate workspace root — skipping resource install');
}
