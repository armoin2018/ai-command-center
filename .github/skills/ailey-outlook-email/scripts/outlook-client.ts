#!/usr/bin/env tsx
/**
 * Microsoft Graph API Client for Outlook/Office 365
 * Provides email, calendar, contacts, and folder management
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential, DeviceCodeCredential } from '@azure/identity';
import type { Message, Event, Contact, MailFolder } from '@microsoft/microsoft-graph-types';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
[
  path.join(process.env.HOME || '', '.vscode', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const GRAPH_API_SCOPES = ['https://graph.microsoft.com/.default'];

interface OutlookConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  authType?: 'app' | 'user';
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: string[];
  isHtml?: boolean;
}

interface SearchEmailOptions {
  folder?: string;
  from?: string;
  subject?: string;
  hasAttachments?: boolean;
  isRead?: boolean;
  startDate?: Date;
  endDate?: Date;
  top?: number;
}

interface CalendarEventOptions {
  subject: string;
  start: Date;
  end: Date;
  location?: string;
  body?: string;
  attendees?: string[];
  isOnline?: boolean;
}

export class OutlookClient {
  private client: Client;
  private config: OutlookConfig;

  constructor(config?: OutlookConfig) {
    this.config = {
      tenantId: config?.tenantId || process.env.AZURE_TENANT_ID,
      clientId: config?.clientId || process.env.AZURE_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.AZURE_CLIENT_SECRET,
      authType: config?.authType || (process.env.AZURE_CLIENT_SECRET ? 'app' : 'user'),
    };

    if (!this.config.tenantId || !this.config.clientId) {
      throw new Error(
        'Microsoft Graph credentials not found. Required:\n' +
        '  - AZURE_TENANT_ID: Your Azure AD tenant ID\n' +
        '  - AZURE_CLIENT_ID: Your app registration client ID\n' +
        '  - AZURE_CLIENT_SECRET: Your app client secret (for app auth)\n\n' +
        'Set these in ~/.vscode/.env, .env, or .env.local\n\n' +
        'Setup guide: Run "npm run outlook setup" for instructions'
      );
    }

    this.client = this.createClient();
  }

  private createClient(): Client {
    let credential;

    if (this.config.authType === 'app' && this.config.clientSecret) {
      // App-only authentication (daemon/service)
      credential = new ClientSecretCredential(
        this.config.tenantId!,
        this.config.clientId!,
        this.config.clientSecret
      );
    } else {
      // User authentication (interactive)
      credential = new DeviceCodeCredential({
        tenantId: this.config.tenantId,
        clientId: this.config.clientId,
      });
    }

    return Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken(GRAPH_API_SCOPES);
          return token!.token;
        },
      },
    });
  }

  /**
   * Test connection to Microsoft Graph API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.api('/me').get();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // EMAIL OPERATIONS
  // ============================================================================

  /**
   * Send email
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const toRecipients = Array.isArray(options.to) ? options.to : [options.to];
    const ccRecipients = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
    const bccRecipients = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];

    const message: any = {
      subject: options.subject,
      body: {
        contentType: options.isHtml ? 'HTML' : 'Text',
        content: options.body,
      },
      toRecipients: toRecipients.map(email => ({ emailAddress: { address: email } })),
    };

    if (ccRecipients.length > 0) {
      message.ccRecipients = ccRecipients.map(email => ({ emailAddress: { address: email } }));
    }

    if (bccRecipients.length > 0) {
      message.bccRecipients = bccRecipients.map(email => ({ emailAddress: { address: email } }));
    }

    // Handle attachments
    if (options.attachments && options.attachments.length > 0) {
      message.attachments = await Promise.all(
        options.attachments.map(async (filePath) => {
          const fileName = path.basename(filePath);
          const fileContent = fs.readFileSync(filePath);
          const base64Content = fileContent.toString('base64');

          return {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: fileName,
            contentBytes: base64Content,
          };
        })
      );
    }

    await this.client.api('/me/sendMail').post({ message });
  }

  /**
   * Read emails
   */
  async readEmails(options: SearchEmailOptions = {}): Promise<Message[]> {
    const folder = options.folder || 'inbox';
    let query = this.client.api(`/me/mailFolders/${folder}/messages`)
      .top(options.top || 10)
      .orderby('receivedDateTime DESC');

    // Build filter
    const filters: string[] = [];
    if (options.from) filters.push(`from/emailAddress/address eq '${options.from}'`);
    if (options.subject) filters.push(`contains(subject, '${options.subject}')`);
    if (options.hasAttachments !== undefined) filters.push(`hasAttachments eq ${options.hasAttachments}`);
    if (options.isRead !== undefined) filters.push(`isRead eq ${options.isRead}`);
    if (options.startDate) filters.push(`receivedDateTime ge ${options.startDate.toISOString()}`);
    if (options.endDate) filters.push(`receivedDateTime le ${options.endDate.toISOString()}`);

    if (filters.length > 0) {
      query = query.filter(filters.join(' and '));
    }

    const response = await query.get();
    return response.value;
  }

  /**
   * Get specific email by ID
   */
  async getEmail(messageId: string): Promise<Message> {
    return await this.client.api(`/me/messages/${messageId}`).get();
  }

  /**
   * Download email attachment
   */
  async downloadAttachment(messageId: string, attachmentId: string, outputPath: string): Promise<void> {
    const attachment = await this.client
      .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
      .get();

    if (attachment.contentBytes) {
      const buffer = Buffer.from(attachment.contentBytes, 'base64');
      fs.writeFileSync(outputPath, buffer);
    }
  }

  /**
   * Mark email as read/unread
   */
  async markAsRead(messageId: string, isRead: boolean = true): Promise<void> {
    await this.client.api(`/me/messages/${messageId}`).patch({ isRead });
  }

  /**
   * Delete email
   */
  async deleteEmail(messageId: string): Promise<void> {
    await this.client.api(`/me/messages/${messageId}`).delete();
  }

  /**
   * Move email to folder
   */
  async moveEmail(messageId: string, destinationFolderId: string): Promise<void> {
    await this.client.api(`/me/messages/${messageId}/move`).post({
      destinationId: destinationFolderId,
    });
  }

  // ============================================================================
  // CALENDAR OPERATIONS
  // ============================================================================

  /**
   * Create calendar event
   */
  async createEvent(options: CalendarEventOptions): Promise<Event> {
    const event: any = {
      subject: options.subject,
      start: {
        dateTime: options.start.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: options.end.toISOString(),
        timeZone: 'UTC',
      },
    };

    if (options.location) {
      event.location = { displayName: options.location };
    }

    if (options.body) {
      event.body = {
        contentType: 'Text',
        content: options.body,
      };
    }

    if (options.attendees && options.attendees.length > 0) {
      event.attendees = options.attendees.map(email => ({
        emailAddress: { address: email },
        type: 'required',
      }));
    }

    if (options.isOnline) {
      event.isOnlineMeeting = true;
      event.onlineMeetingProvider = 'teamsForBusiness';
    }

    return await this.client.api('/me/events').post(event);
  }

  /**
   * List calendar events
   */
  async listEvents(startDate?: Date, endDate?: Date): Promise<Event[]> {
    let query = this.client.api('/me/events')
      .top(50)
      .orderby('start/dateTime');

    if (startDate || endDate) {
      const filters: string[] = [];
      if (startDate) filters.push(`start/dateTime ge '${startDate.toISOString()}'`);
      if (endDate) filters.push(`end/dateTime le '${endDate.toISOString()}'`);
      query = query.filter(filters.join(' and '));
    }

    const response = await query.get();
    return response.value;
  }

  /**
   * Get specific event
   */
  async getEvent(eventId: string): Promise<Event> {
    return await this.client.api(`/me/events/${eventId}`).get();
  }

  /**
   * Update calendar event
   */
  async updateEvent(eventId: string, updates: Partial<CalendarEventOptions>): Promise<Event> {
    const patch: any = {};

    if (updates.subject) patch.subject = updates.subject;
    if (updates.start) patch.start = { dateTime: updates.start.toISOString(), timeZone: 'UTC' };
    if (updates.end) patch.end = { dateTime: updates.end.toISOString(), timeZone: 'UTC' };
    if (updates.location) patch.location = { displayName: updates.location };
    if (updates.body) patch.body = { contentType: 'Text', content: updates.body };

    return await this.client.api(`/me/events/${eventId}`).patch(patch);
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.client.api(`/me/events/${eventId}`).delete();
  }

  // ============================================================================
  // CONTACTS OPERATIONS
  // ============================================================================

  /**
   * Search contacts
   */
  async searchContacts(query: string): Promise<Contact[]> {
    const response = await this.client
      .api('/me/contacts')
      .filter(`startswith(displayName,'${query}') or startswith(emailAddresses/any(a:a/address),'${query}')`)
      .top(20)
      .get();

    return response.value;
  }

  /**
   * Create contact
   */
  async createContact(contact: {
    displayName: string;
    emailAddress?: string;
    phoneNumber?: string;
    jobTitle?: string;
    company?: string;
  }): Promise<Contact> {
    const newContact: any = {
      displayName: contact.displayName,
    };

    if (contact.emailAddress) {
      newContact.emailAddresses = [{ address: contact.emailAddress, name: contact.displayName }];
    }

    if (contact.phoneNumber) {
      newContact.mobilePhone = contact.phoneNumber;
    }

    if (contact.jobTitle) newContact.jobTitle = contact.jobTitle;
    if (contact.company) newContact.companyName = contact.company;

    return await this.client.api('/me/contacts').post(newContact);
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<Contact> {
    return await this.client.api(`/me/contacts/${contactId}`).get();
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<void> {
    await this.client.api(`/me/contacts/${contactId}`).delete();
  }

  // ============================================================================
  // FOLDER OPERATIONS
  // ============================================================================

  /**
   * List mail folders
   */
  async listFolders(): Promise<MailFolder[]> {
    const response = await this.client.api('/me/mailFolders').get();
    return response.value;
  }

  /**
   * Create mail folder
   */
  async createFolder(displayName: string, parentFolderId?: string): Promise<MailFolder> {
    const folder = { displayName };
    const endpoint = parentFolderId
      ? `/me/mailFolders/${parentFolderId}/childFolders`
      : '/me/mailFolders';

    return await this.client.api(endpoint).post(folder);
  }

  /**
   * Delete mail folder
   */
  async deleteFolder(folderId: string): Promise<void> {
    await this.client.api(`/me/mailFolders/${folderId}`).delete();
  }
}

// Test function
async function test() {
  try {
    console.log('Testing Microsoft Graph API connection...');
    const client = new OutlookClient();
    const isConnected = await client.testConnection();

    if (isConnected) {
      console.log('✅ Microsoft Graph API connection successful!');
      console.log('\nTesting email operations...');
      const messages = await client.readEmails({ top: 5 });
      console.log(`Found ${messages.length} recent emails`);
    } else {
      console.log('❌ Microsoft Graph API connection failed.');
      console.log('Run "npm run outlook setup" for configuration instructions');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  test();
}

export default OutlookClient;
