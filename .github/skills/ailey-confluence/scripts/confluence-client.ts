/**
 * Confluence API client with authentication and configuration
 */

import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Load environment variables from multiple possible locations
async function loadEnv(): Promise<void> {
  const envPaths = [
    path.join(os.homedir(), '.vscode', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local')
  ];

  for (const envPath of envPaths) {
    try {
      await fs.access(envPath);
      config({ path: envPath });
      console.log(`📄 Loaded environment from: ${envPath}`);
      break;
    } catch {
      // File doesn't exist, try next
    }
  }
}

export interface ConfluenceConfig {
  baseUrl: string;
  username: string;
  password?: string;
  apiToken?: string;
}

export class ConfluenceClient {
  private client: AxiosInstance;
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
    
    const auth = Buffer.from(
      `${config.username}:${config.apiToken || config.password}`
    ).toString('base64');

    this.client = axios.create({
      baseURL: `${config.baseUrl}/wiki/rest/api`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  // Space operations
  async getSpaces(limit: number = 25): Promise<any> {
    const response = await this.client.get('/space', {
      params: { limit }
    });
    return response.data;
  }

  async getSpace(spaceKey: string): Promise<any> {
    const response = await this.client.get(`/space/${spaceKey}`);
    return response.data;
  }

  // Content operations
  async getContent(contentId: string, expand?: string): Promise<any> {
    const response = await this.client.get(`/content/${contentId}`, {
      params: { expand: expand || 'body.storage,version,space' }
    });
    return response.data;
  }

  async getContentByTitle(spaceKey: string, title: string): Promise<any> {
    const response = await this.client.get('/content', {
      params: {
        spaceKey,
        title,
        expand: 'body.storage,version,space'
      }
    });
    return response.data.results[0] || null;
  }

  async createPage(spaceKey: string, title: string, content: string, parentId?: string): Promise<any> {
    const data: any = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };

    if (parentId) {
      data.ancestors = [{ id: parentId }];
    }

    const response = await this.client.post('/content', data);
    return response.data;
  }

  async updatePage(contentId: string, title: string, content: string, version: number): Promise<any> {
    const data = {
      type: 'page',
      title,
      version: { number: version + 1 },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };

    const response = await this.client.put(`/content/${contentId}`, data);
    return response.data;
  }

  async deletePage(contentId: string): Promise<void> {
    await this.client.delete(`/content/${contentId}`);
  }

  // Search operations
  async search(cql: string, limit: number = 25): Promise<any> {
    const response = await this.client.get('/content/search', {
      params: { cql, limit, expand: 'space,version' }
    });
    return response.data;
  }

  // Attachment operations
  async getAttachments(contentId: string): Promise<any> {
    const response = await this.client.get(`/content/${contentId}/child/attachment`);
    return response.data;
  }

  async uploadAttachment(contentId: string, filePath: string, comment?: string): Promise<any> {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    form.append('file', fileBuffer, fileName);
    if (comment) {
      form.append('comment', comment);
    }

    const response = await this.client.post(
      `/content/${contentId}/child/attachment`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-Atlassian-Token': 'no-check'
        }
      }
    );
    return response.data;
  }

  // Label operations
  async getLabels(contentId: string): Promise<any> {
    const response = await this.client.get(`/content/${contentId}/label`);
    return response.data;
  }

  async addLabel(contentId: string, label: string): Promise<any> {
    const response = await this.client.post(`/content/${contentId}/label`, [{
      prefix: 'global',
      name: label
    }]);
    return response.data;
  }
}

export async function getConfluenceClient(): Promise<ConfluenceClient> {
  await loadEnv();

  const baseUrl = process.env.ATLASSIAN_URL;
  const username = process.env.ATLASSIAN_USER;
  const password = process.env.ATLASSIAN_PASSWORD;
  const apiToken = process.env.ATLASSIAN_APIKEY;

  if (!baseUrl || !username) {
    throw new Error(
      'Missing required environment variables. Set ATLASSIAN_URL and ATLASSIAN_USER in .env file'
    );
  }

  if (!password && !apiToken) {
    throw new Error(
      'Missing authentication. Set either ATLASSIAN_PASSWORD or ATLASSIAN_APIKEY in .env file'
    );
  }

  return new ConfluenceClient({
    baseUrl,
    username,
    password,
    apiToken
  });
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await getConfluenceClient();
    const spaces = await client.getSpaces(1);
    console.log(`✅ Connected to Confluence`);
    console.log(`   Found ${spaces.size} space(s)`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Confluence:', (error as Error).message);
    return false;
  }
}
