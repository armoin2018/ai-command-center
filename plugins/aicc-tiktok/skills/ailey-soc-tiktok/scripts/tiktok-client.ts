import axios, { AxiosInstance, AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import FormData from 'form-data';
import mime from 'mime-types';

dotenv.config();

export interface TikTokConfig {
  clientKey: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  apiVersion?: string;
}

export interface TikTokAPITier {
  tier: 'login' | 'display' | 'content' | 'marketing' | 'research' | 'unknown';
  tierName: string;
  canUploadVideos: boolean;
  canAccessAnalytics: boolean;
  canManageComments: boolean;
  canAccessMarketing: boolean;
  approvalRequired: boolean;
  features: string[];
}

export interface VideoUploadOptions {
  videoFile: string;
  caption?: string;
  privacy?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
}

export interface UserInfo {
  open_id: string;
  union_id: string;
  avatar_url?: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name?: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface VideoInfo {
  id: string;
  create_time: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration?: number;
  height?: number;
  width?: number;
  title?: string;
  embed_html?: string;
  embed_link?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

export class TikTokClient {
  private client: AxiosInstance;
  private config: TikTokConfig;
  private apiTier: TikTokAPITier | null = null;

  constructor(config: TikTokConfig) {
    this.config = config;
    const apiVersion = config.apiVersion || 'v2';
    
    this.client = axios.create({
      baseURL: `https://open.tiktokapis.com/${apiVersion}`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth header if access token available
    if (config.accessToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.accessToken}`;
    }
  }

  // ============================================================================
  // API TIER DETECTION
  // ============================================================================

  /**
   * Detect API access tier and available features
   */
  async detectAPITier(): Promise<TikTokAPITier> {
    if (!this.config.accessToken) {
      return {
        tier: 'unknown',
        tierName: 'No Access Token',
        canUploadVideos: false,
        canAccessAnalytics: false,
        canManageComments: false,
        canAccessMarketing: false,
        approvalRequired: true,
        features: ['OAuth authentication required']
      };
    }

    const capabilities = {
      canGetUserInfo: false,
      canListVideos: false,
      canUploadVideos: false,
      canGetAnalytics: false,
      canManageComments: false
    };

    // Test user.info (Login Kit - always available)
    try {
      await this.client.get('/user/info/', {
        params: { fields: 'open_id,display_name' }
      });
      capabilities.canGetUserInfo = true;
    } catch (error) {
      // Login Kit not working
    }

    // Test video.list (Display API)
    try {
      await this.client.post('/video/list/', {
        max_count: 1
      });
      capabilities.canListVideos = true;
    } catch (error) {
      // Display API not available
    }

    // Test video.upload (Content Posting API - requires approval)
    try {
      await this.client.post('/post/publish/video/init/', {});
      capabilities.canUploadVideos = true;
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.data?.error?.code === 'access_token_invalid') {
        // Expected - need approval
      }
    }

    // Determine tier based on capabilities
    let tier: TikTokAPITier;

    if (capabilities.canUploadVideos) {
      tier = {
        tier: 'content',
        tierName: 'Content Posting API',
        canUploadVideos: true,
        canAccessAnalytics: true,
        canManageComments: true,
        canAccessMarketing: false,
        approvalRequired: false,
        features: [
          'OAuth authentication',
          'User profile access',
          'Video uploads',
          'Video management',
          'Analytics & insights',
          'Comment management',
          'Video queries'
        ]
      };
    } else if (capabilities.canListVideos) {
      tier = {
        tier: 'display',
        tierName: 'Display API',
        canUploadVideos: false,
        canAccessAnalytics: false,
        canManageComments: false,
        canAccessMarketing: false,
        approvalRequired: true,
        features: [
          'OAuth authentication',
          'User profile access',
          'Display user videos',
          'Video embeds'
        ]
      };
    } else if (capabilities.canGetUserInfo) {
      tier = {
        tier: 'login',
        tierName: 'Login Kit',
        canUploadVideos: false,
        canAccessAnalytics: false,
        canManageComments: false,
        canAccessMarketing: false,
        approvalRequired: true,
        features: [
          'OAuth authentication',
          'Basic user info (name, avatar)',
          'User consent management'
        ]
      };
    } else {
      tier = {
        tier: 'unknown',
        tierName: 'No API Access',
        canUploadVideos: false,
        canAccessAnalytics: false,
        canManageComments: false,
        canAccessMarketing: false,
        approvalRequired: true,
        features: ['Invalid or expired access token']
      };
    }

    this.apiTier = tier;
    return tier;
  }

  /**
   * Get current API tier (cached)
   */
  getAPITier(): TikTokAPITier | null {
    return this.apiTier;
  }

  /**
   * Require specific API tier for operation
   */
  private requireTier(requiredTier: 'login' | 'display' | 'content' | 'marketing'): void {
    if (!this.apiTier) {
      throw new Error('API tier not detected. Run detectAPITier() first or use "npm run tiktok detect".');
    }

    const tierHierarchy = ['login', 'display', 'content', 'marketing'];
    const currentIndex = tierHierarchy.indexOf(this.apiTier.tier);
    const requiredIndex = tierHierarchy.indexOf(requiredTier);

    if (currentIndex < requiredIndex) {
      const messages: Record<string, string> = {
        display: 'This feature requires Display API access. Apply at https://developers.tiktok.com/apps/',
        content: 'This feature requires Content Posting API approval. Apply at https://developers.tiktok.com/apps/ and request video upload permissions.',
        marketing: 'This feature requires TikTok Marketing Partner status. Apply at https://ads.tiktok.com/marketing_api/'
      };
      throw new Error(messages[requiredTier] || 'Insufficient API access for this operation.');
    }
  }

  // ============================================================================
  // USER OPERATIONS (Login Kit - Tier 1)
  // ============================================================================

  /**
   * Get user information
   */
  async getUserInfo(fields?: string[]): Promise<UserInfo> {
    try {
      const defaultFields = ['open_id', 'union_id', 'avatar_url', 'display_name'];
      const requestFields = fields || defaultFields;

      const response = await this.client.get('/user/info/', {
        params: {
          fields: requestFields.join(',')
        }
      });

      return response.data.data.user;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================================================
  // VIDEO OPERATIONS (Display API - Tier 2, Content API - Tier 3)
  // ============================================================================

  /**
   * List user's videos
   */
  async listVideos(maxCount: number = 20): Promise<VideoInfo[]> {
    this.requireTier('display');
    
    try {
      const response = await this.client.post('/video/list/', {
        max_count: maxCount
      });

      return response.data.data.videos || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Query video information by IDs
   */
  async queryVideos(videoIds: string[], fields?: string[]): Promise<VideoInfo[]> {
    this.requireTier('display');
    
    try {
      const defaultFields = ['id', 'create_time', 'cover_image_url', 'share_url', 'video_description'];
      const requestFields = fields || defaultFields;

      const response = await this.client.post('/video/query/', {
        filters: {
          video_ids: videoIds
        },
        fields: requestFields
      });

      return response.data.data.videos || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Upload video to TikTok
   */
  async uploadVideo(options: VideoUploadOptions): Promise<any> {
    this.requireTier('content');
    
    try {
      if (!fs.existsSync(options.videoFile)) {
        throw new Error(`Video file not found: ${options.videoFile}`);
      }

      const fileSize = fs.statSync(options.videoFile).size;
      const chunkSize = 10 * 1024 * 1024; // 10MB chunks
      const totalChunks = Math.ceil(fileSize / chunkSize);

      // Step 1: Initialize upload
      const initResponse = await this.client.post('/post/publish/video/init/', {
        post_info: {
          title: options.caption || '',
          privacy_level: options.privacy || 'PUBLIC_TO_EVERYONE',
          disable_comment: options.disableComment || false,
          disable_duet: options.disableDuet || false,
          disable_stitch: options.disableStitch || false
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: fileSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunks
        }
      });

      const publishId = initResponse.data.data.publish_id;
      const uploadUrl = initResponse.data.data.upload_url;

      // Step 2: Upload video chunks
      const fileStream = fs.createReadStream(options.videoFile, { highWaterMark: chunkSize });
      let chunkNumber = 0;

      for await (const chunk of fileStream) {
        const formData = new FormData();
        formData.append('video', chunk, {
          filename: `chunk_${chunkNumber}.mp4`,
          contentType: 'video/mp4'
        });

        await axios.put(uploadUrl, formData, {
          headers: {
            ...formData.getHeaders(),
            'Content-Range': `bytes ${chunkNumber * chunkSize}-${Math.min((chunkNumber + 1) * chunkSize, fileSize) - 1}/${fileSize}`
          }
        });

        chunkNumber++;
      }

      // Step 3: Confirm upload
      const confirmResponse = await this.client.post('/post/publish/status/fetch/', {
        publish_id: publishId
      });

      return {
        publish_id: publishId,
        status: confirmResponse.data.data.status,
        video_id: confirmResponse.data.data.video_id
      };

    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================================================
  // ANALYTICS (Content API - Tier 3)
  // ============================================================================

  /**
   * Get video analytics
   */
  async getVideoAnalytics(videoIds: string[], fields?: string[]): Promise<any> {
    this.requireTier('content');
    
    try {
      const defaultFields = ['like_count', 'comment_count', 'share_count', 'view_count'];
      const requestFields = fields || defaultFields;

      const response = await this.client.post('/video/query/', {
        filters: {
          video_ids: videoIds
        },
        fields: requestFields
      });

      return response.data.data.videos || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================================================
  // COMMENTS (Content API - Tier 3)
  // ============================================================================

  /**
   * List comments on a video
   */
  async listComments(videoId: string, maxCount: number = 20): Promise<any[]> {
    this.requireTier('content');
    
    try {
      const response = await this.client.post('/comment/list/', {
        video_id: videoId,
        max_count: maxCount
      });

      return response.data.data.comments || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(videoId: string, commentId: string, text: string): Promise<any> {
    this.requireTier('content');
    
    try {
      const response = await this.client.post('/comment/reply/', {
        video_id: videoId,
        comment_id: commentId,
        text: text
      });

      return response.data.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Test API connection and detect tier
   */
  async testConnection(): Promise<{ user: UserInfo; tier: TikTokAPITier }> {
    const tier = await this.detectAPITier();
    const user = await this.getUserInfo();
    return { user, tier };
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        switch (status) {
          case 401:
            throw new Error('Authentication failed. Access token is invalid or expired.');
          case 403:
            throw new Error(`Permission denied. ${data.error?.message || 'This feature may require API approval or higher tier access.'}`);
          case 404:
            throw new Error('Resource not found.');
          case 429:
            throw new Error('Rate limit exceeded. Please wait before retrying.');
          default:
            throw new Error(`TikTok API error (${status}): ${data.error?.message || JSON.stringify(data)}`);
        }
      } else if (axiosError.request) {
        throw new Error('No response from TikTok API. Check your internet connection.');
      }
    }
    throw new Error(`Unexpected error: ${error.message}`);
  }
}

/**
 * Load configuration from environment
 */
export function loadConfig(): TikTokConfig {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
  
  if (!clientKey || !clientSecret) {
    throw new Error('TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET not set. Run "npm run tiktok setup" for instructions.');
  }

  return {
    clientKey,
    clientSecret,
    accessToken,
    refreshToken,
    apiVersion: process.env.TIKTOK_API_VERSION || 'v2'
  };
}
