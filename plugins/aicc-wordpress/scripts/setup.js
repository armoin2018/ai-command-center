#!/usr/bin/env node
/**
 * Cross-platform setup script for aicc-wordpress
 * - Checks environment variables for WordPress API access
 * - Copies personas to .github/ai-ley/personas/
 * - Copies instructions to .github/ai-ley/instructions/
 * - Copies agent to .github/agents/
 */
const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

// ── 1. Environment setup (delegates to shared setup-env) ──
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-wordpress",
  "env": [
    [
      "WORDPRESS_URL",
      "WordPress site URL"
    ],
    [
      "WORDPRESS_USER",
      "WordPress username"
    ],
    [
      "WORDPRESS_PASSWORD",
      "WordPress application password"
    ]
  ]
});

// ── 2. Copy personas, instructions, and agent into workspace ──

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

  // Personas → .github/ai-ley/personas/developer/
  const personasSrc = path.join(PLUGIN_ROOT, 'personas');
  const personasDest = path.join(ws, '.github', 'ai-ley', 'personas', 'developer');
  total += copyRecursive(personasSrc, personasDest);

  // Instructions → .github/ai-ley/instructions/
  const instrSrc = path.join(PLUGIN_ROOT, 'instructions');
  const instrDest = path.join(ws, '.github', 'ai-ley', 'instructions');
  total += copyRecursive(instrSrc, instrDest);

  // Agent → .github/agents/
  const agentSrc = path.join(PLUGIN_ROOT, 'agents', 'ailey-wordpress.agent.md');
  const agentDest = path.join(ws, '.github', 'agents', 'ailey-wordpress.agent.md');
  if (fs.existsSync(agentSrc)) {
    const agentDir = path.dirname(agentDest);
    if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });
    fs.copyFileSync(agentSrc, agentDest);
    total++;
  }

  if (total > 0) {
    console.log(`  ✅ Installed ${total} WordPress resource(s) into workspace`);
  }
} else {
  console.log('  ⚠️  Could not locate workspace root — skipping resource install');
}
