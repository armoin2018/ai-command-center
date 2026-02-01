#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import ThreadsClient, { PostOptions } from './index';

dotenv.config();

const program = new Command();

program
  .name('threads')
  .description('Threads Content Manager CLI')
  .version('1.0.0');

// Detect command
program
  .command('detect')
  .description('Detect account type and capabilities')
  .action(async () => {
    try {
      const client = createClient();
      const account = await client.detectAccount();

      console.log(chalk.bold.cyan('\n🎯 Threads Account Status\n'));
      console.log(`Account Type: ${chalk.bold(account.accountType)}`);
      console.log(`User ID: ${account.id}`);
      console.log(`Username: @${account.username}`);

      console.log(chalk.bold('\n✅ Available Features:'));
      console.log('  📝 Text & media posting');
      
      if (account.accountType === 'CREATOR' || account.accountType === 'BUSINESS') {
        console.log('  📊 Enhanced analytics');
        console.log('  💬 Reply management');
        console.log('  👥 Audience insights');
      }
      
      if (account.accountType === 'BUSINESS') {
        console.log('  🏢 Business tools');
        console.log('  👥 Team management');
      }

      console.log(chalk.bold('\n📊 Rate Limits:'));
      console.log(`  Requests: ${account.rateLimit.used}/${account.rateLimit.requestsPerHour} per hour`);
      console.log(`  Posts: ${account.rateLimit.postsPerDay === -1 ? 'Unlimited' : account.rateLimit.postsPerDay} per day`);

      if (account.accountType === 'PERSONAL') {
        console.log(chalk.yellow('\n📈 Upgrade to Creator:'));
        console.log('  • Enhanced analytics & insights');
        console.log('  • Reply management tools');
        console.log('  • Audience demographics');
        console.log('\nHow to upgrade:');
        console.log('  1. Switch Instagram to Creator account');
        console.log('  2. Reconnect Threads API');
      } else if (account.accountType === 'CREATOR') {
        console.log(chalk.yellow('\n📈 Upgrade to Business:'));
        console.log('  • Advanced analytics');
        console.log('  • Team collaboration');
        console.log('  • Business verification');
        console.log('\nHow to upgrade:');
        console.log('  1. Switch Instagram to Business account');
        console.log('  2. Link Facebook Business Page');
        console.log('  3. Reconnect Threads API');
      }

      console.log();
    } catch (error: any) {
      console.error(chalk.red('Error detecting account:'), error.message);
      process.exit(1);
    }
  });

// Setup command
program
  .command('setup')
  .description('Display setup instructions')
  .action(() => {
    console.log(chalk.bold.cyan('\n📋 Threads API Setup Instructions\n'));

    console.log(chalk.bold('1. Prerequisites'));
    console.log('   • Instagram Business or Creator account');
    console.log('   • Facebook Page linked to Instagram');
    console.log('   • Facebook Developer account\n');

    console.log(chalk.bold('2. Create Meta App'));
    console.log('   • Visit: https://developers.facebook.com/');
    console.log('   • Click "My Apps" → "Create App"');
    console.log('   • Choose app type (Business/Consumer)');
    console.log('   • Copy App ID and App Secret\n');

    console.log(chalk.bold('3. Add Threads Product'));
    console.log('   • In app dashboard → "Add Products"');
    console.log('   • Find "Instagram" → Click "Set Up"');
    console.log('   • Enable "Threads" under Instagram settings');
    console.log('   • Add OAuth redirect: https://localhost:3000/auth/callback\n');

    console.log(chalk.bold('4. Configure Permissions'));
    console.log('   • threads_basic (required)');
    console.log('   • threads_content_publish (required)');
    console.log('   • threads_manage_insights (Creator/Business)');
    console.log('   • threads_manage_replies (Creator/Business)');
    console.log('   • threads_read_replies (Business)\n');

    console.log(chalk.bold('5. Configure Environment'));
    console.log('   • Copy .env.example to .env');
    console.log('   • Add your App ID and Secret');
    console.log('   • Run: npm run auth start (to get tokens)\n');

    console.log(chalk.bold('6. Add to AI-ley Configuration'));
    console.log('   • Edit: .github/aicc/aicc.yaml');
    console.log('   • Add threads integration (see SKILL.md)\n');

    console.log(chalk.bold('7. Test Connection'));
    console.log('   • Run: npm test\n');

    console.log(chalk.bold.yellow('📚 Full documentation: see SKILL.md'));
  });

// Auth commands
const authCmd = program.command('auth').description('Authentication management');

authCmd
  .command('start')
  .description('Start OAuth authentication flow')
  .action(() => {
    const scopes = [
      'threads_basic',
      'threads_content_publish',
      'threads_manage_insights',
      'threads_manage_replies',
    ];

    const redirectUri = 'https://localhost:3000/auth/callback';
    const client = createClient();
    const authUrl = client.getAuthUrl(redirectUri, scopes);

    console.log(chalk.bold.cyan('\n🔐 Threads OAuth Authentication\n'));
    console.log('1. Visit this URL to authorize:\n');
    console.log(chalk.blue.underline(authUrl));
    console.log('\n2. After authorization, you\'ll receive a code');
    console.log('3. Run: npm run auth token <CODE>\n');
  });

authCmd
  .command('token <code>')
  .description('Exchange authorization code for access token')
  .action(async (code: string) => {
    try {
      const redirectUri = 'https://localhost:3000/auth/callback';
      const client = createClient();
      const tokens = await client.getAccessToken(code, redirectUri);

      console.log(chalk.green('\n✅ Authentication successful!\n'));
      console.log('Add these to your .env file:\n');
      console.log(`THREADS_ACCESS_TOKEN=${tokens.accessToken}`);
      console.log(`THREADS_USER_ID=${tokens.userId}\n`);
    } catch (error: any) {
      console.error(chalk.red('Error exchanging code:'), error.message);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Test API connection')
  .action(async () => {
    try {
      console.log(chalk.cyan('Testing Threads API connection...\n'));

      const client = createClient();
      const account = await client.detectAccount();

      console.log(chalk.green('✅ Connection successful!\n'));
      console.log(chalk.bold('Account Info:'));
      console.log(`  Username: @${account.username}`);
      console.log(`  ID: ${account.id}`);
      console.log(`  Type: ${account.accountType}\n`);
    } catch (error: any) {
      console.error(chalk.red('❌ Connection failed:'), error.message);

      if (error.message.includes('token')) {
        console.log(chalk.yellow('\n💡 Access token may be invalid. Run: npm run auth start'));
      }

      process.exit(1);
    }
  });

// Post command
program
  .command('post <text>')
  .description('Create a post on Threads')
  .option('--image <path>', 'Image file path')
  .option('--video <path>', 'Video file path')
  .option('--images <paths>', 'Multiple images (comma-separated)')
  .option('--link <url>', 'Attach link')
  .option('--alt <text>', 'Alt text for images')
  .action(async (text: string, options: any) => {
    try {
      console.log(chalk.cyan('Creating post...\n'));

      const postOptions: PostOptions = {
        text,
      };

      if (options.image) {
        postOptions.imageUrl = options.image;
        postOptions.altText = options.alt;
      } else if (options.video) {
        postOptions.videoUrl = options.video;
      } else if (options.images) {
        postOptions.imageUrls = options.images.split(',').map((p: string) => p.trim());
        postOptions.altText = options.alt;
      }

      if (options.link) {
        postOptions.linkAttachment = options.link;
      }

      const client = createClient();
      const post = await client.createPost(postOptions);

      console.log(chalk.green('✅ Post created!\n'));
      console.log(chalk.bold('Post Info:'));
      console.log(`  ID: ${post.id}`);
      console.log(`  URL: ${post.permalink}`);
      console.log(`  Text: ${post.text}\n`);
    } catch (error: any) {
      console.error(chalk.red('❌ Post failed:'), error.message);
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Run comprehensive diagnostics')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔍 Threads API Diagnostics\n'));

    // Check environment variables
    console.log(chalk.bold('1. Environment Configuration'));
    const requiredVars = ['THREADS_APP_ID', 'THREADS_APP_SECRET'];
    const optionalVars = ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID'];

    requiredVars.forEach((varName) => {
      if (process.env[varName]) {
        console.log(`  ${chalk.green('✓')} ${varName}`);
      } else {
        console.log(`  ${chalk.red('✗')} ${varName} ${chalk.dim('(missing)')}`);
      }
    });

    optionalVars.forEach((varName) => {
      if (process.env[varName]) {
        console.log(`  ${chalk.green('✓')} ${varName}`);
      } else {
        console.log(`  ${chalk.yellow('⚠')} ${varName} ${chalk.dim('(not set - run auth)')}`);
      }
    });

    // Test API connection
    if (process.env.THREADS_ACCESS_TOKEN) {
      console.log(chalk.bold('\n2. API Connection Test'));
      try {
        const client = createClient();
        await client.detectAccount();
        console.log(`  ${chalk.green('✓')} Connection successful`);
      } catch (error: any) {
        console.log(`  ${chalk.red('✗')} Connection failed: ${error.message}`);
      }
    }

    console.log(chalk.bold('\n3. Next Steps'));
    if (!process.env.THREADS_APP_ID) {
      console.log('  • Run: npm run setup (for setup instructions)');
    } else if (!process.env.THREADS_ACCESS_TOKEN) {
      console.log('  • Run: npm run auth start (to authenticate)');
    } else {
      console.log('  • Run: npm run detect (to check account type)');
      console.log('  • Ready to use! See SKILL.md for examples');
    }

    console.log();
  });

// Helper function
function createClient(): ThreadsClient {
  const config = {
    appId: process.env.THREADS_APP_ID || '',
    appSecret: process.env.THREADS_APP_SECRET || '',
    accessToken: process.env.THREADS_ACCESS_TOKEN,
    userId: process.env.THREADS_USER_ID,
    instagramAccountId: process.env.THREADS_INSTAGRAM_ACCOUNT_ID,
  };

  if (!config.appId || !config.appSecret) {
    console.error(chalk.red('Error: Missing Threads API credentials'));
    console.log(chalk.yellow('\nRun: npm run setup (for setup instructions)'));
    process.exit(1);
  }

  return new ThreadsClient(config);
}

program.parse();
