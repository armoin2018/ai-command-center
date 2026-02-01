/**
 * No compression handler (passthrough)
 */

import { PassThrough } from 'stream';
import type { CompressionHandler } from '../types.js';

export const noneHandler: CompressionHandler = {
  name: 'none',
  extensions: [],

  async decompress(data: Buffer): Promise<Buffer> {
    return data;
  },

  async compress(data: Buffer): Promise<Buffer> {
    return data;
  },

  createDecompressStream(): NodeJS.ReadWriteStream {
    return new PassThrough();
  },

  createCompressStream(): NodeJS.ReadWriteStream {
    return new PassThrough();
  },
};
