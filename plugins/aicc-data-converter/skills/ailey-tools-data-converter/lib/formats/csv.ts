/**
 * CSV format handler
 */

import Papa from 'papaparse';
import type { FormatHandler } from '../types.js';

export const csvHandler: FormatHandler = {
  name: 'csv',
  extensions: ['csv'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: false,

  async parse(data: Buffer | string): Promise<any> {
    const str = typeof data === 'string' ? data : data.toString('utf-8');
    
    const result = Papa.parse(str, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      throw new Error(`CSV parse errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  },

  async serialize(data: any): Promise<string> {
    // Convert hierarchical data to flat if needed
    const flatData = Array.isArray(data) ? data : [data];
    
    return Papa.unparse(flatData, {
      header: true,
      newline: '\n',
    });
  },

  detect(data: Buffer): boolean {
    try {
      const str = data.toString('utf-8').trim();
      // Simple CSV detection - contains commas and no XML/JSON markers
      return str.includes(',') && !str.startsWith('<') && !str.startsWith('{');
    } catch {
      return false;
    }
  },
};
