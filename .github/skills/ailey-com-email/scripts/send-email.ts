#!/usr/bin/env tsx
/**
 * Send Email CLI
 * 
 * Send emails, use templates, and perform bulk operations
 */

import { Command } from 'commander';
import { EmailClient, SendEmailOptions } from './email-client.js';
import fs from 'fs/promises';
import handlebars from 'handlebars';
import { parse } from 'csv-parse/sync';

const program = new Command();

program
  .name('send-email')
  .description('Send emails via SMTP')
  .version('1.0.0');

// Send single email
program
  .command('send')
  .description('Send a single email')
  .requiredOption('-t, --to <emails>', 'Recipient email(s), comma-separated')
  .requiredOption('-s, --subject <subject>', 'Email subject')
  .option('-b, --body <body>', 'Email body (or use --file)')
  .option('--file <path>', 'Email body from file')
  .option('--cc <emails>', 'CC recipients, comma-separated')
  .option('--bcc <emails>', 'BCC recipients, comma-separated')
  .option('--attach <files>', 'Attachments, comma-separated file paths')
  .option('--html', 'Send as HTML email', false)
  .action(async (options) => {
    try {
      const client = new EmailClient();
      
      let body = options.body;
      if (options.file) {
        body = await fs.readFile(options.file, 'utf-8');
      }
      
      if (!body) {
        console.error('Error: Either --body or --file is required');
        process.exit(1);
      }
      
      const emailOptions: SendEmailOptions = {
        to: options.to.split(',').map((e: string) => e.trim()),
        subject: options.subject
      };
      
      if (options.html) {
        emailOptions.html = body;
      } else {
        emailOptions.text = body;
      }
      
      if (options.cc) {
        emailOptions.cc = options.cc.split(',').map((e: string) => e.trim());
      }
      
      if (options.bcc) {
        emailOptions.bcc = options.bcc.split(',').map((e: string) => e.trim());
      }
      
      if (options.attach) {
        const files = options.attach.split(',').map((f: string) => f.trim());
        emailOptions.attachments = files.map(file => ({
          filename: file.split('/').pop() || 'attachment',
          path: file
        }));
      }
      
      await client.sendEmail(emailOptions);
      console.log('✓ Email sent successfully');
      
    } catch (error: any) {
      console.error('Error sending email:', error.message);
      console.error('\nRun: npm run email setup');
      process.exit(1);
    }
  });

// Send template email
program
  .command('template')
  .description('Send email using Handlebars template')
  .requiredOption('-t, --to <emails>', 'Recipient email(s), comma-separated')
  .requiredOption('--template <path>', 'Handlebars template file')
  .requiredOption('--data <path>', 'JSON data file for template')
  .option('-s, --subject <subject>', 'Email subject (supports {{variables}})')
  .option('--cc <emails>', 'CC recipients')
  .option('--bcc <emails>', 'BCC recipients')
  .option('--attach <files>', 'Attachments, comma-separated')
  .action(async (options) => {
    try {
      const client = new EmailClient();
      
      // Load template and data
      const templateContent = await fs.readFile(options.template, 'utf-8');
      const dataContent = await fs.readFile(options.data, 'utf-8');
      const data = JSON.parse(dataContent);
      
      // Compile template
      const template = handlebars.compile(templateContent);
      const body = template(data);
      
      // Process subject with template variables
      const subject = options.subject 
        ? handlebars.compile(options.subject)(data)
        : 'Email from template';
      
      const emailOptions: SendEmailOptions = {
        to: options.to.split(',').map((e: string) => e.trim()),
        subject,
        html: body
      };
      
      if (options.cc) emailOptions.cc = options.cc.split(',').map((e: string) => e.trim());
      if (options.bcc) emailOptions.bcc = options.bcc.split(',').map((e: string) => e.trim());
      
      if (options.attach) {
        const files = options.attach.split(',').map((f: string) => f.trim());
        emailOptions.attachments = files.map(file => ({
          filename: file.split('/').pop() || 'attachment',
          path: file
        }));
      }
      
      await client.sendEmail(emailOptions);
      console.log('✓ Template email sent successfully');
      
    } catch (error: any) {
      console.error('Error sending template email:', error.message);
      process.exit(1);
    }
  });

// Bulk send from CSV
program
  .command('bulk')
  .description('Send bulk emails from CSV file')
  .requiredOption('--csv <path>', 'CSV file with columns: email, subject, body')
  .option('--template <path>', 'Optional Handlebars template (uses CSV data)')
  .option('--delay <ms>', 'Delay between emails in milliseconds', '1000')
  .option('--attach <files>', 'Attachments for all emails, comma-separated')
  .action(async (options) => {
    try {
      const client = new EmailClient();
      
      // Load CSV
      const csvContent = await fs.readFile(options.csv, 'utf-8');
      const records = parse(csvContent, { columns: true, skip_empty_lines: true });
      
      let template: HandlebarsTemplateDelegate | null = null;
      if (options.template) {
        const templateContent = await fs.readFile(options.template, 'utf-8');
        template = handlebars.compile(templateContent);
      }
      
      const delay = parseInt(options.delay);
      let sent = 0;
      let failed = 0;
      
      for (const record of records) {
        try {
          const body = template ? template(record) : record.body;
          const subject = template && record.subject 
            ? handlebars.compile(record.subject)(record)
            : record.subject;
          
          const emailOptions: SendEmailOptions = {
            to: record.email,
            subject: subject || 'Bulk Email',
            html: body
          };
          
          if (options.attach) {
            const files = options.attach.split(',').map((f: string) => f.trim());
            emailOptions.attachments = files.map(file => ({
              filename: file.split('/').pop() || 'attachment',
              path: file
            }));
          }
          
          await client.sendEmail(emailOptions);
          sent++;
          console.log(`✓ Sent to ${record.email}`);
          
          // Delay between sends
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (error: any) {
          failed++;
          console.error(`✗ Failed to send to ${record.email}: ${error.message}`);
        }
      }
      
      console.log(`\nBulk send complete: ${sent} sent, ${failed} failed`);
      
    } catch (error: any) {
      console.error('Error in bulk send:', error.message);
      process.exit(1);
    }
  });

program.parse();
