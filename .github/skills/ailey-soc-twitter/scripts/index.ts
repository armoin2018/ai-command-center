#!/usr/bin/env node

import { Command } from 'commander';
import { XClient, loadConfig, XApiTier } from './twitter-client.js';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('twitter')
  .description('X (Twitter) integration with tier detection, posting, search, and analytics')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Show setup instructions for X API with tier levels')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                     X (TWITTER) API INTEGRATION SETUP                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 X API TIER OVERVIEW

X (Twitter) has a **4-tier API access model** with dramatic differences in
capabilities and cost. This skill automatically detects your tier and shows
only available features.

═══════════════════════════════════════════════════════════════════════════

🎯 API TIERS

┌────────────────┬──────────────┬─────────────────┬──────────────────────┐
│ Tier           │ Cost/Month   │ Read Limit      │ Write Limit          │
├────────────────┼──────────────┼─────────────────┼──────────────────────┤
│ Free Access    │ $0           │ 1,500/month     │ 50/month             │
│                │              │ Almost useless  │ No media             │
├────────────────┼──────────────┼─────────────────┼──────────────────────┤
│ Basic Access   │ $100         │ 10,000/month    │ 3,000/month          │
│                │              │ Limited search  │ Media supported      │
├────────────────┼──────────────┼─────────────────┼──────────────────────┤
│ Pro Access     │ $5,000 ⚠️    │ 1M/month        │ 100K/month           │
│                │              │ Full features   │ Streaming + DMs      │
├────────────────┼──────────────┼─────────────────┼──────────────────────┤
│ Enterprise     │ Custom       │ Unlimited       │ Unlimited            │
│                │ (~$42K+)     │ Full Firehose   │ Historical data      │
└────────────────┴──────────────┴─────────────────┴──────────────────────┘

⚠️  **Important Cost Warning:**
- Free tier is extremely limited (50 tweets/month write!)
- Basic ($100/month) needed for practical automation
- Pro ($5,000/month) needed for search, streaming, DMs
- Be aware of costs before upgrading!

═══════════════════════════════════════════════════════════════════════════

🔧 STEP 1: CREATE X DEVELOPER ACCOUNT

1️⃣  **Go to X Developer Portal**
   https://developer.twitter.com

2️⃣  **Sign In**
   - Use your X (Twitter) account
   - Verify your email address
   - Verify your phone number (required)

3️⃣  **Apply for Developer Account**
   - Click "Sign up for Free Account"
   - Fill out application form:
     * Account name (personal or organization)
     * Primary use case
     * Description of how you'll use the API
     * Will you analyze tweets? (yes/no)
     * Will you use tweet/user data to display/aggregate? (yes/no)
     * Will your app use X content offline?
   - Review and accept Developer Agreement
   - Submit application

4️⃣  **Wait for Approval** (Free Tier)
   - Usually instant for Free tier
   - Check email for confirmation
   - Log in to Developer Portal once approved

═══════════════════════════════════════════════════════════════════════════

🔑 STEP 2: CREATE APP AND GET API KEYS

1️⃣  **Create New App**
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Click "Create Project" or "Create App"
   - Enter app name (e.g., "My Automation Bot")
   - Select environment (Development)

2️⃣  **Configure App Settings**
   - **App Permissions**: Read and Write (or Read, Write, and Direct Messages for Pro)
   - **Type of App**: Automated App or Bot
   - **Website URL**: Your website or https://example.com
   - **Callback URLs**: http://localhost:3000/callback (for OAuth)
   - **Terms of Service URL**: (optional)
   - **Privacy Policy URL**: (optional)

3️⃣  **Generate API Keys**
   - Go to "Keys and Tokens" tab
   - Generate **API Key and Secret** (Consumer Keys):
     * API Key (Consumer Key)
     * API Secret (Consumer Secret)
     * ⚠️  Save these immediately - shown only once!

4️⃣  **Generate Access Token and Secret**
   - Under "Authentication Tokens"
   - Click "Generate" for Access Token and Secret:
     * Access Token
     * Access Token Secret
     * ⚠️  Save these immediately - shown only once!

5️⃣  **Generate Bearer Token** (Optional - for app-only auth)
   - Click "Generate" for Bearer Token
   - Save token securely
   - Used for read-only operations

═══════════════════════════════════════════════════════════════════════════

⚙️  STEP 3: CONFIGURE ENVIRONMENT

Create \`.env\` file in skill directory:

\`\`\`env
# X (Twitter) API Credentials
# Get these from https://developer.twitter.com/en/portal/dashboard

# Required: API Keys (Consumer Keys)
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here

# Required: Access Tokens (for posting, user context)
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_SECRET=your_access_secret_here

# Optional: Bearer Token (for app-only auth, read-only)
X_BEARER_TOKEN=your_bearer_token_here

# Current tier (detected automatically, for reference)
# FREE | BASIC | PRO | ENTERPRISE
X_API_TIER=FREE
\`\`\`

**How to get values:**

**X_API_KEY & X_API_SECRET:**
- Developer Portal → Your App → "Keys and Tokens" tab
- Under "Consumer Keys", copy API Key and API Secret
- ⚠️  Keep these secret! Never commit to git!

**X_ACCESS_TOKEN & X_ACCESS_SECRET:**
- Same page, under "Authentication Tokens"
- Click "Generate" if not already created
- Copy Access Token and Access Token Secret
- ⚠️  Keep these secret! Never share!

**X_BEARER_TOKEN:**
- Same page, under "Bearer Token"
- Click "Generate" if needed
- Use for read-only operations without user context

═══════════════════════════════════════════════════════════════════════════

🧪 STEP 4: TEST YOUR CONNECTION

1️⃣  **Test API Connection**
   \`\`\`bash
   npm run twitter test
   \`\`\`
   
   Should show:
   - ✅ Your X username and ID
   - Current tier level
   - Available features
   - Rate limits

2️⃣  **Detect Tier Level**
   \`\`\`bash
   npm run twitter detect
   \`\`\`
   
   Shows:
   - Current API tier
   - Enabled features
   - Missing features
   - Cost per month
   - Upgrade guidance

3️⃣  **Test Tweet (if you have write access)**
   \`\`\`bash
   npm run tweet "Hello from X API! 🚀"
   \`\`\`
   
   Posts a test tweet to your account

═══════════════════════════════════════════════════════════════════════════

📈 UPGRADING API TIERS

**From Free to Basic ($100/month):**

⚠️  **Cost Warning: $100/month recurring charge**

Benefits:
- 10,000 tweets read per month (vs 1,500)
- 3,000 tweets write per month (vs 50)
- Post media (photos, videos, GIFs)
- Basic search (50 requests/month)
- Practical for automation

Steps:
1. Go to https://developer.twitter.com/en/portal/products
2. Click "Subscribe to Basic"
3. Review pricing ($100/month)
4. Enter payment information
5. Confirm subscription
6. Wait for activation (usually instant)
7. Run \`npm run twitter detect\` to verify

═══════════════════════════════════════════════════════════════════════════

**From Basic to Pro ($5,000/month):**

⚠️  **COST WARNING: $5,000/month recurring charge!**

This is an extremely expensive tier. Ensure you have a business case that
justifies $60,000/year in API costs.

Benefits:
- 1,000,000 tweets read per month
- 100,000 tweets write per month
- **Full search API** (300 requests per 15 min)
- **Real-time streaming** (filtered stream, sample stream)
- **Direct messages** (read and send)
- **Analytics and metrics**
- Poll creation
- Lists management
- Bookmarks
- Advanced filtering

Use cases that justify the cost:
- Social media management platforms
- Brand monitoring services
- Market research and analytics
- Large-scale automation
- Business intelligence

Steps:
1. ⚠️  Confirm you need Pro features ($5,000/month!)
2. Go to https://developer.twitter.com/en/portal/products
3. Click "Subscribe to Pro"
4. Review pricing ($5,000/month = $60,000/year)
5. Enter payment information
6. Confirm subscription
7. Wait for activation
8. Update app permissions if needed
9. Run \`npm run twitter detect\` to verify

═══════════════════════════════════════════════════════════════════════════

**Enterprise Access (Custom Pricing):**

For extremely high-volume use cases. Starts around $42,000/month.

Contact X sales: https://developer.twitter.com/en/enterprise

═══════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

❌ "Invalid authentication credentials"
   → Verify X_API_KEY and X_API_SECRET in .env
   → Verify X_ACCESS_TOKEN and X_ACCESS_SECRET in .env
   → Ensure no extra spaces or quotes
   → Check tokens weren't revoked in Developer Portal

❌ "Rate limit exceeded"
   → You've hit your tier's monthly limit
   → Free: 1,500 read / 50 write per month
   → Basic: 10,000 read / 3,000 write per month
   → Upgrade tier or wait for limit reset

❌ "Feature not available"
   → Feature requires higher tier
   → Run: npm run twitter detect
   → Review upgrade costs carefully
   → Consider if upgrade is worth the cost

❌ "Forbidden - Authentication failed"
   → Check app permissions in Developer Portal
   → Regenerate access tokens if needed
   → Ensure app has Read & Write permissions

❌ "Search not available" (Free/Basic tier)
   → Free tier: No search at all
   → Basic tier: Limited search (50 requests/month)
   → Pro tier: Full search (300 requests/15min)

═══════════════════════════════════════════════════════════════════════════

📖 RESOURCES

Developer Portal: https://developer.twitter.com
API Documentation: https://developer.twitter.com/en/docs
API Pricing: https://developer.twitter.com/en/pricing
Rate Limits: https://developer.twitter.com/en/docs/twitter-api/rate-limits

Support: https://twittercommunity.com/

═══════════════════════════════════════════════════════════════════════════

💡 RECOMMENDED PATH

1. ✅ Start with Free tier - Test the waters (very limited)
2. 💰 Upgrade to Basic ($100/month) - Practical automation
3. 🤔 Evaluate Pro need - Only if you need search/streaming/DMs ($5,000/month!)
4. 📊 Monitor usage - Track rate limits and costs
5. 💡 Optimize - Use tier detection to stay within limits

⚠️  **Cost Reminder:**
- Free: $0 (almost useless)
- Basic: $100/month = $1,200/year
- Pro: $5,000/month = $60,000/year
- Enterprise: $42,000+/month = $500,000+/year

═══════════════════════════════════════════════════════════════════════════
    `);
  });

// ============================================================================
// DETECT COMMAND
// ============================================================================

program
  .command('detect')
  .description('Detect X API tier and available features')
  .action(async () => {
    const spinner = ora('Detecting API tier...').start();
    
    try {
      const config = loadConfig();
      const client = new XClient(config);
      
      const tier = await client.detectApiTier();
      
      spinner.succeed('Tier detected!\n');
      
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
      console.log(chalk.bold.cyan('  X (TWITTER) API TIER DETECTION'));
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
      // Tier badge with color coding
      const tierColors: Record<XApiTier, any> = {
        [XApiTier.FREE]: chalk.gray,
        [XApiTier.BASIC]: chalk.yellow,
        [XApiTier.PRO]: chalk.green,
        [XApiTier.ENTERPRISE]: chalk.cyan
      };
      
      const tierColor = tierColors[tier.tier];
      console.log(tierColor.bold(`🎯 API Tier: ${tier.tierName.toUpperCase()}`));
      console.log(chalk.gray(`   Cost: $${tier.costPerMonth.toLocaleString()}/month`));
      console.log();
      
      // Rate limits
      console.log(chalk.bold('Rate Limits:'));
      console.log(chalk.cyan(`  📖 Read: ${tier.rateLimits.tweetsReadPerMonth.toLocaleString()} tweets/month`));
      console.log(chalk.cyan(`  ✍️  Write: ${tier.rateLimits.tweetsWritePerMonth.toLocaleString()} tweets/month`));
      if (tier.rateLimits.searchRequestsPer15Min > 0) {
        console.log(chalk.cyan(`  🔍 Search: ${tier.rateLimits.searchRequestsPer15Min} requests/15min`));
      }
      console.log();
      
      // Capabilities
      console.log(chalk.bold('Available Capabilities:'));
      console.log(tier.canPost ? chalk.green('  ✅ Post tweets') : chalk.gray('  ❌ Post tweets'));
      console.log(tier.canPostMedia ? chalk.green('  ✅ Post with media (photos, videos)') : chalk.gray('  ❌ Post with media (requires Basic+)'));
      console.log(tier.canSearch ? chalk.green('  ✅ Search tweets') : chalk.gray('  ❌ Search tweets (requires Basic+)'));
      console.log(tier.canStream ? chalk.green('  ✅ Real-time streaming') : chalk.gray('  ❌ Real-time streaming (requires Pro+)'));
      console.log(tier.canUseDMs ? chalk.green('  ✅ Direct messages') : chalk.gray('  ❌ Direct messages (requires Pro+)'));
      console.log(tier.canUseAnalytics ? chalk.green('  ✅ Analytics & metrics') : chalk.gray('  ❌ Analytics & metrics (requires Pro+)'));
      console.log();
      
      // Enabled features
      console.log(chalk.bold('Enabled Features:'));
      tier.enabledFeatures.slice(0, 6).forEach(feature => {
        console.log(chalk.green(`  • ${feature}`));
      });
      if (tier.enabledFeatures.length > 6) {
        console.log(chalk.gray(`  ... and ${tier.enabledFeatures.length - 6} more`));
      }
      console.log();
      
      // Missing features (upgrade opportunities)
      if (tier.missingFeatures.length > 0) {
        console.log(chalk.bold.yellow('📈 Unlock More Features:\n'));
        
        const nextTier = tier.tier === XApiTier.FREE ? XApiTier.BASIC :
                        tier.tier === XApiTier.BASIC ? XApiTier.PRO :
                        XApiTier.ENTERPRISE;
        
        const nextTierInfo = client.getTierCapabilities(nextTier);
        
        console.log(chalk.yellow(`  Upgrade to ${nextTierInfo.tierName} ($${nextTierInfo.costPerMonth.toLocaleString()}/month):`));
        
        const newFeatures = nextTierInfo.features.filter(f => !tier.features.includes(f));
        newFeatures.slice(0, 5).forEach(feature => {
          console.log(chalk.cyan(`    • ${feature}`));
        });
        
        if (nextTierInfo.costPerMonth >= 5000) {
          console.log();
          console.log(chalk.red.bold(`  ⚠️  WARNING: ${nextTierInfo.tierName} costs $${nextTierInfo.costPerMonth.toLocaleString()}/month!`));
          console.log(chalk.red(`  That's $${(nextTierInfo.costPerMonth * 12).toLocaleString()}/year.`));
          console.log(chalk.yellow('  Ensure you have business justification for this cost.'));
        }
        
        console.log();
        console.log(chalk.gray('  Run "npm run twitter setup" for upgrade instructions.'));
      }
      
      console.log();
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
    } catch (error: any) {
      spinner.fail('Detection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nTroubleshooting:'));
      console.error('  1. Verify API keys in .env');
      console.error('  2. Check authentication tokens');
      console.error('  3. Run: npm run twitter setup\n');
      process.exit(1);
    }
  });

// ============================================================================
// TEST COMMAND
// ============================================================================

program
  .command('test')
  .description('Test X API connection')
  .action(async () => {
    const spinner = ora('Testing connection...').start();
    
    try {
      const config = loadConfig();
      const client = new XClient(config);
      
      const result = await client.testConnection();
      
      spinner.succeed('Connection successful!\n');
      
      console.log(chalk.bold('Your X Account:'));
      console.log(chalk.bold('═══════════════════════════════════════\n'));
      console.log(`  Username: @${result.user!.username}`);
      console.log(`  Name: ${result.user!.name}`);
      console.log(`  User ID: ${result.user!.id}`);
      console.log();
      console.log(chalk.bold(`API Tier: ${result.tier.tierName}`));
      console.log(chalk.gray(`Cost: $${result.tier.costPerMonth.toLocaleString()}/month`));
      console.log();
      
      if (result.tier.costPerMonth === 0 && result.tier.rateLimits.tweetsWritePerMonth <= 50) {
        console.log(chalk.yellow('⚠️  Free tier is extremely limited (50 tweets/month write)'));
        console.log(chalk.yellow('   Consider upgrading to Basic ($100/month) for practical use'));
        console.log();
      }
      
    } catch (error: any) {
      spinner.fail('Connection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nPlease check:'));
      console.error('  1. X_API_KEY and X_API_SECRET are correct');
      console.error('  2. X_ACCESS_TOKEN and X_ACCESS_SECRET are correct');
      console.error('  3. Tokens haven\'t been revoked\n');
      console.error(chalk.gray('Run "npm run twitter setup" for help.\n'));
      process.exit(1);
    }
  });

// ============================================================================
// TWEET COMMAND
// ============================================================================

program
  .command('tweet <text>')
  .description('Post a tweet')
  .option('-r, --reply <id>', 'Reply to tweet ID')
  .option('-q, --quote <id>', 'Quote tweet ID')
  .action(async (text, options) => {
    const spinner = ora('Posting tweet...').start();
    
    try {
      const config = loadConfig();
      const client = new XClient(config);
      
      const tweet = await client.postTweet({
        text,
        replyToId: options.reply,
        quoteTweetId: options.quote
      });
      
      spinner.succeed('Tweet posted!\n');
      
      console.log(chalk.green('✅ Tweet successfully posted'));
      console.log();
      console.log(chalk.bold('Tweet Details:'));
      console.log(`  ID: ${tweet.id}`);
      console.log(`  Text: ${tweet.text}`);
      console.log(`  URL: https://twitter.com/i/status/${tweet.id}`);
      console.log();
      
    } catch (error: any) {
      spinner.fail('Failed to post tweet');
      console.error(chalk.red('\nError:'), error.message);
      
      if (error.message.includes('requires')) {
        console.error(chalk.yellow('\nThis feature requires a higher API tier.'));
        console.error(chalk.gray('Run: npm run twitter detect\n'));
      }
      
      process.exit(1);
    }
  });

// ============================================================================
// SEARCH COMMAND
// ============================================================================

program
  .command('search <query>')
  .description('Search tweets')
  .option('-n, --number <count>', 'Number of results', '10')
  .action(async (query, options) => {
    const spinner = ora('Searching tweets...').start();
    
    try {
      const config = loadConfig();
      const client = new XClient(config);
      
      const tweets = await client.searchTweets({
        query,
        maxResults: parseInt(options.number)
      });
      
      spinner.succeed(`Found ${tweets.length} tweets\n`);
      
      tweets.forEach((tweet, index) => {
        console.log(chalk.cyan(`${index + 1}. ${tweet.text.substring(0, 100)}...`));
        console.log(chalk.gray(`   ID: ${tweet.id} | https://twitter.com/i/status/${tweet.id}`));
        console.log();
      });
      
    } catch (error: any) {
      spinner.fail('Search failed');
      console.error(chalk.red('\nError:'), error.message);
      
      if (error.message.includes('not available')) {
        console.error(chalk.yellow('\n⚠️  Search requires Basic tier or higher'));
        console.error(chalk.yellow('   Current: Free tier ($0/month)'));
        console.error(chalk.yellow('   Upgrade to: Basic tier ($100/month)'));
        console.error(chalk.gray('\nRun: npm run twitter setup\n'));
      }
      
      process.exit(1);
    }
  });

// ============================================================================
// TIMELINE COMMAND
// ============================================================================

program
  .command('timeline [username]')
  .description('Get user timeline (defaults to your timeline)')
  .option('-n, --number <count>', 'Number of tweets', '10')
  .action(async (username, options) => {
    const spinner = ora('Fetching timeline...').start();
    
    try {
      const config = loadConfig();
      const client = new XClient(config);
      
      let userId: string;
      if (username) {
        const user = await client.getUserByUsername(username);
        userId = user.id;
        spinner.text = `Fetching @${username}'s timeline...`;
      } else {
        const me = await client.getMe();
        userId = me.id;
        spinner.text = 'Fetching your timeline...';
      }
      
      const tweets = await client.getUserTimeline(userId, parseInt(options.number));
      
      spinner.succeed(`Found ${tweets.length} tweets\n`);
      
      tweets.forEach((tweet, index) => {
        console.log(chalk.cyan(`${index + 1}. ${tweet.text.substring(0, 100)}...`));
        console.log(chalk.gray(`   https://twitter.com/i/status/${tweet.id}`));
        console.log();
      });
      
    } catch (error: any) {
      spinner.fail('Failed to fetch timeline');
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

program.parse();
