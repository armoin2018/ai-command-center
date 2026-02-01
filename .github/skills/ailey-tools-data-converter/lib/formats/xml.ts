/**
 * XML format handler
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type { FormatHandler } from '../types.js';

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
};

export const xmlHandler: FormatHandler = {
  name: 'xml',
  extensions: ['xml'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,

  async parse(data: Buffer | string): Promise<any> {
    const str = typeof data === 'string' ? data : data.toString('utf-8');
    const parser = new XMLParser(parserOptions);
    return parser.parse(str);
  },

  async serialize(data: any): Promise<string> {
    const builder = new XMLBuilder(builderOptions);
    return builder.build(data);
  },

  detect(data: Buffer): boolean {
    try {
      const str = data.toString('utf-8').trim();
      return str.startsWith('<?xml') || str.startsWith('<');
    } catch {
      return false;
    }
  },
};
