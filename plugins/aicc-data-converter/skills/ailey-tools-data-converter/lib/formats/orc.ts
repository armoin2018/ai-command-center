/**
 * ORC format handler
 * 
 * Note: Full ORC support requires Java-based tools. This handler provides
 * basic support using Apache Arrow, which can read ORC files.
 */

import * as arrow from 'apache-arrow';
import type { FormatHandler } from '../types.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const orcHandler: FormatHandler = {
  name: 'orc',
  extensions: ['orc'],
  canRead: true,
  canWrite: false, // Arrow doesn't support writing ORC directly
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    // Write to temp file for Arrow to read
    const tempFile = path.join(os.tmpdir(), `temp-${Date.now()}.orc`);
    
    try {
      await fs.writeFile(tempFile, buffer);
      
      // Read using Arrow (which supports ORC)
      const table = await arrow.tableFromIPC(buffer);
      const records: any[] = [];
      
      for (let i = 0; i < table.numRows; i++) {
        const record: any = {};
        for (const field of table.schema.fields) {
          const column = table.getChild(field.name);
          record[field.name] = column?.get(i);
        }
        records.push(record);
      }
      
      return records;
    } catch (error) {
      throw new Error(`Failed to parse ORC data: ${error}. Note: ORC support is limited.`);
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  },

  async serialize(data: any): Promise<Buffer> {
    throw new Error('ORC writing is not supported. Use Parquet or Avro instead.');
  },

  detect(data: Buffer): boolean {
    // ORC files start with 'ORC' magic bytes
    return data.length >= 3 && 
           data[0] === 0x4F && // 'O'
           data[1] === 0x52 && // 'R'
           data[2] === 0x43;   // 'C'
  },
};
