/**
 * Parquet format handler
 */

import parquet from 'parquetjs';
import type { FormatHandler } from '../types.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const parquetHandler: FormatHandler = {
  name: 'parquet',
  extensions: ['parquet'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    // Parquet requires file-based reading
    // Write buffer to temp file, read, then delete
    const tempFile = path.join(os.tmpdir(), `temp-${Date.now()}.parquet`);
    
    try {
      const buffer = typeof data === 'string' ? Buffer.from(data) : data;
      await fs.writeFile(tempFile, buffer);
      
      const reader = await parquet.ParquetReader.openFile(tempFile);
      const cursor = reader.getCursor();
      const records: any[] = [];
      
      let record = null;
      while (record = await cursor.next()) {
        records.push(record);
      }
      
      await reader.close();
      return records;
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  },

  async serialize(data: any): Promise<Buffer> {
    const records = Array.isArray(data) ? data : [data];
    if (records.length === 0) {
      throw new Error('No data to write to Parquet');
    }

    // Infer schema from first record
    const schema = inferParquetSchema(records[0]);
    
    const tempFile = path.join(os.tmpdir(), `temp-${Date.now()}.parquet`);
    
    try {
      const writer = await parquet.ParquetWriter.openFile(schema, tempFile);
      
      for (const record of records) {
        await writer.appendRow(record);
      }
      
      await writer.close();
      
      const buffer = await fs.readFile(tempFile);
      return buffer;
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  },

  detect(data: Buffer): boolean {
    // Parquet files start with 'PAR1' magic bytes
    return data.length >= 4 && data.toString('ascii', 0, 4) === 'PAR1';
  },
};

function inferParquetSchema(obj: any): parquet.ParquetSchema {
  const fields: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { type: 'UTF8', optional: true };
    } else if (typeof value === 'string') {
      fields[key] = { type: 'UTF8' };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { type: 'INT64' } : { type: 'DOUBLE' };
    } else if (typeof value === 'boolean') {
      fields[key] = { type: 'BOOLEAN' };
    } else if (value instanceof Date) {
      fields[key] = { type: 'TIMESTAMP_MILLIS' };
    } else if (Array.isArray(value)) {
      fields[key] = { type: 'UTF8', repeated: true };
    } else if (typeof value === 'object') {
      fields[key] = { type: 'UTF8' }; // Serialize nested objects as JSON strings
    }
  }
  
  return new parquet.ParquetSchema(fields);
}
