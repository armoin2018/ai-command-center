import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';

dotenv.config();

export interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
}

export interface QuotaInfo {
  dailyQuota: number;
  usedToday: number;
  remaining: number;
  percentageUsed: number;
  resetTime: Date;
}

export interface VideoUploadOptions {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
  madeForKids?: boolean;
  embeddable?: boolean;
  publicStatsViewable?: boolean;
  publishAt?: string;
  license?: 'youtube' | 'creativeCommon';
  thumbnailPath?: string;
  playlistId?: string;
  playlistPosition?: number;
}

export class YouTubeClient {
  private oauth2Client: OAuth2Client;
  private youtube: youtube_v3.Youtube;
  private quotaUsed: number = 0;
  private quotaLimit: number = 10000; // Default free tier

  constructor(config: YouTubeConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    if (config.accessToken && config.refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
      });
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(scopes: string[]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);
    return credentials.access_token!;
  }

  /**
   * Test API connection and get channel info
   */
  async testConnection(): Promise<any> {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
    });

    this.addQuotaUsage(3); // channels.list with mine=true costs ~3 units
    return response.data.items?.[0];
  }

  /**
   * Detect quota allocation and usage
   */
  async detectQuota(): Promise<QuotaInfo> {
    // Note: YouTube API doesn't provide direct quota info via API
    // This would need to be tracked locally or via Cloud Console API
    // For now, we'll use defaults and local tracking

    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(7, 0, 0, 0); // Resets at midnight Pacific Time (UTC-8)
    if (now > resetTime) {
      resetTime.setDate(resetTime.getDate() + 1);
    }

    return {
      dailyQuota: this.quotaLimit,
      usedToday: this.quotaUsed,
      remaining: this.quotaLimit - this.quotaUsed,
      percentageUsed: (this.quotaUsed / this.quotaLimit) * 100,
      resetTime,
    };
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(filePath: string, options: VideoUploadOptions): Promise<any> {
    const fs = require('fs');

    const requestBody: youtube_v3.Schema$Video = {
      snippet: {
        title: options.title,
        description: options.description || '',
        tags: options.tags || [],
        categoryId: options.categoryId || '22',
      },
      status: {
        privacyStatus: options.privacyStatus || 'private',
        madeForKids: options.madeForKids,
        embeddable: options.embeddable,
        publicStatsViewable: options.publicStatsViewable,
        publishAt: options.publishAt,
        license: options.license,
      },
    };

    const media = {
      body: fs.createReadStream(filePath),
    };

    const response = await this.youtube.videos.insert({
      part: ['snippet', 'status', 'contentDetails'],
      requestBody,
      media,
    });

    this.addQuotaUsage(1600); // Upload costs ~1600 units

    const videoId = response.data.id;

    // Upload thumbnail if provided
    if (options.thumbnailPath && videoId) {
      await this.uploadThumbnail(videoId, options.thumbnailPath);
    }

    // Add to playlist if specified
    if (options.playlistId && videoId) {
      await this.addToPlaylist(options.playlistId, videoId, options.playlistPosition);
    }

    return response.data;
  }

  /**
   * Upload custom thumbnail
   */
  async uploadThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
    const fs = require('fs');

    await this.youtube.thumbnails.set({
      videoId,
      media: {
        body: fs.createReadStream(thumbnailPath),
      },
    });

    this.addQuotaUsage(50);
  }

  /**
   * Get video details
   */
  async getVideo(videoId: string): Promise<any> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails', 'status'],
      id: [videoId],
    });

    this.addQuotaUsage(1);
    return response.data.items?.[0];
  }

  /**
   * List user's videos
   */
  async listVideos(maxResults: number = 50): Promise<any[]> {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      forMine: true,
      type: ['video'],
      maxResults,
    });

    this.addQuotaUsage(100); // Search costs 100 units
    return response.data.items || [];
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId: string, updates: Partial<VideoUploadOptions>): Promise<any> {
    const requestBody: youtube_v3.Schema$Video = {
      id: videoId,
    };

    if (updates.title || updates.description || updates.tags || updates.categoryId) {
      requestBody.snippet = {
        title: updates.title,
        description: updates.description,
        tags: updates.tags,
        categoryId: updates.categoryId,
      };
    }

    if (updates.privacyStatus !== undefined) {
      requestBody.status = {
        privacyStatus: updates.privacyStatus,
      };
    }

    const response = await this.youtube.videos.update({
      part: ['snippet', 'status'],
      requestBody,
    });

    this.addQuotaUsage(50);
    return response.data;
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId: string): Promise<void> {
    await this.youtube.videos.delete({
      id: videoId,
    });

    this.addQuotaUsage(50);
  }

  /**
   * List comments on a video
   */
  async listComments(videoId: string, maxResults: number = 100): Promise<any[]> {
    const response = await this.youtube.commentThreads.list({
      part: ['snippet', 'replies'],
      videoId,
      maxResults,
    });

    this.addQuotaUsage(1);
    return response.data.items || [];
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, text: string): Promise<any> {
    const response = await this.youtube.comments.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: text,
        },
      },
    });

    this.addQuotaUsage(50);
    return response.data;
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<void> {
    await this.youtube.comments.delete({
      id: commentId,
    });

    this.addQuotaUsage(50);
  }

  /**
   * Create playlist
   */
  async createPlaylist(title: string, description: string, privacy: string): Promise<any> {
    const response = await this.youtube.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
        },
        status: {
          privacyStatus: privacy,
        },
      },
    });

    this.addQuotaUsage(50);
    return response.data;
  }

  /**
   * Add video to playlist
   */
  async addToPlaylist(playlistId: string, videoId: string, position?: number): Promise<any> {
    const response = await this.youtube.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
          position,
        },
      },
    });

    this.addQuotaUsage(50);
    return response.data;
  }

  /**
   * Search videos
   */
  async search(query: string, options: any = {}): Promise<any[]> {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      q: query,
      type: options.type || ['video'],
      maxResults: options.maxResults || 25,
      order: options.order,
      videoDuration: options.videoDuration,
      videoDefinition: options.videoDefinition,
      publishedAfter: options.publishedAfter,
      publishedBefore: options.publishedBefore,
      channelId: options.channelId,
    });

    this.addQuotaUsage(100);
    return response.data.items || [];
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(): Promise<any> {
    const response = await this.youtube.channels.list({
      part: ['statistics', 'snippet', 'contentDetails'],
      mine: true,
    });

    this.addQuotaUsage(3);
    return response.data.items?.[0];
  }

  /**
   * Track quota usage locally
   */
  private addQuotaUsage(units: number): void {
    this.quotaUsed += units;
  }

  /**
   * Reset quota tracking (call at midnight PT)
   */
  resetQuotaTracking(): void {
    this.quotaUsed = 0;
  }

  /**
   * Set custom quota limit (if approved for higher quota)
   */
  setQuotaLimit(limit: number): void {
    this.quotaLimit = limit;
  }
}

export default YouTubeClient;
