#!/usr/bin/env tsx
/**
 * Read Email CLI
 * 
 * Read, search, and manage emails via IMAP
 */

import { Command } from 'commander';
import { EmailClient } from './email-client.js';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('read-email')
  .description('Read and search emails via IMAP')
  .version('1.0.0');

// List emails
program
  .command('list')
  .description('List emails from mailbox')
  .option('--folder <name>', 'Folder name', 'INBOX')
  .option('--from <email>', 'Filter by sender email')
  .option('--to <email>', 'Filter by recipient email')
  .option('--subject <text>', 'Filter by subject')
  .option('--unseen', 'Show only unread emails')
  .option('--seen', 'Show only read emails')
  .option('--flagged', 'Show only flagged emails')
  .option('--limit <number>', 'Maximum number of emails', '20')
  .option('--format <type>', 'Output format: table or json', 'table')
  .option('-o, --output <path>', 'Save output to file')
  .action(async (options) => {
    try {
      const client = new EmailClient();
      
      const searchOptions: any = {
        folder: options.folder,
        limit: parseInt(options.limit)
      };
      
      if (options.from) searchOptions.from = options.from;
      if (options.to) searchOptions.to = options.to;
      if (options.subject) searchOptions.subject = options.subject;
      if (options.unseen) searchOptions.unseen = true;
      if (options.seen) searchOptions.seen = true;
      if (options.flagged) searchOptions.flagged = true;
      
      const messages = await client.searchEmails(searchOptions);
      
      if (options.format === 'json') {
        const output = JSON.stringify(messages, null, 2);
        if (options.output) {
          await fs.writeFile(options.output, output);
          console.log(`Saved ${messages.length} emails to ${options.output}`);
        } else {
          console.log(output);
        }
      } else {
        console.log(`\nFound ${messages.length} email(s):\n`);
        messages.forEach(msg => {
          const flagStr = msg.flags.join(', ');
          console.log(`UID: ${msg.uid}`);
          console.log(`From: ${msg.from}`);
          console.log(`Subject: ${msg.subject}`);
          console.log(`Date: ${msg.date.toISOString()}`);
          console.log(`Flags: ${flagStr}`);
          console.log(`Attachments: ${msg.attachments.length}`);
          console.log('---');
        });
      }
      
    } catch (error: any) {
      console.error('Error reading emails:', error.message);
      console.error('\nRun: npm run email setup');
      process.exit(1);
    }
  });

// Show specific email
program
  .command('show')
  .description('Show email details')
  .requiredOption('-u, --uid <number>', 'Email UID')
  .option('--folder <name>', 'Folder name', 'INBOX')
  .option('--save-attachments <dir>', 'Directory to save attachments')
  .action(async (options) => {
    try {
      const client = new EmailClient();
      const uid = parseInt(options.uid);
      
      const message = await client.getEmail(uid, options.folder);
      
      if (!message) {
        console.error(`Email with UID ${uid} not found in ${options.folder}`);
        process.exit(1);
      }
      
      console.log('\n=== Email Details ===\n');
      console.log(`UID: ${message.uid}`);
      console.log(`Message-ID: ${message.messageId}`);
      console.log(`From: ${message.from}`);
      console.log(`To: ${message.to.join(', ')}`);
      if (message.cc) console.log(`CC: ${message.cc.join(', ')}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Date: ${message.date.toISOString()}`);
      console.log(`Flags: ${message.flags.join(', ')}`);
      console.log('\n--- Body ---\n');
      console.log(message.text || message.html || '(no text content)');
      
      if (message.attachments.length > 0) {
        console.log('\n--- Attachments ---\n');
        for (const att of message.attachments) {
          console.log(`- ${att.filename} (${att.contentType}, ${att.size} bytes)`);
          
          if (options.saveAttachments && att.content) {
            const outputPath = path.join(options.saveAttachments, att.filename);
            await fs.mkdir(options.saveAttachments, { recursive: true });
            await fs.writeFile(outputPath, att.content);
            console.log(`  Saved to: ${outputPath}`);
          }
        }
      }
      
    } catch (error: any) {
      console.error('Error showing email:', error.message);
      process.exit(1);
    }
  });

// Mark as read/unread
program
  .command('mark')
  .description('Mark email as read or unread')
  .requiredOption('-u, --uid <number>', 'Email UID')
  .option('--folder <name>', 'Folder name', 'INBOX')
  .option('--unread', 'Mark as unread instead of read')
  .action(async (options) => {
    try {
      const client = new EmailClient();
      const uid = parseInt(options.uid);
      const isRead = !options.unread;
      
      await client.markAsRead(uid, isRead, options.folder);
      console.log(`✓ Email ${uid} marked as ${isRead ? 'read' : 'unread'}`);
      
    } catch (error: any) {
      console.error('Error marking email:', error.message);
      process.exit(1);
    }
  });

// Delete email
program
  .command('delete')
  .description('Delete email')
  .requiredOption('-u, --uid <number>', 'Email UID')
  .option('--folder <name>', 'Folder name', 'INBOX')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const uid = parseInt(options.uid);
      
      if (!options.confirm) {
        console.log(`Are you sure you want to delete email ${uid}? Use --confirm to skip this.`);
        process.exit(1);
      }
      
      const client = new EmailClient();
      await client.deleteEmail(uid, options.folder);
      console.log(`✓ Email ${uid} deleted`);
      
    } catch (error: any) {
      console.error('Error deleting email:', error.message);
      process.exit(1);
    }
  });

// Move email
program
  .command('move')
  .description('Move email to another folder')
  .requiredOption('-u, --uid <number>', 'Email UID')
  .requiredOption('--to <folder>', 'Target folder name')
  .option('--from <folder>', 'Source folder name', 'INBOX')
  .action(async (options) => {
    try {
      const client = new EmailClient();
      const uid = parseInt(options.uid);
      
      await client.moveEmail(uid, options.to, options.from);
      console.log(`✓ Email ${uid} moved to ${options.to}`);
      
    } catch (error: any) {
      console.error('Error moving email:', error.message);
      process.exit(1);
    }
  });

program.parse();
