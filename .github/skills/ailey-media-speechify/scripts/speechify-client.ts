#!/usr/bin/env node
/**
 * Speechify API Client
 * 
 * Wrapper for Speechify text-to-speech API
 * Handles authentication, requests, and response processing
 */

import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import FormData from 'form-data';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.env.HOME || '~', '.vscode', '.env') });

export interface ConversionOptions {
  voice_id: string;
  input: string;
  model?: 'simba-english' | 'simba-multilingual' | 'simba-turbo';
  language?: string; // locale format: en-US, fr-FR, etc.
  audio_format?: 'mp3' | 'wav' | 'ogg' | 'flac' | 'aac';
  sample_rate?: number;
  options?: {
    loudness_normalization?: boolean;
  };
}

export interface Voice {
  id: string;
  display_name: string;
  gender: string;
  locale: string;
  models: VoiceModel[];
  public: boolean;
  user_id?: string;
}

export interface VoiceModel {
  name: string;
  languages: VoiceLanguage[];
}

export interface VoiceLanguage {
  locale: string;
  preview_audio: string;
}

export interface VoiceFilter {
  language?: string;
  gender?: string;
  search?: string;
}

export class SpeechifyClient {
  private client: AxiosInstance;
  private apiToken: string;
  private baseURL: string;

  constructor() {
    this.apiToken = this.getApiToken();
    this.baseURL = process.env.SPEECHIFY_API_URL || 'https://api.sws.speechify.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes for large files
    });
  }

  private getApiToken(): string {
    const token = process.env.SPEECHIFY_TOKEN;
    
    if (!token) {
      throw new Error(
        '❌ SPEECHIFY_TOKEN not found in environment.\n' +
        'Please add SPEECHIFY_TOKEN to one of:\n' +
        '  - .env\n' +
        '  - .env.local\n' +
        '  - ~/.vscode/.env\n' +
        'Get your token at: https://speechify.com/api'
      );
    }

    return token;
  }

  /**
   * Check API health and authentication
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/health');
      return response.status === 200;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('❌ Invalid SPEECHIFY_TOKEN. Please check your API token.');
      }
      throw error;
    }
  }

  /**
   * Convert text to speech
   */
  async convertToSpeech(
    text: string,
    voiceId: string = 'george',
    options: Partial<Omit<ConversionOptions, 'input' | 'voice_id'>> = {}
  ): Promise<Buffer> {
    const {
      model = 'simba-multilingual',
      audio_format = 'mp3',
      sample_rate = 24000,
      language,
      options: additionalOptions
    } = options;

    try {
      const response = await this.client.post('/v1/audio/speech', {
        input: text,
        voice_id: voiceId,
        model,
        audio_format,
        sample_rate,
        language,
        options: additionalOptions || { loudness_normalization: true }
      }, {
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('❌ Rate limit exceeded. Please wait before retrying.');
      }
      if (error.response?.status === 400) {
        throw new Error(`❌ Invalid request: ${error.response.data?.message || 'Bad request'}`);
      }
      throw new Error(`❌ Speechify API error: ${error.message}`);
    }
  }

  /**
   * Stream text to speech
   */
  async streamToSpeech(
    text: string,
    voiceId: string = 'george',
    options: Partial<Omit<ConversionOptions, 'input' | 'voice_id'>> = {}
  ): Promise<Buffer> {
    const {
      model = 'simba-multilingual',
      audio_format = 'mp3',
      language,
    } = options;

    try {
      const response = await this.client.post('/v1/audio/stream', {
        input: text,
        voice_id: voiceId,
        model,
        language,
      }, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': `audio/${audio_format || 'mpeg'}`
        }
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('❌ Rate limit exceeded. Please wait before retrying.');
      }
      throw new Error(`❌ Speechify streaming error: ${error.message}`);
    }
  }

  /**
   * Convert file to speech
   */
  async convertFileToSpeech(
    filePath: string,
    voiceId: string = 'george',
    options: Partial<Omit<ConversionOptions, 'input' | 'voice_id'>> = {}
  ): Promise<Buffer> {
    if (!existsSync(filePath)) {
      throw new Error(`❌ File not found: ${filePath}`);
    }

    const text = readFileSync(filePath, 'utf-8');
    return this.convertToSpeech(text, voiceId, options);
  }

  /**
   * Get available voices
   */
  async getVoices(filter?: VoiceFilter): Promise<Voice[]> {
    try {
      const response = await this.client.get('/v1/voices');
      let voices: Voice[] = response.data.voices || response.data || [];

      // Apply filters
      if (filter?.language) {
        voices = voices.filter(v => 
          v.locale?.toLowerCase().includes(filter.language!.toLowerCase()) ||
          v.models?.some(m => 
            m.languages?.some(l => l.locale?.toLowerCase().includes(filter.language!.toLowerCase()))
          )
        );
      }

      if (filter?.gender) {
        voices = voices.filter(v => v.gender?.toLowerCase() === filter.gender?.toLowerCase());
      }

      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        voices = voices.filter(v =>
          v.display_name?.toLowerCase().includes(searchLower) ||
          v.id?.toLowerCase().includes(searchLower) ||
          v.locale?.toLowerCase().includes(searchLower)
        );
      }

      return voices;
    } catch (error: any) {
      throw new Error(`❌ Failed to fetch voices: ${error.message}`);
    }
  }

  /**
   * Get voice by ID
   */
  async getVoice(voiceId: string): Promise<Voice | null> {
    try {
      const voices = await this.getVoices();
      return voices.find(v => v.id === voiceId) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Estimate cost for conversion
   */
  async estimateCost(text: string): Promise<number> {
    // Approximate cost calculation (adjust based on actual pricing)
    const charCount = text.length;
    const baseRate = 0.000015; // Example: $0.015 per 1000 characters
    return charCount * baseRate;
  }

  /**
   * Preview voice with sample text
   */
  async previewVoice(voiceId: string, sampleText?: string): Promise<Buffer> {
    const text = sampleText || 'Hello, this is a sample voice preview. This demonstrates how this voice sounds.';
    return this.convertToSpeech(text, voiceId, { audio_format: 'mp3' });
  }

  // Helper methods removed - not needed with actual API
}

/**
 * Get singleton Speechify client instance
 */
export function getSpeechifyClient(): SpeechifyClient {
  return new SpeechifyClient();
}

// Standalone execution test
if (require.main === module) {
  (async () => {
    try {
      const client = getSpeechifyClient();
      console.log('🔍 Testing Speechify API connection...');
      
      const healthy = await client.healthCheck();
      if (healthy) {
        console.log('✅ Speechify API connection successful');
        
        const voices = await client.getVoices();
        console.log(`✅ Found ${voices.length} available voices`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}
