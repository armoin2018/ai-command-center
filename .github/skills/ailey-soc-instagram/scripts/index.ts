#!/usr/bin/env node

import { Command } from 'commander';
import { InstagramClient, loadConfig } from './instagram-client.js';

const program = new Command();

program
  .name('instagram')
  .description('Instagram integration for content management, engagement, analytics, and commerce')
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
║                    INSTAGRAM INTEGRATION SETUP                            ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 SETUP OVERVIEW

This skill provides comprehensive Instagram integration for Business and Creator
accounts via the Facebook Graph API. Supports content publishing, engagement
management, analytics, hashtag research, and shopping features.

═══════════════════════════════════════════════════════════════════════════

📝 STEP 1: Prerequisites

1. Instagram Business or Creator Account
2. Facebook Page linked to Instagram account
3. Facebook Developer Account
4. Facebook App with Instagram permissions

═══════════════════════════════════════════════════════════════════════════

🔑 STEP 2: Create Facebook App

1. Go to https://developers.facebook.com/apps/
2. Click "Create App"
3. Choose "Business" type for comprehensive access
4. Fill in app details:
   - App Name: Your app name
   - App Contact Email: Your email
5. Complete setup wizard

═══════════════════════════════════════════════════════════════════════════

🔐 STEP 3: Add Instagram Product

1. In App Dashboard, click "Add Product"
2. Select "Instagram" and set it up
3. In Products > Instagram > Basic Display
   - Add OAuth Redirect URIs
   - Generate App Secret
4. Save changes

═══════════════════════════════════════════════════════════════════════════

🔗 STEP 4: Link Instagram to Facebook Page

1. Go to your Facebook Page settings
2. Navigate to Instagram section
3. Click "Connect Account"
4. Log in to your Instagram Business/Creator account
5. Confirm the connection

═══════════════════════════════════════════════════════════════════════════

🎫 STEP 5: Get Access Token

OPTION A: Graph API Explorer (Testing - 1 hour)
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Click "Generate Access Token"
4. Select permissions:
   - instagram_basic
   - instagram_content_publish
   - instagram_manage_comments
   - instagram_manage_insights
   - pages_read_engagement
   - pages_show_list
5. Copy the access token

OPTION B: Long-Lived Token (Production - 60 days)
1. Get short-lived token from Graph API Explorer
2. Exchange for long-lived token using this skill:
   (See Facebook skill for token exchange)

OPTION C: Never-Expiring Page Token (Recommended)
1. Get page access token (never expires)
2. Use this to access Instagram Business account

═══════════════════════════════════════════════════════════════════════════

🆔 STEP 6: Get Instagram Account ID

1. With your access token, find Instagram Account ID:
   npm run instagram setup-ids --token YOUR_TOKEN --page-id YOUR_PAGE_ID

2. Or manually via Graph API Explorer:
   GET /{page-id}?fields=instagram_business_account

3. Save the Instagram Business Account ID

═══════════════════════════════════════════════════════════════════════════

⚙️  STEP 7: Environment Configuration

Create .env file in the skill directory:

# Required
INSTAGRAM_ACCESS_TOKEN=your_access_token_here
INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id

# Optional
INSTAGRAM_API_VERSION=v18.0
FACEBOOK_PAGE_ID=your_facebook_page_id

You can also configure globally at:
~/.vscode/.env

═══════════════════════════════════════════════════════════════════════════

🔓 REQUIRED PERMISSIONS

- instagram_basic: Access Instagram account
- instagram_content_publish: Publish content
- instagram_manage_comments: Manage comments
- instagram_manage_insights: Access insights
- pages_read_engagement: Read page engagement
- pages_show_list: List pages you manage

═══════════════════════════════════════════════════════════════════════════

🧪 STEP 8: Test Connection

npm run instagram test

This will verify your access token and show your account information.

═══════════════════════════════════════════════════════════════════════════

📚 QUICK START COMMANDS

# Content Management
npm run instagram content photo publish --url "IMAGE_URL" --caption "Caption"
npm run instagram content video publish --url "VIDEO_URL" --caption "Caption"
npm run instagram content reel publish --url "VIDEO_URL" --caption "Caption"
npm run instagram content story publish --url "IMAGE_URL" --type IMAGE
npm run instagram content media list --limit 25

# Engagement
npm run instagram engagement comments list MEDIA_ID
npm run instagram engagement comments reply COMMENT_ID --message "Thanks!"
npm run instagram engagement mentions list

# Analytics
npm run instagram analytics account insights --metrics "impressions,reach,profile_views"
npm run instagram analytics account demographics
npm run instagram analytics media performance --limit 10 --output report.csv

# Hashtag Research
npm run instagram hashtags search "fitness"
npm run instagram hashtags research --tags "fitness,health,wellness" --output hashtags.csv

# Shopping
npm run instagram shopping catalog CATALOG_ID
npm run instagram shopping tag MEDIA_ID --products '[{"product_id":"123","x":0.5,"y":0.5}]'

═══════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

❌ "Invalid OAuth access token"
   → Check token hasn't expired
   → Verify token in Graph API Explorer
   → Ensure Instagram permissions are granted

❌ "Instagram Account ID not found"
   → Verify Instagram account is linked to Facebook Page
   → Ensure account is Business or Creator (not Personal)
   → Check page access token has correct permissions

❌ "Media cannot be published"
   → Ensure media URL is publicly accessible
   → Check media meets Instagram requirements:
     • Photos: JPG format, min 320px
     • Videos: MP4/MOV format, max 60 seconds
     • Aspect ratio: 4:5 to 1.91:1

❌ "Insights not available"
   → Insights only available for posts from last 2 years
   → Story insights only available for 24 hours
   → Account must be Business or Creator

═══════════════════════════════════════════════════════════════════════════

📖 MORE INFORMATION

Graph API Documentation: https://developers.facebook.com/docs/graph-api
Instagram API: https://developers.facebook.com/docs/instagram-api
Content Publishing: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
Insights: https://developers.facebook.com/docs/instagram-api/guides/insights

═══════════════════════════════════════════════════════════════════════════
    `);
  });

// ============================================================================
// TEST COMMAND
// ============================================================================

program
  .command('test')
  .description('Test Instagram API connection')
  .action(async () => {
    try {
      console.log('Testing Instagram API connection...\n');
      
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      // Test connection by getting account info
      const account = await client.getAccount(['id', 'username', 'name', 'followers_count', 'follows_count', 'media_count']);
      
      console.log('✅ Connection successful!\n');
      console.log('Your Instagram Account:');
      console.log(`  ID: ${account.id}`);
      console.log(`  Username: @${account.username}`);
      console.log(`  Name: ${account.name || '(not set)'}`);
      console.log(`  Followers: ${account.followers_count?.toLocaleString() || 0}`);
      console.log(`  Following: ${account.follows_count?.toLocaleString() || 0}`);
      console.log(`  Posts: ${account.media_count?.toLocaleString() || 0}\n`);
      
      console.log('Instagram API is configured correctly.');
      console.log('You can now use all Instagram commands.\n');
      
    } catch (error: any) {
      console.error('❌ Connection failed!\n');
      console.error('Error:', error.message);
      console.error('\nPlease check your configuration:');
      console.error('1. Verify INSTAGRAM_ACCESS_TOKEN is set in .env');
      console.error('2. Verify INSTAGRAM_ACCOUNT_ID is set in .env');
      console.error('3. Ensure token has not expired');
      console.error('4. Check token has required permissions\n');
      console.error('Run "npm run instagram setup" for detailed setup instructions.\n');
      process.exit(1);
    }
  });

// ============================================================================
// AUTH HELPERS
// ============================================================================

const auth = program
  .command('auth')
  .description('Authentication helpers');

auth
  .command('get-account-id')
  .description('Get Instagram Account ID from Facebook Page')
  .option('--page-id <id>', 'Facebook Page ID (required)', '')
  .action(async (options) => {
    try {
      if (!options.pageId) {
        console.error('Error: --page-id is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      console.log('Getting Instagram Account ID...\n');
      
      const account = await client.getAccountFromPage(options.pageId);
      
      console.log('✅ Success! Instagram Business Account:\n');
      console.log(`Instagram Account ID: ${account.id}\n`);
      console.log('Add this to your .env file:');
      console.log(`INSTAGRAM_ACCOUNT_ID=${account.id}\n`);
      
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// COMMAND ROUTING
// ============================================================================

program
  .command('content')
  .description('Content management (publish, schedule, edit)')
  .action(() => {
    console.log('Use: npm run instagram content <command>');
    console.log('Available commands: photo, video, carousel, reel, story, media');
    console.log('Run with --help for more details');
  });

program
  .command('engagement')
  .description('Engagement management (comments, mentions)')
  .action(() => {
    console.log('Use: npm run instagram engagement <command>');
    console.log('Available commands: comments, mentions');
    console.log('Run with --help for more details');
  });

program
  .command('analytics')
  .description('Analytics and insights')
  .action(() => {
    console.log('Use: npm run instagram analytics <command>');
    console.log('Available commands: account, media, story, metrics');
    console.log('Run with --help for more details');
  });

program
  .command('hashtags')
  .description('Hashtag tools and research')
  .action(() => {
    console.log('Use: npm run instagram hashtags <command>');
    console.log('Available commands: search, info, top, recent, research');
    console.log('Run with --help for more details');
  });

program
  .command('shopping')
  .description('Shopping and commerce')
  .action(() => {
    console.log('Use: npm run instagram shopping <command>');
    console.log('Available commands: catalog, tag');
    console.log('Run with --help for more details');
  });

program.parse();
