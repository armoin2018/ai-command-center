import axios, { AxiosInstance } from 'axios';

/**
 * Account tier information with features
 */
export interface AccountTier {
  tier: string;
  storage: number;
  storageUnit: string;
  maxResolution: string;
  watermark: boolean;
  maxBatchPerDay: number;
  features: string[];
  supportLevel: string;
}

/**
 * Video project information
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  modifiedAt: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  status: string;
  coverUrl?: string;
  tags: string[];
  clips: Clip[];
  metadata: any;
}

/**
 * Video clip information
 */
export interface Clip {
  id: string;
  projectId: string;
  fileUrl: string;
  duration: number;
  startTime: number;
  endTime: number;
  type: 'video' | 'image' | 'audio';
  effects: Effect[];
  transitions: Transition[];
  metadata: any;
}

/**
 * Effect information
 */
export interface Effect {
  id: string;
  name: string;
  category: string;
  description?: string;
  duration: number;
  thumbnail?: string;
  parameters: { [key: string]: any };
  compatible: boolean;
  premium: boolean;
  metadata: any;
}

/**
 * Transition information
 */
export interface Transition {
  id: string;
  name: string;
  duration: number;
  type: string;
  thumbnail?: string;
  metadata: any;
}

/**
 * Music track information
 */
export interface Music {
  id: string;
  title: string;
  artist: string;
  genre: string;
  mood: string;
  duration: number;
  tempo: number;
  audioUrl: string;
  waveform?: number[];
  free: boolean;
  metadata: any;
}

/**
 * Template information
 */
export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  width: number;
  height: number;
  duration: number;
  trending: boolean;
  premium: boolean;
  tags: string[];
  metadata: any;
}

/**
 * Filter information
 */
export interface Filter {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  intensity: number;
  premium: boolean;
  metadata: any;
}

/**
 * Export job information
 */
export interface ExportJob {
  jobId: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: string;
  resolution: string;
  quality: string;
  outputPath: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

/**
 * CapCut configuration
 */
export interface CapCutConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  userId: string;
  apiVersion?: string;
  timeout?: number;
}

/**
 * CapCut Client for API interaction
 */
export class CapCutClient {
  private config: CapCutConfig;
  private client: AxiosInstance;
  private baseUrl = 'https://api.capcut.com';

  constructor(config: CapCutConfig) {
    this.config = {
      apiVersion: 'v1',
      timeout: 30000,
      ...config,
    };

    this.client = axios.create({
      baseURL: `${this.baseUrl}/${this.config.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: this.config.timeout,
    });
  }

  /**
   * Detect account tier and capabilities
   */
  async detectAccountTier(): Promise<AccountTier> {
    try {
      const response = await this.client.get(`/users/${this.config.userId}/account`);
      const accountType = response.data?.accountType || 'free';

      const tierMap: { [key: string]: AccountTier } = {
        free: {
          tier: 'Free',
          storage: 5,
          storageUnit: 'GB',
          maxResolution: '1080p',
          watermark: true,
          maxBatchPerDay: 5,
          features: [
            'Basic editing',
            'Limited effects (100+)',
            'Limited music (5000)',
            'Basic filters (50)',
            'Standard export',
            'Up to 1080p resolution',
          ],
          supportLevel: 'Community',
        },
        pro: {
          tier: 'Pro',
          storage: 100,
          storageUnit: 'GB',
          maxResolution: '4K',
          watermark: false,
          maxBatchPerDay: 50,
          features: [
            'Advanced editing',
            'Full effects (1000+)',
            'Full music library (50000+)',
            'Premium filters (200+)',
            'Priority export',
            'Up to 4K resolution',
            'Batch processing',
            'Advanced API access',
          ],
          supportLevel: 'Email',
        },
        business: {
          tier: 'Business',
          storage: 1000,
          storageUnit: 'GB',
          maxResolution: '8K',
          watermark: false,
          maxBatchPerDay: 9999,
          features: [
            'All Pro features',
            'Team collaboration',
            'Custom branding',
            'Advanced API access',
            'Up to 8K resolution',
            'Unlimited batch processing',
            'Priority support',
            'Enterprise integrations',
          ],
          supportLevel: '24/7 Priority',
        },
      };

      return tierMap[accountType] || tierMap['free'];
    } catch (error) {
      throw new Error(`Failed to detect account tier: ${error}`);
    }
  }

  /**
   * Verify API credentials are valid
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      await this.client.get(`/users/${this.config.userId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.client.get(`/users/${this.config.userId}/account`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error}`);
    }
  }

  /**
   * Create new project
   */
  async createProject(options: {
    name: string;
    description?: string;
    width?: number;
    height?: number;
    fps?: number;
    tags?: string[];
  }): Promise<Project> {
    try {
      const response = await this.client.post('/projects', {
        name: options.name,
        description: options.description || '',
        width: options.width || 1920,
        height: options.height || 1080,
        fps: options.fps || 30,
        tags: options.tags || [],
      });
      return this.mapProject(response.data);
    } catch (error) {
      throw new Error(`Failed to create project: ${error}`);
    }
  }

  /**
   * List projects
   */
  async listProjects(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    filterBy?: string;
  }): Promise<Project[]> {
    try {
      const response = await this.client.get('/projects', {
        params: {
          limit: options?.limit || 10,
          offset: options?.offset || 0,
          sortBy: options?.sortBy || 'modified',
          filterBy: options?.filterBy || 'all',
        },
      });
      return response.data.map((p: any) => this.mapProject(p));
    } catch (error) {
      throw new Error(`Failed to list projects: ${error}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<Project> {
    try {
      const response = await this.client.get(`/projects/${id}`);
      return this.mapProject(response.data);
    } catch (error) {
      throw new Error(`Failed to get project: ${error}`);
    }
  }

  /**
   * Update project
   */
  async updateProject(id: string, updates: Partial<any>): Promise<Project> {
    try {
      const response = await this.client.patch(`/projects/${id}`, updates);
      return this.mapProject(response.data);
    } catch (error) {
      throw new Error(`Failed to update project: ${error}`);
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<void> {
    try {
      await this.client.delete(`/projects/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete project: ${error}`);
    }
  }

  /**
   * Add clip to project
   */
  async addClip(projectId: string, clipData: {
    fileUrl: string;
    type: 'video' | 'image' | 'audio';
    duration: number;
    startTime?: number;
  }): Promise<Clip> {
    try {
      const response = await this.client.post(`/projects/${projectId}/clips`, {
        fileUrl: clipData.fileUrl,
        type: clipData.type,
        duration: clipData.duration,
        startTime: clipData.startTime || 0,
      });
      return this.mapClip(response.data);
    } catch (error) {
      throw new Error(`Failed to add clip: ${error}`);
    }
  }

  /**
   * Apply effect to clip
   */
  async applyEffect(
    projectId: string,
    clipId: string,
    effectId: string,
    options?: { [key: string]: any }
  ): Promise<Clip> {
    try {
      const response = await this.client.post(
        `/projects/${projectId}/clips/${clipId}/effects`,
        {
          effectId,
          parameters: options || {},
        }
      );
      return this.mapClip(response.data);
    } catch (error) {
      throw new Error(`Failed to apply effect: ${error}`);
    }
  }

  /**
   * Add text overlay
   */
  async addText(projectId: string, textData: {
    content: string;
    fontSize: number;
    color: string;
    position: { x: number; y: number };
    duration: number;
    startTime?: number;
  }): Promise<any> {
    try {
      const response = await this.client.post(`/projects/${projectId}/text`, {
        content: textData.content,
        fontSize: textData.fontSize,
        color: textData.color,
        position: textData.position,
        duration: textData.duration,
        startTime: textData.startTime || 0,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add text: ${error}`);
    }
  }

  /**
   * Add music to project
   */
  async addMusic(
    projectId: string,
    musicId: string,
    options?: { volume?: number; startTime?: number; fadeIn?: number; fadeOut?: number }
  ): Promise<Music> {
    try {
      const response = await this.client.post(`/projects/${projectId}/music`, {
        musicId,
        volume: options?.volume || 1,
        startTime: options?.startTime || 0,
        fadeIn: options?.fadeIn || 0,
        fadeOut: options?.fadeOut || 0,
      });
      return this.mapMusic(response.data);
    } catch (error) {
      throw new Error(`Failed to add music: ${error}`);
    }
  }

  /**
   * List effects
   */
  async listEffects(options?: {
    category?: string;
    limit?: number;
    search?: string;
  }): Promise<Effect[]> {
    try {
      const response = await this.client.get('/effects', {
        params: {
          category: options?.category,
          limit: options?.limit || 20,
          search: options?.search,
        },
      });
      return response.data.map((e: any) => this.mapEffect(e));
    } catch (error) {
      throw new Error(`Failed to list effects: ${error}`);
    }
  }

  /**
   * List music tracks
   */
  async listMusic(options?: {
    genre?: string;
    mood?: string;
    limit?: number;
  }): Promise<Music[]> {
    try {
      const response = await this.client.get('/music', {
        params: {
          genre: options?.genre,
          mood: options?.mood,
          limit: options?.limit || 20,
        },
      });
      return response.data.map((m: any) => this.mapMusic(m));
    } catch (error) {
      throw new Error(`Failed to list music: ${error}`);
    }
  }

  /**
   * Search music
   */
  async searchMusic(keyword: string): Promise<Music[]> {
    try {
      const response = await this.client.get('/music/search', {
        params: { q: keyword },
      });
      return response.data.map((m: any) => this.mapMusic(m));
    } catch (error) {
      throw new Error(`Failed to search music: ${error}`);
    }
  }

  /**
   * List filters
   */
  async listFilters(category?: string): Promise<Filter[]> {
    try {
      const response = await this.client.get('/filters', {
        params: { category },
      });
      return response.data.map((f: any) => this.mapFilter(f));
    } catch (error) {
      throw new Error(`Failed to list filters: ${error}`);
    }
  }

  /**
   * List templates
   */
  async listTemplates(options?: {
    category?: string;
    trending?: boolean;
    limit?: number;
  }): Promise<Template[]> {
    try {
      const response = await this.client.get('/templates', {
        params: {
          category: options?.category,
          trending: options?.trending,
          limit: options?.limit || 20,
        },
      });
      return response.data.map((t: any) => this.mapTemplate(t));
    } catch (error) {
      throw new Error(`Failed to list templates: ${error}`);
    }
  }

  /**
   * Get template details
   */
  async getTemplate(id: string): Promise<Template> {
    try {
      const response = await this.client.get(`/templates/${id}`);
      return this.mapTemplate(response.data);
    } catch (error) {
      throw new Error(`Failed to get template: ${error}`);
    }
  }

  /**
   * Apply template to project
   */
  async applyTemplate(projectId: string, templateId: string): Promise<Project> {
    try {
      const response = await this.client.post(`/projects/${projectId}/apply-template`, {
        templateId,
      });
      return this.mapProject(response.data);
    } catch (error) {
      throw new Error(`Failed to apply template: ${error}`);
    }
  }

  /**
   * Export video
   */
  async exportVideo(projectId: string, options: {
    format: string;
    resolution: string;
    quality: string;
    outputPath?: string;
    preset?: string;
  }): Promise<ExportJob> {
    try {
      const response = await this.client.post(`/projects/${projectId}/export`, {
        format: options.format,
        resolution: options.resolution,
        quality: options.quality,
        outputPath: options.outputPath,
        preset: options.preset,
      });
      return this.mapExportJob(response.data);
    } catch (error) {
      throw new Error(`Failed to export video: ${error}`);
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(jobId: string): Promise<ExportJob> {
    try {
      const response = await this.client.get(`/export/${jobId}`);
      return this.mapExportJob(response.data);
    } catch (error) {
      throw new Error(`Failed to get export status: ${error}`);
    }
  }

  /**
   * Map API project response
   */
  private mapProject(data: any): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt,
      modifiedAt: data.modifiedAt,
      width: data.width,
      height: data.height,
      fps: data.fps,
      duration: data.duration || 0,
      status: data.status,
      coverUrl: data.coverUrl,
      tags: data.tags || [],
      clips: (data.clips || []).map((c: any) => this.mapClip(c)),
      metadata: data.metadata || {},
    };
  }

  /**
   * Map API clip response
   */
  private mapClip(data: any): Clip {
    return {
      id: data.id,
      projectId: data.projectId,
      fileUrl: data.fileUrl,
      duration: data.duration,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      effects: (data.effects || []).map((e: any) => this.mapEffect(e)),
      transitions: (data.transitions || []).map((t: any) => this.mapTransition(t)),
      metadata: data.metadata || {},
    };
  }

  /**
   * Map API effect response
   */
  private mapEffect(data: any): Effect {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      description: data.description,
      duration: data.duration,
      thumbnail: data.thumbnail,
      parameters: data.parameters || {},
      compatible: data.compatible ?? true,
      premium: data.premium ?? false,
      metadata: data.metadata || {},
    };
  }

  /**
   * Map API transition response
   */
  private mapTransition(data: any): Transition {
    return {
      id: data.id,
      name: data.name,
      duration: data.duration,
      type: data.type,
      thumbnail: data.thumbnail,
      metadata: data.metadata || {},
    };
  }

  /**
   * Map API music response
   */
  private mapMusic(data: any): Music {
    return {
      id: data.id,
      title: data.title,
      artist: data.artist,
      genre: data.genre,
      mood: data.mood,
      duration: data.duration,
      tempo: data.tempo,
      audioUrl: data.audioUrl,
      waveform: data.waveform,
      free: data.free ?? true,
      metadata: data.metadata || {},
    };
  }

  /**
   * Map API template response
   */
  private mapTemplate(data: any): Template {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      description: data.description,
      thumbnail: data.thumbnail,
      width: data.width,
      height: data.height,
      duration: data.duration,
      trending: data.trending ?? false,
      premium: data.premium ?? false,
      tags: data.tags || [],
      metadata: data.metadata || {},
    };
  }

  /**
   * Map API filter response
   */
  private mapFilter(data: any): Filter {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      thumbnail: data.thumbnail,
      intensity: data.intensity,
      premium: data.premium ?? false,
      metadata: data.metadata || {},
    };
  }

  /**
   * Map API export job response
   */
  private mapExportJob(data: any): ExportJob {
    return {
      jobId: data.jobId,
      projectId: data.projectId,
      status: data.status,
      progress: data.progress,
      format: data.format,
      resolution: data.resolution,
      quality: data.quality,
      outputPath: data.outputPath,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
      error: data.error,
    };
  }
}
