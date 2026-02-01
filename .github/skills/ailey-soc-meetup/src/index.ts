/**
 * Meetup Integration Client
 * 
 * Comprehensive Meetup GraphQL API client with:
 * - Account tier detection (Standard vs Pro)
 * - OAuth 2.0 authentication
 * - Event management
 * - Group administration
 * - RSVP tracking
 * - Member engagement
 * - Analytics and reporting
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MeetupConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  apiEndpoint?: string;
}

export interface AccountInfo {
  tier: 'standard' | 'pro';
  hasApiAccess: boolean;
  networkGroups: number;
  features: string[];
  upgradeRequired: boolean;
  setupInstructions?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  duration: number;
  venueId?: string;
  capacity?: number;
  link: string;
  rsvpCount: number;
  waitlistCount: number;
  groupUrlname: string;
  status: string;
}

export interface CreateEventOptions {
  groupUrlname: string;
  title: string;
  description: string;
  startTime: Date;
  duration: number; // minutes
  venueId?: string;
  capacity?: number;
  publishStatus?: 'draft' | 'published';
}

export interface UpdateEventOptions {
  title?: string;
  description?: string;
  startTime?: Date;
  duration?: number;
  venueId?: string;
  capacity?: number;
}

export interface Group {
  id: string;
  urlname: string;
  name: string;
  description: string;
  memberCount: number;
  organizerName: string;
  topics: string[];
  link: string;
}

export interface Rsvp {
  eventId: string;
  memberId: string;
  memberName: string;
  response: 'yes' | 'no' | 'waitlist';
  guests: number;
  updated: string;
}

export interface RsvpSummary {
  yes: number;
  no: number;
  waitlist: number;
  total: number;
}

export interface Analytics {
  memberGrowth: number;
  eventAttendance: number;
  engagementRate: number;
  averageRsvps: number;
  topEvents: Event[];
}

export interface AnalyticsOptions {
  period: 'last-7-days' | 'last-30-days' | 'last-90-days' | 'last-year';
  metrics?: string[];
}

export interface Member {
  id: string;
  name: string;
  bio?: string;
  joined: string;
  role: 'member' | 'organizer' | 'co-organizer';
}

export interface Activity {
  memberId: string;
  eventsAttended: number;
  rsvps: number;
  comments: number;
  lastActive: string;
}

export interface AnnouncementOptions {
  subject: string;
  message: string;
  targetMembers?: 'all' | 'organizers' | 'recent-attendees';
}

// ============================================================================
// Meetup Client Class
// ============================================================================

export class MeetupClient {
  private config: MeetupConfig;
  private client: AxiosInstance;
  private readonly API_ENDPOINT = 'https://api.meetup.com/gql';
  private readonly OAUTH_BASE = 'https://secure.meetup.com/oauth2';

  constructor(config: MeetupConfig) {
    this.config = {
      apiEndpoint: this.API_ENDPOINT,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.apiEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      if (this.config.accessToken) {
        config.headers.Authorization = `Bearer ${this.config.accessToken}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && this.config.refreshToken) {
          try {
            await this.refreshAccessToken();
            // Retry original request
            const originalRequest = error.config!;
            originalRequest.headers.Authorization = `Bearer ${this.config.accessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ==========================================================================
  // Account Detection
  // ==========================================================================

  /**
   * Detect account tier and API access
   */
  async detectAccountTier(): Promise<AccountInfo> {
    try {
      // Try to query user profile to check API access
      const query = `
        query {
          self {
            id
            name
            email
            memberships {
              count
            }
          }
        }
      `;

      const response = await this.query(query);

      if (response.data?.self) {
        // Successfully queried - has API access (Meetup Pro)
        const networkGroups = response.data.self.memberships?.count || 0;

        return {
          tier: 'pro',
          hasApiAccess: true,
          networkGroups,
          features: [
            'GraphQL API access',
            'Event creation/management',
            'Group administration',
            'RSVP tracking',
            'Member engagement',
            'Advanced analytics',
            'Attendee email access',
            'Custom attendance forms',
            'SEO-friendly branded pages',
          ],
          upgradeRequired: false,
        };
      } else {
        throw new Error('No API access');
      }
    } catch (error) {
      // API access denied - Standard account
      return {
        tier: 'standard',
        hasApiAccess: false,
        networkGroups: 0,
        features: [
          'Web-based event creation',
          'Basic group management',
          'Manual RSVP tracking',
          'Limited analytics',
        ],
        upgradeRequired: true,
        setupInstructions: this.getSetupInstructions(),
      };
    }
  }

  /**
   * Get setup instructions for upgrading to Meetup Pro
   */
  getSetupInstructions(): string {
    return `
╔════════════════════════════════════════════════════════════════╗
║  🎯 Meetup Pro Required for API Access                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Your account does not have API access enabled.                ║
║  To use this skill, you need a Meetup Pro subscription.        ║
║                                                                ║
║  Setup Steps:                                                  ║
║  ──────────────────────────────────────────────────────────   ║
║                                                                ║
║  1. Upgrade to Meetup Pro                                      ║
║     → Visit: https://www.meetup.com/pro/                       ║
║     → Choose your network size and features                    ║
║     → Complete subscription process                            ║
║                                                                ║
║  2. Create OAuth Client                                        ║
║     → Visit: https://www.meetup.com/api/oauth/list/            ║
║     → Click "Create New OAuth Consumer"                        ║
║     → Application Name: AI-ley Meetup Integration              ║
║     → Redirect URI: http://localhost:3000/callback             ║
║     → Save Client ID and Client Secret                         ║
║                                                                ║
║  3. Configure Environment                                      ║
║     → Copy .env.example to .env                                ║
║     → Add your Client ID and Client Secret                     ║
║     → Set redirect URI                                         ║
║                                                                ║
║  4. Authenticate                                               ║
║     → Run: npm run auth start                                  ║
║     → Follow OAuth flow in browser                             ║
║     → Tokens will be saved automatically                       ║
║                                                                ║
║  5. Verify Access                                              ║
║     → Run: npm run detect                                      ║
║     → Confirm "Meetup Pro" account tier                        ║
║                                                                ║
║  For AI-ley Configuration:                                     ║
║  ──────────────────────────────────────────────────────────   ║
║                                                                ║
║  Add to .github/aicc/aicc.yaml:                                ║
║                                                                ║
║  integrations:                                                 ║
║    meetup:                                                     ║
║      enabled: true                                             ║
║      account_tier: pro                                         ║
║      oauth:                                                    ║
║        client_id: \${MEETUP_CLIENT_ID}                         ║
║        client_secret: \${MEETUP_CLIENT_SECRET}                 ║
║        access_token: \${MEETUP_ACCESS_TOKEN}                   ║
║                                                                ║
║  Resources:                                                    ║
║  • API Docs: https://www.meetup.com/api/                       ║
║  • GraphQL Playground: https://www.meetup.com/api/playground/  ║
║  • Help Center: https://help.meetup.com/                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `.trim();
  }

  // ==========================================================================
  // OAuth Authentication
  // ==========================================================================

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
    });

    return `${this.OAUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async handleOAuthCallback(code: string): Promise<TokenResponse> {
    try {
      const response = await axios.post(
        `${this.OAUTH_BASE}/access`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
          code,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData = response.data;
      
      // Update config with new tokens
      this.config.accessToken = tokenData.access_token;
      this.config.refreshToken = tokenData.refresh_token;
      this.config.tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

      return tokenData;
    } catch (error) {
      throw new Error(`OAuth callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        `${this.OAUTH_BASE}/access`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData = response.data;
      
      // Update config with new tokens
      this.config.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        this.config.refreshToken = tokenData.refresh_token;
      }
      this.config.tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

      return tokenData;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify authentication
   */
  async verifyAuthentication(): Promise<boolean> {
    try {
      const accountInfo = await this.detectAccountTier();
      return accountInfo.hasApiAccess;
    } catch (error) {
      return false;
    }
  }

  // ==========================================================================
  // GraphQL Query/Mutation
  // ==========================================================================

  /**
   * Execute GraphQL query
   */
  async query(query: string, variables?: any): Promise<any> {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API request failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Execute GraphQL mutation
   */
  async mutate(mutation: string, variables?: any): Promise<any> {
    return this.query(mutation, variables);
  }

  // ==========================================================================
  // Event Management
  // ==========================================================================

  /**
   * Create new event
   */
  async createEvent(options: CreateEventOptions): Promise<Event> {
    const mutation = `
      mutation($input: CreateEventInput!) {
        createEvent(input: $input) {
          event {
            id
            title
            description
            dateTime
            duration
            eventUrl
            going
            waitlistCount
            maxTickets
            group {
              urlname
            }
          }
        }
      }
    `;

    const variables = {
      input: {
        groupUrlname: options.groupUrlname,
        title: options.title,
        description: options.description,
        startDateTime: options.startTime.toISOString(),
        duration: `PT${options.duration}M`,
        venueId: options.venueId,
        maxTickets: options.capacity,
        publishStatus: options.publishStatus || 'published',
      },
    };

    const result = await this.mutate(mutation, variables);
    const event = result.data.createEvent.event;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      dateTime: event.dateTime,
      duration: options.duration,
      venueId: options.venueId,
      capacity: event.maxTickets,
      link: event.eventUrl,
      rsvpCount: event.going || 0,
      waitlistCount: event.waitlistCount || 0,
      groupUrlname: event.group.urlname,
      status: options.publishStatus || 'published',
    };
  }

  /**
   * Update existing event
   */
  async updateEvent(eventId: string, updates: UpdateEventOptions): Promise<Event> {
    const mutation = `
      mutation($eventId: ID!, $input: UpdateEventInput!) {
        updateEvent(eventId: $eventId, input: $input) {
          event {
            id
            title
            description
            dateTime
            duration
            eventUrl
            going
            waitlistCount
            maxTickets
            group {
              urlname
            }
          }
        }
      }
    `;

    const input: any = {};
    if (updates.title) input.title = updates.title;
    if (updates.description) input.description = updates.description;
    if (updates.startTime) input.startDateTime = updates.startTime.toISOString();
    if (updates.duration) input.duration = `PT${updates.duration}M`;
    if (updates.venueId) input.venueId = updates.venueId;
    if (updates.capacity) input.maxTickets = updates.capacity;

    const variables = { eventId, input };
    const result = await this.mutate(mutation, variables);
    const event = result.data.updateEvent.event;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      dateTime: event.dateTime,
      duration: parseInt(event.duration.match(/\d+/)?.[0] || '0'),
      venueId: updates.venueId,
      capacity: event.maxTickets,
      link: event.eventUrl,
      rsvpCount: event.going || 0,
      waitlistCount: event.waitlistCount || 0,
      groupUrlname: event.group.urlname,
      status: 'published',
    };
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<Event> {
    const query = `
      query($eventId: ID!) {
        event(id: $eventId) {
          id
          title
          description
          dateTime
          duration
          eventUrl
          going
          waitlistCount
          maxTickets
          group {
            urlname
          }
        }
      }
    `;

    const result = await this.query(query, { eventId });
    const event = result.data.event;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      dateTime: event.dateTime,
      duration: parseInt(event.duration.match(/\d+/)?.[0] || '0'),
      capacity: event.maxTickets,
      link: event.eventUrl,
      rsvpCount: event.going || 0,
      waitlistCount: event.waitlistCount || 0,
      groupUrlname: event.group.urlname,
      status: 'published',
    };
  }

  /**
   * List events for a group
   */
  async listEvents(groupUrlname: string, filters?: { status?: string }): Promise<Event[]> {
    const query = `
      query($urlname: String!) {
        groupByUrlname(urlname: $urlname) {
          upcomingEvents {
            edges {
              node {
                id
                title
                description
                dateTime
                duration
                eventUrl
                going
                waitlistCount
                maxTickets
              }
            }
          }
        }
      }
    `;

    const result = await this.query(query, { urlname: groupUrlname });
    const events = result.data.groupByUrlname.upcomingEvents.edges;

    return events.map((edge: any) => {
      const event = edge.node;
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        dateTime: event.dateTime,
        duration: parseInt(event.duration?.match(/\d+/)?.[0] || '0'),
        capacity: event.maxTickets,
        link: event.eventUrl,
        rsvpCount: event.going || 0,
        waitlistCount: event.waitlistCount || 0,
        groupUrlname,
        status: 'published',
      };
    });
  }

  /**
   * Cancel event
   */
  async cancelEvent(eventId: string): Promise<boolean> {
    const mutation = `
      mutation($eventId: ID!) {
        deleteEvent(eventId: $eventId) {
          success
        }
      }
    `;

    const result = await this.mutate(mutation, { eventId });
    return result.data.deleteEvent.success;
  }

  /**
   * Get event RSVPs summary
   */
  async getEventRsvps(eventId: string): Promise<RsvpSummary> {
    const query = `
      query($eventId: ID!) {
        event(id: $eventId) {
          going
          waitlistCount
          rsvps {
            totalCount
          }
        }
      }
    `;

    const result = await this.query(query, { eventId });
    const event = result.data.event;

    return {
      yes: event.going || 0,
      no: 0, // Meetup API doesn't expose "no" count directly
      waitlist: event.waitlistCount || 0,
      total: event.rsvps?.totalCount || 0,
    };
  }

  // ==========================================================================
  // Group Management
  // ==========================================================================

  /**
   * List user's groups
   */
  async listGroups(): Promise<Group[]> {
    const query = `
      query {
        self {
          memberships {
            edges {
              node {
                group {
                  id
                  urlname
                  name
                  description
                  members {
                    count
                  }
                  organizer {
                    name
                  }
                  keyGroupPhoto {
                    baseUrl
                  }
                  link
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.query(query);
    const memberships = result.data.self.memberships.edges;

    return memberships.map((edge: any) => {
      const group = edge.node.group;
      return {
        id: group.id,
        urlname: group.urlname,
        name: group.name,
        description: group.description || '',
        memberCount: group.members?.count || 0,
        organizerName: group.organizer?.name || '',
        topics: [],
        link: group.link,
      };
    });
  }

  /**
   * Get group details
   */
  async getGroup(urlname: string): Promise<Group> {
    const query = `
      query($urlname: String!) {
        groupByUrlname(urlname: $urlname) {
          id
          urlname
          name
          description
          members {
            count
          }
          organizer {
            name
          }
          groupTopics {
            edges {
              node {
                name
              }
            }
          }
          link
        }
      }
    `;

    const result = await this.query(query, { urlname });
    const group = result.data.groupByUrlname;

    return {
      id: group.id,
      urlname: group.urlname,
      name: group.name,
      description: group.description || '',
      memberCount: group.members?.count || 0,
      organizerName: group.organizer?.name || '',
      topics: group.groupTopics?.edges.map((e: any) => e.node.name) || [],
      link: group.link,
    };
  }

  /**
   * Get group analytics
   */
  async getGroupAnalytics(groupUrlname: string, options: AnalyticsOptions): Promise<Analytics> {
    // Note: This is a simplified implementation
    // Real analytics would require more complex queries
    
    const group = await this.getGroup(groupUrlname);
    const events = await this.listEvents(groupUrlname);

    const totalRsvps = events.reduce((sum, e) => sum + e.rsvpCount, 0);
    const avgRsvps = events.length > 0 ? totalRsvps / events.length : 0;

    return {
      memberGrowth: 0, // Would need historical data
      eventAttendance: totalRsvps,
      engagementRate: events.length > 0 ? (avgRsvps / group.memberCount) * 100 : 0,
      averageRsvps: avgRsvps,
      topEvents: events.slice(0, 5),
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get current configuration
   */
  getConfig(): MeetupConfig {
    return { ...this.config };
  }

  /**
   * Update access token
   */
  updateAccessToken(accessToken: string, refreshToken?: string, expiresIn?: number): void {
    this.config.accessToken = accessToken;
    if (refreshToken) {
      this.config.refreshToken = refreshToken;
    }
    if (expiresIn) {
      this.config.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    }
  }
}

// Export convenience functions
export function createMeetupClient(config?: Partial<MeetupConfig>): MeetupClient {
  const fullConfig: MeetupConfig = {
    clientId: config?.clientId || process.env.MEETUP_CLIENT_ID || '',
    clientSecret: config?.clientSecret || process.env.MEETUP_CLIENT_SECRET || '',
    redirectUri: config?.redirectUri || process.env.MEETUP_REDIRECT_URI || 'http://localhost:3000/callback',
    accessToken: config?.accessToken || process.env.MEETUP_ACCESS_TOKEN,
    refreshToken: config?.refreshToken || process.env.MEETUP_REFRESH_TOKEN,
  };

  return new MeetupClient(fullConfig);
}
