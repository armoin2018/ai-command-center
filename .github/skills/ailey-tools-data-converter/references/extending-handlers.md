# Extending AI-ley Data Converter

This guide shows how to extend the data converter with custom handlers for formats, compression algorithms, and IO sources.

## Table of Contents

- [Format Handlers](#format-handlers)
- [Compression Handlers](#compression-handlers)
- [IO Handlers](#io-handlers)
- [Registering Plugins](#registering-plugins)
- [Examples](#examples)

## Format Handlers

Format handlers parse and serialize data between different formats.

### Interface

```typescript
interface FormatHandler {
  name: DataFormat;
  extensions: string[];
  canRead: boolean;
  canWrite: boolean;
  supportsHierarchical: boolean;
  
  parse(data: Buffer | string): Promise<any>;
  serialize(data: any): Promise<Buffer | string>;
  detect?(data: Buffer): boolean;
}
```

### Example: Protocol Buffers Handler

```typescript
// lib/formats/protobuf.ts
import protobuf from 'protobufjs';
import type { FormatHandler } from '../types.js';

export const protobufHandler: FormatHandler = {
  name: 'protobuf' as any, // Extend DataFormat type
  extensions: ['proto', 'pb'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    // Load your .proto schema
    const root = await protobuf.load('schema.proto');
    const MessageType = root.lookupType('your.package.Message');
    
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    const message = MessageType.decode(buffer);
    
    return MessageType.toObject(message);
  },

  async serialize(data: any): Promise<Buffer> {
    const root = await protobuf.load('schema.proto');
    const MessageType = root.lookupType('your.package.Message');
    
    const errMsg = MessageType.verify(data);
    if (errMsg) throw new Error(errMsg);
    
    const message = MessageType.create(data);
    return MessageType.encode(message).finish();
  },

  detect(data: Buffer): boolean {
    // Protobuf detection logic
    try {
      // Attempt to parse as protobuf
      return true;
    } catch {
      return false;
    }
  },
};
```

### Example: TOML Handler

```typescript
// lib/formats/toml.ts
import TOML from '@iarna/toml';
import type { FormatHandler } from '../types.js';

export const tomlHandler: FormatHandler = {
  name: 'toml' as any,
  extensions: ['toml'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    const str = typeof data === 'string' ? data : data.toString('utf-8');
    return TOML.parse(str);
  },

  async serialize(data: any): Promise<string> {
    return TOML.stringify(data);
  },

  detect(data: Buffer): boolean {
    const str = data.toString('utf-8').trim();
    // TOML often starts with [section] or key = value
    return /^\[/.test(str) || /^[\w-]+ = /.test(str);
  },
};
```

## Compression Handlers

Compression handlers compress and decompress data with streaming support.

### Interface

```typescript
interface CompressionHandler {
  name: CompressionFormat;
  extensions: string[];
  
  decompress(data: Buffer): Promise<Buffer>;
  compress(data: Buffer): Promise<Buffer>;
  createDecompressStream(): NodeJS.ReadWriteStream;
  createCompressStream(): NodeJS.ReadWriteStream;
}
```

### Example: Brotli Handler

```typescript
// lib/compression/brotli.ts
import { brotliCompress, brotliDecompress, createBrotliCompress, createBrotliDecompress } from 'zlib';
import { promisify } from 'util';
import type { CompressionHandler } from '../types.js';

const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);

export const brotliHandler: CompressionHandler = {
  name: 'brotli' as any, // Extend CompressionFormat type
  extensions: ['br'],

  async decompress(data: Buffer): Promise<Buffer> {
    return brotliDecompressAsync(data);
  },

  async compress(data: Buffer): Promise<Buffer> {
    return brotliCompressAsync(data);
  },

  createDecompressStream(): NodeJS.ReadWriteStream {
    return createBrotliDecompress();
  },

  createCompressStream(): NodeJS.ReadWriteStream {
    return createBrotliCompress();
  },
};
```

### Example: LZ4 Handler

```typescript
// lib/compression/lz4.ts
import lz4 from 'lz4';
import { Transform } from 'stream';
import type { CompressionHandler } from '../types.js';

export const lz4Handler: CompressionHandler = {
  name: 'lz4' as any,
  extensions: ['lz4'],

  async decompress(data: Buffer): Promise<Buffer> {
    return lz4.decode(data);
  },

  async compress(data: Buffer): Promise<Buffer> {
    return lz4.encode(data);
  },

  createDecompressStream(): NodeJS.ReadWriteStream {
    return new Transform({
      transform(chunk, encoding, callback) {
        try {
          const decoded = lz4.decode(chunk);
          callback(null, decoded);
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  },

  createCompressStream(): NodeJS.ReadWriteStream {
    return new Transform({
      transform(chunk, encoding, callback) {
        try {
          const encoded = lz4.encode(chunk);
          callback(null, encoded);
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  },
};
```

## IO Handlers

IO handlers manage reading from and writing to different sources.

### Interface

```typescript
interface IOHandler {
  name: IOSource;
  
  read(options: ConversionOptions): Promise<Buffer>;
  write(data: Buffer | string, options: ConversionOptions): Promise<void>;
  createReadStream?(options: ConversionOptions): NodeJS.ReadableStream;
  createWriteStream?(options: ConversionOptions): NodeJS.WritableStream;
}
```

### Example: S3 Handler

```typescript
// lib/io/s3.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { IOHandler, ConversionOptions } from '../types.js';

export const s3Handler: IOHandler = {
  name: 's3' as any, // Extend IOSource type

  async read(options: ConversionOptions): Promise<Buffer> {
    const s3 = new S3Client({});
    
    // Parse s3://bucket/key from inputPath or inputURL
    const url = options.inputURL || options.inputPath || '';
    const match = url.match(/s3:\/\/([^/]+)\/(.*)/);
    
    if (!match) {
      throw new Error('Invalid S3 URL format. Use: s3://bucket/key');
    }

    const [, bucket, key] = match;
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3.send(command);
    const stream = response.Body as any;
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  },

  async write(data: Buffer | string, options: ConversionOptions): Promise<void> {
    const s3 = new S3Client({});
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    const url = options.outputPath || '';
    const match = url.match(/s3:\/\/([^/]+)\/(.*)/);
    
    if (!match) {
      throw new Error('Invalid S3 URL format. Use: s3://bucket/key');
    }

    const [, bucket, key] = match;
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
    });

    await s3.send(command);
  },
};
```

### Example: Database Handler

```typescript
// lib/io/database.ts
import { Client } from 'pg'; // PostgreSQL example
import type { IOHandler, ConversionOptions } from '../types.js';

export const databaseHandler: IOHandler = {
  name: 'database' as any,

  async read(options: ConversionOptions): Promise<Buffer> {
    const client = new Client({
      connectionString: options.inputURL,
    });

    await client.connect();
    
    try {
      // Query is passed in inputPath or custom field
      const query = options.inputPath || 'SELECT * FROM data';
      const result = await client.query(query);
      
      // Return as JSON
      const json = JSON.stringify(result.rows, null, 2);
      return Buffer.from(json);
    } finally {
      await client.end();
    }
  },

  async write(data: Buffer | string, options: ConversionOptions): Promise<void> {
    const client = new Client({
      connectionString: options.outputPath,
    });

    await client.connect();
    
    try {
      // Parse data as JSON and insert
      const str = typeof data === 'string' ? data : data.toString('utf-8');
      const records = JSON.parse(str);
      
      // Assuming array of records
      if (Array.isArray(records)) {
        for (const record of records) {
          const keys = Object.keys(record);
          const values = Object.values(record);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          const query = `
            INSERT INTO data (${keys.join(', ')})
            VALUES (${placeholders})
            ${options.append ? 'ON CONFLICT DO NOTHING' : ''}
          `;
          
          await client.query(query, values);
        }
      }
    } finally {
      await client.end();
    }
  },
};
```

## Registering Plugins

### Option 1: Direct Registration

```typescript
// my-converter.ts
import { registerFormat, registerCompression, registerIO } from './lib/registry.js';
import { protobufHandler } from './lib/formats/protobuf.js';
import { brotliHandler } from './lib/compression/brotli.js';
import { s3Handler } from './lib/io/s3.js';

// Register custom handlers
registerFormat(protobufHandler);
registerCompression(brotliHandler);
registerIO(s3Handler);

// Now use the converter with your custom handlers
import { convert } from './scripts/convert.js';
```

### Option 2: Extend Type Definitions

```typescript
// types-extended.ts
import type { DataFormat, CompressionFormat, IOSource } from './lib/types.js';

// Extend types
declare module './lib/types.js' {
  interface DataFormat {
    protobuf: 'protobuf';
    toml: 'toml';
  }
  
  interface CompressionFormat {
    brotli: 'brotli';
    lz4: 'lz4';
  }
  
  interface IOSource {
    s3: 's3';
    database: 'database';
  }
}
```

### Option 3: Plugin Directory

Create a `plugins/` directory and auto-load:

```typescript
// lib/plugin-loader.ts
import { promises as fs } from 'fs';
import path from 'path';
import { registerFormat, registerCompression, registerIO } from './registry.js';

export async function loadPlugins(pluginDir: string): Promise<void> {
  const files = await fs.readdir(pluginDir);
  
  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
    
    const modulePath = path.join(pluginDir, file);
    const module = await import(modulePath);
    
    // Auto-register based on export names
    if (module.formatHandler) registerFormat(module.formatHandler);
    if (module.compressionHandler) registerCompression(module.compressionHandler);
    if (module.ioHandler) registerIO(module.ioHandler);
  }
}
```

## Examples

### Complete Custom Handler

See the included format handlers for complete examples:

- JSON: [lib/formats/json.ts](../lib/formats/json.ts)
- YAML: [lib/formats/yaml.ts](../lib/formats/yaml.ts)
- Parquet: [lib/formats/parquet.ts](../lib/formats/parquet.ts)

### Testing Custom Handlers

```typescript
// tests/custom-handler.test.ts
import { registerFormat } from '../lib/registry.js';
import { myCustomHandler } from '../lib/formats/custom.js';
import { convert } from '../scripts/convert.js';

// Register handler
registerFormat(myCustomHandler);

// Test conversion
const result = await convert({
  input: 'test.custom',
  output: 'test.json',
  from: 'custom' as any,
  to: 'json',
});

console.assert(result.success, 'Conversion should succeed');
```

## Best Practices

1. **Error Handling**: Always wrap parse/serialize in try-catch
2. **Type Safety**: Use TypeScript strict mode
3. **Streaming**: Implement streaming for large files
4. **Detection**: Provide accurate format detection
5. **Testing**: Create comprehensive tests
6. **Documentation**: Document limitations and requirements
7. **Dependencies**: Minimize external dependencies
8. **Performance**: Optimize for memory usage

## Resources

- [Type Definitions](../lib/types.ts)
- [Plugin Registry](../lib/registry.ts)
- [Example Handlers](../lib/formats/)
- [Test Suite](../tests/test-runner.ts)

---

**Version**: 1.0.0  
**Updated**: 2026-01-19
