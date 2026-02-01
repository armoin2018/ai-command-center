/**
 * Avro format handler
 */

import avro from 'avsc';
import type { FormatHandler } from '../types.js';

export const avroHandler: FormatHandler = {
  name: 'avro',
  extensions: ['avro'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    // Try to decode as Avro container file
    try {
      const records: any[] = [];
      const decoder = avro.createFileDecoder(buffer);
      
      decoder.on('data', (record) => {
        records.push(record);
      });
      
      await new Promise<void>((resolve, reject) => {
        decoder.on('end', () => resolve());
        decoder.on('error', reject);
      });
      
      return records;
    } catch (error) {
      throw new Error(`Failed to parse Avro data: ${error}`);
    }
  },

  async serialize(data: any): Promise<Buffer> {
    const records = Array.isArray(data) ? data : [data];
    if (records.length === 0) {
      throw new Error('No data to write to Avro');
    }

    // Infer schema from first record
    const type = avro.Type.forValue(records[0]);
    
    // Create encoder with container file format
    const encoder = avro.createFileEncoder(type);
    
    // Write records
    for (const record of records) {
      encoder.write(record);
    }
    
    encoder.end();
    
    // Collect output
    const chunks: Buffer[] = [];
    encoder.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    await new Promise<void>((resolve, reject) => {
      encoder.on('end', () => resolve());
      encoder.on('error', reject);
    });
    
    return Buffer.concat(chunks);
  },

  detect(data: Buffer): boolean {
    // Avro container files start with 'Obj' followed by version byte
    return data.length >= 4 && 
           data[0] === 0x4F && // 'O'
           data[1] === 0x62 && // 'b'
           data[2] === 0x6A && // 'j'
           data[3] === 0x01;   // version 1
  },
};
