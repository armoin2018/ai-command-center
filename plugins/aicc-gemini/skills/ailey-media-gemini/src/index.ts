import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface AccountTier {
  tier: 'Free' | 'Pay-as-you-go' | 'Enterprise';
  rateLimit: number;
  dailyLimit: number;
  maxImageResolution: string;
  maxVideoLength: number;
  costPerImage: number;
  costPerVideo: number;
  features: string[];
}

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  model?: string;
  numberOfImages?: number;
  seed?: number;
  outputFormat?: 'png' | 'jpeg';
}

export interface GeneratedImage {
  images: Array<{
    data: Buffer;
    mimeType: string;
    metadata: {
      model: string;
      prompt: string;
      seed?: number;
      timestamp: string;
    };
  }>;
  promptId: string;
}

export interface EditImageOptions {
  image: Buffer | string;
  mask?: Buffer | string;
  prompt: string;
  mode: 'inpaint' | 'outpaint' | 'style-transfer';
  strength?: number;
  outputFormat?: 'png' | 'jpeg';
}

export interface UpscaleImageOptions {
  image: Buffer | string;
  factor: 2 | 4;
  outputFormat?: 'png' | 'jpeg';
}

export interface GenerateVideoOptions {
  prompt: string;
  duration: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  model?: string;
  fps?: number;
  outputFormat?: 'mp4' | 'webm';
}

export interface GeneratedVideo {
  video: Buffer;
  mimeType: string;
  duration: number;
  resolution: string;
  fps: number;
  metadata: {
    model: string;
    prompt: string;
    timestamp: string;
  };
}

export interface GenerationRecord {
  id: string;
  type: 'image' | 'video' | 'edit' | 'upscale';
  prompt: string;
  model: string;
  timestamp: string;
  outputPath?: string;
  metadata: Record<string, any>;
}

export interface GeminiConfig {
  apiKey?: string;
  projectId?: string;
  location?: string;
  serviceAccountKey?: string;
  accountType?: 'free' | 'paid' | 'enterprise';
  endpoint?: string;
  outputDir?: string;
}

export class GeminiClient {
  private client: AxiosInstance;
  private config: GeminiConfig;
  private history: GenerationRecord[] = [];

  constructor(config: GeminiConfig) {
    this.config = {
      endpoint: config.endpoint || 'https://generativelanguage.googleapis.com',
      outputDir: config.outputDir || './output',
      accountType: config.accountType || 'free',
      ...config
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true });
    }

    this.client = axios.create({
      baseURL: this.isVertexAI() 
        ? `https://${config.location}-aiplatform.googleapis.com/v1`
        : `${this.config.endpoint}/v1`,
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private isVertexAI(): boolean {
    return this.config.accountType === 'enterprise' && !!this.config.projectId;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    if (this.isVertexAI()) {
      // For Vertex AI, use service account authentication
      // In production, use Google Auth Library
      return {
        'Authorization': `Bearer ${await this.getVertexAIToken()}`
      };
    } else {
      // For AI Studio, use API key
      return {
        'x-goog-api-key': this.config.apiKey || ''
      };
    }
  }

  private async getVertexAIToken(): Promise<string> {
    // Simplified - in production, use @google-cloud/auth library
    // For now, assume environment variable or service account key
    throw new Error('Vertex AI authentication requires @google-cloud/auth library');
  }

  async detectAccountTier(): Promise<AccountTier> {
    const accountType = this.config.accountType || 'free';
    
    const tierMap: Record<string, AccountTier> = {
      free: {
        tier: 'Free',
        rateLimit: 15,
        dailyLimit: 1500,
        maxImageResolution: '1024x1024',
        maxVideoLength: 8,
        costPerImage: 0,
        costPerVideo: 0,
        features: [
          'Imagen 3 (basic)',
          'Veo 2 (8 sec videos)',
          'Standard resolution',
          'Basic editing',
          'Community support'
        ]
      },
      paid: {
        tier: 'Pay-as-you-go',
        rateLimit: 60,
        dailyLimit: 10000,
        maxImageResolution: '2048x2048',
        maxVideoLength: 16,
        costPerImage: 0.020,
        costPerVideo: 0.30,
        features: [
          'Full Imagen 3 access',
          'Veo 2 (16 sec videos)',
          '4K resolution',
          'Advanced editing',
          'Upscaling (4x)',
          'Batch operations',
          'Priority processing',
          'Email support'
        ]
      },
      enterprise: {
        tier: 'Enterprise',
        rateLimit: 300,
        dailyLimit: 100000,
        maxImageResolution: '8192x8192',
        maxVideoLength: 60,
        costPerImage: 0, // Custom pricing
        costPerVideo: 0,
        features: [
          'All Paid features',
          '8K resolution',
          'Extended videos (60 sec)',
          'Custom fine-tuning',
          'Advanced safety filters',
          'SLA guarantees',
          'Dedicated support',
          'VPC integration',
          'Audit logging'
        ]
      }
    };

    return tierMap[accountType];
  }

  async generateImage(options: GenerateImageOptions): Promise<GeneratedImage> {
    const {
      prompt,
      negativePrompt,
      aspectRatio = '1:1',
      model = 'imagen-3.0-generate-001',
      numberOfImages = 1,
      seed,
      outputFormat = 'png'
    } = options;

    try {
      const authHeaders = await this.getAuthHeader();
      const endpoint = this.isVertexAI()
        ? `/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${model}:predict`
        : `/models/${model}:generateImages`;

      const requestBody = {
        instances: [{
          prompt,
          ...(negativePrompt && { negativePrompt }),
          parameters: {
            sampleCount: numberOfImages,
            aspectRatio,
            ...(seed && { seed })
          }
        }]
      };

      const response = await this.client.post(endpoint, requestBody, {
        headers: authHeaders
      });

      const images = response.data.predictions.map((prediction: any, index: number) => ({
        data: Buffer.from(prediction.bytesBase64Encoded, 'base64'),
        mimeType: `image/${outputFormat}`,
        metadata: {
          model,
          prompt,
          seed: seed || prediction.seed,
          timestamp: new Date().toISOString()
        }
      }));

      const promptId = `img-${Date.now()}`;

      // Add to history
      this.history.push({
        id: promptId,
        type: 'image',
        prompt,
        model,
        timestamp: new Date().toISOString(),
        metadata: { aspectRatio, numberOfImages, seed }
      });

      return { images, promptId };
    } catch (error: any) {
      throw new Error(`Image generation failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async editImage(options: EditImageOptions): Promise<GeneratedImage> {
    const {
      image,
      mask,
      prompt,
      mode,
      strength = 0.8,
      outputFormat = 'png'
    } = options;

    try {
      const imageBuffer = typeof image === 'string' ? fs.readFileSync(image) : image;
      const maskBuffer = mask ? (typeof mask === 'string' ? fs.readFileSync(mask) : mask) : undefined;

      const authHeaders = await this.getAuthHeader();
      const model = 'imagen-3.0-generate-001';
      const endpoint = this.isVertexAI()
        ? `/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${model}:predict`
        : `/models/${model}:editImage`;

      const requestBody: any = {
        instances: [{
          prompt,
          image: {
            bytesBase64Encoded: imageBuffer.toString('base64')
          },
          parameters: {
            editMode: mode,
            strength,
            ...(maskBuffer && {
              mask: {
                bytesBase64Encoded: maskBuffer.toString('base64')
              }
            })
          }
        }]
      };

      const response = await this.client.post(endpoint, requestBody, {
        headers: authHeaders
      });

      const images = response.data.predictions.map((prediction: any) => ({
        data: Buffer.from(prediction.bytesBase64Encoded, 'base64'),
        mimeType: `image/${outputFormat}`,
        metadata: {
          model,
          prompt,
          mode,
          timestamp: new Date().toISOString()
        }
      }));

      const promptId = `edit-${Date.now()}`;

      this.history.push({
        id: promptId,
        type: 'edit',
        prompt,
        model,
        timestamp: new Date().toISOString(),
        metadata: { mode, strength }
      });

      return { images, promptId };
    } catch (error: any) {
      throw new Error(`Image editing failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async upscaleImage(options: UpscaleImageOptions): Promise<GeneratedImage> {
    const {
      image,
      factor = 4,
      outputFormat = 'png'
    } = options;

    try {
      const imageBuffer = typeof image === 'string' ? fs.readFileSync(image) : image;
      const authHeaders = await this.getAuthHeader();
      const model = 'imagen-3.0-generate-001';
      const endpoint = this.isVertexAI()
        ? `/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${model}:predict`
        : `/models/${model}:upscaleImage`;

      const requestBody = {
        instances: [{
          image: {
            bytesBase64Encoded: imageBuffer.toString('base64')
          },
          parameters: {
            upscaleFactor: factor
          }
        }]
      };

      const response = await this.client.post(endpoint, requestBody, {
        headers: authHeaders
      });

      const images = response.data.predictions.map((prediction: any) => ({
        data: Buffer.from(prediction.bytesBase64Encoded, 'base64'),
        mimeType: `image/${outputFormat}`,
        metadata: {
          model,
          prompt: `Upscale ${factor}x`,
          timestamp: new Date().toISOString()
        }
      }));

      const promptId = `upscale-${Date.now()}`;

      this.history.push({
        id: promptId,
        type: 'upscale',
        prompt: `Upscale ${factor}x`,
        model,
        timestamp: new Date().toISOString(),
        metadata: { factor }
      });

      return { images, promptId };
    } catch (error: any) {
      throw new Error(`Image upscaling failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateVideo(options: GenerateVideoOptions): Promise<GeneratedVideo> {
    const {
      prompt,
      duration,
      aspectRatio = '16:9',
      model = 'veo-2.0-generate-001',
      fps = 30,
      outputFormat = 'mp4'
    } = options;

    try {
      const authHeaders = await this.getAuthHeader();
      const endpoint = this.isVertexAI()
        ? `/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${model}:predict`
        : `/models/${model}:generateVideo`;

      const requestBody = {
        instances: [{
          prompt,
          parameters: {
            duration,
            aspectRatio,
            fps
          }
        }]
      };

      const response = await this.client.post(endpoint, requestBody, {
        headers: authHeaders
      });

      const prediction = response.data.predictions[0];
      const videoBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');

      const promptId = `video-${Date.now()}`;

      this.history.push({
        id: promptId,
        type: 'video',
        prompt,
        model,
        timestamp: new Date().toISOString(),
        metadata: { duration, aspectRatio, fps }
      });

      return {
        video: videoBuffer,
        mimeType: `video/${outputFormat}`,
        duration,
        resolution: aspectRatio === '16:9' ? '1920x1080' : '1080x1920',
        fps,
        metadata: {
          model,
          prompt,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      throw new Error(`Video generation failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async saveOutput(data: Buffer, filename: string): Promise<string> {
    const outputPath = path.join(this.config.outputDir!, filename);
    fs.writeFileSync(outputPath, data);
    
    // Update history with output path
    const lastRecord = this.history[this.history.length - 1];
    if (lastRecord) {
      lastRecord.outputPath = outputPath;
    }
    
    return outputPath;
  }

  async getGenerationHistory(limit?: number): Promise<GenerationRecord[]> {
    return limit ? this.history.slice(-limit) : this.history;
  }

  async clearHistory(): Promise<void> {
    this.history = [];
  }
}

export default GeminiClient;
