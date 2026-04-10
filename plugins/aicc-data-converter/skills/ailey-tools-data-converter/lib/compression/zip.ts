/**
 * Zip compression handler
 */

import { promisify } from 'util';
import { deflate, inflate } from 'zlib';
import { Transform } from 'stream';
import type { CompressionHandler } from '../types.js';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

export const zipHandler: CompressionHandler = {
  name: 'zip',
  extensions: ['zip'],

  async decompress(data: Buffer): Promise<Buffer> {
    // For simple single-file zip, use deflate
    // Full zip archive support would require additional library
    return inflateAsync(data);
  },

  async compress(data: Buffer): Promise<Buffer> {
    return deflateAsync(data);
  },

  createDecompressStream(): NodeJS.ReadWriteStream {
    return new Transform({
      async transform(chunk, encoding, callback) {
        try {
          const decompressed = await inflateAsync(chunk);
          callback(null, decompressed);
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  },

  createCompressStream(): NodeJS.ReadWriteStream {
    return new Transform({
      async transform(chunk, encoding, callback) {
        try {
          const compressed = await deflateAsync(chunk);
          callback(null, compressed);
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  },
};
