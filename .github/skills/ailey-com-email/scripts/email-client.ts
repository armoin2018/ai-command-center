#!/usr/bin/env tsx
/**
 * Standard Email Client
 * 
 * IMAP/SMTP/POP3 client for standard email operations.
 * Works with Gmail, Yahoo, Outlook.com, custom servers, etc.
 */

import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.env.HOME || '', '.vscode', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

export interface EmailConfig {
  // IMAP Configuration
  imap?: {
    host: string;
    port: number;
    user: string;
    password: string;
    tls: boolean;
    tlsOptions?: {
      rejectUnauthorized: boolean;
    };
  };
  
  // SMTP Configuration
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

export interface SearchEmailOptions {
  folder?: string;
  from?: string;
  to?: string;
  subject?: string;
  since?: Date;
  before?: Date;
  unseen?: boolean;
  seen?: boolean;
  flagged?: boolean;
  limit?: number;
}

export interface EmailMessage {
  uid: number;
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  date: Date;
  text?: string;
  html?: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content?: Buffer;
  }>;
  flags: string[];
}

export class EmailClient {
  private config: EmailConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  /**
   * Load configuration from environment variables
   */
  private loadConfig(): EmailConfig {
    const imapHost = process.env.IMAP_HOST;
    const imapPort = parseInt(process.env.IMAP_PORT || '993');
    const imapUser = process.env.IMAP_USER || process.env.EMAIL_USER;
    const imapPassword = process.env.IMAP_PASSWORD || process.env.EMAIL_PASSWORD;
    const imapTls = process.env.IMAP_TLS !== 'false';
    
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
    
    const config: EmailConfig = {};
    
    if (imapHost && imapUser && imapPassword) {
      config.imap = {
        host: imapHost,
        port: imapPort,
        user: imapUser,
        password: imapPassword,
        tls: imapTls,
        tlsOptions: { rejectUnauthorized: false }
      };
    }
    
    if (smtpHost && smtpUser && smtpPassword) {
      config.smtp = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword
        }
      };
    }
    
    return config;
  }
  
  /**
   * Test IMAP connection
   */
  async testImapConnection(): Promise<void> {
    if (!this.config.imap) {
      throw new Error('IMAP not configured. Please set IMAP environment variables.');
    }
    
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.config.imap!);
      
      imap.once('ready', () => {
        imap.end();
        resolve();
      });
      
      imap.once('error', (err) => {
        reject(new Error(`IMAP connection failed: ${err.message}`));
      });
      
      imap.connect();
    });
  }
  
  /**
   * Test SMTP connection
   */
  async testSmtpConnection(): Promise<void> {
    if (!this.config.smtp) {
      throw new Error('SMTP not configured. Please set SMTP environment variables.');
    }
    
    const transporter = nodemailer.createTransport(this.config.smtp);
    
    try {
      await transporter.verify();
    } catch (error: any) {
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  }
  
  /**
   * Send email via SMTP
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.config.smtp) {
      throw new Error('SMTP not configured. Run: npm run email setup');
    }
    
    const transporter = nodemailer.createTransport(this.config.smtp);
    
    const mailOptions: any = {
      from: options.from || this.config.smtp.auth.user,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject
    };
    
    if (options.cc) {
      mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
    }
    
    if (options.bcc) {
      mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
    }
    
    if (options.html) {
      mailOptions.html = options.html;
    } else if (options.text) {
      mailOptions.text = options.text;
    }
    
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }
    
    await transporter.sendMail(mailOptions);
  }
  
  /**
   * Search and fetch emails via IMAP
   */
  async searchEmails(options: SearchEmailOptions = {}): Promise<EmailMessage[]> {
    if (!this.config.imap) {
      throw new Error('IMAP not configured. Run: npm run email setup');
    }
    
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.config.imap!);
      const messages: EmailMessage[] = [];
      
      imap.once('ready', () => {
        const folder = options.folder || 'INBOX';
        
        imap.openBox(folder, false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          // Build search criteria
          const criteria: any[] = [];
          
          if (options.unseen) criteria.push('UNSEEN');
          if (options.seen) criteria.push('SEEN');
          if (options.flagged) criteria.push('FLAGGED');
          if (options.from) criteria.push(['FROM', options.from]);
          if (options.to) criteria.push(['TO', options.to]);
          if (options.subject) criteria.push(['SUBJECT', options.subject]);
          if (options.since) criteria.push(['SINCE', options.since]);
          if (options.before) criteria.push(['BEFORE', options.before]);
          
          if (criteria.length === 0) {
            criteria.push('ALL');
          }
          
          imap.search(criteria, (err, uids) => {
            if (err) {
              imap.end();
              return reject(err);
            }
            
            if (!uids || uids.length === 0) {
              imap.end();
              return resolve([]);
            }
            
            // Limit results
            const limitedUids = options.limit ? uids.slice(-options.limit) : uids;
            
            const fetch = imap.fetch(limitedUids, {
              bodies: '',
              struct: true
            });
            
            fetch.on('message', (msg, seqno) => {
              let uid = 0;
              let flags: string[] = [];
              
              msg.on('body', (stream) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) return;
                  
                  const message: EmailMessage = {
                    uid,
                    messageId: parsed.messageId || '',
                    from: parsed.from?.text || '',
                    to: parsed.to?.text ? [parsed.to.text] : [],
                    cc: parsed.cc?.text ? [parsed.cc.text] : undefined,
                    subject: parsed.subject || '',
                    date: parsed.date || new Date(),
                    text: parsed.text,
                    html: parsed.html ? parsed.html.toString() : undefined,
                    attachments: (parsed.attachments || []).map(att => ({
                      filename: att.filename || 'unnamed',
                      contentType: att.contentType,
                      size: att.size,
                      content: att.content
                    })),
                    flags
                  };
                  
                  messages.push(message);
                });
              });
              
              msg.once('attributes', (attrs) => {
                uid = attrs.uid;
                flags = attrs.flags || [];
              });
            });
            
            fetch.once('error', (err) => {
              imap.end();
              reject(err);
            });
            
            fetch.once('end', () => {
              imap.end();
              resolve(messages);
            });
          });
        });
      });
      
      imap.once('error', (err) => {
        reject(err);
      });
      
      imap.connect();
    });
  }
  
  /**
   * Get specific email by UID
   */
  async getEmail(uid: number, folder: string = 'INBOX'): Promise<EmailMessage | null> {
    const messages = await this.searchEmails({ folder });
    return messages.find(m => m.uid === uid) || null;
  }
  
  /**
   * Mark email as read/unread
   */
  async markAsRead(uid: number, isRead: boolean = true, folder: string = 'INBOX'): Promise<void> {
    if (!this.config.imap) {
      throw new Error('IMAP not configured');
    }
    
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.config.imap!);
      
      imap.once('ready', () => {
        imap.openBox(folder, false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          const flag = isRead ? '\\Seen' : '';
          const action = isRead ? 'addFlags' : 'delFlags';
          
          imap[action](uid, flag, (err) => {
            imap.end();
            if (err) return reject(err);
            resolve();
          });
        });
      });
      
      imap.once('error', reject);
      imap.connect();
    });
  }
  
  /**
   * Delete email (move to trash or mark as deleted)
   */
  async deleteEmail(uid: number, folder: string = 'INBOX'): Promise<void> {
    if (!this.config.imap) {
      throw new Error('IMAP not configured');
    }
    
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.config.imap!);
      
      imap.once('ready', () => {
        imap.openBox(folder, false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          imap.addFlags(uid, '\\Deleted', (err) => {
            if (err) {
              imap.end();
              return reject(err);
            }
            
            imap.expunge((err) => {
              imap.end();
              if (err) return reject(err);
              resolve();
            });
          });
        });
      });
      
      imap.once('error', reject);
      imap.connect();
    });
  }
  
  /**
   * Move email to another folder
   */
  async moveEmail(uid: number, targetFolder: string, sourceFolder: string = 'INBOX'): Promise<void> {
    if (!this.config.imap) {
      throw new Error('IMAP not configured');
    }
    
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.config.imap!);
      
      imap.once('ready', () => {
        imap.openBox(sourceFolder, false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          imap.move(uid, targetFolder, (err) => {
            imap.end();
            if (err) return reject(err);
            resolve();
          });
        });
      });
      
      imap.once('error', reject);
      imap.connect();
    });
  }
  
  /**
   * List mailbox folders
   */
  async listFolders(): Promise<Array<{ name: string; delimiter: string; attributes: string[] }>> {
    if (!this.config.imap) {
      throw new Error('IMAP not configured');
    }
    
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.config.imap!);
      
      imap.once('ready', () => {
        imap.getBoxes((err, boxes) => {
          imap.end();
          
          if (err) return reject(err);
          
          const folders: Array<{ name: string; delimiter: string; attributes: string[] }> = [];
          
          const parseBoxes = (boxes: any, prefix = '') => {
            for (const [name, box] of Object.entries(boxes as any)) {
              const fullName = prefix ? `${prefix}${box.delimiter}${name}` : name;
              folders.push({
                name: fullName,
                delimiter: box.delimiter,
                attributes: box.attribs || []
              });
              
              if (box.children) {
                parseBoxes(box.children, fullName);
              }
            }
          };
          
          parseBoxes(boxes);
          resolve(folders);
        });
      });
      
      imap.once('error', reject);
      imap.connect();
    });
  }
  
  /**
   * Download attachment to file
   */
  async downloadAttachment(uid: number, filename: string, outputPath: string, folder: string = 'INBOX'): Promise<void> {
    const message = await this.getEmail(uid, folder);
    
    if (!message) {
      throw new Error(`Email with UID ${uid} not found`);
    }
    
    const attachment = message.attachments.find(att => att.filename === filename);
    
    if (!attachment || !attachment.content) {
      throw new Error(`Attachment "${filename}" not found`);
    }
    
    await fs.writeFile(outputPath, attachment.content);
  }
}

export default EmailClient;
