#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import YouTubeClient, { VideoUploadOptions } from './index';

dotenv.config();

const program = new Command();

program
  .name('youtube')
  .description('YouTube Content Manager CLI')
  .version('1.0.0');

// Detect command
program
  .command('detect')
  .description('Detect API quota allocation and usage')
  .action(async () => {
    try {
      const client = createClient();
      const quota = await client.detectQuota();

      console.log(chalk.bold.cyan('\n🎯 YouTube API Quota Status\n'));
      console.log(`Daily Quota: ${chalk.bold(quota.dailyQuota.toLocaleString())} units`);
      console.log(
        `Used Today: ${chalk.yellow(quota.usedToday.toLocaleString())} units (${quota.percentageUsed.toFixed(1)}%)`
      );
      console.log(
        `Remaining: ${chalk.green(quota.remaining.toLocaleString())} units (${(100 - quota.percentageUsed).toFixed(1)}%)`
      );

      console.log(chalk.bold('\nEstimated Remaining Operations:'));
      console.log(`  📹 Video uploads: ~${Math.floor(quota.remaining / 1600)}`);
      console.log(`  💬 Comment replies: ~${Math.floor(quota.remaining / 50)}`);
      console.log(`  🔍 Search queries: ~${Math.floor(quota.remaining / 100)}`);
      console.log(`  📊 Metadata updates: ~${Math.floor(quota.remaining / 50)}`);

      console.log(`\nQuota resets at: ${chalk.bold(quota.resetTime.toLocaleString())}`);

      if (quota.percentageUsed >= 80) {
        console.log(chalk.yellow('\n⚠️  Approaching daily quota limit!'));
      }

      if (quota.dailyQuota === 10000) {
        console.log(
          chalk.dim('\n💡 You\'re on the free tier. For higher volume, request quota increase in Google Cloud Console.')
        );
      }
    } catch (error: any) {
      console.error(chalk.red('Error detecting quota:'), error.message);
      process.exit(1);
    }
  });

// Setup command
program
  .command('setup')
  .description('Display setup instructions')
  .action(() => {
    console.log(chalk.bold.cyan('\n📋 YouTube API Setup Instructions\n'));

    console.log(chalk.bold('1. Create Google Cloud Project'));
    console.log('   • Visit: https://console.cloud.google.com/');
    console.log('   • Click "New Project" and create project\n');

    console.log(chalk.bold('2. Enable YouTube APIs'));
    console.log('   • Go to APIs & Services → Library');
    console.log('   • Enable: YouTube Data API v3 (required)');
    console.log('   • Enable: YouTube Analytics API (for analytics)\n');

    console.log(chalk.bold('3. Create OAuth Credentials'));
    console.log('   • Go to APIs & Services → Credentials');
    console.log('   • Create Credentials → OAuth client ID');
    console.log('   • Application type: Web application or Desktop app');
    console.log('   • Add redirect URI: http://localhost:3000/oauth2callback');
    console.log('   • Download credentials JSON\n');

    console.log(chalk.bold('4. Configure Environment'));
    console.log('   • Copy .env.example to .env');
    console.log('   • Add your Client ID and Secret from step 3');
    console.log('   • Run: npm run auth start (to get tokens)\n');

    console.log(chalk.bold('5. Add to AI-ley Configuration'));
    console.log('   • Edit: .github/aicc/aicc.yaml');
    console.log('   • Add youtube integration (see SKILL.md)\n');

    console.log(chalk.bold('6. Test Connection'));
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
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ];

    const client = createClient();
    const authUrl = client.getAuthUrl(scopes);

    console.log(chalk.bold.cyan('\n🔐 YouTube OAuth Authentication\n'));
    console.log('1. Visit this URL to authorize:\n');
    console.log(chalk.blue.underline(authUrl));
    console.log('\n2. After authorization, you\'ll receive a code');
    console.log('3. Run: npm run auth token <CODE>\n');
  });

authCmd
  .command('token <code>')
  .description('Exchange authorization code for tokens')
  .action(async (code: string) => {
    try {
      const client = createClient();
      const tokens = await client.getTokensFromCode(code);

      console.log(chalk.green('\n✅ Authentication successful!\n'));
      console.log('Add these to your .env file:\n');
      console.log(`YOUTUBE_ACCESS_TOKEN=${tokens.accessToken}`);
      console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refreshToken}\n`);
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
      console.log(chalk.cyan('Testing YouTube API connection...\n'));

      const client = createClient();
      const channel = await client.testConnection();

      console.log(chalk.green('✅ Connection successful!\n'));
      console.log(chalk.bold('Channel Info:'));
      console.log(`  Name: ${channel.snippet.title}`);
      console.log(`  ID: ${channel.id}`);
      console.log(`  Subscribers: ${parseInt(channel.statistics.subscriberCount).toLocaleString()}`);
      console.log(`  Videos: ${parseInt(channel.statistics.videoCount).toLocaleString()}`);
      console.log(`  Views: ${parseInt(channel.statistics.viewCount).toLocaleString()}\n`);
    } catch (error: any) {
      console.error(chalk.red('❌ Connection failed:'), error.message);

      if (error.message.includes('invalid_grant')) {
        console.log(chalk.yellow('\n💡 Tokens may be expired. Run: npm run auth start'));
      } else if (error.message.includes('API')) {
        console.log(chalk.yellow('\n💡 Make sure YouTube Data API v3 is enabled in Google Cloud Console'));
      }

      process.exit(1);
    }
  });

// Upload command
program
  .command('upload <file>')
  .description('Upload video to YouTube')
  .option('--title <title>', 'Video title', 'Untitled')
  .option('--description <text>', 'Video description', '')
  .option('--tags <tags>', 'Comma-separated tags', '')
  .option('--category <id>', 'Category ID', '22')
  .option('--privacy <level>', 'Privacy: public, private, unlisted', 'private')
  .option('--thumbnail <path>', 'Thumbnail image path')
  .option('--playlist <id>', 'Add to playlist ID')
  .action(async (file: string, options: any) => {
    try {
      console.log(chalk.cyan(`Uploading ${file}...\n`));

      const uploadOptions: VideoUploadOptions = {
        title: options.title,
        description: options.description,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [],
        categoryId: options.category,
        privacyStatus: options.privacy,
        thumbnailPath: options.thumbnail,
        playlistId: options.playlist,
      };

      const client = createClient();
      const video = await client.uploadVideo(file, uploadOptions);

      console.log(chalk.green('✅ Upload successful!\n'));
      console.log(chalk.bold('Video Info:'));
      console.log(`  ID: ${video.id}`);
      console.log(`  URL: https://youtube.com/watch?v=${video.id}`);
      console.log(`  Title: ${video.snippet.title}`);
      console.log(`  Privacy: ${video.status.privacyStatus}\n`);
    } catch (error: any) {
      console.error(chalk.red('❌ Upload failed:'), error.message);
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Run comprehensive diagnostics')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔍 YouTube API Diagnostics\n'));

    // Check environment variables
    console.log(chalk.bold('1. Environment Configuration'));
    const requiredVars = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'];
    const optionalVars = ['YOUTUBE_ACCESS_TOKEN', 'YOUTUBE_REFRESH_TOKEN'];

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

    // Test API connection if tokens available
    if (process.env.YOUTUBE_ACCESS_TOKEN) {
      console.log(chalk.bold('\n2. API Connection Test'));
      try {
        const client = createClient();
        await client.testConnection();
        console.log(`  ${chalk.green('✓')} Connection successful`);
      } catch (error: any) {
        console.log(`  ${chalk.red('✗')} Connection failed: ${error.message}`);
      }
    }

    console.log(chalk.bold('\n3. Next Steps'));
    if (!process.env.YOUTUBE_CLIENT_ID) {
      console.log('  • Run: npm run setup (for setup instructions)');
    } else if (!process.env.YOUTUBE_ACCESS_TOKEN) {
      console.log('  • Run: npm run auth start (to authenticate)');
    } else {
      console.log('  • Run: npm run detect (to check quota)');
      console.log('  • Ready to use! See SKILL.md for examples');
    }

    console.log();
  });

// Helper function to create client
function createClient(): YouTubeClient {
  const config = {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
    accessToken: process.env.YOUTUBE_ACCESS_TOKEN,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
    apiKey: process.env.YOUTUBE_API_KEY,
  };

  if (!config.clientId || !config.clientSecret) {
    console.error(chalk.red('Error: Missing YouTube API credentials'));
    console.log(chalk.yellow('\nRun: npm run setup (for setup instructions)'));
    process.exit(1);
  }

  return new YouTubeClient(config);
}

program.parse();
