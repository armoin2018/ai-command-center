#!/usr/bin/env node

import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
export interface FacebookConfig {
  accessToken: string;
  apiVersion?: string;
  pageId?: string; // For business features
  userId?: string; // For personal features
}

export interface PostOptions {
  message?: string;
  link?: string;
  photoUrl?: string;
  videoUrl?: string;
  scheduled?: Date;
  published?: boolean;
  targeting?: any;
}

export interface AdCampaignOptions {
  name: string;
  objective: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  bidStrategy?: string;
}

export interface InsightsOptions {
  metric: string[];
  period: 'day' | 'week' | 'days_28' | 'month' | 'lifetime';
  since?: string;
  until?: string;
}

/**
 * Facebook Graph API Client
 * Supports both personal and business features
 */
export class FacebookClient {
  private client: AxiosInstance;
  private config: FacebookConfig;
  private apiVersion: string;

  constructor(config: FacebookConfig) {
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
  // PERSONAL FEATURES
  // ============================================================================

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string = 'me', fields?: string[]): Promise<any> {
    try {
      const fieldList = fields?.join(',') || 'id,name,email,picture';
      const response = await this.client.get(`/${userId}`, {
        params: { fields: fieldList }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a post on user's timeline
   */
  async createPost(options: PostOptions): Promise<any> {
    try {
      const userId = this.config.userId || 'me';
      const response = await this.client.post(`/${userId}/feed`, {
        message: options.message,
        link: options.link,
        published: options.published !== false,
        scheduled_publish_time: options.scheduled ? Math.floor(options.scheduled.getTime() / 1000) : undefined
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload photo to user's timeline or album
   */
  async uploadPhoto(photoPath: string, message?: string, albumId?: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('source', fs.createReadStream(photoPath));
      if (message) formData.append('message', message);
      
      const endpoint = albumId ? `/${albumId}/photos` : '/me/photos';
      const response = await this.client.post(endpoint, formData, {
        headers: formData.getHeaders()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user's friends list
   */
  async getFriends(userId: string = 'me', limit: number = 25): Promise<any> {
    try {
      const response = await this.client.get(`/${userId}/friends`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user's groups
   */
  async getGroups(userId: string = 'me'): Promise<any> {
    try {
      const response = await this.client.get(`/${userId}/groups`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Post to a group
   */
  async postToGroup(groupId: string, message: string, link?: string): Promise<any> {
    try {
      const response = await this.client.post(`/${groupId}/feed`, {
        message,
        link
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user's events
   */
  async getEvents(userId: string = 'me'): Promise<any> {
    try {
      const response = await this.client.get(`/${userId}/events`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create an event
   */
  async createEvent(name: string, startTime: Date, description?: string, location?: string): Promise<any> {
    try {
      const response = await this.client.post('/me/events', {
        name,
        start_time: startTime.toISOString(),
        description,
        location
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // BUSINESS FEATURES - PAGE MANAGEMENT
  // ============================================================================

  /**
   * Get pages managed by user
   */
  async getPages(): Promise<any> {
    try {
      const response = await this.client.get('/me/accounts');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Publish post to page
   */
  async publishToPage(pageId: string, options: PostOptions): Promise<any> {
    try {
      const response = await this.client.post(`/${pageId}/feed`, {
        message: options.message,
        link: options.link,
        published: options.published !== false,
        scheduled_publish_time: options.scheduled ? Math.floor(options.scheduled.getTime() / 1000) : undefined
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get page posts with pagination
   */
  async getPagePosts(pageId: string, limit: number = 25): Promise<any> {
    try {
      const response = await this.client.get(`/${pageId}/posts`, {
        params: { 
          limit,
          fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get page insights (analytics)
   */
  async getPageInsights(pageId: string, options: InsightsOptions): Promise<any> {
    try {
      const response = await this.client.get(`/${pageId}/insights`, {
        params: {
          metric: options.metric.join(','),
          period: options.period,
          since: options.since,
          until: options.until
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // BUSINESS FEATURES - ADVERTISING
  // ============================================================================

  /**
   * Get ad accounts
   */
  async getAdAccounts(): Promise<any> {
    try {
      const response = await this.client.get('/me/adaccounts', {
        params: {
          fields: 'id,name,account_status,currency,timezone_name'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create ad campaign
   */
  async createCampaign(adAccountId: string, options: AdCampaignOptions): Promise<any> {
    try {
      const response = await this.client.post(`/${adAccountId}/campaigns`, {
        name: options.name,
        objective: options.objective,
        status: options.status,
        daily_budget: options.dailyBudget,
        lifetime_budget: options.lifetimeBudget,
        bid_strategy: options.bidStrategy || 'LOWEST_COST_WITHOUT_CAP'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get campaign performance
   */
  async getCampaignInsights(campaignId: string, fields?: string[]): Promise<any> {
    try {
      const fieldList = fields?.join(',') || 'impressions,clicks,spend,reach,ctr,cpc,cpp';
      const response = await this.client.get(`/${campaignId}/insights`, {
        params: { fields: fieldList }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all campaigns for ad account
   */
  async getCampaigns(adAccountId: string, limit: number = 25): Promise<any> {
    try {
      const response = await this.client.get(`/${adAccountId}/campaigns`, {
        params: { 
          limit,
          fields: 'id,name,objective,status,daily_budget,lifetime_budget'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // BUSINESS FEATURES - LEAD GENERATION
  // ============================================================================

  /**
   * Get lead gen forms
   */
  async getLeadForms(pageId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${pageId}/leadgen_forms`, {
        params: {
          fields: 'id,name,status,leads_count'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get leads from a form
   */
  async getLeads(formId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${formId}/leads`, {
        params: {
          fields: 'id,created_time,field_data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // BUSINESS FEATURES - INSTAGRAM BUSINESS
  // ============================================================================

  /**
   * Get Instagram business account
   */
  async getInstagramAccount(pageId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${pageId}`, {
        params: { fields: 'instagram_business_account' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Publish to Instagram
   */
  async publishToInstagram(instagramAccountId: string, imageUrl: string, caption?: string): Promise<any> {
    try {
      // Create media container
      const container = await this.client.post(`/${instagramAccountId}/media`, {
        image_url: imageUrl,
        caption
      });

      // Publish the container
      const response = await this.client.post(`/${instagramAccountId}/media_publish`, {
        creation_id: container.data.id
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get Instagram insights
   */
  async getInstagramInsights(instagramAccountId: string, metrics: string[]): Promise<any> {
    try {
      const response = await this.client.get(`/${instagramAccountId}/insights`, {
        params: {
          metric: metrics.join(','),
          period: 'day'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // MESSENGER
  // ============================================================================

  /**
   * Send message via Messenger
   */
  async sendMessage(recipientId: string, message: string): Promise<any> {
    try {
      const response = await this.client.post('/me/messages', {
        recipient: { id: recipientId },
        message: { text: message }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get conversations
   */
  async getConversations(pageId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${pageId}/conversations`, {
        params: {
          fields: 'id,updated_time,message_count,unread_count,participants'
        }
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
      await this.getUserProfile();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get long-lived access token from short-lived token
   */
  async getLongLivedToken(appId: string, appSecret: string, shortLivedToken: string): Promise<any> {
    try {
      const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
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
        const message = data.error?.message || 'Facebook API error';
        const code = data.error?.code || axiosError.response.status;
        return new Error(`Facebook API Error ${code}: ${message}`);
      }
      return new Error(`Facebook API Error: ${axiosError.message}`);
    }
    return error as Error;
  }
}

/**
 * Load Facebook configuration from environment
 */
export function loadConfig(): FacebookConfig {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('FACEBOOK_ACCESS_TOKEN is required in environment variables');
  }

  return {
    accessToken,
    apiVersion: process.env.FACEBOOK_API_VERSION || 'v18.0',
    pageId: process.env.FACEBOOK_PAGE_ID,
    userId: process.env.FACEBOOK_USER_ID
  };
}
