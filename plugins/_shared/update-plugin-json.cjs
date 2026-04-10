#!/usr/bin/env node
/**
 * Update all plugin.json files with:
 *  - dependencies array using format "pluginName:version+" or "pluginName:latest"
 *  - author: { name: "Armoin, LLC", email: "blaine@armoin.com" }
 *  - icon: "icon.png"
 *
 * Updates BOTH root plugin.json AND .claude-plugin/plugin.json for each plugin.
 */

const fs = require('fs');
const path = require('path');

const pluginsDir = path.resolve(__dirname, '..');

// ─── Dependency map ──────────────────────────────────────
// Format: pluginName → ["dep:version+", ...]
// aicc-core is the foundation — everything depends on it
// Some plugins have logical cross-dependencies

const DEPS = {
  'aicc-core':           [],  // Foundation — no deps
  'aicc-admin':          ['aicc-core:1.0.0+'],  // Admin toolkit
  'aicc-amazon':         ['aicc-core:1.0.0+'],
  'aicc-audio':          ['aicc-core:1.0.0+'],
  'aicc-bootstrap-developer': ['aicc-core:1.0.0+', 'aicc-css-developer:1.0.0+'],
  'aicc-business':       ['aicc-core:1.0.0+'],
  'aicc-calendly':       ['aicc-core:1.0.0+'],
  'aicc-canva':          ['aicc-core:1.0.0+'],
  'aicc-capcut':         ['aicc-core:1.0.0+'],
  'aicc-confluence':     ['aicc-core:1.0.0+'],
  'aicc-css-developer':  ['aicc-core:1.0.0+'],
  'aicc-data-converter': ['aicc-core:1.0.0+'],
  'aicc-discord':        ['aicc-core:1.0.0+'],
  'aicc-diskimager':     ['aicc-core:1.0.0+'],
  'aicc-email':          ['aicc-core:1.0.0+'],
  'aicc-esp-manager':    ['aicc-core:1.0.0+'],
  'aicc-etsy':           ['aicc-core:1.0.0+'],
  'aicc-facebook':       ['aicc-core:1.0.0+'],
  'aicc-flow':           ['aicc-core:1.0.0+'],
  'aicc-game-development': ['aicc-core:1.0.0+'],
  'aicc-gamma':          ['aicc-core:1.0.0+'],
  'aicc-gemini':         ['aicc-core:1.0.0+'],
  'aicc-image':          ['aicc-core:1.0.0+'],
  'aicc-instagram':      ['aicc-core:1.0.0+', 'aicc-facebook:1.0.0+'],
  'aicc-jira':           ['aicc-core:1.0.0+'],
  'aicc-kafka':          ['aicc-core:1.0.0+'],
  'aicc-linkedin':       ['aicc-core:1.0.0+'],
  'aicc-mailchimp':      ['aicc-core:1.0.0+'],
  'aicc-marketing':      ['aicc-core:1.0.0+'],
  'aicc-meetup':         ['aicc-core:1.0.0+'],
  'aicc-model':          ['aicc-core:1.0.0+'],
  'aicc-mysql-developer': ['aicc-core:1.0.0+'],
  'aicc-openai':         ['aicc-core:1.0.0+'],
  'aicc-outlook':        ['aicc-core:1.0.0+'],
  'aicc-php-developer':  ['aicc-core:1.0.0+'],
  'aicc-rag':            ['aicc-core:1.0.0+'],
  'aicc-reddit':         ['aicc-core:1.0.0+'],
  'aicc-salesforce':     ['aicc-core:1.0.0+'],
  'aicc-seo-report':     ['aicc-core:1.0.0+', 'aicc-web-crawl:1.0.0+'],
  'aicc-sharepoint':     ['aicc-core:1.0.0+'],
  'aicc-slack':          ['aicc-core:1.0.0+'],
  'aicc-speechify':      ['aicc-core:1.0.0+'],
  'aicc-teams':          ['aicc-core:1.0.0+'],
  'aicc-threads':        ['aicc-core:1.0.0+'],
  'aicc-tiktok':         ['aicc-core:1.0.0+'],
  'aicc-timetap':        ['aicc-core:1.0.0+'],
  'aicc-translator':     ['aicc-core:1.0.0+'],
  'aicc-twilio':         ['aicc-core:1.0.0+'],
  'aicc-twitter':        ['aicc-core:1.0.0+'],
  'aicc-video':          ['aicc-core:1.0.0+'],
  'aicc-vonage':         ['aicc-core:1.0.0+'],
  'aicc-web-crawl':      ['aicc-core:1.0.0+'],
  'aicc-whatsapp':       ['aicc-core:1.0.0+'],
  'aicc-woocommerce':    ['aicc-core:1.0.0+'],
  'aicc-wordpress':      ['aicc-core:1.0.0+', 'aicc-php-developer:1.0.0+', 'aicc-mysql-developer:1.0.0+', 'aicc-bootstrap-developer:1.0.0+'],
  'aicc-youtube':        ['aicc-core:1.0.0+'],
  'aicc-zoom':           ['aicc-core:1.0.0+'],
};

const AUTHOR = { name: 'Armoin, LLC', email: 'blaine@armoin.com' };

// ─── Update function ─────────────────────────────────────

function updatePluginJson(filePath, pluginName) {
  if (!fs.existsSync(filePath)) return false;
  
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  
  // Set author
  json.author = AUTHOR;
  
  // Set icon
  json.icon = 'icon.png';
  
  // Set dependencies
  json.dependencies = DEPS[pluginName] || ['aicc-core:1.0.0+'];
  
  // Write back with consistent formatting
  const ordered = {};
  // Preserve field order: name, version, description, author, icon, license, keywords, dependencies
  if (json.name) ordered.name = json.name;
  if (json.version) ordered.version = json.version;
  if (json.description) ordered.description = json.description;
  ordered.author = json.author;
  ordered.icon = json.icon;
  if (json.license) ordered.license = json.license;
  if (json.keywords) ordered.keywords = json.keywords;
  ordered.dependencies = json.dependencies;
  
  fs.writeFileSync(filePath, JSON.stringify(ordered, null, 2) + '\n');
  return true;
}

// ─── Main ────────────────────────────────────────────────

const dirs = fs.readdirSync(pluginsDir).filter(d => {
  return d.startsWith('aicc-') && fs.statSync(path.join(pluginsDir, d)).isDirectory();
}).sort();

let updated = 0;
for (const dir of dirs) {
  const rootJson = path.join(pluginsDir, dir, 'plugin.json');
  const claudeJson = path.join(pluginsDir, dir, '.claude-plugin', 'plugin.json');
  
  if (updatePluginJson(rootJson, dir)) {
    console.log(`✓ ${dir}/plugin.json`);
    updated++;
  }
  if (updatePluginJson(claudeJson, dir)) {
    console.log(`✓ ${dir}/.claude-plugin/plugin.json`);
    updated++;
  }
}

console.log(`\nUpdated ${updated} plugin.json files across ${dirs.length} plugins`);
