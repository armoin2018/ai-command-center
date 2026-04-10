#!/usr/bin/env node
/**
 * Mailchimp Client
 * Comprehensive Mailchimp API integration for AI-ley
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AccountInfo {
  tier: 'free' | 'standard' | 'pro' | 'premium';
  hasApiAccess: boolean;
  contactLimit: number;
  contactsUsed: number;
  features: string[];
  upgradeRequired: boolean;
  setupInstructions?: string;
}

export interface MailList {
  id: string;
  name: string;
  subscribedCount: number;
  unsubscribeCount: number;
  createdAt: string;
  campaign_defaults: {
    fromName: string;
    fromEmail: string;
    subject: string;
    language: string;
  };
}

export interface Subscriber {
  id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed' | 'pending' | 'cleaned';
  createdAt: string;
  mergeFields?: Record<string, string>;
}

export interface Campaign {
  id: string;
  title: string;
  subject_line: string;
  status: 'sent' | 'pending' | 'draft' | 'paused' | 'scheduled';
  emails_sent: number;
  createdAt: string;
}

export interface CampaignStats {
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
  openRate: number;
  clickRate: number;
}

export interface ListStats {
  memberCount: number;
  subscribedCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  openRate: number;
  clickRate: number;
}

export interface Automation {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'stopped';
  createdAt: string;
}

export interface MailchimpConfig {
  apiKey?: string;
  serverPrefix?: string;
  timeout?: number;
  rateLimit?: number;
}

// ============================================================================
// MailchimpClient Class
// ============================================================================

export class MailchimpClient {
  private apiKey: string;
  private serverPrefix: string;
  private baseUrl: string;
  private client: AxiosInstance;
  private timeout: number;
  private rateLimit: number;

  constructor(config: MailchimpConfig = {}) {
    this.apiKey = config.apiKey || process.env.MAILCHIMP_API_KEY || '';
    this.serverPrefix = config.serverPrefix || process.env.MAILCHIMP_SERVER_PREFIX || 'us1';
    this.timeout = config.timeout || parseInt(process.env.MAILCHIMP_TIMEOUT || '10000');
    this.rateLimit = config.rateLimit || parseInt(process.env.MAILCHIMP_RATE_LIMIT || '10');

    // Extract server prefix from API key if not provided
    if (this.apiKey && !config.serverPrefix) {
      const match = this.apiKey.match(/-([a-z0-9]+)$/);
      if (match) {
        this.serverPrefix = match[1];
      }
    }

    this.baseUrl = `https://${this.serverPrefix}.api.mailchimp.com/3.0`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      auth: {
        username: 'anystring',
        password: this.apiKey,
      },
    });
  }

  /**
   * Detect account tier and capabilities
   */
  async detectAccountTier(): Promise<AccountInfo> {
    try {
      const response = await this.client.get('/');
      const data = response.data;

      // Determine tier based on plan name
      const planName = data.plan_name?.toLowerCase() || 'free';
      let tier: 'free' | 'standard' | 'pro' | 'premium' = 'free';
      let contactLimit = 500;
      let features: string[] = [];

      if (planName.includes('premium')) {
        tier = 'premium';
        contactLimit = 1000000;
        features = [
          'Email campaigns',
          'Advanced segmentation',
          'Predictive analytics',
          'SMS marketing',
          'Advanced automation',
          'Dedicated support',
          'Custom integrations',
        ];
      } else if (planName.includes('pro')) {
        tier = 'pro';
        contactLimit = 250000;
        features = [
          'Email campaigns',
          'Advanced segmentation',
          'Predictive analytics',
          'SMS integration',
          'Enhanced automation',
          'Priority support',
        ];
      } else if (planName.includes('standard') || planName.includes('monthly')) {
        tier = 'standard';
        contactLimit = 10000;
        features = [
          'Email campaigns',
          'Advanced segmentation',
          'A/B testing',
          'Enhanced analytics',
          'Multi-variate testing',
        ];
      } else {
        tier = 'free';
        contactLimit = 500;
        features = ['Email campaigns', 'Basic segmentation', 'Automation workflows', 'Basic analytics'];
      }

      const hasApiAccess = tier !== 'free' || this.verifyApiKey().catch(() => false);
      const upgradeRequired = tier === 'free' && data.contact_count >= 500;

      return {
        tier,
        hasApiAccess: await hasApiAccess,
        contactLimit,
        contactsUsed: data.contact_count || 0,
        features,
        upgradeRequired,
        setupInstructions: this.getSetupInstructions(),
      };
    } catch (error) {
      throw new Error(`Failed to detect account tier: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get setup instructions
   */
  getSetupInstructions(): string {
    return `
📋 Mailchimp Integration Setup

1. GET YOUR API KEY
   → Visit: https://mailchimp.com/account/
   → Click: Extras → API Keys
   → Create or copy existing API key (format: key-us1)

2. CONFIGURE ENVIRONMENT
   → Edit .env file:
   MAILCHIMP_API_KEY=your_key_here
   MAILCHIMP_SERVER_PREFIX=us1

3. UPGRADE YOUR ACCOUNT
   → Free tier limited to 500 contacts
   → Visit: https://mailchimp.com/pricing/
   → Choose plan: Standard ($20+), Pro ($350+), Premium (custom)
   → Unlock advanced features and higher contact limits

4. VERIFY SETUP
   → Run: npm run auth -- verify
   → Run: npm run detect
   → Run: npm run diagnose

📚 Resources:
   • Account Settings: https://mailchimp.com/account/
   • API Reference: https://mailchimp.com/developer/marketing/api/
   • Help Center: https://mailchimp.com/help/
    `;
  }

  /**
   * Verify API key validity
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.client.get('/');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get all mailing lists
   */
  async getLists(): Promise<MailList[]> {
    try {
      const response = await this.client.get('/lists', {
        params: { count: 1000 },
      });
      return response.data.lists.map((list: any) => this.mapList(list));
    } catch (error) {
      throw new Error(`Failed to get lists: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get specific list details
   */
  async getList(listId: string): Promise<MailList> {
    try {
      const response = await this.client.get(`/lists/${listId}`);
      return this.mapList(response.data);
    } catch (error) {
      throw new Error(`Failed to get list: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Create new mailing list
   */
  async createList(config: any): Promise<MailList> {
    try {
      const response = await this.client.post('/lists', {
        name: config.name,
        permission_reminder: config.permissionReminder,
        use_archive_bar: true,
        campaign_defaults: {
          from_name: config.campaignDefaults.fromName,
          from_email: config.campaignDefaults.fromEmail,
          subject: config.campaignDefaults.subject,
          language: config.campaignDefaults.language,
        },
        contact: config.contact,
        notify_on_subscribe: '',
        notify_on_unsubscribe: '',
        double_optin: false,
        marketing_permissions: false,
      });
      return this.mapList(response.data);
    } catch (error) {
      throw new Error(`Failed to create list: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get list statistics
   */
  async getListStats(listId: string): Promise<ListStats> {
    try {
      const response = await this.client.get(`/lists/${listId}`);
      const list = response.data;
      return {
        memberCount: list.stats.member_count,
        subscribedCount: list.stats.member_count,
        unsubscribeCount: list.stats.unsubscribe_count || 0,
        bounceCount: list.stats.cleaned_count || 0,
        openRate: list.stats.avg_open_rate * 100,
        clickRate: list.stats.avg_click_rate * 100,
      };
    } catch (error) {
      throw new Error(`Failed to get list stats: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get list members
   */
  async getListMembers(
    listId: string,
    options?: { status?: string; limit?: number }
  ): Promise<Subscriber[]> {
    try {
      const response = await this.client.get(`/lists/${listId}/members`, {
        params: {
          status: options?.status || 'subscribed',
          count: options?.limit || 1000,
        },
      });
      return response.data.members.map((member: any) => this.mapSubscriber(member));
    } catch (error) {
      throw new Error(`Failed to get list members: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Add subscriber to list
   */
  async addSubscriber(listId: string, subscriber: any): Promise<Subscriber> {
    try {
      const subscriberHash = this.getSubscriberHash(subscriber.email);
      const response = await this.client.post(`/lists/${listId}/members`, {
        email_address: subscriber.email,
        status: subscriber.status || 'subscribed',
        merge_fields: subscriber.mergeFields || {},
      });
      return this.mapSubscriber(response.data);
    } catch (error) {
      throw new Error(`Failed to add subscriber: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get subscriber
   */
  async getSubscriber(listId: string, email: string): Promise<Subscriber> {
    try {
      const subscriberHash = this.getSubscriberHash(email);
      const response = await this.client.get(`/lists/${listId}/members/${subscriberHash}`);
      return this.mapSubscriber(response.data);
    } catch (error) {
      throw new Error(`Failed to get subscriber: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Update subscriber
   */
  async updateSubscriber(listId: string, email: string, updates: any): Promise<Subscriber> {
    try {
      const subscriberHash = this.getSubscriberHash(email);
      const response = await this.client.patch(`/lists/${listId}/members/${subscriberHash}`, {
        email_address: updates.email || email,
        status: updates.status,
        merge_fields: updates.mergeFields || {},
      });
      return this.mapSubscriber(response.data);
    } catch (error) {
      throw new Error(`Failed to update subscriber: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Remove subscriber
   */
  async removeSubscriber(listId: string, email: string): Promise<void> {
    try {
      const subscriberHash = this.getSubscriberHash(email);
      await this.client.delete(`/lists/${listId}/members/${subscriberHash}`);
    } catch (error) {
      throw new Error(`Failed to remove subscriber: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Create campaign
   */
  async createCampaign(config: any): Promise<Campaign> {
    try {
      const response = await this.client.post('/campaigns', {
        type: config.type,
        recipients: {
          list_id: config.listId,
        },
        settings: {
          subject_line: config.subject,
          title: config.title,
          from_name: config.fromName,
          reply_to: config.fromEmail,
          to_name: '*|FNAME|*',
        },
      });
      return this.mapCampaign(response.data);
    } catch (error) {
      throw new Error(`Failed to create campaign: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get campaign
   */
  async getCampaign(campaignId: string): Promise<Campaign> {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}`);
      return this.mapCampaign(response.data);
    } catch (error) {
      throw new Error(`Failed to get campaign: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * List campaigns
   */
  async listCampaigns(options?: any): Promise<Campaign[]> {
    try {
      const response = await this.client.get('/campaigns', {
        params: {
          status: options?.status || 'any',
          count: options?.limit || 50,
        },
      });
      return response.data.campaigns.map((campaign: any) => this.mapCampaign(campaign));
    } catch (error) {
      throw new Error(`Failed to list campaigns: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Send campaign
   */
  async sendCampaign(campaignId: string): Promise<void> {
    try {
      await this.client.post(`/campaigns/${campaignId}/actions/send`);
    } catch (error) {
      throw new Error(`Failed to send campaign: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Schedule campaign
   */
  async scheduleCampaign(campaignId: string, scheduleTime: Date): Promise<void> {
    try {
      await this.client.post(`/campaigns/${campaignId}/actions/schedule`, {
        schedule_time: scheduleTime.toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to schedule campaign: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    try {
      const response = await this.client.get(`/reports/${campaignId}`);
      const data = response.data;
      return {
        opens: data.opens,
        clicks: data.clicks,
        unsubscribes: data.unsubscribes,
        bounces: data.bounces.hard_bounces + data.bounces.soft_bounces,
        openRate: data.open_rate * 100,
        clickRate: data.click_rate * 100,
      };
    } catch (error) {
      throw new Error(`Failed to get campaign stats: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get automations
   */
  async getAutomations(): Promise<Automation[]> {
    try {
      const response = await this.client.get('/automations', {
        params: { count: 1000 },
      });
      return response.data.automations.map((auto: any) => ({
        id: auto.id,
        title: auto.settings.title,
        status: auto.status,
        createdAt: auto.create_time,
      }));
    } catch (error) {
      throw new Error(`Failed to get automations: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Start automation
   */
  async startAutomation(automationId: string): Promise<void> {
    try {
      await this.client.post(`/automations/${automationId}/actions/start`);
    } catch (error) {
      throw new Error(`Failed to start automation: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Pause automation
   */
  async pauseAutomation(automationId: string): Promise<void> {
    try {
      await this.client.post(`/automations/${automationId}/actions/pause`);
    } catch (error) {
      throw new Error(`Failed to pause automation: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get automation statistics
   */
  async getAutomationStats(automationId: string): Promise<any> {
    try {
      const response = await this.client.get(`/automations/${automationId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get automation stats: ${this.getErrorMessage(error)}`);
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Get MD5 hash of subscriber email (Mailchimp requirement)
   */
  getSubscriberHash(email: string): string {
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  /**
   * Map API list response to MailList interface
   */
  private mapList(list: any): MailList {
    return {
      id: list.id,
      name: list.name,
      subscribedCount: list.stats.member_count,
      unsubscribeCount: list.stats.unsubscribe_count || 0,
      createdAt: list.date_created,
      campaign_defaults: {
        fromName: list.campaign_defaults.from_name,
        fromEmail: list.campaign_defaults.from_email,
        subject: list.campaign_defaults.subject,
        language: list.campaign_defaults.language,
      },
    };
  }

  /**
   * Map API subscriber response to Subscriber interface
   */
  private mapSubscriber(member: any): Subscriber {
    return {
      id: member.id,
      email: member.email_address,
      status: member.status,
      createdAt: member.timestamp_signup,
      mergeFields: member.merge_fields,
    };
  }

  /**
   * Map API campaign response to Campaign interface
   */
  private mapCampaign(campaign: any): Campaign {
    return {
      id: campaign.id,
      title: campaign.settings.title,
      subject_line: campaign.settings.subject_line,
      status: campaign.status,
      emails_sent: campaign.emails_sent || 0,
      createdAt: campaign.create_time,
    };
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return 'Authentication failed. Check your API key and server prefix.';
      }
      if (error.response?.status === 404) {
        return 'Resource not found.';
      }
      if (error.response?.status === 429) {
        return 'Rate limit exceeded. Please try again later.';
      }
      if (error.response?.data?.detail) {
        return error.response.data.detail;
      }
    }
    return error instanceof Error ? error.message : 'Unknown error occurred';
  }
}

/**
 * Factory function to create MailchimpClient
 */
export function createMailchimpClient(config?: MailchimpConfig): MailchimpClient {
  return new MailchimpClient(config);
}

export default MailchimpClient;
