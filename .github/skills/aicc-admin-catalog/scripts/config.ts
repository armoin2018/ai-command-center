import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import Ajv from 'ajv';
import type { AgenticSystem, KitStructure } from './types.js';

// Load environment variables
dotenv.config();

const ajv = new Ajv();

export interface CatalogConfig {
  agenticSystem: AgenticSystem;
  gitCacheDir: string;
  maxRetryAttempts: number;
  retryBackoffBase: number;
  maxBackoffTime: number;
  verbose: boolean;
  dryRun: boolean;
  workspaceRoot: string;
  catalogBasePath: string;
  myBasePath: string;
  schemaPath: string;
}

/**
 * Get configuration from environment and defaults
 */
export function getConfig(): CatalogConfig {
  const workspaceRoot = process.cwd();
  
  return {
    agenticSystem: (process.env.AGENTIC_SYSTEM as AgenticSystem) || 'copilot',
    gitCacheDir: process.env.GIT_CACHE_DIR 
      ? path.resolve(process.env.GIT_CACHE_DIR.replace('~', os.homedir()))
      : (process.platform === 'win32'
        ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'vscode-cache')
        : path.join(os.homedir(), '.vscode', 'cache')),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    retryBackoffBase: parseInt(process.env.RETRY_BACKOFF_BASE || '2'),
    maxBackoffTime: parseInt(process.env.MAX_BACKOFF_TIME || '30'),
    verbose: process.env.VERBOSE === 'true',
    dryRun: process.env.DRY_RUN === 'true',
    workspaceRoot,
    catalogBasePath: path.join(workspaceRoot, '.github', 'aicc', 'catalog'),
    myBasePath: path.join(workspaceRoot, '.my', 'aicc', 'catalog'),
    schemaPath: path.join(workspaceRoot, '.github', 'aicc', 'schemas', 'structure.v1.schema.json'),
  };
}

/**
 * Validate kit structure against schema
 */
export async function validateKitStructure(structure: KitStructure, config: CatalogConfig): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    const schemaContent = await fs.readJSON(config.schemaPath);
    const validate = ajv.compile(schemaContent);
    const valid = validate(structure);
    
    if (!valid && validate.errors) {
      return {
        valid: false,
        errors: validate.errors.map(err => `${err.instancePath} ${err.message}`),
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [`Schema validation error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Load kit structure from file
 */
export async function loadKitStructure(structurePath: string, config: CatalogConfig): Promise<KitStructure> {
  const structure = await fs.readJSON(structurePath);
  
  // Validate against schema
  const validation = await validateKitStructure(structure, config);
  if (!validation.valid) {
    throw new Error(`Invalid kit structure: ${validation.errors?.join(', ')}`);
  }
  
  return structure;
}

/**
 * Save kit structure to file
 */
export async function saveKitStructure(structurePath: string, structure: KitStructure): Promise<void> {
  await fs.ensureDir(path.dirname(structurePath));
  await fs.writeJSON(structurePath, structure, { spaces: 2 });
}

/**
 * Load kit configuration values
 */
export async function loadKitConfig(configPath: string): Promise<Record<string, any>> {
  if (await fs.pathExists(configPath)) {
    return await fs.readJSON(configPath);
  }
  return {};
}

/**
 * Save kit configuration values
 */
export async function saveKitConfig(configPath: string, values: Record<string, any>): Promise<void> {
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJSON(configPath, values, { spaces: 2 });
}

/**
 * Get paths for a kit
 */
export function getKitPaths(kitName: string, config: CatalogConfig, custom: boolean = false) {
  const basePath = custom ? config.myBasePath : config.catalogBasePath;
  const kitPath = path.join(basePath, kitName);
  
  return {
    kitPath,
    structurePath: path.join(kitPath, 'structure.json'),
    configPath: path.join(config.myBasePath, kitName, 'config.json'),
    configValuesPath: path.join(config.myBasePath, kitName, 'config.values.json'),
    manifestPath: path.join(config.myBasePath, kitName, 'manifest.json'),
    iconPath: async (iconFile?: string) => {
      if (!iconFile) return undefined;
      const iconPath = path.join(kitPath, iconFile);
      return (await fs.pathExists(iconPath)) ? iconPath : undefined;
    },
  };
}

/**
 * Ensure required directories exist
 */
export async function ensureDirectories(config: CatalogConfig): Promise<void> {
  await fs.ensureDir(config.catalogBasePath);
  await fs.ensureDir(config.myBasePath);
  await fs.ensureDir(config.gitCacheDir);
}

/**
 * Check if agentic system matches supported systems
 */
export function isAgenticSupported(
  currentSystem: AgenticSystem,
  supported: AgenticSystem | AgenticSystem[] | undefined
): boolean {
  if (!supported) return true;
  if (supported === '*') return true;
  if (Array.isArray(supported)) {
    return supported.includes('*') || supported.includes(currentSystem);
  }
  return supported === currentSystem;
}
