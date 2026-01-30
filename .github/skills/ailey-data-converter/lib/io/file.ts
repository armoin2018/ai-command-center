/**
 * File IO handler
 */

import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import type { IOHandler, ConversionOptions } from '../types.js';

export const fileHandler: IOHandler = {
  name: 'file',

  async read(options: ConversionOptions): Promise<Buffer> {
    if (!options.inputPath) {
      throw new Error('Input path required for file IO');
    }
    return fs.readFile(options.inputPath);
  },

  async write(data: Buffer | string, options: ConversionOptions): Promise<void> {
    if (!options.outputPath) {
      throw new Error('Output path required for file IO');
    }

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;

    if (options.append) {
      await fs.appendFile(options.outputPath, buffer);
    } else {
      await fs.writeFile(options.outputPath, buffer);
    }
  },

  createReadStream(options: ConversionOptions): NodeJS.ReadableStream {
    if (!options.inputPath) {
      throw new Error('Input path required for file IO');
    }
    return createReadStream(options.inputPath);
  },

  createWriteStream(options: ConversionOptions): NodeJS.WritableStream {
    if (!options.outputPath) {
      throw new Error('Output path required for file IO');
    }
    return createWriteStream(options.outputPath, {
      flags: options.append ? 'a' : 'w',
    });
  },
};
