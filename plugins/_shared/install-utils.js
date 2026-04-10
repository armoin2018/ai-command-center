#!/usr/bin/env node
/**
 * Shared cross-platform install utility for AICC plugin skills.
 * Works on macOS, Linux, and Windows — requires only Node.js.
 *
 * Usage:
 *   const { install } = require('../../_shared/install-utils');
 *   install({
 *     name: 'My Skill',
 *     nodeVersion: 18,
 *     npmVersion: 9,          // optional
 *     npmInstall: true,
 *     build: true,
 *     envSetup: true,
 *     envVars: ['VAR1', 'VAR2'],
 *     outputDirs: ['output', 'logs'],
 *     buildVerify: ['dist/index.js', 'dist/cli.js'],
 *     systemChecks: [['chroma', 'ChromaDB CLI — pip install chromadb']],
 *     npmPackageChecks: ['puppeteer', 'cheerio'],
 *     postInstall: async (ctx) => { ... },
 *   });
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

// ──────────────────────────────────────────────────────────
// Cross-platform helpers
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

function getVersion(cmd, parseArgs) {
  try {
    const raw = execSync(`${cmd} ${parseArgs || '-v'}`, { stdio: 'pipe', encoding: 'utf8' }).trim();
    return raw;
  } catch {
    return null;
  }
}

function getMajorVersion(versionStr) {
  if (!versionStr) return 0;
  const match = versionStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function mkdirSafe(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

function copyFileSafe(src, dest) {
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkEnvVar(envPath, varName) {
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (key !== varName) continue;
    const val = trimmed.slice(eqIdx + 1).trim();
    // Not configured if empty, placeholder, or "your_*"
    if (!val || val.startsWith('your_') || val === '""' || val === "''") return false;
    return true;
  }
  return false;
}

function npmPackageInstalled(packageName, cwd) {
  try {
    execSync(`npm list ${packageName}`, { cwd: cwd || process.cwd(), stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// Logging helpers (work on all platforms including Windows)
// ──────────────────────────────────────────────────────────

const log = {
  ok: (msg) => console.log(`  ✓ ${msg}`),
  fail: (msg) => console.error(`  ✗ ${msg}`),
  warn: (msg) => console.log(`  ⚠ ${msg}`),
  info: (msg) => console.log(`  ℹ ${msg}`),
  step: (msg) => console.log(`  → ${msg}`),
  header: (title) => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`    ${title}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  },
  section: (title) => {
    console.log('');
    console.log(`── ${title} ──`);
  },
  success: (title) => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`    ${title}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  },
};

// ──────────────────────────────────────────────────────────
// Main install function
// ──────────────────────────────────────────────────────────

/**
 * @param {Object} config
 * @param {string} config.name - Display name (e.g. 'Google Gemini AI-ley Skill')
 * @param {number} [config.nodeVersion=18] - Minimum Node.js major version
 * @param {number} [config.npmVersion] - Minimum npm major version (optional)
 * @param {boolean} [config.npmInstall=true] - Run npm install
 * @param {boolean} [config.build=true] - Run npm run build
 * @param {boolean} [config.envSetup=true] - Copy .env.example → .env if missing
 * @param {string[]} [config.envVars] - Environment variable names to check
 * @param {string[]} [config.outputDirs] - Output directories to create
 * @param {string[]} [config.buildVerify] - Files that should exist after build
 * @param {Array<[string, string]>} [config.systemChecks] - [[cmd, hint], ...] system tools to check
 * @param {string[]} [config.npmPackageChecks] - npm packages to verify after install
 * @param {Function} [config.postInstall] - Custom async function(ctx) called after standard steps
 * @param {string} [config.cwd] - Working directory (defaults to script's dir)
 */
async function install(config) {
  const cwd = config.cwd || process.cwd();
  const minNode = config.nodeVersion || 18;
  const envPath = path.join(cwd, '.env');
  const envExamplePath = path.join(cwd, '.env.example');
  let errors = 0;

  log.header(`${config.name} Installation`);

  // ─── Node.js version ───────────────────────────────────
  log.step('Checking Node.js version...');
  if (!commandExists('node')) {
    log.fail('Node.js not found');
    log.info(`Install from: https://nodejs.org/ (v${minNode}+ required)`);
    process.exit(1);
  }
  const nodeVer = getVersion('node', '-v');
  const nodeMajor = getMajorVersion(nodeVer);
  if (nodeMajor < minNode) {
    log.fail(`Node.js v${minNode}+ required (found ${nodeVer})`);
    process.exit(1);
  }
  log.ok(`Node.js ${nodeVer}`);

  // ─── npm version ───────────────────────────────────────
  log.step('Checking npm...');
  if (!commandExists('npm')) {
    log.fail('npm not found');
    process.exit(1);
  }
  const npmVer = getVersion('npm', '-v');
  log.ok(`npm v${npmVer}`);

  if (config.npmVersion) {
    const npmMajor = getMajorVersion(npmVer);
    if (npmMajor < config.npmVersion) {
      log.fail(`npm v${config.npmVersion}+ required (found v${npmVer})`);
      log.info('Upgrade: npm install -g npm@latest');
      process.exit(1);
    }
  }

  // ─── npm install ───────────────────────────────────────
  if (config.npmInstall !== false) {
    log.section('Installing Dependencies');
    log.step('Running npm install...');
    try {
      execSync('npm install', { cwd, stdio: 'pipe' });
      log.ok('Dependencies installed');
    } catch (e) {
      log.fail('npm install failed');
      console.error(e.stderr ? e.stderr.toString() : e.message);
      process.exit(1);
    }
  }

  // ─── TypeScript build ──────────────────────────────────
  if (config.build !== false) {
    log.section('Building TypeScript');
    log.step('Compiling...');
    try {
      execSync('npm run build', { cwd, stdio: 'pipe' });
      log.ok('Build successful');
    } catch (e) {
      log.fail('Build failed');
      console.error(e.stderr ? e.stderr.toString() : e.message);
      process.exit(1);
    }
  }

  // ─── .env setup ────────────────────────────────────────
  if (config.envSetup !== false) {
    log.section('Environment Setup');
    if (copyFileSafe(envExamplePath, envPath)) {
      log.ok('Created .env from .env.example');
      log.info('Edit .env with your credentials');
    } else if (fileExists(envPath)) {
      log.info('.env already exists');
    } else if (!fileExists(envExamplePath)) {
      log.info('No .env.example found — skipping');
    }
  }

  // ─── Output directories ────────────────────────────────
  if (config.outputDirs && config.outputDirs.length > 0) {
    log.section('Output Directories');
    for (const dir of config.outputDirs) {
      const fullPath = path.join(cwd, dir);
      if (mkdirSafe(fullPath)) {
        log.ok(`Created ${dir}/`);
      } else {
        log.info(`${dir}/ already exists`);
      }
    }
  }

  // ─── System tool checks ────────────────────────────────
  if (config.systemChecks && config.systemChecks.length > 0) {
    log.section('System Dependencies');
    for (const [cmd, hint] of config.systemChecks) {
      if (commandExists(cmd)) {
        log.ok(`${cmd} installed`);
      } else {
        log.warn(`${cmd} not found`);
        if (hint) log.info(`Install: ${hint}`);
        errors++;
      }
    }
  }

  // ─── npm package verification ──────────────────────────
  if (config.npmPackageChecks && config.npmPackageChecks.length > 0) {
    log.section('Package Verification');
    for (const pkg of config.npmPackageChecks) {
      if (npmPackageInstalled(pkg, cwd)) {
        log.ok(`${pkg} installed`);
      } else {
        log.fail(`${pkg} not installed`);
        errors++;
      }
    }
  }

  // ─── Build output verification ─────────────────────────
  if (config.buildVerify && config.buildVerify.length > 0) {
    log.section('Build Verification');
    for (const file of config.buildVerify) {
      const fullPath = path.join(cwd, file);
      if (fileExists(fullPath)) {
        log.ok(file);
      } else {
        log.fail(`${file} missing`);
        errors++;
      }
    }
  }

  // ─── Environment variable diagnostics ──────────────────
  if (config.envVars && config.envVars.length > 0) {
    log.section('Environment Variables');
    let missingVars = 0;
    for (const varName of config.envVars) {
      if (checkEnvVar(envPath, varName)) {
        log.ok(varName);
      } else {
        log.fail(`${varName} (not configured)`);
        missingVars++;
      }
    }
    if (missingVars > 0) {
      log.info(`Configure ${missingVars} variable(s) in .env`);
    }
  }

  // ─── Custom post-install steps ─────────────────────────
  if (config.postInstall) {
    const ctx = { cwd, envPath, log, commandExists, execSync, fileExists, mkdirSafe };
    await config.postInstall(ctx);
  }

  // ─── Summary ───────────────────────────────────────────
  if (errors === 0) {
    log.success('Installation Complete!');
  } else {
    console.log('');
    log.warn(`Installation finished with ${errors} warning(s)`);
    console.log('');
  }
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

if (require.main === module) {
  console.log('This module is designed to be required by individual install.js scripts.');
  console.log('Usage: const { install } = require("../../_shared/install-utils");');
}

module.exports = { install, commandExists, getVersion, getMajorVersion, mkdirSafe, copyFileSafe, fileExists, checkEnvVar, npmPackageInstalled, log };
