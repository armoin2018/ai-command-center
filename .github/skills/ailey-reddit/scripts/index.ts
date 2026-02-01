#!/usr/bin/env node

import { Command } from 'commander';
import { RedditClient, loadConfig, AccessLevel } from './reddit-client.js';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('reddit')
  .description('Reddit integration with access level detection and moderation tools')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Show setup instructions for all access levels')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                        REDDIT INTEGRATION SETUP                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 ACCESS LEVELS OVERVIEW

Reddit has different access levels based on authentication and permissions.
This skill automatically detects your access level and shows only available features.

═══════════════════════════════════════════════════════════════════════════

🎯 ACCESS LEVELS

┌──────────────────┬──────────────────────────────┬────────────────────────┐
│ Level            │ Features                     │ Requirements           │
├──────────────────┼──────────────────────────────┼────────────────────────┤
│ Read-Only        │ Browse, read, search         │ ✅ None (default)     │
├──────────────────┼──────────────────────────────┼────────────────────────┤
│ Authenticated    │ Post, comment, vote, message │ ⚠️  OAuth required    │
│ (OAuth)          │ Subscribe, save, award       │                        │
├──────────────────┼──────────────────────────────┼────────────────────────┤
│ Moderator        │ All above + moderation tools │ ⚠️  Must be mod       │
│                  │ Approve/remove, ban, modmail │                        │
├──────────────────┼──────────────────────────────┼────────────────────────┤
│ Ads API          │ All above + advertising      │ ❌ Approval required  │
│                  │ Campaigns, targeting         │    (2-4 weeks)         │
└──────────────────┴──────────────────────────────┴────────────────────────┘

═══════════════════════════════════════════════════════════════════════════

📖 LEVEL 1: READ-ONLY (No Authentication)

✅ Available to everyone immediately
✅ No setup required
✅ Public content access

**Features:**
- Browse public subreddits
- Read posts and comments
- Search Reddit content
- Get subreddit information

**Limitations:**
- ❌ Cannot post or comment
- ❌ Cannot vote
- ❌ Cannot save posts
- ❌ Cannot subscribe
- ❌ Cannot send messages
- ⚠️  Rate limited (60 requests/min)

**Upgrade to Authenticated:**
See Level 2 setup below.

═══════════════════════════════════════════════════════════════════════════

🔐 LEVEL 2: AUTHENTICATED (OAuth 2.0) - RECOMMENDED START

⚠️  Requires Reddit app creation and OAuth flow
✅ Full standard API access
✅ Most common features available

**Features:**
- **All read-only features**
- Post submissions (text, link, image, video, poll, gallery)
- Comment on posts
- Vote (upvote/downvote)
- Save posts and comments
- Subscribe to subreddits
- Send private messages
- Manage user profile
- Award posts/comments
- Report content

**Setup Steps:**

1️⃣  **Create Reddit Account** (if you don't have one)
   https://www.reddit.com/register

2️⃣  **Create Reddit App**
   - Go to: https://www.reddit.com/prefs/apps
   - Scroll to bottom and click "Create App" or "Create Another App"
   - Fill in form:
     * Choose a name: "AIley Reddit Skill"
     * Select app type:
       - "script" for personal use (recommended)
       - "web app" if building web application
     * Description: "Reddit automation via AIley skill"
     * About URL: (leave blank or your website)
     * Redirect URI: http://localhost:8080
   - Click "Create app"

3️⃣  **Get Credentials**
   After creating app, you'll see:
   - **Client ID**: String under app name (looks like: abc123DEF456)
   - **Client Secret**: Labeled "secret" (longer string)
   
   Copy both values - you'll need them next.

4️⃣  **Configure Environment**
   Create .env file in skill directory:

   \`\`\`env
   # Required - from Reddit app
   REDDIT_CLIENT_ID=your_client_id_here
   REDDIT_CLIENT_SECRET=your_client_secret_here
   
   # OAuth settings
   REDDIT_REDIRECT_URI=http://localhost:8080
   REDDIT_USERNAME=your_reddit_username
   
   # User agent (required by Reddit)
   REDDIT_USER_AGENT=AIley-Reddit/1.0.0 (by /u/your_username)
   
   # Tokens (obtained via OAuth flow - see step 5)
   REDDIT_ACCESS_TOKEN=
   REDDIT_REFRESH_TOKEN=
   \`\`\`

5️⃣  **Run OAuth Flow**
   
   Option A: Automated (recommended):
   \`\`\`bash
   npm run reddit auth start
   \`\`\`
   This will:
   - Open browser to Reddit authorization
   - You grant permissions
   - Automatically save tokens to .env
   
   Option B: Manual:
   \`\`\`bash
   npm run reddit auth url
   \`\`\`
   Then:
   - Visit the displayed URL
   - Grant permissions
   - Copy authorization code from redirect
   - Exchange code for token:
     \`npm run reddit auth exchange <code>\`

6️⃣  **Test Connection**
   \`\`\`bash
   npm run reddit test
   \`\`\`
   Should show your profile and "Authenticated" access level.

7️⃣  **Detect Access Level**
   \`\`\`bash
   npm run reddit detect
   \`\`\`
   Verify you have "Authenticated (OAuth)" access.

**OAuth Scopes (automatically requested):**
☑️  identity - User account info
☑️  read - Read posts and comments
☑️  submit - Submit posts
☑️  vote - Upvote/downvote
☑️  save - Save posts
☑️  subscribe - Subscribe to subreddits
☑️  privatemessages - Send/receive messages
☑️  mysubreddits - Access your subreddits
☑️  edit - Edit your content
☑️  flair - Manage flair
☑️  history - Access post history

**Troubleshooting:**
- "Invalid client credentials" → Verify REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET
- "Redirect URI mismatch" → Ensure redirect_uri matches app settings
- "Access token expired" → Run: \`npm run reddit auth refresh\`

═══════════════════════════════════════════════════════════════════════════

👮 LEVEL 3: MODERATOR ACCESS

⚠️  Requires being a moderator of at least one subreddit
✅ Full moderation tools available
✅ Automates moderation workflows

**Additional Features:**
- **All authenticated features**
- Approve/remove posts and comments
- Ban/unban users
- Mute users
- Lock/unlock threads
- Sticky posts
- Distinguish as moderator
- Manage modmail
- View mod log
- Edit subreddit settings
- Manage user flair
- Configure AutoModerator

**How to Become Moderator:**

**Option 1: Create Your Own Subreddit** (Easiest)
1. Go to: https://www.reddit.com/subreddits/create
2. Fill in subreddit name (must be unique)
3. Choose type: Public, Restricted, or Private
4. Fill in title and description
5. Configure settings
6. Click "Create"
7. You are automatically the moderator!

**Option 2: Get Invited as Moderator**
1. Be an active, trusted community member
2. Contribute quality content
3. Follow subreddit rules
4. Build reputation (karma)
5. Wait for invitation from existing moderators
6. Accept invitation when received

**Option 3: Request to Moderate on r/redditrequest**
1. Find subreddit with inactive moderators
2. Go to: https://www.reddit.com/r/redditrequest
3. Submit request to take over moderation
4. Must meet requirements:
   - Account at least 90 days old
   - 500+ combined karma
   - Active Reddit user
5. Wait for admin approval

**After Becoming Moderator:**

1. Update OAuth scopes to include moderation:
   \`\`\`bash
   npm run reddit auth start
   \`\`\`
   
   Additional scopes will be requested:
   ☑️  modposts - Moderate posts
   ☑️  modcontributors - Manage contributors
   ☑️  modmail - Access modmail
   ☑️  modconfig - Edit subreddit config
   ☑️  modflair - Manage flair
   ☑️  modlog - View mod log

2. Re-authorize with new permissions

3. Verify access:
   \`\`\`bash
   npm run reddit detect
   \`\`\`
   Should show "Moderator" access level.

4. Start using moderation features:
   \`\`\`bash
   npm run reddit moderation --help
   \`\`\`

**Moderation Commands:**
\`\`\`bash
# Approve post
npm run reddit mod approve POST_ID

# Remove post
npm run reddit mod remove POST_ID --reason "Spam"

# Ban user
npm run reddit mod ban USERNAME --subreddit SUBREDDIT --days 7

# Lock thread
npm run reddit mod lock POST_ID

# Sticky post
npm run reddit mod sticky POST_ID

# View mod queue
npm run reddit mod queue SUBREDDIT
\`\`\`

═══════════════════════════════════════════════════════════════════════════

💰 LEVEL 4: REDDIT ADS API

❌ Requires active Reddit Ads account and manual approval
❌ Most restrictive access level
⚠️  Approval takes 2-4 weeks

**Additional Features:**
- **All moderator features**
- Create ad campaigns
- Manage ad creatives
- Set targeting options (subreddits, interests, locations)
- Track campaign performance
- Budget management
- A/B testing

**Prerequisites:**
✅ Active Reddit Ads account
✅ Demonstrated ad spend history
✅ Business/marketing use case
✅ Technical implementation plan

**Application Process:**

1️⃣  **Create Reddit Ads Account**
   - Go to: https://ads.reddit.com/
   - Sign up for advertising
   - Set up billing
   - Run at least one campaign manually

2️⃣  **Apply for Ads API Access**
   - Go to: https://ads-api.reddit.com/
   - Click "Request Access"
   - Complete application form:

   **Required Information:**
   - Company/Organization name
   - Business email
   - Website URL
   - Use case description:
     * How you'll use the Ads API
     * Expected benefits
     * Integration plans
   - Expected API usage volume
   - Technical contact information

3️⃣  **Demonstrate Legitimacy**
   Include in application:
   - Active advertising campaigns
   - Ad spend history
   - Marketing objectives
   - Compliance with Reddit policies
   - Data privacy measures

4️⃣  **Submit and Wait**
   - Submit application
   - Reddit reviews manually
   - Check email for status updates
   - Typical approval: **2-4 weeks**
   - May require follow-up information

5️⃣  **After Approval**
   - Receive Ads API credentials
   - Add to .env configuration:
     \`\`\`env
     REDDIT_ADS_API_KEY=your_ads_api_key
     REDDIT_ADS_ACCOUNT_ID=your_ads_account_id
     \`\`\`
   - Re-run detection:
     \`npm run reddit detect\`
   - Advertising features unlock automatically

**Application URL:**
https://ads-api.reddit.com/

**Tips for Approval:**
✅ Clear, legitimate business use case
✅ Demonstrated Reddit advertising experience
✅ Technical capabilities described
✅ Compliance and privacy protections outlined
✅ Professional communication

**Advertising Commands (after approval):**
\`\`\`bash
# Create campaign
npm run reddit ads campaign create

# Set targeting
npm run reddit ads target --subreddits "technology,programming"

# Track performance
npm run reddit ads analytics CAMPAIGN_ID
\`\`\`

═══════════════════════════════════════════════════════════════════════════

⚙️  ENVIRONMENT CONFIGURATION

Complete .env template:

\`\`\`env
# Required for all OAuth access levels
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here

# OAuth settings
REDDIT_REDIRECT_URI=http://localhost:8080
REDDIT_USERNAME=your_reddit_username

# User agent (required by Reddit API)
REDDIT_USER_AGENT=AIley-Reddit/1.0.0 (by /u/your_username)

# Access tokens (obtained via OAuth flow)
REDDIT_ACCESS_TOKEN=your_access_token_here
REDDIT_REFRESH_TOKEN=your_refresh_token_here

# Optional: Ads API (Level 4 only)
REDDIT_ADS_API_KEY=
REDDIT_ADS_ACCOUNT_ID=
\`\`\`

Global configuration: ~/.vscode/.env

═══════════════════════════════════════════════════════════════════════════

🧪 TESTING YOUR ACCESS

After configuration, test access level:

\`\`\`bash
# Detect current access level
npm run reddit detect

# Test connection
npm run reddit test

# List available features
npm run reddit features
\`\`\`

═══════════════════════════════════════════════════════════════════════════

📚 QUICK START COMMANDS

\`\`\`bash
# Access detection
npm run reddit detect

# OAuth setup
npm run reddit auth start

# Test connection
npm run reddit test

# Post submission (OAuth required)
npm run reddit post "MySubreddit" "Post Title" --text "Post content"

# Comment on post (OAuth required)
npm run reddit comment POST_ID "Great post!"

# Vote (OAuth required)
npm run reddit vote POST_ID up

# Moderation (Mod access required)
npm run reddit mod approve POST_ID

# View your profile
npm run reddit user info
\`\`\`

═══════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

❌ "Access level: Read-Only"
   → You need OAuth authentication
   → Run: npm run reddit auth start

❌ "Permission denied - requires Authenticated access"
   → Run OAuth flow: npm run reddit auth start
   → Check access token is valid

❌ "Permission denied - requires Moderator access"
   → You must be a moderator of a subreddit
   → See Level 3 setup above
   → Or create your own subreddit

❌ "Invalid client credentials"
   → Verify REDDIT_CLIENT_ID in .env
   → Verify REDDIT_CLIENT_SECRET in .env
   → Check app settings: https://www.reddit.com/prefs/apps

❌ "Access token expired"
   → Run: npm run reddit auth refresh
   → Or re-run: npm run reddit auth start

❌ "Rate limit exceeded"
   → Wait 1 minute before retrying
   → Reduce request frequency
   → Consider upgrading to OAuth (higher limits)

═══════════════════════════════════════════════════════════════════════════

📖 RESOURCES

Reddit Apps: https://www.reddit.com/prefs/apps
API Documentation: https://www.reddit.com/dev/api/
OAuth Guide: https://github.com/reddit-archive/reddit/wiki/OAuth2
Ads API: https://ads-api.reddit.com/
Create Subreddit: https://www.reddit.com/subreddits/create
Reddit Request: https://www.reddit.com/r/redditrequest

═══════════════════════════════════════════════════════════════════════════

💡 RECOMMENDED PATH

1. ✅ Start with OAuth (Level 2) - Most features available
2. ⏳ Create or join subreddit as moderator (Level 3) - Optional
3. 🔄 Build and test workflows
4. 🚀 Apply for Ads API if needed (Level 4) - Advanced

═══════════════════════════════════════════════════════════════════════════
    `);
  });

// ============================================================================
// DETECT COMMAND
// ============================================================================

program
  .command('detect')
  .description('Detect your Reddit API access level and available features')
  .action(async () => {
    const spinner = ora('Detecting access level...').start();
    
    try {
      const config = loadConfig();
      const client = new RedditClient(config);
      
      const access = await client.detectAccessLevel();
      
      spinner.succeed('Access level detected!\n');
      
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
      console.log(chalk.bold.cyan('  REDDIT API ACCESS DETECTION'));
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
      // Access level badge
      const levelColors: Record<string, any> = {
        [AccessLevel.READ_ONLY]: chalk.gray,
        [AccessLevel.AUTHENTICATED]: chalk.green,
        [AccessLevel.MODERATOR]: chalk.blue,
        [AccessLevel.ADS_API]: chalk.magenta
      };
      
      const levelColor = levelColors[access.level] || chalk.gray;
      console.log(levelColor.bold(`🎯 Access Level: ${access.levelName.toUpperCase()}`));
      console.log();
      
      // Capabilities
      console.log(chalk.bold('Available Capabilities:'));
      console.log(access.canPost ? chalk.green('  ✅ Post submissions') : chalk.gray('  ❌ Post submissions (requires OAuth)'));
      console.log(access.canComment ? chalk.green('  ✅ Comments') : chalk.gray('  ❌ Comments (requires OAuth)'));
      console.log(access.canVote ? chalk.green('  ✅ Voting') : chalk.gray('  ❌ Voting (requires OAuth)'));
      console.log(access.canMessage ? chalk.green('  ✅ Private messages') : chalk.gray('  ❌ Private messages (requires OAuth)'));
      console.log(access.canModerate ? chalk.green('  ✅ Moderation tools') : chalk.gray('  ❌ Moderation (requires mod status)'));
      console.log(access.canAdvertise ? chalk.green('  ✅ Advertising') : chalk.gray('  ❌ Advertising (requires Ads API)'));
      console.log();
      
      // Features
      console.log(chalk.bold('Enabled Features:'));
      access.features.forEach(feature => {
        console.log(chalk.green(`  • ${feature}`));
      });
      console.log();
      
      // Upgrade suggestions
      if (access.level === AccessLevel.READ_ONLY) {
        console.log(chalk.bold.yellow('📈 Upgrade to Unlock Features:\n'));
        console.log(chalk.yellow('  You have read-only access.'));
        console.log(chalk.yellow('  To unlock posting, commenting, and voting:'));
        console.log(chalk.cyan('    1. Create Reddit app: https://www.reddit.com/prefs/apps'));
        console.log(chalk.cyan('    2. Configure .env with client credentials'));
        console.log(chalk.cyan('    3. Run OAuth flow: npm run reddit auth start'));
        console.log(chalk.cyan('    4. Test: npm run reddit test'));
        console.log();
        console.log(chalk.gray('  Run "npm run reddit setup" for detailed instructions.'));
        
      } else if (access.level === AccessLevel.AUTHENTICATED) {
        console.log(chalk.bold.green('✅ You have full standard API access!'));
        console.log(chalk.green('   You can post, comment, vote, and message.'));
        console.log();
        
        console.log(chalk.bold.yellow('💡 Optional: Become a Moderator\n'));
        console.log(chalk.yellow('  To unlock moderation features:'));
        console.log(chalk.cyan('    1. Create your own subreddit, OR'));
        console.log(chalk.cyan('    2. Get invited as moderator'));
        console.log(chalk.cyan('    3. Re-run OAuth with mod scopes'));
        console.log();
        console.log(chalk.gray('  Run "npm run reddit setup" for mod setup guide.'));
        
      } else if (access.level === AccessLevel.MODERATOR) {
        console.log(chalk.bold.green('✅ You have moderator access!'));
        console.log(chalk.green('   All moderation tools are available.'));
      }
      
      console.log();
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
    } catch (error: any) {
      spinner.fail('Detection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nTroubleshooting:'));
      console.error('  1. Check .env configuration');
      console.error('  2. Run: npm run reddit setup');
      console.error('  3. Verify Reddit app credentials\n');
      process.exit(1);
    }
  });

// ============================================================================
// TEST COMMAND
// ============================================================================

program
  .command('test')
  .description('Test Reddit API connection')
  .action(async () => {
    const spinner = ora('Testing connection...').start();
    
    try {
      const config = loadConfig();
      const client = new RedditClient(config);
      
      const { connected, user, access } = await client.testConnection();
      
      if (!connected) {
        spinner.fail('Not authenticated\n');
        console.log(chalk.yellow('You are in read-only mode.'));
        console.log(chalk.yellow('To unlock full features, run: npm run reddit auth start\n'));
        return;
      }
      
      spinner.succeed('Connection successful!\n');
      
      console.log(chalk.bold('Your Reddit Profile:'));
      console.log(chalk.bold('═══════════════════════════════════════\n'));
      console.log(`  Username: u/${user!.name}`);
      console.log(`  Account ID: ${user!.id}`);
      console.log(`  Link Karma: ${user!.link_karma.toLocaleString()}`);
      console.log(`  Comment Karma: ${user!.comment_karma.toLocaleString()}`);
      console.log(`  Total Karma: ${user!.total_karma.toLocaleString()}`);
      console.log(`  Reddit Premium: ${user!.is_gold ? 'Yes' : 'No'}`);
      console.log(`  Verified Email: ${user!.has_verified_email ? 'Yes' : 'No'}`);
      console.log(`  Moderator: ${user!.is_mod ? 'Yes' : 'No'}`);
      console.log();
      console.log(chalk.bold(`Access Level: ${access.levelName}`));
      console.log();
      
    } catch (error: any) {
      spinner.fail('Connection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nPlease check:'));
      console.error('  1. REDDIT_ACCESS_TOKEN is set');
      console.error('  2. Token has not expired');
      console.error('  3. OAuth flow completed successfully\n');
      console.error(chalk.gray('Run "npm run reddit auth start" to authenticate.\n'));
      process.exit(1);
    }
  });

// ============================================================================
// FEATURES COMMAND
// ============================================================================

program
  .command('features')
  .description('List all available features based on your access level')
  .action(async () => {
    const spinner = ora('Checking features...').start();
    
    try {
      const config = loadConfig();
      const client = new RedditClient(config);
      
      const access = await client.detectAccessLevel();
      
      spinner.stop();
      
      console.log(chalk.bold('\n═══════════════════════════════════════════════════════════════'));
      console.log(chalk.bold.cyan(`  AVAILABLE FEATURES (${access.levelName})`));
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
      // Check key features
      const featureChecks = [
        { name: 'Post submissions', key: 'post' },
        { name: 'Comments', key: 'comment' },
        { name: 'Voting', key: 'vote' },
        { name: 'Private messages', key: 'message' },
        { name: 'Save posts', key: 'save' },
        { name: 'Subscribe to subreddits', key: 'subscribe' },
        { name: 'Moderation tools', key: 'moderate' },
        { name: 'Ban users', key: 'ban_user' },
        { name: 'Modmail', key: 'modmail' },
        { name: 'Advertising', key: 'advertising' }
      ];
      
      for (const { name, key } of featureChecks) {
        const check = await client.checkFeatureAvailability(key);
        
        if (check.available) {
          console.log(chalk.green(`✅ ${name}`));
        } else {
          console.log(chalk.gray(`❌ ${name}`));
          console.log(chalk.yellow(`   → ${check.reason}`));
          
          if (check.upgradeInfo) {
            console.log(chalk.cyan(`   → Setup: npm run reddit setup`));
          }
        }
      }
      
      console.log(chalk.bold('\n═══════════════════════════════════════════════════════════════\n'));
      
    } catch (error: any) {
      spinner.fail('Feature check failed');
      console.error(chalk.red('\nError:'), error.message);
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
  .action(() => {
    console.log(chalk.yellow('\n⚠️  OAuth implementation requires callback server.'));
    console.log(chalk.yellow('Manual OAuth flow:\n'));
    console.log(chalk.cyan('1. Get authorization URL:'));
    console.log(chalk.gray('   npm run reddit auth url\n'));
    console.log(chalk.cyan('2. Visit URL in browser and authorize\n'));
    console.log(chalk.cyan('3. Exchange code for token:'));
    console.log(chalk.gray('   npm run reddit auth exchange <code>\n'));
  });

auth
  .command('url')
  .description('Generate OAuth authorization URL')
  .action(() => {
    const config = loadConfig();
    const client = new RedditClient(config);
    
    const scopes = [
      'identity', 'read', 'submit', 'vote', 'save',
      'subscribe', 'privatemessages', 'mysubreddits',
      'edit', 'flair', 'history'
    ];
    
    const url = client.getAuthorizationUrl(scopes);
    
    console.log(chalk.bold('\n📋 OAuth Authorization URL:\n'));
    console.log(chalk.cyan(url));
    console.log();
    console.log(chalk.yellow('1. Visit this URL in your browser'));
    console.log(chalk.yellow('2. Click "Allow" to grant permissions'));
    console.log(chalk.yellow('3. Copy the "code" parameter from the redirect URL'));
    console.log(chalk.yellow('4. Run: npm run reddit auth exchange <code>\n'));
  });

// ============================================================================
// COMMAND ROUTING
// ============================================================================

program
  .command('post')
  .description('Submit posts (OAuth required)')
  .action(() => {
    console.log('Use: npm run reddit content post');
    console.log('Run "npm run reddit detect" to check access level');
  });

program
  .command('comment')
  .description('Post comments (OAuth required)')
  .action(() => {
    console.log('Use: npm run reddit content comment');
    console.log('Run "npm run reddit detect" to check access level');
  });

program
  .command('mod')
  .description('Moderation tools (Moderator access required)')
  .action(() => {
    console.log('Use: npm run reddit moderation');
    console.log('Run "npm run reddit detect" to check access level');
  });

program
  .command('message')
  .description('Private messaging (OAuth required)')
  .action(() => {
    console.log('Use: npm run reddit messaging');
    console.log('Run "npm run reddit detect" to check access level');
  });

program.parse();
