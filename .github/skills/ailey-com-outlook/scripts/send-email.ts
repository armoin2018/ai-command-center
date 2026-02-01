#!/usr/bin/env tsx
/**
 * Send Email CLI
 */

import { Command } from 'commander';
import fs from 'fs';
import Handlebars from 'handlebars';
import { OutlookClient } from './outlook-client.js';

const program = new Command();

program
  .name('send-email')
  .description('Send emails via Outlook/Office 365')
  .version('1.0.0');

program
  .command('send')
  .description('Send a single email')
  .requiredOption('-t, --to <emails>', 'Recipient email(s), comma-separated')
  .requiredOption('-s, --subject <subject>', 'Email subject')
  .requiredOption('-b, --body <body>', 'Email body (or use --file)')
  .option('--file <path>', 'Email body from file')
  .option('--cc <emails>', 'CC recipients, comma-separated')
  .option('--bcc <emails>', 'BCC recipients, comma-separated')
  .option('--attach <files>', 'Attachments, comma-separated file paths')
  .option('--html', 'Send as HTML email', false)
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      // Get body content
      let body = options.body;
      if (options.file) {
        if (!fs.existsSync(options.file)) {
          throw new Error(`Body file not found: ${options.file}`);
        }
        body = fs.readFileSync(options.file, 'utf-8');
      }

      // Parse recipients
      const to = options.to.split(',').map((e: string) => e.trim());
      const cc = options.cc ? options.cc.split(',').map((e: string) => e.trim()) : undefined;
      const bcc = options.bcc ? options.bcc.split(',').map((e: string) => e.trim()) : undefined;

      // Parse attachments
      const attachments = options.attach
        ? options.attach.split(',').map((f: string) => f.trim())
        : undefined;

      // Validate attachments exist
      if (attachments) {
        attachments.forEach((file: string) => {
          if (!fs.existsSync(file)) {
            throw new Error(`Attachment not found: ${file}`);
          }
        });
      }

      console.log(`Sending email to ${to.join(', ')}...`);

      await client.sendEmail({
        to,
        subject: options.subject,
        body,
        cc,
        bcc,
        attachments,
        isHtml: options.html,
      });

      console.log('✅ Email sent successfully!');
      console.log(`To: ${to.join(', ')}`);
      console.log(`Subject: ${options.subject}`);
      if (cc) console.log(`CC: ${cc.join(', ')}`);
      if (bcc) console.log(`BCC: ${bcc.join(', ')}`);
      if (attachments) console.log(`Attachments: ${attachments.length} file(s)`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('template')
  .description('Send email from template')
  .requiredOption('-t, --to <emails>', 'Recipient email(s), comma-separated')
  .requiredOption('--template <path>', 'Handlebars template file')
  .option('--data <path>', 'JSON data file for template')
  .option('-s, --subject <subject>', 'Email subject (can use template vars)')
  .option('--cc <emails>', 'CC recipients, comma-separated')
  .option('--bcc <emails>', 'BCC recipients, comma-separated')
  .option('--attach <files>', 'Attachments, comma-separated file paths')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      // Load template
      if (!fs.existsSync(options.template)) {
        throw new Error(`Template file not found: ${options.template}`);
      }
      const templateContent = fs.readFileSync(options.template, 'utf-8');
      const template = Handlebars.compile(templateContent);

      // Load data
      let data = {};
      if (options.data) {
        if (!fs.existsSync(options.data)) {
          throw new Error(`Data file not found: ${options.data}`);
        }
        const dataContent = fs.readFileSync(options.data, 'utf-8');
        data = JSON.parse(dataContent);
      }

      // Render template
      const body = template(data);

      // Render subject if it has template vars
      let subject = options.subject || 'Email from template';
      if (subject.includes('{{')) {
        const subjectTemplate = Handlebars.compile(subject);
        subject = subjectTemplate(data);
      }

      // Parse recipients
      const to = options.to.split(',').map((e: string) => e.trim());
      const cc = options.cc ? options.cc.split(',').map((e: string) => e.trim()) : undefined;
      const bcc = options.bcc ? options.bcc.split(',').map((e: string) => e.trim()) : undefined;
      const attachments = options.attach
        ? options.attach.split(',').map((f: string) => f.trim())
        : undefined;

      console.log(`Sending email from template to ${to.join(', ')}...`);

      await client.sendEmail({
        to,
        subject,
        body,
        cc,
        bcc,
        attachments,
        isHtml: true, // Templates are typically HTML
      });

      console.log('✅ Template email sent successfully!');
      console.log(`To: ${to.join(', ')}`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${options.template}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('bulk')
  .description('Send bulk emails from CSV')
  .requiredOption('--csv <path>', 'CSV file with columns: email, subject, body')
  .option('--template <path>', 'Optional Handlebars template')
  .option('--attach <files>', 'Attachments for all emails, comma-separated')
  .option('--delay <ms>', 'Delay between emails (ms)', '1000')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      // Read CSV
      if (!fs.existsSync(options.csv)) {
        throw new Error(`CSV file not found: ${options.csv}`);
      }

      const csvContent = fs.readFileSync(options.csv, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      // Validate headers
      if (!headers.includes('email')) {
        throw new Error('CSV must have "email" column');
      }

      console.log(`Processing ${lines.length - 1} emails...`);

      let sent = 0;
      let failed = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        try {
          let body = row.body || 'Email content';
          let subject = row.subject || 'Bulk email';

          // Use template if provided
          if (options.template) {
            const templateContent = fs.readFileSync(options.template, 'utf-8');
            const template = Handlebars.compile(templateContent);
            body = template(row);

            if (subject.includes('{{')) {
              const subjectTemplate = Handlebars.compile(subject);
              subject = subjectTemplate(row);
            }
          }

          await client.sendEmail({
            to: row.email,
            subject,
            body,
            attachments: options.attach
              ? options.attach.split(',').map((f: string) => f.trim())
              : undefined,
            isHtml: !!options.template,
          });

          sent++;
          console.log(`✅ Sent to ${row.email} (${sent}/${lines.length - 1})`);

          // Delay between sends
          if (i < lines.length - 1) {
            await new Promise(resolve => setTimeout(resolve, parseInt(options.delay)));
          }
        } catch (error) {
          failed++;
          console.error(`❌ Failed to send to ${row.email}: ${error}`);
        }
      }

      console.log(`\n📊 Bulk send complete:`);
      console.log(`  Sent: ${sent}`);
      console.log(`  Failed: ${failed}`);
      console.log(`  Total: ${lines.length - 1}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
