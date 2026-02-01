import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

export type AccountType = 'PERSONAL' | 'CREATOR' | 'BUSINESS';

export interface ThreadsConfig {
  appId: string;
  appSecret: string;
  accessToken?: string;
  userId?: string;
  instagramAccountId?: string;
}

export interface AccountInfo {
  id: string;
  username: string;
  accountType: AccountType;
  permissions: string[];
  rateLimit: RateLimitInfo;
}

export interface RateLimitInfo {
  tier: AccountType;
  requestsPerHour: number;
  postsPerDay: number;
  repliesPerDay: number;
  used: number;
  remaining: number;
  resetTime: Date;
}

export interface PostOptions {
  text: string;
  mediaType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  imageUrl?: string;
  videoUrl?: string;
  imageUrls?: string[];
  altText?: string;
  linkAttachment?: string;
  scheduledTime?: string;
}

export interface PostResponse {
  id: string;
  text: string;
  timestamp: string;
  permalink?: string;
}

export interface AnalyticsData {
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  views?: number;
  reach?: number;
  impressions?: number;
  engagementRate?: number;
}

export class ThreadsClient {
  private apiBase = 'https://graph.threads.net/v1.0';
  private client: AxiosInstance;
  private config: ThreadsConfig;
  private requestCount = 0;
  private accountType: AccountType = 'PERSONAL';

  constructor(config: ThreadsConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.apiBase,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(redirectUri: string, scopes: string[]): string {
    const scopeString = scopes.join(',');
    return `https://threads.net/oauth/authorize?client_id=${this.config.appId}&redirect_uri=${redirectUri}&scope=${scopeString}&response_type=code`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string, redirectUri: string): Promise<{ accessToken: string; userId: string }> {
    const response = await axios.post('https://graph.threads.net/oauth/access_token', {
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    return {
      accessToken: response.data.access_token,
      userId: response.data.user_id,
    };
  }

  /**
   * Test API connection and detect account type
   */
  async detectAccount(): Promise<AccountInfo> {
    const response = await this.client.get(`/${this.config.userId}`, {
      params: {
        fields: 'id,username,threads_profile_picture_url,threads_biography',
        access_token: this.config.accessToken,
      },
    });

    this.trackRequest();

    // Detect account type based on available permissions
    const permissions = await this.getPermissions();
    const accountType = this.determineAccountType(permissions);
    this.accountType = accountType;

    const rateLimit = this.getRateLimitInfo();

    return {
      id: response.data.id,
      username: response.data.username,
      accountType,
      permissions,
      rateLimit,
    };
  }

  /**
   * Get granted permissions
   */
  private async getPermissions(): Promise<string[]> {
    try {
      const response = await this.client.get(`/${this.config.userId}/permissions`, {
        params: {
          access_token: this.config.accessToken,
        },
      });

      return response.data.data.map((p: any) => p.permission);
    } catch {
      return ['threads_basic', 'threads_content_publish'];
    }
  }

  /**
   * Determine account type from permissions
   */
  private determineAccountType(permissions: string[]): AccountType {
    if (permissions.includes('threads_manage_insights') && permissions.includes('threads_manage_replies')) {
      if (permissions.includes('threads_read_replies')) {
        return 'BUSINESS';
      }
      return 'CREATOR';
    }
    return 'PERSONAL';
  }

  /**
   * Get rate limit information
   */
  private getRateLimitInfo(): RateLimitInfo {
    const limits = {
      PERSONAL: { requestsPerHour: 200, postsPerDay: 500, repliesPerDay: 1000 },
      CREATOR: { requestsPerHour: 500, postsPerDay: 1000, repliesPerDay: 5000 },
      BUSINESS: { requestsPerHour: 1000, postsPerDay: -1, repliesPerDay: -1 },
    };

    const limit = limits[this.accountType];
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setHours(resetTime.getHours() + 1, 0, 0, 0);

    return {
      tier: this.accountType,
      ...limit,
      used: this.requestCount,
      remaining: limit.requestsPerHour - this.requestCount,
      resetTime,
    };
  }

  /**
   * Create a post on Threads
   */
  async createPost(options: PostOptions): Promise<PostResponse> {
    let mediaType = options.mediaType || 'TEXT';

    // Auto-detect media type
    if (options.imageUrls && options.imageUrls.length > 1) {
      mediaType = 'CAROUSEL';
    } else if (options.imageUrl) {
      mediaType = 'IMAGE';
    } else if (options.videoUrl) {
      mediaType = 'VIDEO';
    }

    const requestBody: any = {
      media_type: mediaType,
      text: options.text,
    };

    if (mediaType === 'IMAGE' && options.imageUrl) {
      requestBody.image_url = options.imageUrl;
      if (options.altText) {
        requestBody.alt_text = options.altText;
      }
    } else if (mediaType === 'VIDEO' && options.videoUrl) {
      requestBody.video_url = options.videoUrl;
    } else if (mediaType === 'CAROUSEL' && options.imageUrls) {
      requestBody.children = options.imageUrls.map((url: string) => ({
        image_url: url,
        alt_text: options.altText,
      }));
    }

    if (options.linkAttachment) {
      requestBody.link_attachment = options.linkAttachment;
    }

    // Create media container
    const containerResponse = await this.client.post(
      `/${this.config.userId}/threads`,
      requestBody,
      {
        params: {
          access_token: this.config.accessToken,
        },
      }
    );

    this.trackRequest();

    const containerId = containerResponse.data.id;

    // Publish the post
    const publishResponse = await this.client.post(
      `/${this.config.userId}/threads_publish`,
      { creation_id: containerId },
      {
        params: {
          access_token: this.config.accessToken,
        },
      }
    );

    this.trackRequest();

    return {
      id: publishResponse.data.id,
      text: options.text,
      timestamp: new Date().toISOString(),
      permalink: `https://threads.net/@${this.config.userId}/post/${publishResponse.data.id}`,
    };
  }

  /**
   * Get post details
   */
  async getPost(postId: string): Promise<any> {
    const response = await this.client.get(`/${postId}`, {
      params: {
        fields: 'id,text,timestamp,media_type,media_url,permalink,username,is_quote_post',
        access_token: this.config.accessToken,
      },
    });

    this.trackRequest();
    return response.data;
  }

  /**
   * Get post analytics (Creator/Business only)
   */
  async getPostAnalytics(postId: string): Promise<AnalyticsData> {
    if (this.accountType === 'PERSONAL') {
      throw new Error('Analytics require Creator or Business account');
    }

    const response = await this.client.get(`/${postId}/insights`, {
      params: {
        metric: 'likes,replies,reposts,quotes,views,reach,impressions',
        access_token: this.config.accessToken,
      },
    });

    this.trackRequest();

    const metrics = response.data.data.reduce((acc: any, item: any) => {
      acc[item.name] = item.values[0].value;
      return acc;
    }, {});

    const totalEngagement = (metrics.likes || 0) + (metrics.replies || 0) + (metrics.reposts || 0);
    const engagementRate = metrics.reach ? (totalEngagement / metrics.reach) * 100 : 0;

    return {
      likes: metrics.likes || 0,
      replies: metrics.replies || 0,
      reposts: metrics.reposts || 0,
      quotes: metrics.quotes || 0,
      views: metrics.views,
      reach: metrics.reach,
      impressions: metrics.impressions,
      engagementRate,
    };
  }

  /**
   * List user's posts
   */
  async listPosts(limit: number = 25): Promise<any[]> {
    const response = await this.client.get(`/${this.config.userId}/threads`, {
      params: {
        fields: 'id,text,timestamp,media_type,permalink',
        limit,
        access_token: this.config.accessToken,
      },
    });

    this.trackRequest();
    return response.data.data || [];
  }

  /**
   * Get replies to a post
   */
  async getReplies(postId: string): Promise<any[]> {
    const response = await this.client.get(`/${postId}/replies`, {
      params: {
        fields: 'id,text,timestamp,username,hide_status',
        access_token: this.config.accessToken,
      },
    });

    this.trackRequest();
    return response.data.data || [];
  }

  /**
   * Reply to a post
   */
  async replyToPost(postId: string, text: string): Promise<PostResponse> {
    return this.createPost({
      text,
      mediaType: 'TEXT',
    });
  }

  /**
   * Hide a reply
   */
  async hideReply(replyId: string): Promise<void> {
    await this.client.post(
      `/${replyId}`,
      { hide: true },
      {
        params: {
          access_token: this.config.accessToken,
        },
      }
    );

    this.trackRequest();
  }

  /**
   * Unhide a reply
   */
  async unhideReply(replyId: string): Promise<void> {
    await this.client.post(
      `/${replyId}`,
      { hide: false },
      {
        params: {
          access_token: this.config.accessToken,
        },
      }
    );

    this.trackRequest();
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    const response = await this.client.get(`/${this.config.userId}`, {
      params: {
        fields: 'id,username,threads_profile_picture_url,threads_biography',
        access_token: this.config.accessToken,
      },
    });

    this.trackRequest();
    return response.data;
  }

  /**
   * Track API request for rate limiting
   */
  private trackRequest(): void {
    this.requestCount++;
  }

  /**
   * Reset request counter (called hourly)
   */
  resetRequestCounter(): void {
    this.requestCount = 0;
  }

  /**
   * Check if approaching rate limit
   */
  isApproachingRateLimit(): boolean {
    const limit = this.getRateLimitInfo();
    const usagePercent = (this.requestCount / limit.requestsPerHour) * 100;
    return usagePercent >= 80;
  }
}

export default ThreadsClient;
