#!/usr/bin/env node

import { Command } from 'commander';
import { DiscordBot, loadConfig, getDefaultCommands, IntentLevel } from './discord-client.js';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('discord')
  .description('Discord bot with intent detection, slash commands, and moderation tools')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Show setup instructions for Discord bot with intent levels')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                        DISCORD BOT INTEGRATION SETUP                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 GATEWAY INTENTS OVERVIEW

Discord bots use **Gateway Intents** to receive specific events. This skill
automatically detects your enabled intents and shows only available features.

═══════════════════════════════════════════════════════════════════════════

🎯 INTENT LEVELS

┌──────────────────────┬──────────────────────────┬───────────────────────┐
│ Level                │ Features                 │ Verification          │
├──────────────────────┼──────────────────────────┼───────────────────────┤
│ Basic Bot            │ Commands, moderation     │ ✅ None required     │
│ (Standard Intents)   │ Send messages, manage    │                       │
├──────────────────────┼──────────────────────────┼───────────────────────┤
│ + Members Intent     │ Track joins/leaves       │ ⚠️  75+ servers      │
│                      │ Access member list       │    verification       │
├──────────────────────┼──────────────────────────┼───────────────────────┤
│ + Presence Intent    │ See online status        │ ⚠️  75+ servers      │
│                      │ Track activities         │    verification       │
├──────────────────────┼──────────────────────────┼───────────────────────┤
│ + Message Content    │ Read message text        │ ⚠️  75+ servers      │
│                      │ Content moderation       │    verification       │
├──────────────────────┼──────────────────────────┼───────────────────────┤
│ All Privileged       │ All features             │ ⚠️  75+ servers      │
│                      │ Comprehensive bot        │    verification       │
└──────────────────────┴──────────────────────────┴───────────────────────┘

**Important:** Bots in 75+ servers with privileged intents MUST be verified.

═══════════════════════════════════════════════════════════════════════════

🤖 STEP 1: CREATE DISCORD APPLICATION

1️⃣  **Go to Discord Developer Portal**
   https://discord.com/developers/applications

2️⃣  **Create New Application**
   - Click "New Application" (top right)
   - Enter application name (e.g., "AIley Discord Bot")
   - Accept terms and click "Create"

3️⃣  **Configure Application**
   - **General Information** tab:
     * Set app icon (optional)
     * Add description
     * Note your **Application ID** (you'll need this)

4️⃣  **Create Bot User**
   - Go to "Bot" tab (left sidebar)
   - Click "Add Bot"
   - Confirm "Yes, do it!"
   - Bot user is now created

5️⃣  **Configure Bot Settings**
   - Set bot username
   - Set bot avatar (optional)
   - Under "Token":
     * Click "Reset Token"
     * Copy token (you'll need this - keep it secret!)
     * ⚠️  Never share your bot token!

═══════════════════════════════════════════════════════════════════════════

🔐 STEP 2: CONFIGURE GATEWAY INTENTS

In the "Bot" tab, scroll to **Privileged Gateway Intents**:

**For Basic Bot (Recommended Start):**
Leave all privileged intents OFF. Standard intents are enough for:
- Slash commands
- Sending messages
- Managing roles/channels
- Basic moderation

**To Enable Privileged Intents:**

┌─────────────────────────────────────────────────────────────────────────┐
│ SERVER MEMBERS INTENT (GUILD_MEMBERS)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Allows: Track member joins/leaves, access member list                  │
│ Use for: Welcome messages, member analytics, verification systems      │
│                                                                         │
│ To enable:                                                              │
│   ☑️ Toggle "SERVER MEMBERS INTENT" to ON                              │
│   ☑️ Click "Save Changes"                                              │
│                                                                         │
│ ⚠️  Required for 75+ servers: Bot verification                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PRESENCE INTENT (GUILD_PRESENCES)                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ Allows: See member status (online/idle/dnd/offline) and activities     │
│ Use for: Activity tracking, status-based roles, analytics              │
│                                                                         │
│ To enable:                                                              │
│   ☑️ Toggle "PRESENCE INTENT" to ON                                    │
│   ☑️ Click "Save Changes"                                              │
│                                                                         │
│ ⚠️  Required for 75+ servers: Bot verification                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MESSAGE CONTENT INTENT (MESSAGE_CONTENT)                                │
├─────────────────────────────────────────────────────────────────────────┤
│ Allows: Read message content (text)                                    │
│ Use for: Content moderation, auto-mod, custom prefix commands          │
│                                                                         │
│ To enable:                                                              │
│   ☑️ Toggle "MESSAGE CONTENT INTENT" to ON                             │
│   ☑️ Click "Save Changes"                                              │
│                                                                         │
│ ⚠️  Required for 75+ servers: Bot verification                         │
│                                                                         │
│ Note: Slash commands work WITHOUT this intent                          │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════

🔗 STEP 3: GENERATE BOT INVITE LINK

1️⃣  **Go to OAuth2 → URL Generator** (left sidebar)

2️⃣  **Select Scopes:**
   ☑️ bot
   ☑️ applications.commands

3️⃣  **Select Bot Permissions:**
   
   **Recommended permissions:**
   ☑️ Read Messages/View Channels
   ☑️ Send Messages
   ☑️ Send Messages in Threads
   ☑️ Manage Messages (for moderation)
   ☑️ Embed Links
   ☑️ Attach Files
   ☑️ Read Message History
   ☑️ Add Reactions
   ☑️ Use Slash Commands
   ☑️ Manage Roles
   ☑️ Manage Channels
   ☑️ Kick Members (for moderation bots)
   ☑️ Ban Members (for moderation bots)
   ☑️ Manage Nicknames
   ☑️ Connect (voice)
   ☑️ Speak (voice)

4️⃣  **Copy Generated URL**
   - URL appears at bottom of page
   - Copy the full URL

5️⃣  **Invite Bot to Your Server**
   - Paste URL in browser
   - Select server from dropdown
   - Click "Authorize"
   - Complete captcha
   - Bot is now in your server!

═══════════════════════════════════════════════════════════════════════════

⚙️  STEP 4: CONFIGURE ENVIRONMENT

Create \`.env\` file in skill directory:

\`\`\`env
# Required - from Discord Developer Portal
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here

# Privileged Intents (set to 'true' to enable)
# ⚠️  Must also enable in Developer Portal

# Track member joins/leaves, access member list
DISCORD_INTENT_MEMBERS=false

# See member status and activities  
DISCORD_INTENT_PRESENCES=false

# Read message content (for content moderation)
DISCORD_INTENT_MESSAGE_CONTENT=false

# Note: Standard intents are always enabled:
# - GUILDS
# - GUILD_MESSAGES  
# - GUILD_MESSAGE_REACTIONS
# - GUILD_VOICE_STATES
# - DIRECT_MESSAGES
\`\`\`

**How to get values:**

**DISCORD_BOT_TOKEN:**
- Developer Portal → Your App → Bot tab
- Under "Token", click "Reset Token"
- Copy token
- ⚠️  Keep this secret! Never commit to git!

**DISCORD_CLIENT_ID:**
- Developer Portal → Your App → General Information
- Copy "APPLICATION ID"

**Intent Toggles:**
- Set to \`true\` only if you enabled them in Developer Portal
- Must match Developer Portal settings
- Start with all \`false\` for basic bot

═══════════════════════════════════════════════════════════════════════════

🧪 STEP 5: TEST YOUR BOT

1️⃣  **Test Connection**
   \`\`\`bash
   npm run discord test
   \`\`\`
   
   Should show:
   - ✅ Bot username and ID
   - Current intent level
   - Number of servers
   - Available features

2️⃣  **Detect Intent Level**
   \`\`\`bash
   npm run discord detect
   \`\`\`
   
   Shows:
   - Enabled intents
   - Missing intents
   - Available features
   - Upgrade guidance

3️⃣  **Register Slash Commands**
   \`\`\`bash
   npm run discord register-commands
   \`\`\`
   
   Registers default commands:
   - /ping - Check bot latency
   - /serverinfo - Server information
   - /userinfo - User information

4️⃣  **Verify in Discord**
   - Go to your server
   - Type \`/\` in any channel
   - You should see bot commands appear
   - Try \`/ping\` to test

═══════════════════════════════════════════════════════════════════════════

📈 UPGRADING TO PRIVILEGED INTENTS

**Before 75 Servers (Easy):**

1. Go to Developer Portal
2. Bot tab → Privileged Gateway Intents
3. Toggle intent ON
4. Click "Save Changes"
5. Update .env: Set intent to \`true\`
6. Restart bot
7. Run \`npm run discord detect\` to verify

**After 75 Servers (Requires Verification):**

═══════════════════════════════════════════════════════════════════════════
⚠️  BOT VERIFICATION PROCESS (75+ Servers with Privileged Intents)
═══════════════════════════════════════════════════════════════════════════

When your bot reaches 75 servers AND you want privileged intents, you must
verify your bot with Discord.

**Step 1: Prepare Documentation**

Before applying, prepare:

1. **Privacy Policy** (required):
   - URL to public privacy policy
   - Must explain:
     * What data you collect
     * How you use it
     * How you protect it
     * User rights (deletion, access)
   - Can use template from Discord or create your own

2. **Terms of Service** (required):
   - URL to public ToS
   - Bot usage terms
   - User responsibilities
   - Can be simple for personal bots

3. **Use Case Justification**:
   - Why you need each privileged intent
   - How it benefits users
   - What features require it
   - Data protection measures

**Step 2: Submit Verification**

1. Go to Developer Portal → Your App
2. You'll see "Verification Required" banner
3. Click "Submit for Verification"
4. Complete verification form:

   **Bot Information:**
   - Bot name and purpose
   - Description of functionality
   - Target audience
   - Primary language/region

   **Privileged Intent Justification:**
   
   For each enabled privileged intent, explain:
   
   **GUILD_MEMBERS:**
   - "Track member joins for welcome messages"
   - "Member verification system"
   - "Member count analytics"
   
   **GUILD_PRESENCES:**
   - "Activity-based role assignment"  
   - "Track streaming status"
   - "Member activity analytics"
   
   **MESSAGE_CONTENT:**
   - "Content moderation (profanity, spam)"
   - "Auto-moderation system"
   - "Message logging for server safety"

   **Data Handling:**
   - How you store data (if at all)
   - Retention period
   - Security measures
   - Compliance (GDPR, etc.)

   **URLs:**
   - Privacy Policy URL
   - Terms of Service URL
   - Support server invite (optional)

5. Click "Submit"

**Step 3: Wait for Review**

- Discord reviews manually
- Typical timeline: 1-2 weeks
- Check email for updates
- May request additional information

**Step 4: Address Follow-ups**

If Discord requests clarification:
- Respond promptly
- Provide detailed answers
- Update documentation if needed

**Step 5: Approval**

Once approved:
- You'll receive email confirmation
- Privileged intents remain enabled
- No need to reapply unless suspended
- Update bot code and restart

**Tips for Approval:**

✅ Clear, specific use case for each intent
✅ Legitimate privacy policy and ToS
✅ Emphasis on user privacy and data protection
✅ Professional presentation
✅ Responsive to follow-up questions

❌ Avoid vague justifications
❌ Don't request intents you don't use
❌ Don't ignore follow-up requests

═══════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

❌ "Invalid token"
   → Verify DISCORD_BOT_TOKEN in .env
   → Reset token in Developer Portal if needed
   → Ensure no extra spaces or quotes

❌ "Intents not available"
   → Enable intents in Developer Portal (Bot tab)
   → Update .env to match Developer Portal settings
   → Restart bot

❌ "Missing Access" error
   → Check bot permissions in server
   → Right-click bot → Permissions
   → Ensure required permissions enabled

❌ "Privileged intent blocked" (75+ servers)
   → You must verify bot first
   → See verification process above
   → Cannot use privileged intents until verified

❌ Slash commands not appearing
   → Run: npm run discord register-commands
   → Wait a few minutes (Discord caches commands)
   → Try in different server

═══════════════════════════════════════════════════════════════════════════

📖 RESOURCES

Developer Portal: https://discord.com/developers/applications
Discord.js Guide: https://discordjs.guide/
Intent Documentation: https://discord.com/developers/docs/topics/gateway#gateway-intents
Verification Info: https://support-dev.discord.com/hc/en-us/articles/360040720412

Bot Verification FAQs: https://support-dev.discord.com/hc/en-us/sections/360002383171

═══════════════════════════════════════════════════════════════════════════

💡 RECOMMENDED PATH

1. ✅ Start with Basic Bot (standard intents) - Works immediately
2. ⏳ Add bot to servers, build features
3. 🔄 Enable privileged intents as needed (before 75 servers)
4. 📈 Apply for verification when approaching 75 servers
5. 🚀 Unlock all features after verification

═══════════════════════════════════════════════════════════════════════════
    `);
  });

// ============================================================================
// DETECT COMMAND
// ============================================================================

program
  .command('detect')
  .description('Detect bot\'s intent level and available features')
  .action(async () => {
    const spinner = ora('Detecting intents...').start();
    
    try {
      const config = loadConfig();
      const bot = new DiscordBot(config);
      
      await bot.login();
      const intents = await bot.detectIntentLevel();
      await bot.logout();
      
      spinner.succeed('Intents detected!\n');
      
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════'));
      console.log(chalk.bold.cyan('  DISCORD BOT INTENT DETECTION'));
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
      // Intent level badge
      const levelColors: Record<string, any> = {
        [IntentLevel.BASIC]: chalk.yellow,
        [IntentLevel.PRIVILEGED_MEMBERS]: chalk.green,
        [IntentLevel.PRIVILEGED_PRESENCE]: chalk.blue,
        [IntentLevel.PRIVILEGED_CONTENT]: chalk.magenta,
        [IntentLevel.PRIVILEGED_ALL]: chalk.cyan
      };
      
      const levelColor = levelColors[intents.level] || chalk.gray;
      console.log(levelColor.bold(`🎯 Intent Level: ${intents.levelName.toUpperCase()}`));
      console.log(chalk.gray(`   Servers: ${intents.serverCount}`));
      console.log();
      
      // Enabled intents
      console.log(chalk.bold('Enabled Intents:'));
      intents.enabledIntents.forEach(intent => {
        const isPrivileged = intents.privilegedIntents.includes(intent);
        if (isPrivileged) {
          console.log(chalk.cyan(`  ⭐ ${intent} (privileged)`));
        } else {
          console.log(chalk.green(`  ✅ ${intent}`));
        }
      });
      console.log();
      
      // Missing privileged intents
      if (intents.missingIntents.length > 0) {
        console.log(chalk.bold('Missing Privileged Intents:'));
        intents.missingIntents.forEach(intent => {
          console.log(chalk.gray(`  ❌ ${intent}`));
        });
        console.log();
      }
      
      // Capabilities
      console.log(chalk.bold('Available Capabilities:'));
      console.log(intents.canReadMessages ? chalk.green('  ✅ Read message content') : chalk.gray('  ❌ Read message content (requires MESSAGE_CONTENT)'));
      console.log(intents.canTrackMembers ? chalk.green('  ✅ Track member joins/leaves') : chalk.gray('  ❌ Track members (requires GUILD_MEMBERS)'));
      console.log(intents.canSeePresence ? chalk.green('  ✅ See member status/activities') : chalk.gray('  ❌ See presence (requires GUILD_PRESENCES)'));
      console.log(intents.canModerate ? chalk.green('  ✅ Moderation commands') : chalk.gray('  ❌ Moderation (check permissions)'));
      console.log();
      
      // Features
      console.log(chalk.bold('Enabled Features:'));
      intents.features.slice(0, 6).forEach(feature => {
        console.log(chalk.green(`  • ${feature}`));
      });
      if (intents.features.length > 6) {
        console.log(chalk.gray(`  ... and ${intents.features.length - 6} more`));
      }
      console.log();
      
      // Verification warning
      if (intents.requiresVerification) {
        console.log(chalk.bold.red('⚠️  VERIFICATION REQUIRED:\n'));
        console.log(chalk.yellow(`  Your bot is in ${intents.serverCount} servers with privileged intents.`));
        console.log(chalk.yellow('  You must verify your bot to continue using privileged intents.'));
        console.log();
        console.log(chalk.cyan('  Steps:'));
        console.log(chalk.cyan('    1. Go to Developer Portal'));
        console.log(chalk.cyan('    2. Submit for verification'));
        console.log(chalk.cyan('    3. Provide privacy policy and ToS'));
        console.log(chalk.cyan('    4. Wait for approval (1-2 weeks)'));
        console.log();
        console.log(chalk.gray('  Run "npm run discord setup" for detailed verification guide.'));
        console.log();
      }
      
      // Upgrade suggestions
      if (intents.missingIntents.length > 0 && !intents.requiresVerification) {
        console.log(chalk.bold.yellow('📈 Unlock More Features:\n'));
        console.log(chalk.yellow('  Enable privileged intents to unlock:'));
        
        if (intents.missingIntents.includes('MESSAGE_CONTENT')) {
          console.log(chalk.cyan('    • Read message content (content moderation)'));
        }
        if (intents.missingIntents.includes('GUILD_MEMBERS')) {
          console.log(chalk.cyan('    • Track member joins/leaves'));
        }
        if (intents.missingIntents.includes('GUILD_PRESENCES')) {
          console.log(chalk.cyan('    • See member status and activities'));
        }
        
        console.log();
        console.log(chalk.gray('  Run "npm run discord setup" for enablement instructions.'));
      }
      
      console.log();
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
    } catch (error: any) {
      spinner.fail('Detection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nTroubleshooting:'));
      console.error('  1. Verify DISCORD_BOT_TOKEN in .env');
      console.error('  2. Check bot is invited to at least one server');
      console.error('  3. Run: npm run discord setup\n');
      process.exit(1);
    }
  });

// ============================================================================
// TEST COMMAND
// ============================================================================

program
  .command('test')
  .description('Test Discord bot connection')
  .action(async () => {
    const spinner = ora('Testing connection...').start();
    
    try {
      const config = loadConfig();
      const bot = new DiscordBot(config);
      
      const result = await bot.testConnection();
      await bot.logout();
      
      spinner.succeed('Connection successful!\n');
      
      console.log(chalk.bold('Your Discord Bot:'));
      console.log(chalk.bold('═══════════════════════════════════════\n'));
      console.log(`  Username: ${result.user!.username}#${result.user!.discriminator}`);
      console.log(`  Bot ID: ${result.user!.id}`);
      console.log(`  Servers: ${result.guilds}`);
      console.log();
      console.log(chalk.bold(`Intent Level: ${result.intents.levelName}`));
      console.log();
      
      if (result.intents.requiresVerification) {
        console.log(chalk.yellow('⚠️  Verification required for privileged intents'));
        console.log(chalk.yellow(`   (Bot is in ${result.guilds} servers)`));
        console.log();
      }
      
    } catch (error: any) {
      spinner.fail('Connection failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nPlease check:'));
      console.error('  1. DISCORD_BOT_TOKEN is correct');
      console.error('  2. Bot is invited to a server');
      console.error('  3. Token has not been reset\n');
      console.error(chalk.gray('Run "npm run discord setup" for help.\n'));
      process.exit(1);
    }
  });

// ============================================================================
// REGISTER COMMANDS
// ============================================================================

program
  .command('register-commands')
  .description('Register default slash commands')
  .option('-g, --guild <id>', 'Register to specific guild (faster for testing)')
  .action(async (options) => {
    const spinner = ora('Registering slash commands...').start();
    
    try {
      const config = loadConfig();
      const bot = new DiscordBot(config);
      const commands = getDefaultCommands();
      
      await bot.login();
      
      if (options.guild) {
        await bot.registerGuildCommands(options.guild, commands);
        spinner.succeed(`Registered ${commands.length} commands to guild ${options.guild}\n`);
      } else {
        await bot.registerGlobalCommands(commands);
        spinner.succeed(`Registered ${commands.length} global commands\n`);
        console.log(chalk.yellow('Note: Global commands can take up to 1 hour to appear everywhere.'));
        console.log(chalk.yellow('For testing, use: npm run discord register-commands -- --guild YOUR_GUILD_ID\n'));
      }
      
      await bot.logout();
      
    } catch (error: any) {
      spinner.fail('Command registration failed');
      console.error(chalk.red('\nError:'), error.message);
      console.error(chalk.yellow('\nPlease check:'));
      console.error('  1. Bot has applications.commands scope');
      console.error('  2. DISCORD_CLIENT_ID is correct\n');
      process.exit(1);
    }
  });

// ============================================================================
// FEATURES COMMAND
// ============================================================================

program
  .command('features')
  .description('List all available features based on intents')
  .action(async () => {
    const spinner = ora('Checking features...').start();
    
    try {
      const config = loadConfig();
      const bot = new DiscordBot(config);
      
      await bot.login();
      const intents = await bot.detectIntentLevel();
      await bot.logout();
      
      spinner.stop();
      
      console.log(chalk.bold('\n═══════════════════════════════════════════════════════════════'));
      console.log(chalk.bold.cyan(`  AVAILABLE FEATURES (${intents.levelName})`));
      console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));
      
      // Check key features
      const featureChecks = [
        { name: 'Read message content', key: 'read_messages' },
        { name: 'Track member joins/leaves', key: 'track_members' },
        { name: 'See member presence', key: 'see_presence' },
        { name: 'Content auto-moderation', key: 'auto_moderation' },
        { name: 'Member analytics', key: 'member_analytics' },
        { name: 'Kick members', key: 'kick_members' },
        { name: 'Ban members', key: 'ban_members' },
        { name: 'Manage messages', key: 'manage_messages' }
      ];
      
      for (const { name, key } of featureChecks) {
        const check = await bot.checkFeatureAvailability(key);
        
        if (check.available) {
          console.log(chalk.green(`✅ ${name}`));
        } else {
          console.log(chalk.gray(`❌ ${name}`));
          console.log(chalk.yellow(`   → ${check.reason}`));
          
          if (check.upgradeInfo) {
            console.log(chalk.cyan(`   → Enable: npm run discord setup`));
          }
        }
      }
      
      console.log(chalk.bold('\n═══════════════════════════════════════════════════════════════\n'));
      
    } catch (error: any) {
      spinner.fail('Feature check failed');
      console.error(chalk.red('\nError:'), error.message);
    }
  });

program.parse();
