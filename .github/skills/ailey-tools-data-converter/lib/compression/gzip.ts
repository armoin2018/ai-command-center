/**
 * Gzip compression handler
 */

import { createGzip, createGunzip } from 'zlib';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import type { CompressionHandler } from '../types.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const gzipHandler: CompressionHandler = {
  name: 'gzip',
  extensions: ['gz', 'gzip'],

  async decompress(data: Buffer): Promise<Buffer> {
    return gunzipAsync(data);
  },

  async compress(data: Buffer): Promise<Buffer> {
    return gzipAsync(data);
  },

  createDecompressStream(): NodeJS.ReadWriteStream {
    return createGunzip();
  },

  createCompressStream(): NodeJS.ReadWriteStream {
    return createGzip();
  },
};
