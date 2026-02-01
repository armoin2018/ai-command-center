#!/usr/bin/env node

import { Command } from 'commander';
import { FacebookClient, loadConfig } from './facebook-client.js';
import express from 'express';
import open from 'open';

const program = new Command();

program
  .name('facebook')
  .description('Facebook integration for personal and business features')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Show setup instructions')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    FACEBOOK INTEGRATION SETUP                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 SETUP OVERVIEW

This skill requires Facebook Graph API access with OAuth 2.0 authentication.
You'll need to create a Facebook App and obtain an access token.

═══════════════════════════════════════════════════════════════════════════

📝 STEP 1: Create Facebook App

1. Go to https://developers.facebook.com/apps/
2. Click "Create App"
3. Choose app type:
   - Consumer: For personal Facebook features
   - Business: For page management and advertising
   - Other: For comprehensive access
4. Fill in app details:
   - App Name: Your app name
   - App Contact Email: Your email
5. Complete setup wizard

═══════════════════════════════════════════════════════════════════════════

🔑 STEP 2: Configure App Settings

1. In App Dashboard, go to Settings > Basic
2. Note your App ID and App Secret
3. Add platform:
   - Website URL: http://localhost:3000 (for local OAuth)
4. Save changes

═══════════════════════════════════════════════════════════════════════════

🔐 STEP 3: Get Access Token

OPTION A: Short-Lived Token (Testing - 1 hour)
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Click "Generate Access Token"
4. Select required permissions (see below)
5. Copy the access token

OPTION B: Long-Lived Token (Production - 60 days)
1. Get short-lived token from Graph API Explorer
2. Use this skill's auth command:
   npm run facebook auth exchange --app-id YOUR_APP_ID --app-secret YOUR_APP_SECRET --token SHORT_LIVED_TOKEN
3. Copy the long-lived token

OPTION C: Never-Expiring Page Token (Business Features)
1. Get user access token with manage_pages permission
2. Get page access token:
   npm run facebook auth page-token --page-id YOUR_PAGE_ID
3. This token never expires as long as app/permissions remain valid

═══════════════════════════════════════════════════════════════════════════

🔓 STEP 4: Required Permissions

PERSONAL FEATURES:
- email: User email address
- public_profile: Basic profile information
- user_posts: Read and publish posts
- user_photos: Upload and manage photos
- user_friends: Access friends list
- user_events: Manage events
- publish_to_groups: Post to groups

BUSINESS FEATURES - PAGE:
- pages_show_list: List pages you manage
- pages_read_engagement: Read page insights
- pages_manage_posts: Publish to pages
- pages_manage_engagement: Respond to comments/messages
- pages_read_user_content: Read page user content

BUSINESS FEATURES - ADVERTISING:
- ads_read: Read advertising data
- ads_management: Create and manage ads
- business_management: Manage business assets

BUSINESS FEATURES - INSTAGRAM:
- instagram_basic: Access Instagram account
- instagram_content_publish: Publish to Instagram
- pages_read_engagement: Read Instagram insights

BUSINESS FEATURES - LEADS:
- leads_retrieval: Retrieve leads from lead ads
- pages_manage_metadata: Manage lead forms

═══════════════════════════════════════════════════════════════════════════

⚙️  STEP 5: Environment Configuration

Create .env file in the skill directory:

# Required
FACEBOOK_ACCESS_TOKEN=your_access_token_here

# Optional - API version (default: v18.0)
FACEBOOK_API_VERSION=v18.0

# Optional - For business features
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_USER_ID=me

# Optional - For ad management
FACEBOOK_AD_ACCOUNT_ID=act_your_ad_account_id

You can also configure globally at:
~/.vscode/.env

═══════════════════════════════════════════════════════════════════════════

🧪 STEP 6: Test Connection

npm run facebook test

This will verify your access token and show your profile information.

═══════════════════════════════════════════════════════════════════════════

📚 QUICK START COMMANDS

# Personal Features
npm run facebook personal profile show
npm run facebook personal posts create --message "Hello from CLI!"
npm run facebook personal photos upload photo.jpg --message "Check this out"
npm run facebook personal friends list
npm run facebook personal groups list
npm run facebook personal events list

# Business Features
npm run facebook business pages list
npm run facebook business pages publish PAGE_ID --message "Business update"
npm run facebook business leads forms PAGE_ID
npm run facebook business instagram account PAGE_ID

# Advertising
npm run facebook ads accounts list
npm run facebook ads campaigns list AD_ACCOUNT_ID
npm run facebook ads campaigns create AD_ACCOUNT_ID --name "My Campaign" --objective OUTCOME_TRAFFIC

# Analytics
npm run facebook analytics page insights PAGE_ID
npm run facebook analytics page summary PAGE_ID --days 30
npm run facebook analytics metrics

═══════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

❌ "Invalid OAuth access token"
   → Check token hasn't expired
   → Verify token in Graph API Explorer
   → Exchange for long-lived token

❌ "Permissions error"
   → Review required permissions above
   → Regenerate token with correct scopes
   → Submit for app review if needed

❌ "App not approved"
   → Some features require app review by Facebook
   → Submit app for review at developers.facebook.com
   → Use test users during development

❌ "Rate limit exceeded"
   → Facebook has rate limits per user/app
   → Wait before retrying
   → Implement exponential backoff

═══════════════════════════════════════════════════════════════════════════

📖 MORE INFORMATION

Graph API Documentation: https://developers.facebook.com/docs/graph-api
App Dashboard: https://developers.facebook.com/apps/
Marketing API: https://developers.facebook.com/docs/marketing-apis
Instagram API: https://developers.facebook.com/docs/instagram-api

═══════════════════════════════════════════════════════════════════════════
    `);
  });

// ============================================================================
// TEST COMMAND
// ============================================================================

program
  .command('test')
  .description('Test Facebook API connection')
  .action(async () => {
    try {
      console.log('Testing Facebook API connection...\n');
      
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      // Test connection by getting user profile
      const profile = await client.getUserProfile('me', ['id', 'name', 'email']);
      
      console.log('✅ Connection successful!\n');
      console.log('Your Profile:');
      console.log(`  ID: ${profile.id}`);
      console.log(`  Name: ${profile.name}`);
      console.log(`  Email: ${profile.email || '(not available)'}\n`);
      
      console.log('Facebook API is configured correctly.');
      console.log('You can now use all Facebook commands.\n');
      
    } catch (error: any) {
      console.error('❌ Connection failed!\n');
      console.error('Error:', error.message);
      console.error('\nPlease check your configuration:');
      console.error('1. Verify FACEBOOK_ACCESS_TOKEN is set in .env');
      console.error('2. Ensure token has not expired');
      console.error('3. Check token has required permissions\n');
      console.error('Run "npm run facebook setup" for detailed setup instructions.\n');
      process.exit(1);
    }
  });

// ============================================================================
// AUTH COMMANDS
// ============================================================================

const auth = program
  .command('auth')
  .description('Authentication helpers');

auth
  .command('exchange')
  .description('Exchange short-lived token for long-lived token')
  .option('--app-id <id>', 'Facebook App ID (required)', '')
  .option('--app-secret <secret>', 'Facebook App Secret (required)', '')
  .option('--token <token>', 'Short-lived access token (required)', '')
  .action(async (options) => {
    try {
      if (!options.appId || !options.appSecret || !options.token) {
        console.error('Error: --app-id, --app-secret, and --token are required');
        process.exit(1);
      }

      const config = { accessToken: options.token };
      const client = new FacebookClient(config);
      
      console.log('Exchanging token for long-lived access token...\n');
      
      const result = await client.getLongLivedToken(
        options.appId,
        options.appSecret,
        options.token
      );
      
      console.log('✅ Success! Long-lived access token (valid for ~60 days):\n');
      console.log(result.access_token);
      console.log('\nAdd this to your .env file:');
      console.log(`FACEBOOK_ACCESS_TOKEN=${result.access_token}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

auth
  .command('page-token')
  .description('Get never-expiring page access token')
  .option('--page-id <id>', 'Page ID (required)', '')
  .action(async (options) => {
    try {
      if (!options.pageId) {
        console.error('Error: --page-id is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      console.log('Getting page access token...\n');
      
      const pages = await client.getPages();
      const page = pages.data?.find((p: any) => p.id === options.pageId);
      
      if (!page) {
        console.error(`Error: Page ${options.pageId} not found or you don't manage it`);
        process.exit(1);
      }
      
      console.log('✅ Success! Page access token (never expires):\n');
      console.log(page.access_token);
      console.log('\nUse this as FACEBOOK_ACCESS_TOKEN for page operations.\n');
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// COMMAND ROUTING
// ============================================================================

program
  .command('personal')
  .description('Personal Facebook features (posts, photos, friends, etc.)')
  .action(() => {
    console.log('Use: npm run facebook personal <command>');
    console.log('Available commands: profile, posts, photos, friends, groups, events');
    console.log('Run with --help for more details');
  });

program
  .command('business')
  .description('Business features (pages, leads, Instagram, messenger)')
  .action(() => {
    console.log('Use: npm run facebook business <command>');
    console.log('Available commands: pages, leads, instagram, messenger');
    console.log('Run with --help for more details');
  });

program
  .command('ads')
  .description('Advertising management')
  .action(() => {
    console.log('Use: npm run facebook ads <command>');
    console.log('Available commands: accounts, campaigns');
    console.log('Run with --help for more details');
  });

program
  .command('analytics')
  .description('Analytics and insights')
  .action(() => {
    console.log('Use: npm run facebook analytics <command>');
    console.log('Available commands: page, post, metrics');
    console.log('Run with --help for more details');
  });

program.parse();
