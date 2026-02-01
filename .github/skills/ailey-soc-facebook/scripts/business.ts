#!/usr/bin/env node

import { Command } from 'commander';
import { FacebookClient, loadConfig } from './facebook-client.js';
import fs from 'fs';

const program = new Command();

program
  .name('facebook-business')
  .description('Facebook business features management')
  .version('1.0.0');

// ============================================================================
// PAGE COMMANDS
// ============================================================================

const pages = program
  .command('pages')
  .description('Manage Facebook pages');

pages
  .command('list')
  .description('List pages you manage')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getPages();
      
      console.log(`Found ${result.data?.length || 0} pages:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

pages
  .command('publish')
  .description('Publish post to page')
  .argument('<page-id>', 'Page ID')
  .option('-m, --message <message>', 'Post message')
  .option('-l, --link <url>', 'Link to share')
  .option('-s, --schedule <datetime>', 'Schedule for future (ISO 8601 format)')
  .option('--draft', 'Save as draft (unpublished)')
  .action(async (pageId, options) => {
    try {
      if (!options.message && !options.link) {
        console.error('Error: Either --message or --link is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.publishToPage(pageId, {
        message: options.message,
        link: options.link,
        scheduled: options.schedule ? new Date(options.schedule) : undefined,
        published: !options.draft
      });
      
      console.log('Post published to page successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

pages
  .command('posts')
  .description('Get page posts')
  .argument('<page-id>', 'Page ID')
  .option('-l, --limit <number>', 'Limit results', '25')
  .action(async (pageId, options) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getPagePosts(pageId, parseInt(options.limit));
      
      console.log(`Found ${result.data?.length || 0} posts:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// LEAD GENERATION COMMANDS
// ============================================================================

const leads = program
  .command('leads')
  .description('Manage lead generation');

leads
  .command('forms')
  .description('List lead gen forms')
  .argument('<page-id>', 'Page ID')
  .action(async (pageId) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getLeadForms(pageId);
      
      console.log(`Found ${result.data?.length || 0} lead gen forms:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

leads
  .command('get')
  .description('Get leads from a form')
  .argument('<form-id>', 'Lead gen form ID')
  .option('-o, --output <file>', 'Export to CSV file')
  .action(async (formId, options) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getLeads(formId);
      
      console.log(`Found ${result.data?.length || 0} leads:`);
      
      if (options.output) {
        // Convert to CSV format
        const leads = result.data || [];
        if (leads.length > 0) {
          const headers = ['id', 'created_time', ...Object.keys(leads[0].field_data || {})];
          const csvRows = [headers.join(',')];
          
          for (const lead of leads) {
            const row = [
              lead.id,
              lead.created_time,
              ...(lead.field_data || []).map((field: any) => `"${field.values?.join(', ') || ''}"`)
            ];
            csvRows.push(row.join(','));
          }
          
          fs.writeFileSync(options.output, csvRows.join('\n'));
          console.log(`Exported to ${options.output}`);
        }
      }
      
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// INSTAGRAM BUSINESS COMMANDS
// ============================================================================

const instagram = program
  .command('instagram')
  .description('Manage Instagram Business account');

instagram
  .command('account')
  .description('Get Instagram Business account info')
  .argument('<page-id>', 'Facebook Page ID')
  .action(async (pageId) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getInstagramAccount(pageId);
      
      console.log('Instagram Business Account:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

instagram
  .command('publish')
  .description('Publish to Instagram')
  .argument('<instagram-account-id>', 'Instagram Business Account ID')
  .option('-i, --image-url <url>', 'Image URL (required)', '')
  .option('-c, --caption <text>', 'Post caption')
  .action(async (accountId, options) => {
    try {
      if (!options.imageUrl) {
        console.error('Error: --image-url is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.publishToInstagram(
        accountId,
        options.imageUrl,
        options.caption
      );
      
      console.log('Published to Instagram successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

instagram
  .command('insights')
  .description('Get Instagram insights')
  .argument('<instagram-account-id>', 'Instagram Business Account ID')
  .option('-m, --metrics <metrics>', 'Comma-separated metrics', 'impressions,reach,profile_views')
  .action(async (accountId, options) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const metrics = options.metrics.split(',');
      const result = await client.getInstagramInsights(accountId, metrics);
      
      console.log('Instagram Insights:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// MESSENGER COMMANDS
// ============================================================================

const messenger = program
  .command('messenger')
  .description('Manage Messenger conversations');

messenger
  .command('send')
  .description('Send message')
  .argument('<recipient-id>', 'Recipient user ID')
  .option('-m, --message <text>', 'Message text (required)', '')
  .action(async (recipientId, options) => {
    try {
      if (!options.message) {
        console.error('Error: --message is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.sendMessage(recipientId, options.message);
      
      console.log('Message sent successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

messenger
  .command('conversations')
  .description('List conversations')
  .argument('<page-id>', 'Page ID')
  .action(async (pageId) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getConversations(pageId);
      
      console.log(`Found ${result.data?.length || 0} conversations:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
