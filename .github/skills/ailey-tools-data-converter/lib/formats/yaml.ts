/**
 * YAML format handler
 */

import yaml from 'js-yaml';
import type { FormatHandler } from '../types.js';

export const yamlHandler: FormatHandler = {
  name: 'yaml',
  extensions: ['yaml', 'yml'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    const str = typeof data === 'string' ? data : data.toString('utf-8');
    return yaml.load(str);
  },

  async serialize(data: any): Promise<string> {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
  },

  detect(data: Buffer): boolean {
    try {
      const str = data.toString('utf-8').trim();
      // Basic YAML detection - contains key: value or starts with ---
      return str.includes(':') || str.startsWith('---');
    } catch {
      return false;
    }
  },
};
