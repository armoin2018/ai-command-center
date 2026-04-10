#!/usr/bin/env node
/**
 * Shared environment setup utility for AICC plugins.
 * Cross-platform (macOS, Linux, Windows) — requires only Node.js.
 *
 * Usage as module:
 *   const { setup } = require('./setup-env');
 *   setup({ pluginName: 'aicc-slack', env: [...], sys: [...], pip: [...] });
 *
 * Usage as CLI:
 *   node setup-env.js --config '{"pluginName":"aicc-slack","env":[["SLACK_BOT_TOKEN","desc"]]}'
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

// ──────────────────────────────────────────────────────────
// .env file parser (no external deps)
// ──────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const vars = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

function loadEnv(pluginRoot) {
  // Walk up to find .env — check plugin root, then up to project root
  const candidates = [
    path.resolve(pluginRoot, '.env'),
    path.resolve(pluginRoot, '..', '.env'),
    path.resolve(pluginRoot, '..', '..', '.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const vars = parseEnvFile(envPath);
      // Load into process.env (don't overwrite existing)
      for (const [k, v] of Object.entries(vars)) {
        if (process.env[k] === undefined) {
          process.env[k] = v;
        }
      }
      return envPath;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────
// System dependency checks (cross-platform)
// ──────────────────────────────────────────────────────────

function commandExists(cmd) {
  try {
    if (isWindows) {
      execSync(`where ${cmd}`, { stdio: 'pipe' });
    } else {
      execSync(`command -v ${cmd}`, { stdio: 'pipe' });
    }
    return true;
  } catch {
    return false;
  }
}

function checkSystemDep(cmd, hints) {
  if (commandExists(cmd)) return true;
  const hintText = typeof hints === 'string' ? hints : getInstallHint(cmd, hints);
  console.warn(`⚠  Missing system dependency: ${cmd}`);
  if (hintText) console.warn(`   Install: ${hintText}`);
  return false;
}

function getInstallHint(cmd, hints) {
  if (typeof hints === 'string') return hints;
  if (!hints) return '';
  const platform = os.platform();
  if (platform === 'darwin' && hints.mac) return hints.mac;
  if (platform === 'linux' && hints.linux) return hints.linux;
  if (platform === 'win32' && hints.win) return hints.win;
  return hints.mac || hints.linux || hints.win || '';
}

// ──────────────────────────────────────────────────────────
// Python package checks (cross-platform)
// ──────────────────────────────────────────────────────────

function getPythonCmd() {
  // Windows often has 'python' not 'python3'
  if (commandExists('python3')) return 'python3';
  if (commandExists('python')) return 'python';
  return null;
}

function checkPipPackage(pkg, installHint) {
  const py = getPythonCmd();
  if (!py) {
    console.warn(`⚠  Python not found — cannot check for ${pkg}`);
    console.warn(`   Install Python 3.x first`);
    return false;
  }
  try {
    execSync(`${py} -c "import ${pkg}"`, { stdio: 'pipe' });
    return true;
  } catch {
    console.warn(`⚠  Missing Python package: ${pkg}`);
    console.warn(`   Install: ${installHint || `pip install ${pkg}`}`);
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// npm dependency installation (cross-platform)
// ──────────────────────────────────────────────────────────

function installNpmDeps(dir) {
  const pkgJson = path.join(dir, 'package.json');
  const nodeModules = path.join(dir, 'node_modules');
  if (fs.existsSync(pkgJson) && !fs.existsSync(nodeModules)) {
    console.log(`📦 Installing npm dependencies in ${path.relative(process.cwd(), dir) || dir}...`);
    try {
      execSync('npm install --silent', { cwd: dir, stdio: 'pipe' });
    } catch (e) {
      console.warn(`   npm install failed in ${dir}: ${e.message}`);
    }
  }
}

function installSkillDeps(pluginRoot) {
  const skillsDir = path.join(pluginRoot, 'skills');
  if (!fs.existsSync(skillsDir)) return;
  const skills = fs.readdirSync(skillsDir).filter((d) => {
    return fs.statSync(path.join(skillsDir, d)).isDirectory();
  });
  for (const skill of skills) {
    const scriptsDir = path.join(skillsDir, skill, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      installNpmDeps(scriptsDir);
    }
  }
}

// ──────────────────────────────────────────────────────────
// Environment variable checking
// ──────────────────────────────────────────────────────────

function checkEnvVars(envVars) {
  const missing = [];
  for (const [varName, desc] of envVars) {
    if (!process.env[varName]) {
      missing.push([varName, desc]);
    }
  }
  return missing;
}

function reportMissing(pluginName, missing, envFilePath) {
  if (missing.length === 0) return;
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${pluginName} — Missing Environment Variables`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  for (const [varName, desc] of missing) {
    if (desc) {
      console.log(`  ${varName}: ${desc}`);
    } else {
      console.log(`  ${varName}`);
    }
  }
  console.log('');
  if (envFilePath) {
    console.log(`  Add these to your .env file at: ${envFilePath}`);
  } else {
    console.log('  Add these to a .env file in your project root.');
  }
  console.log('  Or export them in your shell before using this plugin.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// ──────────────────────────────────────────────────────────
// Main setup function
// ──────────────────────────────────────────────────────────

/**
 * @param {Object} config
 * @param {string} config.pluginName - Plugin identifier (e.g. 'aicc-slack')
 * @param {string} [config.pluginRoot] - Absolute path to plugin root
 * @param {Array<[string, string]>} [config.env] - [[varName, description], ...]
 * @param {Array<[string, Object|string]>} [config.sys] - [[cmd, hints], ...]
 *   hints can be a string or { mac, linux, win }
 * @param {Array<[string, string]>} [config.pip] - [[package, installHint], ...]
 */
function setup(config) {
  const pluginRoot = config.pluginRoot || process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

  // 1. Load .env
  const envFilePath = loadEnv(pluginRoot);

  // 2. System dependency checks
  if (config.sys) {
    for (const [cmd, hints] of config.sys) {
      checkSystemDep(cmd, hints);
    }
  }

  // 3. Python package checks
  if (config.pip) {
    for (const [pkg, hint] of config.pip) {
      checkPipPackage(pkg, hint);
    }
  }

  // 4. npm dependency installation
  installSkillDeps(pluginRoot);

  // 5. Environment variable checks
  if (config.env && config.env.length > 0) {
    const missing = checkEnvVars(config.env);
    reportMissing(config.pluginName, missing, envFilePath);
  }
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

if (require.main === module) {
  // When run directly, expect config via --config JSON arg
  const args = process.argv.slice(2);
  const configIdx = args.indexOf('--config');
  if (configIdx !== -1 && args[configIdx + 1]) {
    try {
      const config = JSON.parse(args[configIdx + 1]);
      setup(config);
    } catch (e) {
      console.error('Failed to parse --config JSON:', e.message);
      process.exit(1);
    }
  } else {
    console.log('Usage: node setup-env.js --config \'{"pluginName":"name","env":[["VAR","desc"]]}\'');
  }
}

module.exports = { setup, loadEnv, checkSystemDep, checkPipPackage, installNpmDeps, installSkillDeps, commandExists, getPythonCmd };
