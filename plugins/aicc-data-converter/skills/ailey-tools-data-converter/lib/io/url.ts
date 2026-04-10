/**
 * URL IO handler with authentication support
 */

import fetch from 'node-fetch';
import type { IOHandler, ConversionOptions, AuthOptions } from '../types.js';

export const urlHandler: IOHandler = {
  name: 'url',

  async read(options: ConversionOptions): Promise<Buffer> {
    if (!options.inputURL) {
      throw new Error('Input URL required for URL IO');
    }

    const headers = buildAuthHeaders(options.authOptions);

    const response = await fetch(options.inputURL, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    return buffer;
  },

  async write(data: Buffer | string, options: ConversionOptions): Promise<void> {
    if (!options.outputPath) {
      throw new Error('Output URL required for URL IO write');
    }

    const headers = buildAuthHeaders(options.authOptions);
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;

    const response = await fetch(options.outputPath, {
      method: options.append ? 'PATCH' : 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  },
};

function buildAuthHeaders(authOptions?: AuthOptions): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!authOptions || authOptions.type === 'none') {
    return headers;
  }

  switch (authOptions.type) {
    case 'basic':
      if (authOptions.username && authOptions.password) {
        const credentials = Buffer.from(
          `${authOptions.username}:${authOptions.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
      break;

    case 'bearer':
      if (authOptions.token) {
        headers['Authorization'] = `Bearer ${authOptions.token}`;
      }
      break;

    case 'apikey':
      if (authOptions.apiKey) {
        const headerName = authOptions.apiKeyHeader || 'X-API-Key';
        headers[headerName] = authOptions.apiKey;
      }
      break;
  }

  return headers;
}
