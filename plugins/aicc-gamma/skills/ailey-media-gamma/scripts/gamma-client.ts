#!/usr/bin/env tsx
/**
 * Gamma API Client
 * Provides wrapper functions for Gamma's public API (https://developers.gamma.app)
 */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from multiple locations
const envPaths = [
  path.join(process.env.HOME || '', '.vscode', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
];

// Walk up from cwd to find .env in parent directories (e.g. workspace root)
let dir = process.cwd();
for (let i = 0; i < 6; i++) {
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
  envPaths.push(path.join(dir, '.env'));
}

envPaths.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const GAMMA_API_BASE = process.env.GAMMA_API_BASE_URL || 'https://public-api.gamma.app/v1.0';
const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

interface GammaTheme {
  id: string;
  name: string;
  colorKeywords?: string[];
  toneKeywords?: string[];
  type?: string;
}

interface GammaGeneration {
  generationId: string;
  status: 'pending' | 'completed' | 'failed';
  gammaId?: string;
  gammaUrl?: string;
  exportUrl?: string;
  error?: { message: string; statusCode: number };
  credits?: { deducted: number; remaining: number };
  warnings?: string;
}

interface GenerateOptions {
  inputText: string;
  textMode: 'generate' | 'condense' | 'preserve';
  format?: 'presentation' | 'document' | 'social' | 'webpage';
  numCards?: number;
  cardSplit?: 'auto' | 'inputTextBreaks';
  themeId?: string;
  exportAs?: 'pptx' | 'pdf' | 'png';
  additionalInstructions?: string;
  textOptions?: {
    amount?: 'brief' | 'medium' | 'detailed' | 'extensive';
    tone?: string;
    audience?: string;
    language?: string;
  };
  imageOptions?: {
    source?: 'aiGenerated' | 'web' | 'noImages';
    model?: string;
    style?: string;
    stylePreset?: string;
  };
  cardOptions?: {
    dimensions?: string;
    headerFooter?: Record<string, unknown>;
  };
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
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  /**
   * Test API key validity by listing themes
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/themes', { params: { limit: 1 } });
      return response.status === 200;
    } catch (error: any) {
      if (error.response) {
        console.error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  /**
   * List available themes
   */
  async listThemes(query?: string): Promise<GammaTheme[]> {
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (query) params.query = query;
      const response = await this.client.get('/themes', { params });
      return response.data.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to list themes: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Start an async generation job
   */
  async createGeneration(options: GenerateOptions): Promise<GammaGeneration> {
    try {
      const response = await this.client.post('/generations', options);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message || error.message;
        const status = error.response?.status;
        if (status === 402) throw new Error(`Insufficient credits: ${msg}`);
        throw new Error(`Failed to create generation: ${msg}`);
      }
      throw error;
    }
  }

  /**
   * Poll generation status until completed or failed
   */
  async getGenerationStatus(generationId: string): Promise<GammaGeneration> {
    try {
      const response = await this.client.get(`/generations/${generationId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get generation status: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create generation and poll until complete
   */
  async generateAndWait(
    options: GenerateOptions,
    onProgress?: (status: string, attempt: number) => void
  ): Promise<GammaGeneration> {
    const result = await this.createGeneration(options);
    const generationId = result.generationId;
    console.log(`Generation started: ${generationId}`);
    if (result.warnings) {
      console.warn(`⚠️  ${result.warnings}`);
    }

    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_INTERVAL));

      let status: GammaGeneration;
      try {
        status = await this.getGenerationStatus(generationId);
      } catch (err) {
        // Retry on transient failures (timeout, network errors)
        console.warn(`Poll ${attempt}: transient error, retrying... (${err instanceof Error ? err.message : err})`);
        continue;
      }
      console.log(`Poll ${attempt}: status=${status.status}`);
      if (onProgress) onProgress(status.status, attempt);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Generation failed: ${status.error?.message || 'Unknown error'}`);
      }
    }

    throw new Error(`Generation timed out after ${MAX_POLL_ATTEMPTS * DEFAULT_POLL_INTERVAL / 1000}s`);
  }

  /**
   * Create presentation from file content and wait for completion
   */
  async createPresentationFromFile(
    filePath: string,
    options: {
      title?: string;
      theme?: string;
      type?: 'presentation' | 'document' | 'social' | 'webpage';
      exportAs?: 'pptx' | 'pdf' | 'png';
      textMode?: 'generate' | 'condense' | 'preserve';
      numCards?: number;
      additionalInstructions?: string;
    } = {}
  ): Promise<GammaGeneration> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const title = options.title || path.basename(filePath, path.extname(filePath));

    return this.generateAndWait({
      inputText: content,
      textMode: options.textMode || 'preserve',
      format: options.type || 'presentation',
      themeId: options.theme,
      exportAs: options.exportAs,
      numCards: options.numCards,
      additionalInstructions: options.additionalInstructions || `Title: ${title}`,
    });
  }

  /**
   * Download export file from URL
   */
  async downloadExport(exportUrl: string, outputPath: string): Promise<void> {
    const response = await axios.get(exportUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, Buffer.from(response.data));
  }
}

export default GammaClient;
