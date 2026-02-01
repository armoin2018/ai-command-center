import { TwitterApi, TwitterApiReadWrite, TweetV2, UserV2 } from 'twitter-api-v2';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// ============================================================================
// TIER DETECTION ENUMS
// ============================================================================

export enum XApiTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum FeatureStatus {
  AVAILABLE = 'available',
  REQUIRES_BASIC = 'requires_basic',
  REQUIRES_PRO = 'requires_pro',
  REQUIRES_ENTERPRISE = 'requires_enterprise',
  NOT_AVAILABLE = 'not_available'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface XApiConfig {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  accessSecret?: string;
  bearerToken?: string;
}

export interface XApiCapabilities {
  tier: XApiTier;
  tierName: string;
  costPerMonth: number;
  status: FeatureStatus;
  features: string[];
  rateLimits: {
    tweetsReadPerMonth: number;
    tweetsWritePerMonth: number;
    searchRequestsPer15Min: number;
  };
  enabledFeatures: string[];
  missingFeatures: string[];
  canPost: boolean;
  canPostMedia: boolean;
  canSearch: boolean;
  canStream: boolean;
  canUseDMs: boolean;
  canUseAnalytics: boolean;
  upgradeInfo?: XApiTierInfo;
}

export interface XApiTierInfo {
  tier: XApiTier;
  tierName: string;
  cost: string;
  setupSteps: string[];
  features: string[];
  rateLimits: string;
  approval: string;
}

export interface TweetOptions {
  text: string;
  mediaIds?: string[];
  replyToId?: string;
  quoteTweetId?: string;
  pollOptions?: string[];
  pollDurationMinutes?: number;
}

export interface SearchOptions {
  query: string;
  maxResults?: number;
  startTime?: Date;
  endTime?: Date;
}

// ============================================================================
// TWITTER CLIENT WITH TIER DETECTION
// ============================================================================

export class XClient {
  private client: TwitterApi;
  private rwClient?: TwitterApiReadWrite;
  private config: XApiConfig;
  private currentTier?: XApiTier;

  constructor(config: XApiConfig) {
    this.config = config;
    
    if (config.accessToken && config.accessSecret) {
      // User context (OAuth 1.0a)
      this.client = new TwitterApi({
        appKey: config.appKey,
        appSecret: config.appSecret,
        accessToken: config.accessToken,
        accessSecret: config.accessSecret
      });
      this.rwClient = this.client.readWrite;
    } else if (config.bearerToken) {
      // App-only context (OAuth 2.0)
      this.client = new TwitterApi(config.bearerToken);
    } else {
      throw new Error('Either access tokens or bearer token required');
    }
  }

  // ==========================================================================
  // TIER DETECTION
  // ==========================================================================

  async detectApiTier(): Promise<XApiCapabilities> {
    const capabilities: Partial<XApiCapabilities> = {
      enabledFeatures: [],
      missingFeatures: [],
      features: []
    };

    try {
      // Test 1: Basic tweet posting (available in all tiers)
      const canPost = await this.testTweetCapability();
      
      // Test 2: Search capability (Free: fails, Basic: limited, Pro: full)
      const searchCapability = await this.testSearchCapability();
      
      // Test 3: Streaming (Pro+ only)
      const canStream = await this.testStreamingCapability();
      
      // Test 4: DMs (Pro+ only)
      const canUseDMs = await this.testDMCapability();

      // Determine tier based on test results
      let tier: XApiTier;
      let tierName: string;
      let costPerMonth: number;
      let rateLimits: XApiCapabilities['rateLimits'];

      if (canUseDMs && canStream) {
        // Has DMs and Streaming = Pro or Enterprise
        // Distinguish by rate limits (would need actual API calls to determine)
        tier = XApiTier.PRO;
        tierName = 'Pro Access';
        costPerMonth = 5000;
        rateLimits = {
          tweetsReadPerMonth: 1000000,
          tweetsWritePerMonth: 100000,
          searchRequestsPer15Min: 300
        };
      } else if (searchCapability === 'full' && canPost) {
        // Has search but no DMs/streaming = Basic
        tier = XApiTier.BASIC;
        tierName = 'Basic Access';
        costPerMonth = 100;
        rateLimits = {
          tweetsReadPerMonth: 10000,
          tweetsWritePerMonth: 3000,
          searchRequestsPer15Min: 50
        };
      } else {
        // Very limited = Free
        tier = XApiTier.FREE;
        tierName = 'Free Access';
        costPerMonth = 0;
        rateLimits = {
          tweetsReadPerMonth: 1500,
          tweetsWritePerMonth: 50,
          searchRequestsPer15Min: 0
        };
      }

      this.currentTier = tier;

      // Build features list based on tier
      const features = this.getFeaturesForTier(tier);
      const allFeatures = this.getAllFeatures();
      const enabledFeatures = features;
      const missingFeatures = allFeatures.filter(f => !features.includes(f));

      return {
        tier,
        tierName,
        costPerMonth,
        status: FeatureStatus.AVAILABLE,
        features,
        rateLimits,
        enabledFeatures,
        missingFeatures,
        canPost: tier !== XApiTier.FREE || canPost,
        canPostMedia: tier !== XApiTier.FREE,
        canSearch: tier === XApiTier.BASIC || tier === XApiTier.PRO || tier === XApiTier.ENTERPRISE,
        canStream: tier === XApiTier.PRO || tier === XApiTier.ENTERPRISE,
        canUseDMs: tier === XApiTier.PRO || tier === XApiTier.ENTERPRISE,
        canUseAnalytics: tier === XApiTier.PRO || tier === XApiTier.ENTERPRISE
      };

    } catch (error: any) {
      throw new Error(`Tier detection failed: ${error.message}`);
    }
  }

  private async testTweetCapability(): Promise<boolean> {
    try {
      // Test if we can access user context (required for posting)
      if (!this.rwClient) return false;
      
      const me = await this.client.v2.me();
      return !!me.data;
    } catch {
      return false;
    }
  }

  private async testSearchCapability(): Promise<'none' | 'limited' | 'full'> {
    try {
      // Try recent search (available in Basic and Pro)
      await this.client.v2.search('test', { max_results: 10 });
      return 'full';
    } catch (error: any) {
      if (error.code === 403 || error.code === 429) {
        return 'limited'; // May have some access but rate limited
      }
      return 'none';
    }
  }

  private async testStreamingCapability(): Promise<boolean> {
    try {
      // Test if we can access streaming rules (Pro+ only)
      await this.client.v2.streamRules();
      return true;
    } catch {
      return false;
    }
  }

  private async testDMCapability(): Promise<boolean> {
    try {
      // Test if we can access DM events (Pro+ only)
      await this.client.v2.listDmEvents();
      return true;
    } catch {
      return false;
    }
  }

  private getFeaturesForTier(tier: XApiTier): string[] {
    const baseFeatures = [
      'Read public tweets',
      'Read user profiles',
      'Read timelines'
    ];

    const basicFeatures = [
      ...baseFeatures,
      'Post tweets (text)',
      'Post tweets (with media)',
      'Reply to tweets',
      'Delete tweets',
      'Like/unlike tweets',
      'Retweet/unretweet',
      'Follow/unfollow users',
      'Basic search (limited)'
    ];

    const proFeatures = [
      ...basicFeatures,
      'Full search API',
      'Streaming API',
      'Direct messages',
      'Analytics & metrics',
      'Poll creation',
      'Lists management',
      'Bookmarks',
      'Advanced filtering'
    ];

    const enterpriseFeatures = [
      ...proFeatures,
      'Full Firehose',
      'Historical data access',
      'Advanced compliance',
      'Custom integrations',
      'Premium analytics',
      'Dedicated support'
    ];

    switch (tier) {
      case XApiTier.FREE:
        return ['Read public tweets (limited)', 'Post tweets (50/month)'];
      case XApiTier.BASIC:
        return basicFeatures;
      case XApiTier.PRO:
        return proFeatures;
      case XApiTier.ENTERPRISE:
        return enterpriseFeatures;
      default:
        return [];
    }
  }

  private getAllFeatures(): string[] {
    return [
      'Read public tweets',
      'Post tweets (text)',
      'Post tweets (with media)',
      'Reply to tweets',
      'Delete tweets',
      'Like/unlike tweets',
      'Retweet/unretweet',
      'Follow/unfollow users',
      'Full search API',
      'Streaming API',
      'Direct messages',
      'Analytics & metrics',
      'Poll creation',
      'Lists management',
      'Bookmarks',
      'Advanced filtering',
      'Full Firehose',
      'Historical data access'
    ];
  }

  getTierCapabilities(tier: XApiTier): XApiCapabilities {
    const tierInfo: Record<XApiTier, Omit<XApiCapabilities, 'enabledFeatures' | 'missingFeatures'>> = {
      [XApiTier.FREE]: {
        tier: XApiTier.FREE,
        tierName: 'Free Access',
        costPerMonth: 0,
        status: FeatureStatus.AVAILABLE,
        features: this.getFeaturesForTier(XApiTier.FREE),
        rateLimits: {
          tweetsReadPerMonth: 1500,
          tweetsWritePerMonth: 50,
          searchRequestsPer15Min: 0
        },
        canPost: true,
        canPostMedia: false,
        canSearch: false,
        canStream: false,
        canUseDMs: false,
        canUseAnalytics: false
      },
      [XApiTier.BASIC]: {
        tier: XApiTier.BASIC,
        tierName: 'Basic Access',
        costPerMonth: 100,
        status: FeatureStatus.REQUIRES_BASIC,
        features: this.getFeaturesForTier(XApiTier.BASIC),
        rateLimits: {
          tweetsReadPerMonth: 10000,
          tweetsWritePerMonth: 3000,
          searchRequestsPer15Min: 50
        },
        canPost: true,
        canPostMedia: true,
        canSearch: true,
        canStream: false,
        canUseDMs: false,
        canUseAnalytics: false
      },
      [XApiTier.PRO]: {
        tier: XApiTier.PRO,
        tierName: 'Pro Access',
        costPerMonth: 5000,
        status: FeatureStatus.REQUIRES_PRO,
        features: this.getFeaturesForTier(XApiTier.PRO),
        rateLimits: {
          tweetsReadPerMonth: 1000000,
          tweetsWritePerMonth: 100000,
          searchRequestsPer15Min: 300
        },
        canPost: true,
        canPostMedia: true,
        canSearch: true,
        canStream: true,
        canUseDMs: true,
        canUseAnalytics: true
      },
      [XApiTier.ENTERPRISE]: {
        tier: XApiTier.ENTERPRISE,
        tierName: 'Enterprise Access',
        costPerMonth: 42000,
        status: FeatureStatus.REQUIRES_ENTERPRISE,
        features: this.getFeaturesForTier(XApiTier.ENTERPRISE),
        rateLimits: {
          tweetsReadPerMonth: 999999999,
          tweetsWritePerMonth: 999999999,
          searchRequestsPer15Min: 999999
        },
        canPost: true,
        canPostMedia: true,
        canSearch: true,
        canStream: true,
        canUseDMs: true,
        canUseAnalytics: true
      }
    };

    const info = tierInfo[tier];
    const allFeatures = this.getAllFeatures();
    
    return {
      ...info,
      enabledFeatures: info.features,
      missingFeatures: allFeatures.filter(f => !info.features.includes(f))
    };
  }

  async checkFeatureAvailability(feature: string): Promise<{
    available: boolean;
    reason: string;
    upgradeInfo?: XApiTierInfo;
  }> {
    const capabilities = await this.detectApiTier();
    const available = capabilities.features.includes(feature);

    if (available) {
      return {
        available: true,
        reason: `Feature available with ${capabilities.tierName}`
      };
    }

    // Determine which tier is needed
    let requiredTier: XApiTier;
    if (feature.includes('Streaming') || feature.includes('Direct messages') || feature.includes('Analytics')) {
      requiredTier = XApiTier.PRO;
    } else if (feature.includes('Firehose') || feature.includes('Historical')) {
      requiredTier = XApiTier.ENTERPRISE;
    } else {
      requiredTier = XApiTier.BASIC;
    }

    return {
      available: false,
      reason: `Feature requires ${this.getTierCapabilities(requiredTier).tierName}`,
      upgradeInfo: this.getTierUpgradePath(requiredTier)
    };
  }

  getTierUpgradePath(targetTier: XApiTier): XApiTierInfo {
    const tierInfo: Record<XApiTier, XApiTierInfo> = {
      [XApiTier.FREE]: {
        tier: XApiTier.FREE,
        tierName: 'Free Access',
        cost: '$0/month',
        setupSteps: [
          'Create X developer account at https://developer.twitter.com',
          'Create new app in Developer Portal',
          'Generate API keys and tokens',
          'Configure OAuth settings',
          'Start using API (very limited)'
        ],
        features: [
          '1,500 tweets read per month',
          '50 tweets write per month',
          'No media upload',
          'No search',
          'No streaming'
        ],
        rateLimits: '1,500 read / 50 write per month',
        approval: 'Automatic (email verification required)'
      },
      [XApiTier.BASIC]: {
        tier: XApiTier.BASIC,
        tierName: 'Basic Access',
        cost: '$100/month',
        setupSteps: [
          'Go to https://developer.twitter.com/en/portal/products',
          'Click "Subscribe to Basic"',
          'Enter payment information',
          'Confirm subscription ($100/month)',
          'Wait for activation (usually instant)',
          'Generate new API keys if needed',
          'Update your application configuration'
        ],
        features: [
          '10,000 tweets read per month',
          '3,000 tweets write per month',
          'Post tweets with media (photos, videos, GIFs)',
          'Reply, like, retweet',
          'Basic search (50 requests/month)',
          'Follow/unfollow users'
        ],
        rateLimits: '10,000 read / 3,000 write per month',
        approval: 'Payment required only'
      },
      [XApiTier.PRO]: {
        tier: XApiTier.PRO,
        tierName: 'Pro Access',
        cost: '$5,000/month ⚠️',
        setupSteps: [
          '⚠️  WARNING: This costs $5,000 per month!',
          '',
          'Go to https://developer.twitter.com/en/portal/products',
          'Click "Subscribe to Pro"',
          'Review pricing ($5,000/month)',
          'Enter payment information',
          'Confirm subscription',
          'Wait for activation',
          'Update API keys and configuration',
          '',
          'Use cases to justify cost:',
          '• Full search API (300 requests per 15 min)',
          '• Real-time streaming',
          '• Direct message automation',
          '• Analytics and metrics',
          '• 1M tweets read, 100K tweets write per month'
        ],
        features: [
          '1,000,000 tweets read per month',
          '100,000 tweets write per month',
          'Full search API (300 requests/15min)',
          'Streaming API (filtered stream)',
          'Direct messages (read/send)',
          'Analytics and metrics',
          'Poll creation',
          'Lists management',
          'Bookmarks',
          'Advanced filtering'
        ],
        rateLimits: '1M read / 100K write per month',
        approval: 'Payment + use case review'
      },
      [XApiTier.ENTERPRISE]: {
        tier: XApiTier.ENTERPRISE,
        tierName: 'Enterprise Access',
        cost: 'Custom (starts ~$42,000/month)',
        setupSteps: [
          'Contact X sales team',
          'Discuss use case and requirements',
          'Receive custom pricing quote',
          'Sign enterprise contract',
          'Enterprise onboarding process',
          'Dedicated account manager assigned',
          'Custom integration setup'
        ],
        features: [
          'Full Firehose (all public tweets in real-time)',
          'Historical data access (full archive)',
          'Unlimited rate limits',
          'Advanced compliance features',
          'Dedicated support',
          'Custom integrations',
          'Premium analytics'
        ],
        rateLimits: 'Custom / Very high',
        approval: 'Direct sales + custom contract'
      }
    };

    return tierInfo[targetTier];
  }

  // ==========================================================================
  // TWEET OPERATIONS
  // ==========================================================================

  async postTweet(options: TweetOptions): Promise<TweetV2> {
    if (!this.rwClient) {
      throw new Error('User authentication required to post tweets');
    }

    const check = await this.checkFeatureAvailability('Post tweets (text)');
    if (!check.available) {
      throw new Error(`Cannot post tweet: ${check.reason}`);
    }

    try {
      const tweetData: any = { text: options.text };

      if (options.mediaIds && options.mediaIds.length > 0) {
        const mediaCheck = await this.checkFeatureAvailability('Post tweets (with media)');
        if (!mediaCheck.available) {
          throw new Error(`Cannot post media: ${mediaCheck.reason}`);
        }
        tweetData.media = { media_ids: options.mediaIds };
      }

      if (options.replyToId) {
        tweetData.reply = { in_reply_to_tweet_id: options.replyToId };
      }

      if (options.quoteTweetId) {
        tweetData.quote_tweet_id = options.quoteTweetId;
      }

      if (options.pollOptions && options.pollOptions.length > 0) {
        const pollCheck = await this.checkFeatureAvailability('Poll creation');
        if (!pollCheck.available) {
          throw new Error(`Cannot create poll: ${pollCheck.reason}`);
        }
        tweetData.poll = {
          options: options.pollOptions,
          duration_minutes: options.pollDurationMinutes || 1440
        };
      }

      const result = await this.rwClient.v2.tweet(tweetData);
      return result.data;
    } catch (error: any) {
      throw new Error(`Failed to post tweet: ${error.message}`);
    }
  }

  async deleteTweet(tweetId: string): Promise<boolean> {
    if (!this.rwClient) {
      throw new Error('User authentication required');
    }

    try {
      await this.rwClient.v2.deleteTweet(tweetId);
      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete tweet: ${error.message}`);
    }
  }

  async likeTweet(tweetId: string): Promise<boolean> {
    if (!this.rwClient) {
      throw new Error('User authentication required');
    }

    try {
      const me = await this.client.v2.me();
      await this.rwClient.v2.like(me.data.id, tweetId);
      return true;
    } catch (error: any) {
      throw new Error(`Failed to like tweet: ${error.message}`);
    }
  }

  async retweet(tweetId: string): Promise<boolean> {
    if (!this.rwClient) {
      throw new Error('User authentication required');
    }

    try {
      const me = await this.client.v2.me();
      await this.rwClient.v2.retweet(me.data.id, tweetId);
      return true;
    } catch (error: any) {
      throw new Error(`Failed to retweet: ${error.message}`);
    }
  }

  // ==========================================================================
  // SEARCH & DISCOVERY
  // ==========================================================================

  async searchTweets(options: SearchOptions): Promise<TweetV2[]> {
    const check = await this.checkFeatureAvailability('Full search API');
    if (!check.available) {
      throw new Error(`Search not available: ${check.reason}`);
    }

    try {
      const searchOptions: any = {
        max_results: options.maxResults || 10
      };

      if (options.startTime) {
        searchOptions.start_time = options.startTime.toISOString();
      }

      if (options.endTime) {
        searchOptions.end_time = options.endTime.toISOString();
      }

      const result = await this.client.v2.search(options.query, searchOptions);
      return result.data.data || [];
    } catch (error: any) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // ==========================================================================
  // USER OPERATIONS
  // ==========================================================================

  async getMe(): Promise<UserV2> {
    try {
      const result = await this.client.v2.me();
      return result.data;
    } catch (error: any) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  async getUserByUsername(username: string): Promise<UserV2> {
    try {
      const result = await this.client.v2.userByUsername(username);
      return result.data;
    } catch (error: any) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  async getUserTimeline(userId: string, maxResults: number = 10): Promise<TweetV2[]> {
    try {
      const result = await this.client.v2.userTimeline(userId, {
        max_results: maxResults
      });
      return result.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to get timeline: ${error.message}`);
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    user?: UserV2;
    tier: XApiCapabilities;
  }> {
    try {
      const tier = await this.detectApiTier();
      const user = await this.getMe();
      
      return {
        success: true,
        user,
        tier
      };
    } catch (error: any) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function loadConfig(): XApiConfig {
  const appKey = process.env.X_API_KEY || process.env.TWITTER_API_KEY;
  const appSecret = process.env.X_API_SECRET || process.env.TWITTER_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET || process.env.TWITTER_ACCESS_SECRET;
  const bearerToken = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;

  if (!appKey || !appSecret) {
    throw new Error('X_API_KEY and X_API_SECRET environment variables required');
  }

  if (!accessToken && !bearerToken) {
    throw new Error('Either access tokens (X_ACCESS_TOKEN/X_ACCESS_SECRET) or bearer token (X_BEARER_TOKEN) required');
  }

  return {
    appKey,
    appSecret,
    accessToken,
    accessSecret,
    bearerToken
  };
}
