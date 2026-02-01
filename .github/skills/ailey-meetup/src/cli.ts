#!/usr/bin/env node
/**
 * Meetup CLI
 * 
 * Command-line interface for Meetup integration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import open from 'open';
import express from 'express';
import {
  MeetupClient,
  createMeetupClient,
  AccountInfo,
  Event,
} from './index';

const program = new Command();

// ============================================================================
// Helper Functions
// ============================================================================

function saveEnvVariable(key: string, value: string): void {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');
}

function displayAccountInfo(info: AccountInfo): void {
  console.log(chalk.bold('\n📊 Meetup Account Information\n'));
  console.log(`${chalk.cyan('Account Tier:')} ${info.tier === 'pro' ? chalk.green('Meetup Pro ✅') : chalk.yellow('Standard')}`);
  console.log(`${chalk.cyan('API Access:')} ${info.hasApiAccess ? chalk.green('✅ Enabled') : chalk.red('❌ Disabled')}`);
  console.log(`${chalk.cyan('Network Groups:')} ${info.networkGroups}`);

  console.log(chalk.bold('\n📋 Available Features:\n'));
  info.features.forEach(feature => {
    const icon = info.hasApiAccess ? '✅' : '❌';
    console.log(`  ${icon} ${feature}`);
  });

  if (info.upgradeRequired) {
    console.log(chalk.yellow('\n⚠️  Upgrade Required\n'));
    console.log(info.setupInstructions);
  }
}

function displayEvent(event: Event): void {
  console.log(chalk.bold('\n📅 Event Details\n'));
  console.log(`${chalk.cyan('ID:')} ${event.id}`);
  console.log(`${chalk.cyan('Title:')} ${event.title}`);
  console.log(`${chalk.cyan('Date/Time:')} ${new Date(event.dateTime).toLocaleString()}`);
  console.log(`${chalk.cyan('Duration:')} ${event.duration} minutes`);
  console.log(`${chalk.cyan('Group:')} ${event.groupUrlname}`);
  console.log(`${chalk.cyan('RSVPs:')} ${event.rsvpCount}${event.capacity ? ` / ${event.capacity}` : ''}`);
  if (event.waitlistCount > 0) {
    console.log(`${chalk.cyan('Waitlist:')} ${event.waitlistCount}`);
  }
  console.log(`${chalk.cyan('URL:')} ${event.link}`);
  console.log('');
}

// ============================================================================
// Commands
// ============================================================================

program
  .name('meetup-cli')
  .description('Meetup Integration CLI')
  .version('1.0.0');

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🚀 Meetup Integration Setup\n'));

    const client = createMeetupClient();
    const accountInfo = await client.detectAccountTier();

    displayAccountInfo(accountInfo);

    if (!accountInfo.hasApiAccess) {
      console.log(chalk.yellow('\n⚠️  Please upgrade to Meetup Pro and complete OAuth setup before continuing.\n'));
      process.exit(1);
    }

    console.log(chalk.green('\n✅ Setup complete! Your account is ready to use.\n'));
  });

// Detect command
program
  .command('detect')
  .description('Detect account tier and API access')
  .action(async () => {
    try {
      const client = createMeetupClient();
      const accountInfo = await client.detectAccountTier();
      displayAccountInfo(accountInfo);
    } catch (error) {
      console.error(chalk.red('❌ Detection failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Auth commands
const authCommand = program
  .command('auth')
  .description('Authentication commands');

authCommand
  .command('start')
  .description('Start OAuth authentication flow')
  .action(async () => {
    try {
      const client = createMeetupClient();
      const authUrl = client.getAuthUrl();

      console.log(chalk.cyan('\n🔐 Starting OAuth authentication...\n'));
      console.log(`Opening browser to: ${authUrl}\n`);

      // Start local server for callback
      const app = express();
      const port = 3000;

      app.get('/callback', async (req, res) => {
        const code = req.query.code as string;

        if (!code) {
          res.send('❌ Authentication failed: No authorization code received');
          return;
        }

        try {
          const tokens = await client.handleOAuthCallback(code);

          // Save tokens to .env
          saveEnvVariable('MEETUP_ACCESS_TOKEN', tokens.access_token);
          saveEnvVariable('MEETUP_REFRESH_TOKEN', tokens.refresh_token);
          saveEnvVariable('MEETUP_TOKEN_EXPIRY', new Date(Date.now() + tokens.expires_in * 1000).toISOString());

          res.send(`
            <html>
              <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
                <h1 style="color: green;">✅ Authentication Successful!</h1>
                <p>You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);

          console.log(chalk.green('\n✅ Authentication successful!'));
          console.log(chalk.cyan('\nTokens saved to .env file'));
          console.log(chalk.yellow('\nRun "npm run detect" to verify your account tier\n'));

          setTimeout(() => process.exit(0), 1000);
        } catch (error) {
          res.send(`❌ Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(chalk.red('❌ Authentication failed:'), error);
          process.exit(1);
        }
      });

      const server = app.listen(port, () => {
        console.log(chalk.gray(`Callback server listening on port ${port}...\n`));
      });

      // Open browser
      await open(authUrl);

      // Close server after timeout
      setTimeout(() => {
        server.close();
        console.log(chalk.yellow('\n⏱️  Authentication timeout. Please try again.\n'));
        process.exit(1);
      }, 5 * 60 * 1000); // 5 minutes
    } catch (error) {
      console.error(chalk.red('❌ Authentication failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

authCommand
  .command('verify')
  .description('Verify current authentication')
  .action(async () => {
    try {
      const client = createMeetupClient();
      const isValid = await client.verifyAuthentication();

      if (isValid) {
        console.log(chalk.green('\n✅ Authentication valid\n'));
        const accountInfo = await client.detectAccountTier();
        displayAccountInfo(accountInfo);
      } else {
        console.log(chalk.red('\n❌ Authentication invalid or expired\n'));
        console.log(chalk.yellow('Run: npm run auth start\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Verification failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

authCommand
  .command('refresh')
  .description('Refresh access token')
  .action(async () => {
    try {
      const client = createMeetupClient();
      const tokens = await client.refreshAccessToken();

      saveEnvVariable('MEETUP_ACCESS_TOKEN', tokens.access_token);
      if (tokens.refresh_token) {
        saveEnvVariable('MEETUP_REFRESH_TOKEN', tokens.refresh_token);
      }
      saveEnvVariable('MEETUP_TOKEN_EXPIRY', new Date(Date.now() + tokens.expires_in * 1000).toISOString());

      console.log(chalk.green('\n✅ Token refreshed successfully\n'));
    } catch (error) {
      console.error(chalk.red('❌ Token refresh failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

authCommand
  .command('status')
  .description('Show current token status')
  .action(() => {
    const accessToken = process.env.MEETUP_ACCESS_TOKEN;
    const refreshToken = process.env.MEETUP_REFRESH_TOKEN;
    const expiry = process.env.MEETUP_TOKEN_EXPIRY;

    console.log(chalk.bold('\n🔑 Token Status\n'));
    console.log(`${chalk.cyan('Access Token:')} ${accessToken ? chalk.green('✅ Set') : chalk.red('❌ Not set')}`);
    console.log(`${chalk.cyan('Refresh Token:')} ${refreshToken ? chalk.green('✅ Set') : chalk.red('❌ Not set')}`);
    
    if (expiry) {
      const expiryDate = new Date(expiry);
      const isExpired = expiryDate < new Date();
      console.log(`${chalk.cyan('Expiry:')} ${expiryDate.toLocaleString()} ${isExpired ? chalk.red('(Expired)') : chalk.green('(Valid)')}`);
    } else {
      console.log(`${chalk.cyan('Expiry:')} ${chalk.yellow('Unknown')}`);
    }
    console.log('');
  });

// Event commands
const eventCommand = program
  .command('event')
  .description('Event management commands');

eventCommand
  .command('create')
  .description('Create new event')
  .requiredOption('--group <urlname>', 'Group URL name')
  .requiredOption('--title <title>', 'Event title')
  .requiredOption('--description <description>', 'Event description')
  .requiredOption('--start <datetime>', 'Start date/time (ISO 8601)')
  .requiredOption('--duration <minutes>', 'Duration in minutes')
  .option('--venue-id <id>', 'Venue ID')
  .option('--capacity <number>', 'Maximum capacity')
  .option('--draft', 'Save as draft (not published)')
  .action(async (options) => {
    try {
      const client = createMeetupClient();

      console.log(chalk.cyan('\n📅 Creating event...\n'));

      const event = await client.createEvent({
        groupUrlname: options.group,
        title: options.title,
        description: options.description,
        startTime: new Date(options.start),
        duration: parseInt(options.duration),
        venueId: options.venueId,
        capacity: options.capacity ? parseInt(options.capacity) : undefined,
        publishStatus: options.draft ? 'draft' : 'published',
      });

      console.log(chalk.green('✅ Event created successfully!'));
      displayEvent(event);
    } catch (error) {
      console.error(chalk.red('❌ Event creation failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

eventCommand
  .command('list')
  .description('List events for a group')
  .requiredOption('--group <urlname>', 'Group URL name')
  .action(async (options) => {
    try {
      const client = createMeetupClient();
      const events = await client.listEvents(options.group);

      console.log(chalk.bold(`\n📅 Events for ${options.group}\n`));
      
      if (events.length === 0) {
        console.log(chalk.yellow('No upcoming events found\n'));
        return;
      }

      events.forEach((event, index) => {
        console.log(`${index + 1}. ${chalk.cyan(event.title)}`);
        console.log(`   ${new Date(event.dateTime).toLocaleString()} • ${event.rsvpCount} RSVPs`);
        console.log(`   ${event.link}\n`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list events:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

eventCommand
  .command('get')
  .description('Get event details')
  .requiredOption('--event-id <id>', 'Event ID')
  .action(async (options) => {
    try {
      const client = createMeetupClient();
      const event = await client.getEvent(options.eventId);
      displayEvent(event);
    } catch (error) {
      console.error(chalk.red('❌ Failed to get event:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

eventCommand
  .command('update')
  .description('Update event')
  .requiredOption('--event-id <id>', 'Event ID')
  .option('--title <title>', 'New title')
  .option('--description <description>', 'New description')
  .option('--start <datetime>', 'New start time (ISO 8601)')
  .option('--duration <minutes>', 'New duration in minutes')
  .option('--capacity <number>', 'New capacity')
  .action(async (options) => {
    try {
      const client = createMeetupClient();

      console.log(chalk.cyan('\n📝 Updating event...\n'));

      const updates: any = {};
      if (options.title) updates.title = options.title;
      if (options.description) updates.description = options.description;
      if (options.start) updates.startTime = new Date(options.start);
      if (options.duration) updates.duration = parseInt(options.duration);
      if (options.capacity) updates.capacity = parseInt(options.capacity);

      const event = await client.updateEvent(options.eventId, updates);

      console.log(chalk.green('✅ Event updated successfully!'));
      displayEvent(event);
    } catch (error) {
      console.error(chalk.red('❌ Event update failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

eventCommand
  .command('cancel')
  .description('Cancel event')
  .requiredOption('--event-id <id>', 'Event ID')
  .action(async (options) => {
    try {
      const client = createMeetupClient();

      console.log(chalk.cyan('\n🗑️  Canceling event...\n'));

      const success = await client.cancelEvent(options.eventId);

      if (success) {
        console.log(chalk.green('✅ Event canceled successfully\n'));
      } else {
        console.log(chalk.red('❌ Event cancelation failed\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Event cancelation failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

eventCommand
  .command('rsvps')
  .description('Get event RSVPs')
  .requiredOption('--event-id <id>', 'Event ID')
  .action(async (options) => {
    try {
      const client = createMeetupClient();
      const rsvps = await client.getEventRsvps(options.eventId);

      console.log(chalk.bold('\n👥 Event RSVPs\n'));
      console.log(`${chalk.green('Yes:')} ${rsvps.yes}`);
      console.log(`${chalk.red('No:')} ${rsvps.no}`);
      console.log(`${chalk.yellow('Waitlist:')} ${rsvps.waitlist}`);
      console.log(`${chalk.cyan('Total:')} ${rsvps.total}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to get RSVPs:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Group commands
const groupCommand = program
  .command('group')
  .description('Group management commands');

groupCommand
  .command('list')
  .description('List your groups')
  .action(async () => {
    try {
      const client = createMeetupClient();
      const groups = await client.listGroups();

      console.log(chalk.bold('\n👥 Your Groups\n'));

      if (groups.length === 0) {
        console.log(chalk.yellow('No groups found\n'));
        return;
      }

      groups.forEach((group, index) => {
        console.log(`${index + 1}. ${chalk.cyan(group.name)}`);
        console.log(`   URL: ${group.urlname}`);
        console.log(`   Members: ${group.memberCount}`);
        console.log(`   ${group.link}\n`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list groups:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

groupCommand
  .command('get')
  .description('Get group details')
  .requiredOption('--group <urlname>', 'Group URL name')
  .action(async (options) => {
    try {
      const client = createMeetupClient();
      const group = await client.getGroup(options.group);

      console.log(chalk.bold('\n👥 Group Details\n'));
      console.log(`${chalk.cyan('Name:')} ${group.name}`);
      console.log(`${chalk.cyan('URL Name:')} ${group.urlname}`);
      console.log(`${chalk.cyan('Members:')} ${group.memberCount}`);
      console.log(`${chalk.cyan('Organizer:')} ${group.organizerName}`);
      console.log(`${chalk.cyan('Topics:')} ${group.topics.join(', ')}`);
      console.log(`${chalk.cyan('Link:')} ${group.link}`);
      console.log(`\n${chalk.cyan('Description:')}\n${group.description}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to get group:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

groupCommand
  .command('analytics')
  .description('Get group analytics')
  .requiredOption('--group <urlname>', 'Group URL name')
  .option('--period <period>', 'Time period (last-7-days, last-30-days, last-90-days, last-year)', 'last-30-days')
  .action(async (options) => {
    try {
      const client = createMeetupClient();
      const analytics = await client.getGroupAnalytics(options.group, {
        period: options.period as any,
      });

      console.log(chalk.bold(`\n📊 Group Analytics (${options.period})\n`));
      console.log(`${chalk.cyan('Member Growth:')} ${analytics.memberGrowth}`);
      console.log(`${chalk.cyan('Event Attendance:')} ${analytics.eventAttendance}`);
      console.log(`${chalk.cyan('Engagement Rate:')} ${analytics.engagementRate.toFixed(1)}%`);
      console.log(`${chalk.cyan('Average RSVPs:')} ${analytics.averageRsvps.toFixed(1)}`);

      if (analytics.topEvents.length > 0) {
        console.log(chalk.bold('\n🏆 Top Events:\n'));
        analytics.topEvents.forEach((event, index) => {
          console.log(`${index + 1}. ${event.title} - ${event.rsvpCount} RSVPs`);
        });
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red('❌ Failed to get analytics:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Run diagnostic checks')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔍 Running Diagnostics...\n'));

    // Check environment variables
    console.log(chalk.bold('1. Environment Variables'));
    const requiredVars = ['MEETUP_CLIENT_ID', 'MEETUP_CLIENT_SECRET', 'MEETUP_REDIRECT_URI'];
    const optionalVars = ['MEETUP_ACCESS_TOKEN', 'MEETUP_REFRESH_TOKEN'];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`   ${chalk.green('✅')} ${varName}`);
      } else {
        console.log(`   ${chalk.red('❌')} ${varName} ${chalk.yellow('(required)')}`);
      }
    });

    optionalVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`   ${chalk.green('✅')} ${varName}`);
      } else {
        console.log(`   ${chalk.yellow('⚠️ ')} ${varName} ${chalk.gray('(run auth to set)')}`);
      }
    });

    // Check authentication
    console.log(chalk.bold('\n2. Authentication'));
    try {
      const client = createMeetupClient();
      const isValid = await client.verifyAuthentication();
      if (isValid) {
        console.log(`   ${chalk.green('✅')} Authentication valid`);
      } else {
        console.log(`   ${chalk.red('❌')} Authentication invalid`);
      }
    } catch (error) {
      console.log(`   ${chalk.red('❌')} Authentication check failed`);
    }

    // Check account tier
    console.log(chalk.bold('\n3. Account Tier'));
    try {
      const client = createMeetupClient();
      const accountInfo = await client.detectAccountTier();
      console.log(`   ${chalk.cyan('Tier:')} ${accountInfo.tier}`);
      console.log(`   ${chalk.cyan('API Access:')} ${accountInfo.hasApiAccess ? chalk.green('✅') : chalk.red('❌')}`);
    } catch (error) {
      console.log(`   ${chalk.red('❌')} Account detection failed`);
    }

    console.log(chalk.bold.green('\n✅ Diagnostics complete\n'));
  });

// Query command (for custom GraphQL)
program
  .command('query')
  .description('Execute custom GraphQL query')
  .requiredOption('--query <query>', 'GraphQL query string')
  .option('--variables <json>', 'Variables as JSON string')
  .action(async (options) => {
    try {
      const client = createMeetupClient();
      const variables = options.variables ? JSON.parse(options.variables) : undefined;
      const result = await client.query(options.query, variables);

      console.log(chalk.bold('\n📊 Query Result\n'));
      console.log(JSON.stringify(result, null, 2));
      console.log('');
    } catch (error) {
      console.error(chalk.red('❌ Query failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Parse and execute
program.parse(process.argv);
