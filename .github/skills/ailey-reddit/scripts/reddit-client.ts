import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

// ============================================================================
// ACCESS LEVEL ENUMS
// ============================================================================

export enum AccessLevel {
  READ_ONLY = 'read_only',          // No auth, public content only
  AUTHENTICATED = 'authenticated',   // OAuth, standard API access
  MODERATOR = 'moderator',           // Mod permissions in subreddits
  ADS_API = 'ads_api'                // Reddit Ads API access
}

export enum AccessStatus {
  AVAILABLE = 'available',
  REQUIRES_AUTH = 'requires_auth',
  REQUIRES_MOD = 'requires_mod',
  REQUIRES_ADS_APPROVAL = 'requires_ads_approval',
  NOT_AVAILABLE = 'not_available'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface RedditConfig {
  client_id: string;
  client_secret: string;
  username?: string;
  password?: string;
  redirect_uri?: string;
  access_token?: string;
  refresh_token?: string;
  user_agent: string;
}

export interface AccessCapabilities {
  level: AccessLevel;
  levelName: string;
  status: AccessStatus;
  features: string[];
  permissions: string[];
  limitations: string[];
  canPost: boolean;
  canComment: boolean;
  canVote: boolean;
  canModerate: boolean;
  canAdvertise: boolean;
  canMessage: boolean;
}

export interface AccessInfo {
  level: AccessLevel;
  description: string;
  setupSteps: string[];
  requiredScopes: string[];
  approvalRequired: boolean;
  approvalTimeline?: string;
  applicationUrl?: string;
}

export interface UserProfile {
  name: string;
  id: string;
  link_karma: number;
  comment_karma: number;
  total_karma: number;
  created_utc: number;
  is_gold: boolean;
  is_mod: boolean;
  has_verified_email: boolean;
  icon_img?: string;
}

export interface SubredditInfo {
  name: string;
  display_name: string;
  title: string;
  public_description: string;
  subscribers: number;
  active_user_count: number;
  created_utc: number;
  over18: boolean;
  user_is_subscriber: boolean;
  user_is_moderator: boolean;
}

export interface PostOptions {
  subreddit: string;
  title: string;
  text?: string;           // For text posts
  url?: string;            // For link posts
  image?: string;          // Path to image file
  video?: string;          // Path to video file
  nsfw?: boolean;
  spoiler?: boolean;
  flair_id?: string;
  flair_text?: string;
  send_replies?: boolean;
}

export interface PostData {
  id: string;
  name: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  is_self: boolean;
  selftext?: string;
  link_flair_text?: string;
  over_18: boolean;
  stickied: boolean;
  locked: boolean;
}

export interface CommentData {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  permalink: string;
  parent_id: string;
  link_id: string;
  subreddit: string;
  depth: number;
  replies?: CommentData[];
}

export interface ModAction {
  action: 'approve' | 'remove' | 'spam' | 'lock' | 'unlock' | 'sticky' | 'unsticky' | 'distinguish' | 'undistinguish';
  item_id: string;
  reason?: string;
}

export interface BanOptions {
  username: string;
  subreddit: string;
  duration?: number;  // Days, omit for permanent
  note?: string;
  reason?: string;
  message?: string;
}

export interface MessageOptions {
  to: string;
  subject: string;
  text: string;
  from_subreddit?: string;
}

// ============================================================================
// REDDIT CLIENT
// ============================================================================

export class RedditClient {
  private client: AxiosInstance;
  private config: RedditConfig;
  private baseUrl = 'https://oauth.reddit.com';
  private authUrl = 'https://www.reddit.com/api/v1';

  constructor(config: RedditConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'User-Agent': config.user_agent,
        ...(config.access_token && {
          'Authorization': `Bearer ${config.access_token}`
        })
      }
    });
  }

  // ==========================================================================
  // ACCESS LEVEL DETECTION
  // ==========================================================================

  /**
   * Detect user's Reddit API access level
   */
  async detectAccessLevel(): Promise<AccessCapabilities> {
    try {
      // Level 1: Check if authenticated
      if (!this.config.access_token) {
        return this.getAccessCapabilities(AccessLevel.READ_ONLY);
      }

      // Level 2: Verify OAuth access
      try {
        const user = await this.getUserInfo();
        
        // Level 3: Check if user is moderator of any subreddit
        if (user.is_mod) {
          // Verify actual mod permissions
          const modSubs = await this.getModeratedSubreddits();
          if (modSubs.length > 0) {
            // Level 4: Check for Ads API access (harder to detect, requires test call)
            try {
              // This would require actual Ads API endpoint test
              // For now, we assume no Ads access unless explicitly configured
              return this.getAccessCapabilities(AccessLevel.MODERATOR);
            } catch {
              return this.getAccessCapabilities(AccessLevel.MODERATOR);
            }
          }
        }

        // Has OAuth but not moderator
        return this.getAccessCapabilities(AccessLevel.AUTHENTICATED);
        
      } catch (error) {
        // OAuth token invalid or expired
        return this.getAccessCapabilities(AccessLevel.READ_ONLY);
      }
      
    } catch (error) {
      console.error('Error detecting access level:', error);
      return this.getAccessCapabilities(AccessLevel.READ_ONLY);
    }
  }

  /**
   * Get capabilities for specific access level
   */
  getAccessCapabilities(level: AccessLevel): AccessCapabilities {
    const capabilities: Record<AccessLevel, AccessCapabilities> = {
      [AccessLevel.READ_ONLY]: {
        level: AccessLevel.READ_ONLY,
        levelName: 'Read-Only (No Authentication)',
        status: AccessStatus.REQUIRES_AUTH,
        features: [
          'Browse public subreddits',
          'Read posts and comments',
          'Search Reddit content'
        ],
        permissions: [],
        limitations: [
          'Cannot post or comment',
          'Cannot vote',
          'Cannot save posts',
          'Cannot subscribe to subreddits',
          'Cannot send messages',
          'Rate limited to 60 requests per minute'
        ],
        canPost: false,
        canComment: false,
        canVote: false,
        canModerate: false,
        canAdvertise: false,
        canMessage: false
      },
      
      [AccessLevel.AUTHENTICATED]: {
        level: AccessLevel.AUTHENTICATED,
        levelName: 'Authenticated (OAuth)',
        status: AccessStatus.AVAILABLE,
        features: [
          'All read-only features',
          'Post submissions (text, link, image, video, poll, gallery)',
          'Comment on posts',
          'Vote (upvote/downvote)',
          'Save posts and comments',
          'Subscribe to subreddits',
          'Send private messages',
          'Manage user profile',
          'Award posts/comments',
          'Report content'
        ],
        permissions: [
          'identity', 'read', 'submit', 'vote', 'save',
          'subscribe', 'privatemessages', 'mysubreddits',
          'edit', 'flair', 'history'
        ],
        limitations: [
          'Cannot moderate subreddits',
          'Cannot access Ads API'
        ],
        canPost: true,
        canComment: true,
        canVote: true,
        canModerate: false,
        canAdvertise: false,
        canMessage: true
      },
      
      [AccessLevel.MODERATOR]: {
        level: AccessLevel.MODERATOR,
        levelName: 'Moderator',
        status: AccessStatus.AVAILABLE,
        features: [
          'All authenticated features',
          'Approve/remove posts and comments',
          'Ban/unban users',
          'Mute users',
          'Lock/unlock threads',
          'Sticky posts',
          'Distinguish as moderator',
          'Manage modmail',
          'View mod log',
          'Edit subreddit settings',
          'Manage user flair',
          'Configure AutoModerator'
        ],
        permissions: [
          'All authenticated permissions',
          'modposts', 'modcontributors', 'modmail',
          'modconfig', 'modflair', 'modlog',
          'modothers', 'modself', 'modwiki'
        ],
        limitations: [
          'Moderation limited to subreddits where you are moderator',
          'Cannot access Ads API'
        ],
        canPost: true,
        canComment: true,
        canVote: true,
        canModerate: true,
        canAdvertise: false,
        canMessage: true
      },
      
      [AccessLevel.ADS_API]: {
        level: AccessLevel.ADS_API,
        levelName: 'Reddit Ads API',
        status: AccessStatus.REQUIRES_ADS_APPROVAL,
        features: [
          'All moderator features',
          'Create ad campaigns',
          'Manage ad creatives',
          'Set targeting options',
          'Track campaign performance',
          'Budget management',
          'A/B testing'
        ],
        permissions: [
          'All moderator permissions',
          'ads_manage', 'ads_report'
        ],
        limitations: [
          'Requires active Reddit Ads account',
          'Requires API approval'
        ],
        canPost: true,
        canComment: true,
        canVote: true,
        canModerate: true,
        canAdvertise: true,
        canMessage: true
      }
    };

    return capabilities[level];
  }

  /**
   * Check if specific feature is available
   */
  async checkFeatureAvailability(feature: string): Promise<{
    available: boolean;
    reason: string;
    upgradeInfo?: AccessInfo;
  }> {
    const currentAccess = await this.detectAccessLevel();
    
    const featureRequirements: Record<string, AccessLevel> = {
      'post': AccessLevel.AUTHENTICATED,
      'comment': AccessLevel.AUTHENTICATED,
      'vote': AccessLevel.AUTHENTICATED,
      'message': AccessLevel.AUTHENTICATED,
      'save': AccessLevel.AUTHENTICATED,
      'subscribe': AccessLevel.AUTHENTICATED,
      'moderate': AccessLevel.MODERATOR,
      'ban_user': AccessLevel.MODERATOR,
      'remove_content': AccessLevel.MODERATOR,
      'sticky_post': AccessLevel.MODERATOR,
      'modmail': AccessLevel.MODERATOR,
      'advertising': AccessLevel.ADS_API
    };

    const requiredLevel = featureRequirements[feature];
    
    if (!requiredLevel) {
      return {
        available: false,
        reason: `Unknown feature: ${feature}`
      };
    }

    const levelOrder = [
      AccessLevel.READ_ONLY,
      AccessLevel.AUTHENTICATED,
      AccessLevel.MODERATOR,
      AccessLevel.ADS_API
    ];

    const currentIndex = levelOrder.indexOf(currentAccess.level);
    const requiredIndex = levelOrder.indexOf(requiredLevel);

    if (currentIndex >= requiredIndex) {
      return {
        available: true,
        reason: 'Feature is available'
      };
    }

    return {
      available: false,
      reason: `Requires ${this.getAccessCapabilities(requiredLevel).levelName}`,
      upgradeInfo: this.getAccessUpgradePath(currentAccess.level, requiredLevel)
    };
  }

  /**
   * Get upgrade path from current to required access level
   */
  getAccessUpgradePath(current: AccessLevel, target: AccessLevel): AccessInfo {
    const upgradePaths: Record<AccessLevel, AccessInfo> = {
      [AccessLevel.AUTHENTICATED]: {
        level: AccessLevel.AUTHENTICATED,
        description: 'OAuth authentication provides full standard API access',
        setupSteps: [
          'Create Reddit account (if you don\'t have one)',
          'Go to https://www.reddit.com/prefs/apps',
          'Click "Create App" or "Create Another App"',
          'Select "script" type for personal use or "web app" for web applications',
          'Fill in app name and description',
          'Set redirect URI (use http://localhost:8080 for script apps)',
          'Click "Create app"',
          'Copy "client_id" (under app name)',
          'Copy "client_secret"',
          'Add credentials to .env file',
          'Run OAuth flow: npm run reddit auth'
        ],
        requiredScopes: [
          'identity', 'read', 'submit', 'vote', 'save',
          'subscribe', 'privatemessages', 'mysubreddits',
          'edit', 'flair', 'history'
        ],
        approvalRequired: false
      },

      [AccessLevel.MODERATOR]: {
        level: AccessLevel.MODERATOR,
        description: 'Moderator access requires being a moderator of a subreddit',
        setupSteps: [
          'Option 1: Create your own subreddit',
          '  - Go to https://www.reddit.com/subreddits/create',
          '  - Fill in subreddit name and details',
          '  - Configure settings',
          '  - You are automatically the moderator',
          '',
          'Option 2: Get invited as moderator',
          '  - Contribute quality content to a subreddit',
          '  - Build reputation and trust',
          '  - Wait for invitation from existing moderators',
          '  - Accept moderator invitation',
          '',
          'Option 3: Request to moderate',
          '  - Find subreddits on r/redditrequest with inactive mods',
          '  - Submit request to take over moderation',
          '  - Wait for Reddit admin approval',
          '',
          'Once you are a moderator:',
          '  - Add moderation scopes when setting up OAuth',
          '  - Re-run OAuth flow with mod permissions',
          '  - Moderation features will automatically unlock'
        ],
        requiredScopes: [
          'All authenticated scopes',
          'modposts', 'modcontributors', 'modmail',
          'modconfig', 'modflair', 'modlog'
        ],
        approvalRequired: false,
        approvalTimeline: 'Immediate (if you create subreddit) or varies (if invited)'
      },

      [AccessLevel.ADS_API]: {
        level: AccessLevel.ADS_API,
        description: 'Reddit Ads API requires active advertising account and approval',
        setupSteps: [
          'Prerequisites:',
          '  - Active Reddit Ads account',
          '  - Advertising campaign history',
          '  - Demonstrated ad spend',
          '',
          'Application Process:',
          '  1. Go to https://ads-api.reddit.com/',
          '  2. Click "Request Access"',
          '  3. Complete application form:',
          '     - Company information',
          '     - Use case description',
          '     - Expected API usage',
          '     - Technical implementation plan',
          '  4. Submit application',
          '  5. Wait for Reddit review',
          '  6. Check email for status updates',
          '',
          'After Approval:',
          '  - Receive Ads API credentials',
          '  - Add to .env configuration',
          '  - Advertising features will unlock'
        ],
        requiredScopes: [
          'All moderator scopes',
          'ads_manage', 'ads_report'
        ],
        approvalRequired: true,
        approvalTimeline: '2-4 weeks',
        applicationUrl: 'https://ads-api.reddit.com/'
      },

      [AccessLevel.READ_ONLY]: {
        level: AccessLevel.READ_ONLY,
        description: 'Read-only access for public content browsing',
        setupSteps: ['No setup required - public content is accessible without authentication'],
        requiredScopes: [],
        approvalRequired: false
      }
    };

    return upgradePaths[target];
  }

  // ==========================================================================
  // OAUTH AUTHENTICATION
  // ==========================================================================

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(scopes: string[], state?: string): string {
    const scope = scopes.join(' ');
    const redirectUri = this.config.redirect_uri || 'http://localhost:8080';
    
    const params = new URLSearchParams({
      client_id: this.config.client_id,
      response_type: 'code',
      state: state || Math.random().toString(36).substring(7),
      redirect_uri: redirectUri,
      duration: 'permanent',
      scope
    });

    return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }> {
    const redirectUri = this.config.redirect_uri || 'http://localhost:8080';
    
    const response = await axios.post(
      `${this.authUrl}/access_token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }),
      {
        auth: {
          username: this.config.client_id,
          password: this.config.client_secret
        },
        headers: {
          'User-Agent': this.config.user_agent,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    scope: string;
  }> {
    const response = await axios.post(
      `${this.authUrl}/access_token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        auth: {
          username: this.config.client_id,
          password: this.config.client_secret
        },
        headers: {
          'User-Agent': this.config.user_agent
        }
      }
    );

    return response.data;
  }

  // ==========================================================================
  // USER OPERATIONS
  // ==========================================================================

  /**
   * Get authenticated user information
   */
  async getUserInfo(): Promise<UserProfile> {
    const response = await this.client.get('/api/v1/me');
    return response.data;
  }

  /**
   * Get user's moderated subreddits
   */
  async getModeratedSubreddits(): Promise<SubredditInfo[]> {
    const response = await this.client.get('/subreddits/mine/moderator');
    return response.data.data.children.map((child: any) => child.data);
  }

  /**
   * Get user's subscribed subreddits
   */
  async getSubscribedSubreddits(): Promise<SubredditInfo[]> {
    const response = await this.client.get('/subreddits/mine/subscriber');
    return response.data.data.children.map((child: any) => child.data);
  }

  // ==========================================================================
  // CONTENT OPERATIONS
  // ==========================================================================

  /**
   * Submit a post to Reddit
   */
  async submitPost(options: PostOptions): Promise<PostData> {
    let kind: string;
    const formData: any = {
      sr: options.subreddit,
      title: options.title,
      nsfw: options.nsfw || false,
      spoiler: options.spoiler || false,
      sendreplies: options.send_replies !== false
    };

    if (options.flair_id) formData.flair_id = options.flair_id;
    if (options.flair_text) formData.flair_text = options.flair_text;

    // Determine post type
    if (options.text !== undefined) {
      kind = 'self';
      formData.text = options.text;
    } else if (options.url) {
      kind = 'link';
      formData.url = options.url;
    } else if (options.image || options.video) {
      kind = 'image'; // Simplified - actual image/video upload is more complex
      throw new Error('Image/video uploads require additional implementation');
    } else {
      throw new Error('Post must have text, url, image, or video');
    }

    formData.kind = kind;

    const response = await this.client.post('/api/submit', formData);
    
    if (response.data.json.errors.length > 0) {
      throw new Error(`Reddit API error: ${JSON.stringify(response.data.json.errors)}`);
    }

    const postId = response.data.json.data.name;
    return this.getPost(postId);
  }

  /**
   * Get post by ID
   */
  async getPost(postId: string): Promise<PostData> {
    // Remove 't3_' prefix if present
    const id = postId.replace('t3_', '');
    const response = await this.client.get(`/by_id/t3_${id}`);
    return response.data.data.children[0].data;
  }

  /**
   * Post a comment
   */
  async postComment(parent: string, text: string): Promise<CommentData> {
    const response = await this.client.post('/api/comment', {
      parent,
      text
    });

    if (response.data.json.errors.length > 0) {
      throw new Error(`Reddit API error: ${JSON.stringify(response.data.json.errors)}`);
    }

    return response.data.json.data.things[0].data;
  }

  /**
   * Vote on post or comment
   */
  async vote(itemId: string, direction: 1 | 0 | -1): Promise<void> {
    await this.client.post('/api/vote', {
      id: itemId,
      dir: direction
    });
  }

  /**
   * Delete post or comment
   */
  async deleteItem(itemId: string): Promise<void> {
    await this.client.post('/api/del', {
      id: itemId
    });
  }

  /**
   * Edit text post or comment
   */
  async editItem(itemId: string, text: string): Promise<void> {
    await this.client.post('/api/editusertext', {
      thing_id: itemId,
      text
    });
  }

  // ==========================================================================
  // SUBREDDIT OPERATIONS
  // ==========================================================================

  /**
   * Get subreddit posts
   */
  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' | 'controversial' = 'hot',
    limit: number = 25
  ): Promise<PostData[]> {
    const response = await this.client.get(`/r/${subreddit}/${sort}`, {
      params: { limit }
    });
    return response.data.data.children.map((child: any) => child.data);
  }

  /**
   * Subscribe to subreddit
   */
  async subscribe(subreddit: string): Promise<void> {
    await this.client.post('/api/subscribe', {
      action: 'sub',
      sr_name: subreddit
    });
  }

  /**
   * Unsubscribe from subreddit
   */
  async unsubscribe(subreddit: string): Promise<void> {
    await this.client.post('/api/subscribe', {
      action: 'unsub',
      sr_name: subreddit
    });
  }

  // ==========================================================================
  // MODERATION OPERATIONS (Requires Moderator Access)
  // ==========================================================================

  /**
   * Perform moderation action
   */
  async moderateItem(action: ModAction): Promise<void> {
    const endpoints: Record<string, string> = {
      'approve': '/api/approve',
      'remove': '/api/remove',
      'spam': '/api/remove',
      'lock': '/api/lock',
      'unlock': '/api/unlock',
      'sticky': '/api/set_subreddit_sticky',
      'unsticky': '/api/set_subreddit_sticky',
      'distinguish': '/api/distinguish',
      'undistinguish': '/api/distinguish'
    };

    const endpoint = endpoints[action.action];
    if (!endpoint) {
      throw new Error(`Unknown moderation action: ${action.action}`);
    }

    const params: any = { id: action.item_id };
    
    if (action.action === 'spam') {
      params.spam = true;
    }
    
    if (action.action === 'sticky' || action.action === 'unsticky') {
      params.state = action.action === 'sticky';
    }
    
    if (action.action === 'distinguish' || action.action === 'undistinguish') {
      params.how = action.action === 'distinguish' ? 'yes' : 'no';
    }

    await this.client.post(endpoint, params);
  }

  /**
   * Ban user from subreddit
   */
  async banUser(options: BanOptions): Promise<void> {
    const params: any = {
      name: options.username,
      ban_reason: options.reason || '',
      note: options.note || '',
      ban_message: options.message || ''
    };

    if (options.duration) {
      params.duration = options.duration;
    }

    await this.client.post(`/r/${options.subreddit}/api/friend`, {
      ...params,
      type: 'banned'
    });
  }

  /**
   * Unban user from subreddit
   */
  async unbanUser(username: string, subreddit: string): Promise<void> {
    await this.client.post(`/r/${subreddit}/api/unfriend`, {
      name: username,
      type: 'banned'
    });
  }

  // ==========================================================================
  // MESSAGING
  // ==========================================================================

  /**
   * Send private message
   */
  async sendMessage(options: MessageOptions): Promise<void> {
    await this.client.post('/api/compose', {
      to: options.to,
      subject: options.subject,
      text: options.text,
      from_sr: options.from_subreddit || ''
    });
  }

  /**
   * Get inbox messages
   */
  async getInbox(filter: 'all' | 'unread' | 'messages' | 'comments' | 'mentions' = 'all'): Promise<any[]> {
    const response = await this.client.get(`/message/${filter}`);
    return response.data.data.children.map((child: any) => child.data);
  }

  /**
   * Mark message as read
   */
  async markRead(messageId: string): Promise<void> {
    await this.client.post('/api/read_message', {
      id: messageId
    });
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Test connection
   */
  async testConnection(): Promise<{
    connected: boolean;
    user?: UserProfile;
    access: AccessCapabilities;
  }> {
    try {
      const access = await this.detectAccessLevel();
      
      if (access.level === AccessLevel.READ_ONLY) {
        return {
          connected: false,
          access
        };
      }

      const user = await this.getUserInfo();
      
      return {
        connected: true,
        user,
        access
      };
    } catch (error) {
      const access = await this.detectAccessLevel();
      return {
        connected: false,
        access
      };
    }
  }

  /**
   * Handle API errors
   */
  handleError(error: AxiosError): void {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      if (status === 401) {
        console.error('Authentication failed. Please check your credentials or re-run OAuth flow.');
        console.error('Run: npm run reddit auth');
      } else if (status === 403) {
        console.error('Permission denied. This action may require higher access level.');
        console.error('Run: npm run reddit detect');
      } else if (status === 429) {
        console.error('Rate limit exceeded. Please wait before making more requests.');
      } else {
        console.error(`Reddit API error: ${data.message || error.message}`);
      }
    } else {
      console.error(`Network error: ${error.message}`);
    }
  }
}

// ============================================================================
// CONFIGURATION HELPER
// ============================================================================

export function loadConfig(): RedditConfig {
  const userAgent = process.env.REDDIT_USER_AGENT || 
                    `AIley-Reddit/1.0.0 (by /u/${process.env.REDDIT_USERNAME || 'unknown'})`;

  return {
    client_id: process.env.REDDIT_CLIENT_ID || '',
    client_secret: process.env.REDDIT_CLIENT_SECRET || '',
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    redirect_uri: process.env.REDDIT_REDIRECT_URI || 'http://localhost:8080',
    access_token: process.env.REDDIT_ACCESS_TOKEN,
    refresh_token: process.env.REDDIT_REFRESH_TOKEN,
    user_agent: userAgent
  };
}
