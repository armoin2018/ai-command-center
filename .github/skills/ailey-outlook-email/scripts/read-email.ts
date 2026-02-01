#!/usr/bin/env tsx
/**
 * Read Email CLI
 */

import { Command } from 'commander';
import fs from 'fs';
import { OutlookClient } from './outlook-client.js';

const program = new Command();

program
  .name('read-email')
  .description('Read and search emails')
  .version('1.0.0');

program
  .command('list')
  .description('List emails from folder')
  .option('--folder <name>', 'Folder name (inbox, sent, drafts, etc.)', 'inbox')
  .option('--from <email>', 'Filter by sender email')
  .option('--subject <text>', 'Filter by subject contains')
  .option('--unread', 'Show only unread emails', false)
  .option('--attachments', 'Show only emails with attachments', false)
  .option('--top <number>', 'Number of emails to retrieve', '10')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .option('-o, --output <path>', 'Save output to file')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Fetching emails from ${options.folder}...`);

      const messages = await client.readEmails({
        folder: options.folder,
        from: options.from,
        subject: options.subject,
        isRead: options.unread ? false : undefined,
        hasAttachments: options.attachments ? true : undefined,
        top: parseInt(options.top),
      });

      if (messages.length === 0) {
        console.log('No emails found.');
        return;
      }

      let output = '';

      if (options.format === 'json') {
        output = JSON.stringify(messages, null, 2);
      } else {
        // Table format
        console.log(`\nFound ${messages.length} emails:\n`);
        console.log('From'.padEnd(30) + 'Subject'.padEnd(50) + 'Date');
        console.log('-'.repeat(110));

        messages.forEach((msg: any) => {
          const from = (msg.from?.emailAddress?.address || 'Unknown').substring(0, 28).padEnd(30);
          const subject = (msg.subject || '(no subject)').substring(0, 48).padEnd(50);
          const date = new Date(msg.receivedDateTime).toLocaleDateString();
          console.log(`${from}${subject}${date}`);
        });

        console.log(`\nTotal: ${messages.length} emails`);
        return;
      }

      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`\nEmails saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('show')
  .description('Show email details')
  .requiredOption('-i, --id <messageId>', 'Message ID')
  .option('--save-attachments <dir>', 'Save attachments to directory')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Fetching email ${options.id}...`);

      const message: any = await client.getEmail(options.id);

      console.log('\n=== EMAIL DETAILS ===');
      console.log(`From: ${message.from?.emailAddress?.address || 'Unknown'}`);
      console.log(`To: ${message.toRecipients?.map((r: any) => r.emailAddress.address).join(', ') || 'Unknown'}`);
      console.log(`Subject: ${message.subject || '(no subject)'}`);
      console.log(`Date: ${new Date(message.receivedDateTime).toLocaleString()}`);
      console.log(`\nBody:\n${message.body?.content || '(no content)'}`);

      // Handle attachments
      if (message.hasAttachments && message.attachments) {
        console.log(`\nAttachments: ${message.attachments.length}`);

        message.attachments.forEach((att: any, index: number) => {
          console.log(`  ${index + 1}. ${att.name} (${(att.size / 1024).toFixed(2)} KB)`);
        });

        if (options.saveAttachments) {
          if (!fs.existsSync(options.saveAttachments)) {
            fs.mkdirSync(options.saveAttachments, { recursive: true });
          }

          console.log(`\nDownloading attachments to ${options.saveAttachments}...`);

          for (const att of message.attachments) {
            const outputPath = `${options.saveAttachments}/${att.name}`;
            await client.downloadAttachment(message.id, att.id, outputPath);
            console.log(`  ✅ Downloaded ${att.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('mark')
  .description('Mark email as read/unread')
  .requiredOption('-i, --id <messageId>', 'Message ID')
  .option('--unread', 'Mark as unread', false)
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      const isRead = !options.unread;
      console.log(`Marking email as ${isRead ? 'read' : 'unread'}...`);

      await client.markAsRead(options.id, isRead);

      console.log('✅ Email updated successfully!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete email')
  .requiredOption('-i, --id <messageId>', 'Message ID')
  .option('--confirm', 'Confirm deletion', false)
  .action(async (options) => {
    try {
      if (!options.confirm) {
        console.log('Use --confirm to delete the email');
        process.exit(1);
      }

      const client = new OutlookClient();

      console.log(`Deleting email ${options.id}...`);

      await client.deleteEmail(options.id);

      console.log('✅ Email deleted successfully!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('move')
  .description('Move email to folder')
  .requiredOption('-i, --id <messageId>', 'Message ID')
  .requiredOption('--to <folderId>', 'Destination folder ID')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Moving email to folder ${options.to}...`);

      await client.moveEmail(options.id, options.to);

      console.log('✅ Email moved successfully!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
