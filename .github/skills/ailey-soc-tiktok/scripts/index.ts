#!/usr/bin/env node

import { Command } from 'commander';
import { TikTokClient, loadConfig } from './tiktok-client.js';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('tiktok')
  .description('TikTok integration with multi-tier API access support')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Show setup instructions for all API tiers')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                        TIKTOK INTEGRATION SETUP                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 MULTI-TIER API ACCESS

TikTok provides different API tiers with increasing capabilities. This skill
supports all tiers and automatically detects your access level.

═══════════════════════════════════════════════════════════════════════════

🎯 API TIERS OVERVIEW

┌─────────────┬──────────────────────────────┬─────────────────────────────┐
│ Tier        │ Features                     │ Approval Required           │
├─────────────┼──────────────────────────────┼─────────────────────────────┤
│ Tier 1      │ OAuth, Basic Profile         │ ✅ Auto-approved           │
│ Login Kit   │ User authentication          │                             │
├─────────────┼──────────────────────────────┼─────────────────────────────┤
│ Tier 2      │ Display videos, Embeds       │ ⚠️  Application required   │
│ Display API │ Video queries                │                             │
├─────────────┼──────────────────────────────┼─────────────────────────────┤
│ Tier 3      │ Video uploads, Analytics     │ ⚠️  Manual approval        │
│ Content API │ Comment management           │    (2-8 weeks)              │
├─────────────┼──────────────────────────────┼─────────────────────────────┤
│ Tier 4      │ Advertising, Campaigns       │ ❌ Partner status required │
│ Marketing   │ Advanced targeting           │    (3-6 months)             │
└─────────────┴──────────────────────────────┴─────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════

📝 TIER 1: LOGIN KIT (Start Here - Auto-Approved)

✅ Available to all developers immediately
✅ No approval process
✅ Foundation for higher tiers

**Features:**
- OAuth 2.0 authentication
- Basic user profile (name, avatar, bio)
- User consent management

**Setup Steps:**

1. Create TikTok Developer Account
   https://developers.tiktok.com/

2. Create New App
   - Go to https://developers.tiktok.com/apps/
   - Click "Create an app"
   - Fill in app details:
     * App name
     * Privacy policy URL
     * Terms of service URL

3. Configure OAuth
   - In app dashboard, go to "Login Kit"
   - Add redirect URI: http://localhost:3000/auth/callback
   - Select scopes:
     ☑️ user.info.basic

4. Get Credentials
   - Copy Client Key
   - Copy Client Secret
   - Add to .env file

═══════════════════════════════════════════════════════════════════════════

📹 TIER 2: DISPLAY API (Application Required)

⚠️  Requires application and review (typically 1-2 weeks)
⚠️  Being phased out - focus on Content API instead

**Additional Features:**
- Display user videos on external sites
- Video embed codes
- Basic video information

**How to Apply:**

1. In app dashboard, go to "Products"
2. Find "Display API"
3. Click "Apply"
4. Provide use case description:
   - How you'll display TikTok content
   - Where content will appear
   - Expected user benefit
5. Submit and wait for approval

**Application Tips:**
- Clear, legitimate use case
- Detailed implementation plan
- Emphasis on user value
- Privacy/data protection measures

**Redirect URLs to Add:**
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback

═══════════════════════════════════════════════════════════════════════════

🎬 TIER 3: CONTENT POSTING API (Manual Approval - RECOMMENDED)

⚠️  Requires detailed application and manual review (2-8 weeks)
✅ Most comprehensive tier for creators
✅ Full video upload and management

**Additional Features:**
- Video uploads via API
- Post scheduling
- Video analytics (views, likes, shares)
- Comment management (read, reply, delete)
- Audience insights

**How to Apply:**

1. Ensure Tier 1 (Login Kit) is working
2. Go to https://developers.tiktok.com/apps/
3. Select your app
4. Click "Add products"
5. Select "Content Posting API"
6. Complete application form:

   **Required Information:**
   - Use case description
   - Expected daily upload volume
   - Content moderation plan
   - Privacy/data handling procedures
   - Sample integration screenshots

   **Use Case Examples:**
   - Social media management tool
   - Content creator automation
   - Multi-platform publishing
   - Video editing platform integration

7. Submit application
8. Wait for TikTok review (check email regularly)

**Approval Criteria:**
✅ Clear business use case
✅ Compliance with TikTok community guidelines
✅ Data privacy protections
✅ Content moderation plan
✅ No policy violations in existing content

**After Approval:**
1. Additional scopes become available:
   ☑️ video.upload
   ☑️ video.list
   ☑️ video.publish

2. Update OAuth configuration to include new scopes
3. Re-authorize users to grant new permissions

**Application URL:**
https://developers.tiktok.com/apps/

═══════════════════════════════════════════════════════════════════════════

💰 TIER 4: MARKETING API (Partner Program)

❌ Requires TikTok Marketing Partner status
❌ Very difficult to obtain
❌ Primarily for agencies and SaaS platforms

**Additional Features:**
- Campaign management
- Ad creation and targeting
- Marketing analytics
- Budget management
- ROI tracking

**How to Apply:**

1. Must be advertising agency or marketing platform
2. Active TikTok Ads account with spending history
3. Technical capabilities for API integration
4. Demonstrated TikTok marketing expertise

**Application Process:**
1. Go to https://ads.tiktok.com/marketing_api/
2. Click "Apply to be a partner"
3. Complete extensive application:
   - Company information
   - Business model
   - TikTok advertising experience
   - Expected client volume
   - Technical integration plan
   - Case studies/portfolio

4. Wait for review (3-6 months)
5. May require interviews and technical evaluation

**Requirements:**
- Registered business entity
- Proven track record with TikTok Ads
- Technical development team
- Compliance infrastructure
- Minimum advertising spend threshold

═══════════════════════════════════════════════════════════════════════════

⚙️  ENVIRONMENT CONFIGURATION

Create .env file in skill directory:

# Required for all tiers
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here

# OAuth tokens (obtained via auth flow)
TIKTOK_ACCESS_TOKEN=your_access_token_here
TIKTOK_REFRESH_TOKEN=your_refresh_token_here

# Optional
TIKTOK_API_VERSION=v2
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/callback

Global configuration: ~/.vscode/.env

═══════════════════════════════════════════════════════════════════════════

🔐 OAUTH SCOPES BY TIER

**Tier 1 (Login Kit):**
- user.info.basic
- user.info.profile
- user.info.stats

**Tier 2 (Display API):**
+ video.list

**Tier 3 (Content Posting API):**
+ video.upload
+ video.publish
+ comment.list
+ comment.list.manage

**Tier 4 (Marketing API):**
+ ad.management
+ campaign.create
+ audience.list

═══════════════════════════════════════════════════════════════════════════

🧪 TESTING YOUR ACCESS

After configuration, test your API tier:

npm run tiktok detect

This will:
✅ Test API connection
✅ Detect your current tier
✅ Show available features
✅ Suggest upgrade path if needed

═══════════════════════════════════════════════════════════════════════════

📚 QUICK START COMMANDS

# Detect API tier
npm run tiktok detect

# OAuth authentication
npm run tiktok auth start

# Test connection
npm run tiktok test

# User profile
npm run tiktok user info

# Video operations (Tier 2+)
npm run tiktok videos list

# Upload video (Tier 3+)
npm run tiktok upload video.mp4 --caption "My video"

# Analytics (Tier 3+)
npm run tiktok analytics video VIDEO_ID

# Comments (Tier 3+)
npm run tiktok comments list VIDEO_ID

═══════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

❌ "API tier not detected"
   → Run: npm run tiktok detect
   → Ensure access token is valid

❌ "Permission denied - requires Content Posting API"
   → Apply for Tier 3 access
   → Check application status in developer portal

❌ "Invalid client credentials"
   → Verify TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET
   → Check credentials in developer dashboard

❌ "Access token expired"
   → Re-run OAuth flow: npm run tiktok auth start
   → Use refresh token to get new access token

═══════════════════════════════════════════════════════════════════════════

📖 RESOURCES

Developer Portal: https://developers.tiktok.com/
API Documentation: https://developers.tiktok.com/doc/
Login Kit Guide: https://developers.tiktok.com/doc/login-kit-web/
Content Posting: https://developers.tiktok.com/doc/content-posting-api-get-started/
OAuth Guide: https://developers.tiktok.com/doc/oauth-user-access-token-management/

Support: https://developers.tiktok.com/community/

═══════════════════════════════════════════════════════════════════════════

💡 RECOMMENDED PATH

1. ✅ Start with Tier 1 (Login Kit) - immediate access
2. ⏳ Apply for Tier 3 (Content Posting) - most valuable
3. 🔄 Build and test while waiting for approval
4. 🚀 Unlock features as approvals come through

═══════════════════════════════════════════════════════════════════════════
    `);
  });

// ============================================================================
// DETECT COMMAND
// ============================================================================

program
  .command('detect')
  .description('Detect your TikTok API access tier and available features')
  .action(async () => {
    const spinner = ora('Detecting API tier...').start();
    
    try {
      const config = loadConfig();
      const client = new TikTokClient(config);
      
      const tier = await client.detectAPITier();
      
      spinner.succeed('API tier detected!\n');
      
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
      console.log(chalk.bold.cyan('  TIKTOK API TIER DETECTION'));
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
      // Tier badge
      const tierColors: Record<string, any> = {
        login: chalk.yellow,
        display: chalk.blue,
        content: chalk.green,
        marketing: chalk.magenta,
        unknown: chalk.red
      };
      
      const tierColor = tierColors[tier.tier] || chalk.gray;
      console.log(tierColor.bold(`🎯 API Tier: ${tier.tierName.toUpperCase()}`));
      console.log();
      
      // Capabilities
      console.log(chalk.bold('Available Capabilities:'));
      console.log(tier.canUploadVideos ? chalk.green('  ✅ Video uploads') : chalk.gray('  ❌ Video uploads (requires Content API)'));
      console.log(tier.canAccessAnalytics ? chalk.green('  ✅ Analytics & insights') : chalk.gray('  ❌ Analytics (requires Content API)'));
      console.log(tier.canManageComments ? chalk.green('  ✅ Comment management') : chalk.gray('  ❌ Comments (requires Content API)'));
      console.log(tier.canAccessMarketing ? chalk.green('  ✅ Marketing & ads') : chalk.gray('  ❌ Marketing (requires Partner status)'));
      console.log();
      
      // Features
      console.log(chalk.bold('Enabled Features:'));
      tier.features.forEach(feature => {
        console.log(chalk.green(`  • ${feature}`));
      });
      console.log();
      
      // Upgrade suggestions
      if (tier.approvalRequired) {
        console.log(chalk.bold.yellow('📈 Upgrade Available:\n'));
        
        if (tier.tier === 'login') {
          console.log(chalk.yellow('  You have basic Login Kit access.'));
          console.log(chalk.yellow('  To unlock video uploads and analytics:'));
          console.log(chalk.cyan('    1. Apply for Content Posting API'));
          console.log(chalk.cyan('    2. Go to: https://developers.tiktok.com/apps/'));
          console.log(chalk.cyan('    3. Select "Add products" > "Content Posting API"'));
          console.log(chalk.cyan('    4. Complete application (review takes 2-8 weeks)'));
        } else if (tier.tier === 'display') {
          console.log(chalk.yellow('  You have Display API access.'));
          console.log(chalk.yellow('  To unlock video uploads:'));
          console.log(chalk.cyan('    1. Apply for Content Posting API (recommended)'));
          console.log(chalk.cyan('    2. https://developers.tiktok.com/apps/'));
        }
        
        console.log();
        console.log(chalk.gray('  Run "npm run tiktok setup" for detailed upgrade instructions.'));
      } else {
        console.log(chalk.bold.green('✅ You have full Content Posting API access!'));
        console.log(chalk.green('   All creator features are available.'));
      }
      
      console.log();
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
    } catch (error: any) {
      spinner.fail('Detection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nTroubleshooting:'));
      console.error('  1. Ensure TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are set');
      console.error('  2. Run OAuth flow: npm run tiktok auth start');
      console.error('  3. Check access token is valid');
      console.error('  4. Run "npm run tiktok setup" for help\n');
      process.exit(1);
    }
  });

// ============================================================================
// TEST COMMAND
// ============================================================================

program
  .command('test')
  .description('Test TikTok API connection')
  .action(async () => {
    const spinner = ora('Testing connection...').start();
    
    try {
      const config = loadConfig();
      const client = new TikTokClient(config);
      
      const { user, tier } = await client.testConnection();
      
      spinner.succeed('Connection successful!\n');
      
      console.log(chalk.bold('Your TikTok Profile:'));
      console.log(chalk.bold('═══════════════════════════════════════\n'));
      console.log(`  Display Name: ${user.display_name || '(not set)'}`);
      console.log(`  Username: @${user.open_id}`);
      if (user.bio_description) {
        console.log(`  Bio: ${user.bio_description}`);
      }
      if (user.follower_count !== undefined) {
        console.log(`  Followers: ${user.follower_count.toLocaleString()}`);
      }
      if (user.video_count !== undefined) {
        console.log(`  Videos: ${user.video_count.toLocaleString()}`);
      }
      console.log();
      console.log(chalk.bold(`API Tier: ${tier.tierName}`));
      console.log();
      
    } catch (error: any) {
      spinner.fail('Connection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nPlease check your configuration:'));
      console.error('  1. TIKTOK_ACCESS_TOKEN is set');
      console.error('  2. Token has not expired');
      console.error('  3. OAuth scopes are granted\n');
      console.error(chalk.gray('Run "npm run tiktok setup" for detailed instructions.\n'));
      process.exit(1);
    }
  });

// ============================================================================
// AUTH COMMANDS
// ============================================================================

const auth = program
  .command('auth')
  .description('OAuth authentication helpers');

auth
  .command('start')
  .description('Start OAuth authorization flow')
  .action(async () => {
    console.log(chalk.yellow('\n⚠️  OAuth implementation requires web server setup.'));
    console.log(chalk.yellow('For now, use manual OAuth flow:\n'));
    console.log(chalk.cyan('1. Build authorization URL:'));
    console.log(chalk.gray('   https://www.tiktok.com/v2/auth/authorize/'));
    console.log(chalk.gray('   ?client_key=YOUR_CLIENT_KEY'));
    console.log(chalk.gray('   &response_type=code'));
    console.log(chalk.gray('   &scope=user.info.basic,video.list,video.upload'));
    console.log(chalk.gray('   &redirect_uri=http://localhost:3000/auth/callback\n'));
    console.log(chalk.cyan('2. Visit URL and authorize'));
    console.log(chalk.cyan('3. Exchange code for token (see setup guide)'));
    console.log(chalk.cyan('4. Add token to .env file\n'));
  });

// ============================================================================
// COMMAND ROUTING
// ============================================================================

program
  .command('user')
  .description('User profile operations')
  .action(() => {
    console.log('Use: npm run tiktok user <command>');
    console.log('Available commands: info');
  });

program
  .command('videos')
  .description('Video operations (Display API required)')
  .action(() => {
    console.log('Use: npm run tiktok videos <command>');
    console.log('Available commands: list, query');
  });

program
  .command('upload')
  .description('Upload videos (Content Posting API required)')
  .action(() => {
    console.log('Use: npm run tiktok upload <video-file>');
  });

program
  .command('analytics')
  .description('Analytics and insights (Content Posting API required)')
  .action(() => {
    console.log('Use: npm run tiktok analytics <command>');
    console.log('Available commands: video, user');
  });

program
  .command('comments')
  .description('Comment management (Content Posting API required)')
  .action(() => {
    console.log('Use: npm run tiktok comments <command>');
    console.log('Available commands: list, reply');
  });

program.parse();
