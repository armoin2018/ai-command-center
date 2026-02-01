/**
 * Standard IO handler (stdin/stdout)
 */

import type { IOHandler, ConversionOptions } from '../types.js';

export const stdioHandler: IOHandler = {
  name: 'stdio',

  async read(options: ConversionOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      process.stdin.on('data', (chunk) => {
        chunks.push(chunk);
      });

      process.stdin.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      process.stdin.on('error', reject);
    });
  },

  async write(data: Buffer | string, options: ConversionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const buffer = typeof data === 'string' ? Buffer.from(data) : data;

      process.stdout.write(buffer, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  },

  createReadStream(options: ConversionOptions): NodeJS.ReadableStream {
    return process.stdin;
  },

  createWriteStream(options: ConversionOptions): NodeJS.WritableStream {
    return process.stdout;
  },
};
