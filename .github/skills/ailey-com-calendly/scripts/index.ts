#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getCalendlyConfig } from './config.js';
import CalendlyClient from './calendly-client.js';

const program = new Command();

program
  .name('calendly')
  .description('Calendly CLI - Manage Calendly scheduling and events')
  .version('1.0.0');

// Setup command
program
  .command('setup')
  .description('Interactive setup for Calendly authentication')
  .option('--token', 'Setup using Personal Access Token')
  .option('--oauth', 'Setup using OAuth 2.0')
  .action(async (options) => {
    console.log(chalk.blue('Calendly Setup'));
    console.log(chalk.gray('─'.repeat(50)));
    
    if (options.oauth) {
      console.log(chalk.yellow('\nOAuth 2.0 Setup:'));
      console.log('1. Go to: https://calendly.com/integrations/api_webhooks');
      console.log('2. Create a new OAuth application');
      console.log('3. Set redirect URI to: http://localhost:3000/callback');
      console.log('4. Add credentials to .env:');
      console.log(chalk.cyan('   CALENDLY_CLIENT_ID=your_client_id'));
      console.log(chalk.cyan('   CALENDLY_CLIENT_SECRET=your_client_secret'));
      console.log(chalk.cyan('   CALENDLY_REDIRECT_URI=http://localhost:3000/callback'));
      
      const config = getCalendlyConfig();
      if (config.clientId && config.clientSecret) {
        console.log(chalk.green('\n✓ OAuth credentials found'));
        const client = new CalendlyClient(config);
        const authUrl = await client.initiateOAuth();
        console.log(chalk.yellow('\nOpened browser for authorization...'));
        console.log('After authorization, you will receive a code.');
        console.log('Exchange it for a token with:');
        console.log(chalk.cyan(`  calendly oauth-callback --code YOUR_CODE`));
      }
    } else {
      console.log(chalk.yellow('\nPersonal Access Token Setup:'));
      console.log('1. Go to: https://calendly.com/integrations/api_webhooks');
      console.log('2. Generate a Personal Access Token');
      console.log('3. Add to .env:');
      console.log(chalk.cyan('   CALENDLY_ACCESS_TOKEN=your_token'));
    }
  });

// OAuth callback
program
  .command('oauth-callback')
  .description('Exchange OAuth authorization code for access token')
  .requiredOption('--code <code>', 'Authorization code from OAuth callback')
  .action(async (options) => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      const tokens = await client.exchangeCodeForToken(options.code);
      
      console.log(chalk.green('✓ Successfully obtained access token'));
      console.log('\nAdd to your .env:');
      console.log(chalk.cyan(`CALENDLY_ACCESS_TOKEN=${tokens.access_token}`));
      console.log(chalk.cyan(`CALENDLY_REFRESH_TOKEN=${tokens.refresh_token}`));
      console.log(chalk.gray(`\nToken expires in: ${tokens.expires_in} seconds`));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Detect tier
program
  .command('detect-tier')
  .description('Detect current Calendly subscription tier')
  .action(async () => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      const tier = await client.detectTier();
      
      console.log(chalk.green('✓ Detected tier:'), chalk.cyan(tier));
      
      const { getTierCapabilities } = await import('./config.js');
      const capabilities = getTierCapabilities(tier);
      
      console.log(chalk.yellow('\nAvailable features:'));
      console.log(chalk.gray('─'.repeat(50)));
      for (const [feature, available] of Object.entries(capabilities)) {
        if (typeof available === 'boolean') {
          const icon = available ? chalk.green('✓') : chalk.red('✗');
          console.log(`${icon} ${feature}`);
        } else {
          console.log(chalk.cyan(`  ${feature}: ${available}`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Get current user
program
  .command('me')
  .description('Get current user information')
  .action(async () => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      const user = await client.getCurrentUser();
      
      console.log(chalk.green('✓ User:'), user.resource.name);
      console.log(chalk.gray('─'.repeat(50)));
      console.log('URI:', user.resource.uri);
      console.log('Email:', user.resource.email);
      console.log('Timezone:', user.resource.timezone);
      console.log('Scheduling URL:', user.resource.scheduling_url);
      console.log('Organization:', user.resource.current_organization);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List event types
program
  .command('event-types')
  .description('List all event types')
  .option('--user <uri>', 'User URI to list event types for')
  .option('--active', 'Show only active event types')
  .action(async (options) => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      const params: any = {};
      
      if (options.active) {
        params.active = true;
      }
      
      const result = await client.listEventTypes(options.user, params);
      
      console.log(chalk.green(`✓ Found ${result.collection.length} event type(s)`));
      console.log(chalk.gray('─'.repeat(50)));
      
      for (const eventType of result.collection) {
        console.log(chalk.cyan(eventType.name));
        console.log('  URI:', eventType.uri);
        console.log('  URL:', eventType.scheduling_url);
        console.log('  Duration:', eventType.duration, 'minutes');
        console.log('  Active:', eventType.active ? 'Yes' : 'No');
        console.log('');
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List scheduled events
program
  .command('scheduled-events')
  .description('List scheduled events')
  .option('--status <status>', 'Filter by status (active, canceled)')
  .option('--min <date>', 'Minimum start time (ISO 8601)')
  .option('--max <date>', 'Maximum start time (ISO 8601)')
  .option('--count <number>', 'Number of results per page')
  .action(async (options) => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      
      // Get current user first
      const user = await client.getCurrentUser();
      
      const params: any = {
        organization: user.resource.current_organization,
      };
      
      if (options.status) params.status = options.status;
      if (options.min) params.min_start_time = options.min;
      if (options.max) params.max_start_time = options.max;
      if (options.count) params.count = parseInt(options.count);
      
      const result = await client.listScheduledEvents(params);
      
      console.log(chalk.green(`✓ Found ${result.collection.length} scheduled event(s)`));
      console.log(chalk.gray('─'.repeat(50)));
      
      for (const event of result.collection) {
        console.log(chalk.cyan(event.name));
        console.log('  URI:', event.uri);
        console.log('  Status:', event.status);
        console.log('  Start:', event.start_time);
        console.log('  End:', event.end_time);
        console.log('  Location:', event.location?.type || 'N/A');
        console.log('');
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Cancel event
program
  .command('cancel-event')
  .description('Cancel a scheduled event')
  .requiredOption('--uuid <uuid>', 'Event UUID to cancel')
  .option('--reason <reason>', 'Cancellation reason')
  .action(async (options) => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      
      await client.cancelScheduledEvent(options.uuid, options.reason);
      
      console.log(chalk.green('✓ Event canceled successfully'));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List webhooks
program
  .command('webhooks')
  .description('List webhook subscriptions')
  .option('--org <uri>', 'Organization URI')
  .action(async (options) => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      
      let orgUri = options.org;
      if (!orgUri) {
        const user = await client.getCurrentUser();
        orgUri = user.resource.current_organization;
      }
      
      const result = await client.listWebhookSubscriptions(orgUri);
      
      console.log(chalk.green(`✓ Found ${result.collection.length} webhook(s)`));
      console.log(chalk.gray('─'.repeat(50)));
      
      for (const webhook of result.collection) {
        console.log(chalk.cyan(webhook.uri));
        console.log('  URL:', webhook.callback_url);
        console.log('  State:', webhook.state);
        console.log('  Events:', webhook.events.join(', '));
        console.log('  Created:', webhook.created_at);
        console.log('');
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Create webhook
program
  .command('create-webhook')
  .description('Create a webhook subscription')
  .requiredOption('--url <url>', 'Callback URL')
  .requiredOption('--events <events>', 'Comma-separated list of events')
  .option('--org <uri>', 'Organization URI')
  .option('--scope <scope>', 'Scope (organization or user)')
  .action(async (options) => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      
      let orgUri = options.org;
      if (!orgUri) {
        const user = await client.getCurrentUser();
        orgUri = user.resource.current_organization;
      }
      
      const data = {
        url: options.url,
        events: options.events.split(',').map((e: string) => e.trim()),
        organization: orgUri,
        scope: options.scope || 'organization',
      };
      
      const webhook = await client.createWebhookSubscription(data);
      
      console.log(chalk.green('✓ Webhook created successfully'));
      console.log('URI:', webhook.resource.uri);
      console.log('Signing key:', webhook.resource.signing_key);
      console.log(chalk.yellow('\nSave the signing key to verify webhook payloads:'));
      console.log(chalk.cyan(`CALENDLY_WEBHOOK_SIGNING_KEY=${webhook.resource.signing_key}`));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Delete webhook
program
  .command('delete-webhook')
  .description('Delete a webhook subscription')
  .requiredOption('--uuid <uuid>', 'Webhook UUID')
  .action(async (options) => {
    try {
      const config = getCalendlyConfig();
      const client = new CalendlyClient(config);
      
      await client.deleteWebhookSubscription(options.uuid);
      
      console.log(chalk.green('✓ Webhook deleted successfully'));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
