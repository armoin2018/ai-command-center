#!/usr/bin/env node

import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mime from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from multiple locations
const envPaths = [
  path.join(process.env.HOME || '', '.vscode', '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '.env.local')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
  }
}

// Configuration interfaces
export interface InstagramConfig {
  accessToken: string;
  apiVersion?: string;
  accountId?: string; // Instagram Business Account ID
  pageId?: string; // Linked Facebook Page ID
}

export interface MediaOptions {
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  locationId?: string;
  userTags?: Array<{ username: string; x: number; y: number }>;
  productTags?: string[];
  collaborators?: string[];
}

export interface StoryOptions {
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  caption?: string;
  link?: string; // Swipe-up link (requires eligibility)
}

export interface InsightsOptions {
  metric: string[];
  period: 'day' | 'week' | 'days_28' | 'month' | 'lifetime';
  since?: string;
  until?: string;
  breakdown?: string;
}

export interface HashtagInsights {
  id: string;
  name: string;
  mediaCount?: number;
  topPosts?: any[];
}

/**
 * Instagram Graph API Client
 * Comprehensive Instagram integration for Business and Creator accounts
 */
export class InstagramClient {
  private client: AxiosInstance;
  private config: InstagramConfig;
  private apiVersion: string;

  constructor(config: InstagramConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || 'v18.0';
    
    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ============================================================================
  // ACCOUNT MANAGEMENT
  // ============================================================================

  /**
   * Get Instagram Business Account information
   */
  async getAccount(fields?: string[]): Promise<any> {
    try {
      const accountId = this.config.accountId || 'me';
      const fieldList = fields?.join(',') || 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website';
      
      const response = await this.client.get(`/${accountId}`, {
        params: { fields: fieldList }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get Instagram account from Facebook Page
   */
  async getAccountFromPage(pageId?: string): Promise<any> {
    try {
      const pid = pageId || this.config.pageId;
      if (!pid) {
        throw new Error('Page ID is required');
      }
      
      const response = await this.client.get(`/${pid}`, {
        params: { fields: 'instagram_business_account' }
      });
      return response.data.instagram_business_account;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // CONTENT PUBLISHING - PHOTOS
  // ============================================================================

  /**
   * Publish a photo post
   */
  async publishPhoto(imageUrl: string, options: MediaOptions = {}): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      // Step 1: Create media container
      const containerData: any = {
        image_url: imageUrl,
        caption: options.caption
      };

      if (options.locationId) containerData.location_id = options.locationId;
      if (options.userTags) containerData.user_tags = JSON.stringify(options.userTags);
      if (options.productTags) containerData.product_tags = JSON.stringify(options.productTags);

      const container = await this.client.post(`/${accountId}/media`, containerData);

      // Step 2: Publish the container
      const published = await this.client.post(`/${accountId}/media_publish`, {
        creation_id: container.data.id
      });

      return published.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Publish a carousel post (multiple images/videos)
   */
  async publishCarousel(mediaItems: Array<{ imageUrl?: string; videoUrl?: string; isVideo?: boolean }>, caption?: string): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      // Step 1: Create containers for each media item
      const itemContainers = await Promise.all(
        mediaItems.map(item => {
          const data: any = { is_carousel_item: true };
          if (item.videoUrl) {
            data.media_type = 'VIDEO';
            data.video_url = item.videoUrl;
          } else {
            data.image_url = item.imageUrl;
          }
          return this.client.post(`/${accountId}/media`, data);
        })
      );

      const itemIds = itemContainers.map(c => c.data.id);

      // Step 2: Create carousel container
      const carouselContainer = await this.client.post(`/${accountId}/media`, {
        media_type: 'CAROUSEL',
        children: itemIds.join(','),
        caption
      });

      // Step 3: Publish carousel
      const published = await this.client.post(`/${accountId}/media_publish`, {
        creation_id: carouselContainer.data.id
      });

      return published.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Publish a video post
   */
  async publishVideo(videoUrl: string, options: MediaOptions = {}): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      // Step 1: Create media container
      const containerData: any = {
        media_type: 'VIDEO',
        video_url: videoUrl,
        caption: options.caption
      };

      if (options.locationId) containerData.location_id = options.locationId;
      if (options.productTags) containerData.product_tags = JSON.stringify(options.productTags);

      const container = await this.client.post(`/${accountId}/media`, containerData);

      // Step 2: Publish the container
      const published = await this.client.post(`/${accountId}/media_publish`, {
        creation_id: container.data.id
      });

      return published.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Publish a Reel
   */
  async publishReel(videoUrl: string, caption?: string, coverUrl?: string, shareToFeed: boolean = true): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      const containerData: any = {
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        share_to_feed: shareToFeed
      };

      if (coverUrl) containerData.thumb_offset = coverUrl;

      // Step 1: Create media container
      const container = await this.client.post(`/${accountId}/media`, containerData);

      // Step 2: Publish the container
      const published = await this.client.post(`/${accountId}/media_publish`, {
        creation_id: container.data.id
      });

      return published.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Publish a Story
   */
  async publishStory(options: StoryOptions): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      const containerData: any = {
        media_type: 'STORIES',
        [options.mediaType === 'IMAGE' ? 'image_url' : 'video_url']: options.mediaUrl
      };

      // Step 1: Create media container
      const container = await this.client.post(`/${accountId}/media`, containerData);

      // Step 2: Publish the container
      const published = await this.client.post(`/${accountId}/media_publish`, {
        creation_id: container.data.id
      });

      return published.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // CONTENT MANAGEMENT
  // ============================================================================

  /**
   * Get media details
   */
  async getMedia(mediaId: string, fields?: string[]): Promise<any> {
    try {
      const fieldList = fields?.join(',') || 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count';
      
      const response = await this.client.get(`/${mediaId}`, {
        params: { fields: fieldList }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get account's media
   */
  async getAccountMedia(limit: number = 25, fields?: string[]): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      const fieldList = fields?.join(',') || 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
      
      const response = await this.client.get(`/${accountId}/media`, {
        params: { 
          limit,
          fields: fieldList
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update media caption
   */
  async updateCaption(mediaId: string, caption: string): Promise<any> {
    try {
      const response = await this.client.post(`/${mediaId}`, {
        caption
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId: string): Promise<any> {
    try {
      const response = await this.client.delete(`/${mediaId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // ENGAGEMENT - COMMENTS
  // ============================================================================

  /**
   * Get comments on media
   */
  async getComments(mediaId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${mediaId}/comments`, {
        params: {
          fields: 'id,text,username,timestamp,like_count,replies'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, message: string): Promise<any> {
    try {
      const response = await this.client.post(`/${commentId}/replies`, {
        message
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<any> {
    try {
      const response = await this.client.delete(`/${commentId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Hide/unhide a comment
   */
  async hideComment(commentId: string, hide: boolean = true): Promise<any> {
    try {
      const response = await this.client.post(`/${commentId}`, {
        hide
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // ENGAGEMENT - MENTIONS
  // ============================================================================

  /**
   * Get mentions in stories and posts
   */
  async getMentions(limit: number = 25): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      const response = await this.client.get(`/${accountId}/tags`, {
        params: { 
          limit,
          fields: 'id,caption,media_type,media_url,permalink,timestamp'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // ANALYTICS & INSIGHTS
  // ============================================================================

  /**
   * Get account insights
   */
  async getAccountInsights(metrics: string[], period: string = 'day'): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      const response = await this.client.get(`/${accountId}/insights`, {
        params: {
          metric: metrics.join(','),
          period
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get media insights
   */
  async getMediaInsights(mediaId: string, metrics: string[]): Promise<any> {
    try {
      const response = await this.client.get(`/${mediaId}/insights`, {
        params: {
          metric: metrics.join(',')
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get story insights
   */
  async getStoryInsights(storyId: string): Promise<any> {
    try {
      const metrics = ['exits', 'impressions', 'reach', 'replies', 'taps_forward', 'taps_back'];
      const response = await this.client.get(`/${storyId}/insights`, {
        params: {
          metric: metrics.join(',')
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get audience demographics
   */
  async getAudienceDemographics(): Promise<any> {
    try {
      const accountId = this.config.accountId;
      if (!accountId) {
        throw new Error('Instagram Account ID is required');
      }

      const metrics = [
        'audience_gender_age',
        'audience_locale',
        'audience_country',
        'audience_city'
      ];

      const response = await this.client.get(`/${accountId}/insights`, {
        params: {
          metric: metrics.join(','),
          period: 'lifetime'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // HASHTAGS
  // ============================================================================

  /**
   * Search hashtags
   */
  async searchHashtags(query: string): Promise<any> {
    try {
      const response = await this.client.get('/ig_hashtag_search', {
        params: {
          user_id: this.config.accountId,
          q: query
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get hashtag information
   */
  async getHashtag(hashtagId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${hashtagId}`, {
        params: {
          fields: 'id,name'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get top media for hashtag
   */
  async getHashtagTopMedia(hashtagId: string, limit: number = 25): Promise<any> {
    try {
      const response = await this.client.get(`/${hashtagId}/top_media`, {
        params: {
          user_id: this.config.accountId,
          limit,
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get recent media for hashtag
   */
  async getHashtagRecentMedia(hashtagId: string, limit: number = 25): Promise<any> {
    try {
      const response = await this.client.get(`/${hashtagId}/recent_media`, {
        params: {
          user_id: this.config.accountId,
          limit,
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // SHOPPING & COMMERCE
  // ============================================================================

  /**
   * Get product catalog
   */
  async getProductCatalog(catalogId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${catalogId}/products`, {
        params: {
          fields: 'id,name,description,price,url,image_url,availability'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Tag products in media
   */
  async tagProducts(mediaId: string, productTags: Array<{ product_id: string; x: number; y: number }>): Promise<any> {
    try {
      const response = await this.client.post(`/${mediaId}`, {
        product_tags: JSON.stringify(productTags)
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccount(['id', 'username']);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const data: any = axiosError.response.data;
        const message = data.error?.message || 'Instagram API error';
        const code = data.error?.code || axiosError.response.status;
        return new Error(`Instagram API Error ${code}: ${message}`);
      }
      return new Error(`Instagram API Error: ${axiosError.message}`);
    }
    return error as Error;
  }
}

/**
 * Load Instagram configuration from environment
 */
export function loadConfig(): InstagramConfig {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN is required in environment variables');
  }

  return {
    accessToken,
    apiVersion: process.env.INSTAGRAM_API_VERSION || 'v18.0',
    accountId: process.env.INSTAGRAM_ACCOUNT_ID,
    pageId: process.env.FACEBOOK_PAGE_ID
  };
}
