/**
 * Plugin registry for format handlers, compression handlers, and IO handlers
 */

import type {
  PluginRegistry,
  FormatHandler,
  CompressionHandler,
  IOHandler,
  DataFormat,
  CompressionFormat,
  IOSource,
} from './types.js';

// Import format handlers
import { jsonHandler } from './formats/json.js';
import { yamlHandler } from './formats/yaml.js';
import { xmlHandler } from './formats/xml.js';
import { csvHandler } from './formats/csv.js';
import { tsvHandler } from './formats/tsv.js';
import { parquetHandler } from './formats/parquet.js';
import { avroHandler } from './formats/avro.js';
import { orcHandler } from './formats/orc.js';
import { thriftHandler } from './formats/thrift.js';

// Import compression handlers
import { gzipHandler } from './compression/gzip.js';
import { zipHandler } from './compression/zip.js';
import { noneHandler } from './compression/none.js';

// Import IO handlers
import { fileHandler } from './io/file.js';
import { stdioHandler } from './io/stdio.js';
import { urlHandler } from './io/url.js';

class Registry implements PluginRegistry {
  formatHandlers: Map<DataFormat, FormatHandler> = new Map();
  compressionHandlers: Map<CompressionFormat, CompressionHandler> = new Map();
  ioHandlers: Map<IOSource, IOHandler> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // Register format handlers
    this.registerFormat(jsonHandler);
    this.registerFormat(yamlHandler);
    this.registerFormat(xmlHandler);
    this.registerFormat(csvHandler);
    this.registerFormat(tsvHandler);
    this.registerFormat(parquetHandler);
    this.registerFormat(avroHandler);
    this.registerFormat(orcHandler);
    this.registerFormat(thriftHandler);

    // Register compression handlers
    this.registerCompression(gzipHandler);
    this.registerCompression(zipHandler);
    this.registerCompression(noneHandler);

    // Register IO handlers
    this.registerIO(fileHandler);
    this.registerIO(stdioHandler);
    this.registerIO(urlHandler);
  }

  registerFormat(handler: FormatHandler): void {
    this.formatHandlers.set(handler.name, handler);
  }

  registerCompression(handler: CompressionHandler): void {
    this.compressionHandlers.set(handler.name, handler);
  }

  registerIO(handler: IOHandler): void {
    this.ioHandlers.set(handler.name, handler);
  }

  getFormat(name: DataFormat): FormatHandler | undefined {
    return this.formatHandlers.get(name);
  }

  getCompression(name: CompressionFormat): CompressionHandler | undefined {
    return this.compressionHandlers.get(name);
  }

  getIO(name: IOSource): IOHandler | undefined {
    return this.ioHandlers.get(name);
  }

  detectFormat(filename: string): DataFormat | undefined {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return undefined;

    for (const [, handler] of this.formatHandlers) {
      if (handler.extensions.includes(ext)) {
        return handler.name;
      }
    }
    return undefined;
  }

  detectCompression(filename: string): CompressionFormat {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'gz' || ext === 'gzip') return 'gzip';
    if (ext === 'zip') return 'zip';
    return 'none';
  }

  listFormats(): DataFormat[] {
    return Array.from(this.formatHandlers.keys());
  }

  listCompressions(): CompressionFormat[] {
    return Array.from(this.compressionHandlers.keys());
  }

  listIOHandlers(): IOSource[] {
    return Array.from(this.ioHandlers.keys());
  }
}

// Singleton instance
export const registry = new Registry();

// Export registration functions for extensibility
export function registerFormat(handler: FormatHandler): void {
  registry.registerFormat(handler);
}

export function registerCompression(handler: CompressionHandler): void {
  registry.registerCompression(handler);
}

export function registerIO(handler: IOHandler): void {
  registry.registerIO(handler);
}
