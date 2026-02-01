#!/usr/bin/env tsx
/**
 * Gamma API Client
 * Provides wrapper functions for Gamma API operations
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from multiple locations
[
  path.join(process.env.HOME || '', '.vscode', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const GAMMA_API_BASE = 'https://api.gamma.app/api/v1';

interface GammaTheme {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
}

interface GammaProject {
  id: string;
  name: string;
  type: 'presentation' | 'document' | 'webpage';
  created_at: string;
  updated_at: string;
  url: string;
}

interface CreatePresentationOptions {
  title: string;
  content: string;
  theme?: string;
  type?: 'presentation' | 'document' | 'webpage';
}

interface ExportOptions {
  format: 'pptx' | 'pdf';
  projectId: string;
}

export class GammaClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GAMMA_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error(
        'Gamma API key not found. Set GAMMA_API_KEY in:\n' +
        '  - ~/.vscode/.env\n' +
        '  - .env\n' +
        '  - .env.local\n' +
        'Or pass as constructor parameter.'
      );
    }

    this.client = axios.create({
      baseURL: GAMMA_API_BASE,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Test API key validity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/user');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available themes
   */
  async listThemes(): Promise<GammaTheme[]> {
    try {
      const response = await this.client.get('/themes');
      return response.data.themes || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to list themes: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * List user projects
   */
  async listProjects(): Promise<GammaProject[]> {
    try {
      const response = await this.client.get('/projects');
      return response.data.projects || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to list projects: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create presentation from content
   */
  async createPresentation(options: CreatePresentationOptions): Promise<GammaProject> {
    try {
      const response = await this.client.post('/generate', {
        title: options.title,
        content: options.content,
        theme: options.theme || 'default',
        type: options.type || 'presentation',
      });

      return response.data.project;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create presentation: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create presentation from file
   */
  async createPresentationFromFile(
    filePath: string,
    options: Partial<CreatePresentationOptions> = {}
  ): Promise<GammaProject> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const title = options.title || path.basename(filePath, path.extname(filePath));

    return this.createPresentation({
      title,
      content,
      theme: options.theme,
      type: options.type,
    });
  }

  /**
   * Export presentation to PowerPoint or PDF
   */
  async exportPresentation(options: ExportOptions): Promise<Buffer> {
    try {
      const response = await this.client.post(
        `/projects/${options.projectId}/export`,
        { format: options.format },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to export presentation: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get project details
   */
  async getProject(projectId: string): Promise<GammaProject> {
    try {
      const response = await this.client.get(`/projects/${projectId}`);
      return response.data.project;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get project: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.client.delete(`/projects/${projectId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete project: ${error.message}`);
      }
      throw error;
    }
  }
}

// Test function for standalone execution
async function test() {
  try {
    console.log('Testing Gamma API connection...');
    const client = new GammaClient();
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      console.log('✅ Gamma API connection successful!');
      console.log('\nFetching available themes...');
      const themes = await client.listThemes();
      console.log(`Found ${themes.length} themes`);
      
      console.log('\nFetching projects...');
      const projects = await client.listProjects();
      console.log(`Found ${projects.length} projects`);
    } else {
      console.log('❌ Gamma API connection failed. Check your API key.');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  test();
}

export default GammaClient;
