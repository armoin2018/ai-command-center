/**
 * JSON format handler
 */

import type { FormatHandler } from '../types.js';

export const jsonHandler: FormatHandler = {
  name: 'json',
  extensions: ['json'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    const str = typeof data === 'string' ? data : data.toString('utf-8');
    return JSON.parse(str);
  },

  async serialize(data: any): Promise<string> {
    return JSON.stringify(data, null, 2);
  },

  detect(data: Buffer): boolean {
    try {
      const str = data.toString('utf-8').trim();
      return (str.startsWith('{') || str.startsWith('[')) && 
             (JSON.parse(str) !== undefined);
    } catch {
      return false;
    }
  },
};
