/**
 * Thrift format handler
 * 
 * Note: Thrift requires schema definitions. This is a placeholder
 * for custom Thrift implementations. Full support requires schema files.
 */

import type { FormatHandler } from '../types.js';

export const thriftHandler: FormatHandler = {
  name: 'thrift',
  extensions: ['thrift'],
  canRead: false,
  canWrite: false,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    throw new Error(
      'Thrift format requires schema definitions. ' +
      'Please implement a custom handler with your Thrift schema. ' +
      'See references/extending-handlers.md for details.'
    );
  },

  async serialize(data: any): Promise<Buffer> {
    throw new Error(
      'Thrift format requires schema definitions. ' +
      'Please implement a custom handler with your Thrift schema. ' +
      'See references/extending-handlers.md for details.'
    );
  },

  detect(data: Buffer): boolean {
    // Thrift binary protocol detection is schema-dependent
    return false;
  },
};
