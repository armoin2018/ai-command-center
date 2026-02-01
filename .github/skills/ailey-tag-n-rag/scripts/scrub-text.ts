/**
 * Clean and normalize text
 * Removes junk words/phrases based on configuration
 */

import { promises as fs } from 'fs';
import * as path from 'path';

interface ReplacementConfig {
  replacements?: Array<{ pattern: string; replace: string }>;
  remove?: string[];
}

let configCache: ReplacementConfig | null = null;

export async function scrubText(text: string): Promise<string> {
  const config = await loadConfig();
  let scrubbed = text;

  // Apply regex replacements
  if (config.replacements) {
    for (const { pattern, replace } of config.replacements) {
      const regex = new RegExp(pattern, 'g');
      scrubbed = scrubbed.replace(regex, replace);
    }
  }

  // Remove junk phrases
  if (config.remove) {
    for (const phrase of config.remove) {
      scrubbed = scrubbed.replace(new RegExp(phrase, 'gi'), '');
    }
  }

  // Normalize whitespace
  scrubbed = scrubbed.replace(/\s+/g, ' ').trim();

  return scrubbed;
}

async function loadConfig(): Promise<ReplacementConfig> {
  if (configCache) return configCache;

  const configs: ReplacementConfig[] = [];

  // Load global config
  const globalPath = path.join(process.cwd(), '.github/ai-ley/config/rag-replacements.json');
  try {
    const content = await fs.readFile(globalPath, 'utf-8');
    configs.push(JSON.parse(content));
  } catch (error) {
    // Global config is optional
  }

  // Load user config (overrides)
  const userPath = path.join(process.cwd(), '.my/ai-ley/config/rag-replacements.json');
  try {
    const content = await fs.readFile(userPath, 'utf-8');
    configs.push(JSON.parse(content));
  } catch (error) {
    // User config is optional
  }

  // Merge configs
  configCache = {
    replacements: configs.flatMap(c => c.replacements || []),
    remove: configs.flatMap(c => c.remove || [])
  };

  return configCache;
}
