import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';

interface WhatsAppConfig {
  apiToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  timeout?: number;
  rateLimit?: number;
  environment?: 'cloud' | 'on-premises';
  apiEndpoint?: string;
}

interface AccountInfo {
  tier: 'standard' | 'business' | 'enterprise';
  hasApiAccess: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  phoneNumber: string;
  displayName: string;
  features: string[];
  messageRate: number; // messages per second
  setupInstructions: string;
  upgradeRequired: boolean;
  environment: 'cloud' | 'on-premises';
}

interface TextMessage {
  recipientPhone: string;
  body: string;
}

interface MediaMessage {
  recipientPhone: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  caption?: string;
}

interface TemplateMessage {
  recipientPhone: string;
  templateName: string;
  language: string;
  parameters?: string[];
}

interface Contact {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  metadata?: Record<string, string>;
}

interface Campaign {
  id?: string;
  templateName: string;
  language: string;
  recipients: string[];
  parameters?: Record<string, string>;
}

interface MessageResponse {
  id: string;
  recipientPhone: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
}

interface TemplateInfo {
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  category: string;
}

class WhatsAppClient {
  private config: WhatsAppConfig;
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private rateLimitQueue: number[] = [];

  constructor(config: WhatsAppConfig) {
    this.config = {
      timeout: 30000,
      rateLimit: 60,
      environment: 'cloud',
      ...config,
    };

    this.baseUrl =
      this.config.environment === 'cloud'
        ? 'https://graph.instagram.com/v19.0'
        : this.config.apiEndpoint || 'https://your-on-premises-endpoint';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    this.rateLimitQueue = this.rateLimitQueue.filter((t) => now - t < 60000);

    if (this.rateLimitQueue.length >= this.config.rateLimit!) {
      const oldestRequest = this.rateLimitQueue[0];
      const waitTime = 60000 - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimitQueue.push(now);
  }

  async detectAccountTier(): Promise<AccountInfo> {
    try {
      const info = await this.getAccountInfo();

      // Detect tier based on API capabilities
      let tier: 'standard' | 'business' | 'enterprise' = 'standard';
      const features: string[] = [];

      features.push('text_messaging');
      features.push('media_messaging');
      features.push('webhook_events');
      features.push('contact_management');

      // Check if Business features are available
      try {
        await this.axiosInstance.get(`/${this.config.businessAccountId}/message_templates`);
        tier = 'business';
        features.push('template_messages');
        features.push('automated_workflows');
        features.push('team_collaboration');
        features.push('analytics_dashboard');
      } catch {
        // Standard tier doesn't have full template support
      }

      // Check for Enterprise features
      if (this.config.environment === 'on-premises') {
        tier = 'enterprise';
        features.push('on_premises_deployment');
        features.push('dedicated_support');
        features.push('custom_integration');
        features.push('advanced_security');
      }

      const messageRate = tier === 'standard' ? 1 : tier === 'business' ? 60 : 999;

      return {
        tier,
        hasApiAccess: true,
        phoneNumberId: this.config.phoneNumberId,
        businessAccountId: this.config.businessAccountId,
        phoneNumber: info.display_phone_number || '',
        displayName: info.name || 'WhatsApp Business',
        features,
        messageRate,
        environment: this.config.environment!,
        setupInstructions: this.getSetupInstructions(),
        upgradeRequired: tier === 'standard',
      };
    } catch (error) {
      return {
        tier: 'standard',
        hasApiAccess: false,
        phoneNumberId: this.config.phoneNumberId,
        businessAccountId: this.config.businessAccountId,
        phoneNumber: '',
        displayName: '',
        features: [],
        messageRate: 0,
        environment: this.config.environment!,
        setupInstructions: this.getSetupInstructions(),
        upgradeRequired: true,
      };
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `/${this.config.phoneNumberId}?fields=display_phone_number,name,about,status,quality_rating`
      );
      return response.data;
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async verifyApiKey(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get(`/${this.config.phoneNumberId}`);
      return !!response.data.id;
    } catch {
      return false;
    }
  }

  async sendTextMessage(message: TextMessage): Promise<MessageResponse> {
    await this.checkRateLimit();

    try {
      const response = await this.axiosInstance.post(
        `/${this.config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.recipientPhone.replace(/\D/g, ''),
          type: 'text',
          text: {
            body: message.body,
          },
        }
      );

      return {
        id: response.data.messages[0].id,
        recipientPhone: message.recipientPhone,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async sendMediaMessage(message: MediaMessage): Promise<MessageResponse> {
    await this.checkRateLimit();

    try {
      const mediaObject: any = {
        link: message.url,
      };

      if (message.caption) {
        mediaObject.caption = message.caption;
      }

      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.recipientPhone.replace(/\D/g, ''),
        type: message.type,
      };

      payload[message.type] = mediaObject;

      const response = await this.axiosInstance.post(
        `/${this.config.phoneNumberId}/messages`,
        payload
      );

      return {
        id: response.data.messages[0].id,
        recipientPhone: message.recipientPhone,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async sendTemplateMessage(message: TemplateMessage): Promise<MessageResponse> {
    await this.checkRateLimit();

    try {
      const components: any[] = [];

      if (message.parameters && message.parameters.length > 0) {
        components.push({
          type: 'body',
          parameters: message.parameters.map((param) => ({
            type: 'text',
            text: param,
          })),
        });
      }

      const response = await this.axiosInstance.post(
        `/${this.config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: message.recipientPhone.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: message.templateName,
            language: {
              code: message.language,
            },
            components,
          },
        }
      );

      return {
        id: response.data.messages[0].id,
        recipientPhone: message.recipientPhone,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async getTemplates(): Promise<TemplateInfo[]> {
    try {
      const response = await this.axiosInstance.get(
        `/${this.config.businessAccountId}/message_templates`
      );
      return response.data.data.map((template: any) => ({
        name: template.name,
        status: template.status,
        language: template.language,
        category: template.category,
      }));
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async addContact(contact: Contact): Promise<Contact> {
    try {
      // Note: WhatsApp API doesn't have direct contact creation
      // This is stored in your application database
      return contact;
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async getContact(phone: string): Promise<Contact | null> {
    try {
      // Check if contact exists in WhatsApp
      const response = await this.axiosInstance.post(
        `/${this.config.phoneNumberId}/contacts`,
        {
          blocking: 'wait',
          contacts: [phone.replace(/\D/g, '')],
        }
      );

      if (response.data.contacts && response.data.contacts.length > 0) {
        return {
          phone: phone.replace(/\D/g, ''),
          firstName: response.data.contacts[0].input,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async updateContact(phone: string, updates: Partial<Contact>): Promise<Contact> {
    try {
      // Update in your application database
      return {
        phone: phone.replace(/\D/g, ''),
        ...updates,
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async setBusinessProfile(profile: {
    name?: string;
    description?: string;
    category?: string;
    websiteUrl?: string;
    profilePhotoUrl?: string;
  }): Promise<any> {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
      };

      if (profile.name) payload.business_profile = { business_profile: { about: profile.description } };

      const response = await this.axiosInstance.post(
        `/${this.config.phoneNumberId}/whatsapp_business_profile`,
        payload
      );

      return response.data;
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  async getMessageStatus(messageId: string): Promise<MessageResponse> {
    try {
      const response = await this.axiosInstance.get(`/${messageId}`);

      return {
        id: messageId,
        recipientPhone: '',
        status: response.data.status as any,
        timestamp: new Date(response.data.timestamp),
      };
    } catch (error) {
      throw this.getErrorMessage(error);
    }
  }

  private getSetupInstructions(): string {
    return `
WhatsApp Business API Setup Instructions

1. Get API Credentials:
   - Visit: https://developers.facebook.com/
   - Create/log into developer account
   - Create new app (Business type)
   - Add WhatsApp product
   - Go to API Setup section

2. Get Your Credentials:
   - Phone Number ID: From "Phone Numbers" section
   - Business Account ID: From "Settings" section
   - API Token: Create System User token

3. Verify Phone Number:
   - Phone Numbers → Add Phone Number
   - Enter business phone (with country code)
   - Complete verification (SMS or call)
   - Copy Phone Number ID

4. Configure Environment:
   - Set WHATSAPP_API_TOKEN=${your_token}
   - Set WHATSAPP_PHONE_NUMBER_ID=${your_phone_id}
   - Set WHATSAPP_BUSINESS_ACCOUNT_ID=${your_waba_id}

5. Verify Setup:
   - Run: npm run detect
   - Run: npm run auth -- verify

For more info: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
    `;
  }

  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.data) {
        return JSON.stringify(axiosError.response.data);
      }
      return axiosError.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

function createWhatsAppClient(): WhatsAppClient {
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!apiToken || !phoneNumberId || !businessAccountId) {
    throw new Error(
      'Missing required environment variables: WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID'
    );
  }

  return new WhatsAppClient({
    apiToken,
    phoneNumberId,
    businessAccountId,
    timeout: parseInt(process.env.WHATSAPP_TIMEOUT || '30000'),
    rateLimit: parseInt(process.env.WHATSAPP_RATE_LIMIT || '60'),
    environment: (process.env.WHATSAPP_ENVIRONMENT || 'cloud') as 'cloud' | 'on-premises',
  });
}

export {
  WhatsAppClient,
  createWhatsAppClient,
  AccountInfo,
  TextMessage,
  MediaMessage,
  TemplateMessage,
  Contact,
  Campaign,
  MessageResponse,
  TemplateInfo,
  WhatsAppConfig,
};
