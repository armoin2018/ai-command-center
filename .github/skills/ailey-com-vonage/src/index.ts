import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  senderId?: string;
  applicationId?: string;
  privateKeyPath?: string;
  timeout?: number;
  subdomain?: string;
}

export interface AccountTier {
  tier: 'Pay-As-You-Go' | 'Starter' | 'Pro' | 'Enterprise';
  hasApiAccess: boolean;
  monthlyLimit: number;
  rateLimit: number;
  features: string[];
  setupInstructions: string;
}

export interface SmsOptions {
  to: string;
  text: string;
  from?: string;
  type?: 'unicode' | 'binary';
  validityPeriod?: number;
}

export interface SmsResponse {
  messageId: string;
  to: string;
  status: string;
  remainingBalance?: number;
  messagePrice?: number;
  network?: string;
}

export interface MmsOptions {
  to: string;
  mediaUrl: string;
  caption?: string;
}

export interface MmsResponse {
  messageId: string;
  to: string;
  status: string;
}

export interface CallOptions {
  to: string;
  from: string;
  answerUrl: string;
  eventUrl?: string;
  machineDetection?: boolean;
  timeoutConnect?: number;
}

export interface CallResponse {
  uuid: string;
  status: string;
  direction: string;
}

export interface VerificationOptions {
  number: string;
  brand: string;
  senderId?: string;
  codeLength?: number;
  locale?: string;
}

export interface VerificationResponse {
  requestId: string;
  status: string;
}

export interface CheckVerificationOptions {
  requestId: string;
  code: string;
}

export interface VerificationCheckResponse {
  status: string;
  eventId: string;
}

export interface NumberLookupResponse {
  status: string;
  number: string;
  internationalFormatNumber: string;
  countryCode: string;
  countryName: string;
  countryPrefix: string;
  carrier: string;
  type: string;
  validNumber: string;
  reachable: string;
  roaming: {
    status: string;
    roamingCountryCode?: string;
    roamingCountryName?: string;
  };
}

export interface ConversationMessageOptions {
  conversationId: string;
  content: {
    type: 'text' | 'custom';
    text?: string;
    custom?: Record<string, unknown>;
  };
  channel?: string;
}

export interface ConversationMessageResponse {
  id: string;
  status: string;
}

export interface AccountInfo {
  accountId: string;
  balance: number;
  autoReload: boolean;
  smallAccountLimit: number;
}

export interface AccountUsage {
  monthlyTotalSms: number;
  monthlyTotalVoice: number;
  monthlyTotalVerify: number;
  costMtd: number;
  estimatedCostMtm: number;
}

export interface WebhookOptions {
  url: string;
  type: 'sms' | 'voice' | 'verify' | 'conversation';
  httpMethod?: 'POST' | 'GET';
  verifySignature?: boolean;
}

export interface WebhookResponse {
  webhookUrl: string;
  type: string;
  status: string;
}

export class VonageClient {
  private apiKey: string;
  private apiSecret: string;
  private senderId: string;
  private applicationId?: string;
  private privateKeyPath?: string;
  private axiosInstance: AxiosInstance;
  private subdomain: string;
  private accountTier?: AccountTier;

  constructor(config: VonageConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.senderId = config.senderId || 'Vonage';
    this.applicationId = config.applicationId;
    this.privateKeyPath = config.privateKeyPath;
    this.subdomain = config.subdomain || 'api.vonage.com';

    this.axiosInstance = axios.create({
      baseURL: `https://${this.subdomain}`,
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': 'vonage-ai-ley/1.0.0'
      }
    });
  }

  /**
   * Detect account tier based on API permissions and account settings
   */
  async detectAccountTier(): Promise<AccountTier> {
    try {
      const accountInfo = await this.getAccountInfo();
      
      // Determine tier based on balance and account settings
      let tier: 'Pay-As-You-Go' | 'Starter' | 'Pro' | 'Enterprise' = 'Pay-As-You-Go';
      let monthlyLimit = 0;
      let rateLimit = 10;
      let features = ['sms', 'voice', 'verification'];

      if (accountInfo.balance > 100) {
        tier = 'Starter';
        monthlyLimit = 50000;
        rateLimit = 20;
      }

      if (accountInfo.balance > 500) {
        tier = 'Pro';
        monthlyLimit = 1000000;
        rateLimit = 50;
        features = [...features, 'conversation', 'numberLookup'];
      }

      if (accountInfo.balance > 5000) {
        tier = 'Enterprise';
        monthlyLimit = 10000000;
        rateLimit = 100;
        features = [...features, 'webhookSigning', 'dedicatedSupport'];
      }

      this.accountTier = {
        tier,
        hasApiAccess: true,
        monthlyLimit,
        rateLimit,
        features,
        setupInstructions: this.getSetupInstructions()
      };

      return this.accountTier;
    } catch (error) {
      throw new Error(`Failed to detect account tier: ${error}`);
    }
  }

  /**
   * Verify API credentials
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/account/get-balance', {
        params: {
          api_key: this.apiKey,
          api_secret: this.apiSecret
        }
      });
      return response.status === 200 && response.data.value !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const response = await this.axiosInstance.get('/account/get-balance', {
        params: {
          api_key: this.apiKey,
          api_secret: this.apiSecret
        }
      });

      return {
        accountId: this.apiKey,
        balance: parseFloat(response.data.value),
        autoReload: response.data.auto_reload === '1',
        smallAccountLimit: parseFloat(response.data.small_account_limit || '0')
      };
    } catch (error) {
      throw new Error(`Failed to get account info: ${error}`);
    }
  }

  /**
   * Get account usage statistics
   */
  async getAccountUsage(): Promise<AccountUsage> {
    try {
      const response = await this.axiosInstance.get('/account/get-sms-pricing', {
        params: {
          api_key: this.apiKey,
          api_secret: this.apiSecret,
          account_id: this.apiKey
        }
      });

      return {
        monthlyTotalSms: response.data.monthly_sms_submitted || 0,
        monthlyTotalVoice: response.data.monthly_calls_submitted || 0,
        monthlyTotalVerify: response.data.monthly_verify_requests || 0,
        costMtd: parseFloat(response.data.cost_mtd || '0'),
        estimatedCostMtm: parseFloat(response.data.estimated_cost_mtm || '0')
      };
    } catch (error) {
      throw new Error(`Failed to get account usage: ${error}`);
    }
  }

  /**
   * Send SMS message
   */
  async sendSms(options: SmsOptions): Promise<SmsResponse> {
    try {
      const response = await this.axiosInstance.post('/sms/json', {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        to: options.to,
        from: options.from || this.senderId,
        text: options.text,
        type: options.type || 'text',
        validity_period: options.validityPeriod || 3600
      });

      const message = response.data.messages[0];

      return {
        messageId: message['message-id'],
        to: message.to,
        status: message.status === '0' ? 'success' : 'failed',
        remainingBalance: parseFloat(message['remaining-balance']),
        messagePrice: parseFloat(message['message-price']),
        network: message.network || 'unknown'
      };
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error}`);
    }
  }

  /**
   * Send MMS message
   */
  async sendMms(options: MmsOptions): Promise<MmsResponse> {
    try {
      const response = await this.axiosInstance.post('/mms/json/submit', {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        to: options.to,
        from: this.senderId,
        media_url: options.mediaUrl,
        text: options.caption
      });

      const message = response.data.messages[0];

      return {
        messageId: message['message-id'],
        to: message.to,
        status: message.status === '0' ? 'success' : 'failed'
      };
    } catch (error) {
      throw new Error(`Failed to send MMS: ${error}`);
    }
  }

  /**
   * Create outbound voice call
   */
  async createCall(options: CallOptions): Promise<CallResponse> {
    try {
      const response = await this.axiosInstance.post('/v1/calls', {
        to: [{ type: 'phone', number: options.to }],
        from: { type: 'phone', number: options.from },
        answer_url: [options.answerUrl],
        event_url: options.eventUrl ? [options.eventUrl] : undefined,
        machine_detection: options.machineDetection || 'continue',
        length_timer: options.timeoutConnect || 7200
      }, {
        headers: {
          'Authorization': `Bearer ${this.generateJwt()}`
        }
      });

      return {
        uuid: response.data.uuid,
        status: response.data.status,
        direction: response.data.direction
      };
    } catch (error) {
      throw new Error(`Failed to create call: ${error}`);
    }
  }

  /**
   * Request number verification
   */
  async requestVerification(options: VerificationOptions): Promise<VerificationResponse> {
    try {
      const response = await this.axiosInstance.post('/verify/json/request', {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        number: options.number,
        brand: options.brand,
        sender_id: options.senderId || this.senderId,
        code_length: options.codeLength || 6,
        lg: options.locale || 'en'
      });

      if (response.data.status !== '0') {
        throw new Error(`Verification request failed: ${response.data.error_text}`);
      }

      return {
        requestId: response.data.request_id,
        status: 'sent'
      };
    } catch (error) {
      throw new Error(`Failed to request verification: ${error}`);
    }
  }

  /**
   * Check verification code
   */
  async checkVerification(options: CheckVerificationOptions): Promise<VerificationCheckResponse> {
    try {
      const response = await this.axiosInstance.post('/verify/json/check', {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        request_id: options.requestId,
        code: options.code
      });

      if (response.data.status !== '0') {
        throw new Error(`Verification check failed: ${response.data.error_text}`);
      }

      return {
        status: 'verified',
        eventId: response.data.event_id
      };
    } catch (error) {
      throw new Error(`Failed to check verification: ${error}`);
    }
  }

  /**
   * Lookup number information
   */
  async lookupNumber(number: string): Promise<NumberLookupResponse> {
    try {
      const response = await this.axiosInstance.get('/ni/advanced/json', {
        params: {
          api_key: this.apiKey,
          api_secret: this.apiSecret,
          number: number,
          features: 'carrier,roaming'
        }
      });

      return {
        status: response.data.status,
        number: response.data.international_format_number,
        internationalFormatNumber: response.data.international_format_number,
        countryCode: response.data.country_code,
        countryName: response.data.country_name,
        countryPrefix: response.data.country_prefix,
        carrier: response.data.carrier || 'unknown',
        type: response.data.type || 'unknown',
        validNumber: response.data.valid_number,
        reachable: response.data.reachable,
        roaming: response.data.roaming || { status: 'unknown' }
      };
    } catch (error) {
      throw new Error(`Failed to lookup number: ${error}`);
    }
  }

  /**
   * Send message via Conversation API
   */
  async sendConversationMessage(options: ConversationMessageOptions): Promise<ConversationMessageResponse> {
    try {
      const response = await this.axiosInstance.post(
        `/v1/conversations/${options.conversationId}/messages`,
        {
          from: { type: 'app' },
          to: { type: options.channel || 'sms' },
          message_type: options.content.type,
          text: options.content.text,
          custom: options.content.custom
        },
        {
          headers: {
            'Authorization': `Bearer ${this.generateJwt()}`
          }
        }
      );

      return {
        id: response.data.id,
        status: response.data.status
      };
    } catch (error) {
      throw new Error(`Failed to send conversation message: ${error}`);
    }
  }

  /**
   * Setup webhook for receiving callbacks
   */
  async setupWebhook(options: WebhookOptions): Promise<WebhookResponse> {
    try {
      const endpoint = this.getWebhookEndpoint(options.type);
      
      const response = await this.axiosInstance.post(endpoint, {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        address: options.url,
        http_method: options.httpMethod || 'POST',
        verify_ssl_certificate: options.verifySignature !== false
      });

      return {
        webhookUrl: options.url,
        type: options.type,
        status: response.status === 200 ? 'configured' : 'pending'
      };
    } catch (error) {
      throw new Error(`Failed to setup webhook: ${error}`);
    }
  }

  /**
   * Generate JWT token for Voice API
   */
  private generateJwt(): string {
    if (!this.applicationId || !this.privateKeyPath) {
      throw new Error('Application ID and private key required for JWT generation');
    }

    const privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
    const payload = {
      iss: this.applicationId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    return require('jsonwebtoken').sign(payload, privateKey, { algorithm: 'RS256' });
  }

  /**
   * Get webhook endpoint based on type
   */
  private getWebhookEndpoint(type: string): string {
    const endpoints: Record<string, string> = {
      sms: '/account/subscribe/sms',
      voice: '/account/subscribe/call_event',
      verify: '/account/subscribe/verify',
      conversation: '/account/subscribe/conversation'
    };
    return endpoints[type] || '/account/subscribe/sms';
  }

  /**
   * Get setup instructions
   */
  private getSetupInstructions(): string {
    return `
Setup Instructions for Vonage Communications API:

1. Create Account:
   - Visit https://dashboard.vonage.com/
   - Sign up with email and password
   - Verify email address

2. Get API Credentials:
   - Log in to https://dashboard.vonage.com/
   - Navigate to Settings → API Settings
   - Copy API Key and API Secret

3. Configure Environment:
   - Copy .env.example to .env
   - Add VONAGE_API_KEY and VONAGE_API_SECRET
   - Add VONAGE_SENDER_ID for SMS

4. For Voice API:
   - Go to Applications in dashboard
   - Create new application
   - Add Voice capabilities
   - Download private key as PEM file
   - Set VONAGE_APPLICATION_ID and VONAGE_PRIVATE_KEY_PATH

5. Test Setup:
   - Run: npm run auth verify
   - Run: npm run detect

6. Enable Features:
   - In dashboard, enable SMS, Voice, Verify as needed
   - Add phone numbers for testing

7. Add Webhooks:
   - For receiving SMS: npm run webhook setup --type=sms --url=your-url
   - For voice events: npm run webhook setup --type=voice --url=your-url

Learn more: https://developer.vonage.com/
    `;
  }
}
