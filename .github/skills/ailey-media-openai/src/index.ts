import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export interface AccountTier {
  tier: 'Free Trial' | 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5';
  rateLimit: number;
  dailyLimit: number;
  soraAccess: boolean;
  costPerImage: number;
  features: string[];
}

export interface GenerateImageOptions {
  prompt: string;
  model?: 'dall-e-3' | 'dall-e-2';
  size?: '1024x1024' | '1024x1792' | '1792x1024' | '512x512' | '256x256';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
  responseFormat?: 'url' | 'b64_json';
}

export interface GeneratedImage {
  images: Array<{
    url?: string;
    b64_json?: string;
    revisedPrompt?: string;
    metadata: {
      model: string;
      size: string;
      quality?: string;
      style?: string;
      timestamp: string;
    };
  }>;
  promptId: string;
}

export interface EditImageOptions {
  image: Buffer | string;
  mask: Buffer | string;
  prompt: string;
  size?: '1024x1024' | '512x512' | '256x256';
  n?: number;
  responseFormat?: 'url' | 'b64_json';
}

export interface CreateVariationOptions {
  image: Buffer | string;
  n?: number;
  size?: '1024x1024' | '512x512' | '256x256';
  responseFormat?: 'url' | 'b64_json';
}

export interface GenerateVideoOptions {
  prompt: string;
  duration?: number;
  resolution?: '1920x1080' | '1080x1920' | '1280x720';
  fps?: number;
  style?: 'realistic' | 'cinematic' | 'animated';
}

export interface GeneratedVideo {
  video: Buffer;
  url?: string;
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
  type: 'image' | 'edit' | 'variation' | 'video';
  prompt: string;
  model: string;
  timestamp: string;
  outputPath?: string;
  cost?: number;
  metadata: Record<string, any>;
}

export interface OpenAIConfig {
  apiKey: string;
  organizationId?: string;
  outputDir?: string;
}

export class OpenAIClient {
  private client: OpenAI;
  private config: OpenAIConfig;
  private history: GenerationRecord[] = [];

  constructor(config: OpenAIConfig) {
    this.config = {
      outputDir: config.outputDir || './output',
      ...config
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true });
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organizationId
    });
  }

  async detectAccountTier(): Promise<AccountTier> {
    // Note: OpenAI doesn't provide direct tier detection via API
    // This is a simplified implementation based on known tier structure
    // In production, track usage and spending to determine tier
    
    try {
      // Try to fetch account info (requires proper permissions)
      // For now, we'll assume pay-as-you-go and provide tier info
      
      // Default to Tier 1 (most common for API users)
      const tierMap: Record<string, AccountTier> = {
        'trial': {
          tier: 'Free Trial',
          rateLimit: 3,
          dailyLimit: 200,
          soraAccess: false,
          costPerImage: 0,
          features: [
            'DALL-E 3 (limited)',
            'Standard quality only',
            '$5 free credits',
            '3-month expiration'
          ]
        },
        'tier-1': {
          tier: 'Tier 1',
          rateLimit: 5,
          dailyLimit: 500,
          soraAccess: false,
          costPerImage: 0.040,
          features: [
            'Full DALL-E 3 access',
            'Standard and HD quality',
            'All resolutions',
            'Image editing',
            'Image variations'
          ]
        },
        'tier-4': {
          tier: 'Tier 4',
          rateLimit: 15,
          dailyLimit: 5000,
          soraAccess: true,
          costPerImage: 0.040,
          features: [
            'All Tier 1 features',
            'Sora early access',
            'Higher rate limits',
            'Priority processing'
          ]
        },
        'tier-5': {
          tier: 'Tier 5',
          rateLimit: 50,
          dailyLimit: 10000,
          soraAccess: true,
          costPerImage: 0.040,
          features: [
            'All features',
            'Full Sora access',
            'Highest rate limits',
            'Dedicated support',
            'Volume discounts'
          ]
        }
      };

      // Default to Tier 1 for API key users
      return tierMap['tier-1'];
    } catch (error: any) {
      throw new Error(`Tier detection failed: ${error.message}`);
    }
  }

  async generateImage(options: GenerateImageOptions): Promise<GeneratedImage> {
    const {
      prompt,
      model = 'dall-e-3',
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
      n = 1,
      responseFormat = 'b64_json'
    } = options;

    try {
      const response = await this.client.images.generate({
        prompt,
        model,
        size: size as any,
        quality: model === 'dall-e-3' ? quality : undefined,
        style: model === 'dall-e-3' ? style : undefined,
        n,
        response_format: responseFormat as any
      });

      const images = response.data.map((item: any) => ({
        url: item.url,
        b64_json: item.b64_json,
        revisedPrompt: item.revised_prompt,
        metadata: {
          model,
          size,
          quality,
          style,
          timestamp: new Date().toISOString()
        }
      }));

      const promptId = `img-${Date.now()}`;
      const cost = this.estimateCost('image', { model, size, quality, n });

      // Add to history
      this.history.push({
        id: promptId,
        type: 'image',
        prompt,
        model,
        timestamp: new Date().toISOString(),
        cost,
        metadata: { size, quality, style, n }
      });

      return { images, promptId };
    } catch (error: any) {
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  async editImage(options: EditImageOptions): Promise<GeneratedImage> {
    const {
      image,
      mask,
      prompt,
      size = '1024x1024',
      n = 1,
      responseFormat = 'b64_json'
    } = options;

    try {
      const imageBuffer = typeof image === 'string' ? fs.readFileSync(image) : image;
      const maskBuffer = typeof mask === 'string' ? fs.readFileSync(mask) : mask;

      // Convert buffers to File objects
      const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
      const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

      const response = await this.client.images.edit({
        image: imageFile as any,
        mask: maskFile as any,
        prompt,
        size: size as any,
        n,
        response_format: responseFormat as any
      });

      const images = response.data.map((item: any) => ({
        url: item.url,
        b64_json: item.b64_json,
        metadata: {
          model: 'dall-e-2',
          size,
          timestamp: new Date().toISOString()
        }
      }));

      const promptId = `edit-${Date.now()}`;
      const cost = this.estimateCost('edit', { size, n });

      this.history.push({
        id: promptId,
        type: 'edit',
        prompt,
        model: 'dall-e-2',
        timestamp: new Date().toISOString(),
        cost,
        metadata: { size, n }
      });

      return { images, promptId };
    } catch (error: any) {
      throw new Error(`Image editing failed: ${error.message}`);
    }
  }

  async createVariation(options: CreateVariationOptions): Promise<GeneratedImage> {
    const {
      image,
      n = 1,
      size = '1024x1024',
      responseFormat = 'b64_json'
    } = options;

    try {
      const imageBuffer = typeof image === 'string' ? fs.readFileSync(image) : image;
      const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

      const response = await this.client.images.createVariation({
        image: imageFile as any,
        n,
        size: size as any,
        response_format: responseFormat as any
      });

      const images = response.data.map((item: any) => ({
        url: item.url,
        b64_json: item.b64_json,
        metadata: {
          model: 'dall-e-2',
          size,
          timestamp: new Date().toISOString()
        }
      }));

      const promptId = `var-${Date.now()}`;
      const cost = this.estimateCost('variation', { size, n });

      this.history.push({
        id: promptId,
        type: 'variation',
        prompt: 'Image variation',
        model: 'dall-e-2',
        timestamp: new Date().toISOString(),
        cost,
        metadata: { size, n }
      });

      return { images, promptId };
    } catch (error: any) {
      throw new Error(`Variation creation failed: ${error.message}`);
    }
  }

  async generateVideo(options: GenerateVideoOptions): Promise<GeneratedVideo> {
    const {
      prompt,
      duration = 5,
      resolution = '1920x1080',
      fps = 30,
      style = 'realistic'
    } = options;

    // Note: Sora API is not yet publicly available
    // This is a placeholder implementation
    throw new Error('Sora video generation requires Tier 4+ and is currently in limited access. Visit https://openai.com/sora for updates.');

    // Future implementation when Sora API is available:
    /*
    try {
      const response = await this.client.videos.generate({
        prompt,
        duration,
        resolution,
        fps,
        style
      });

      const promptId = `video-${Date.now()}`;
      const cost = this.estimateCost('video', { duration });

      this.history.push({
        id: promptId,
        type: 'video',
        prompt,
        model: 'sora-1.0',
        timestamp: new Date().toISOString(),
        cost,
        metadata: { duration, resolution, fps, style }
      });

      return {
        video: Buffer.from(response.video_data, 'base64'),
        duration,
        resolution,
        fps,
        metadata: {
          model: 'sora-1.0',
          prompt,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      throw new Error(`Video generation failed: ${error.message}`);
    }
    */
  }

  estimateCost(operation: string, options: any): number {
    switch (operation) {
      case 'image':
        const { model, size, quality, n = 1 } = options;
        if (model === 'dall-e-3') {
          let baseCost = 0.040; // 1024x1024 standard
          if (size === '1024x1792' || size === '1792x1024') {
            baseCost = 0.080;
          }
          if (quality === 'hd') {
            baseCost *= 2;
          }
          return baseCost * n;
        } else {
          // DALL-E 2
          const sizeMap: any = {
            '1024x1024': 0.020,
            '512x512': 0.018,
            '256x256': 0.016
          };
          return (sizeMap[size] || 0.020) * n;
        }
      
      case 'edit':
      case 'variation':
        const editSize = options.size || '1024x1024';
        const editN = options.n || 1;
        const sizeMap: any = {
          '1024x1024': 0.020,
          '512x512': 0.018,
          '256x256': 0.016
        };
        return (sizeMap[editSize] || 0.020) * editN;
      
      case 'video':
        // Estimated Sora pricing
        const duration = options.duration || 5;
        return 0.10 * duration; // ~$0.10 per second estimate
      
      default:
        return 0;
    }
  }

  async saveOutput(data: Buffer | string, filename: string): Promise<string> {
    const outputPath = path.join(this.config.outputDir!, filename);
    
    if (typeof data === 'string') {
      // Base64 encoded
      fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    } else {
      fs.writeFileSync(outputPath, data);
    }
    
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

  getTotalCost(): number {
    return this.history.reduce((sum, record) => sum + (record.cost || 0), 0);
  }

  async clearHistory(): Promise<void> {
    this.history = [];
  }
}

export default OpenAIClient;
