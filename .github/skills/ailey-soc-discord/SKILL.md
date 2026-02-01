---
id: ailey-soc-discord
name: Discord Bot Integration Manager
description: Comprehensive Discord bot with intent detection, slash commands, event handlers, and moderation tools. Automatically detects Gateway intent level and adapts features. Includes verification guidance for 75+ server bots.
keywords: [discord, bot, gateway, intents, slash-commands, moderation, events, verification]
tools: [discord.js, Gateway API, slash commands, webhooks]
---

# Discord Bot Integration Manager

Comprehensive Discord bot skill with intelligent Gateway intent detection, slash commands, real-time event handling, and moderation capabilities. Automatically adapts to your bot's intent configuration and provides upgrade guidance.

## Overview

This skill provides:

- **Gateway Intent Detection**: Automatically detects enabled intents (GUILD_MEMBERS, GUILD_PRESENCES, MESSAGE_CONTENT)
- **5 Intent Levels**: BASIC → PRIVILEGED_MEMBERS → PRIVILEGED_PRESENCE → PRIVILEGED_CONTENT → PRIVILEGED_ALL
- **Feature Gating**: Shows only available features based on current intent level
- **Upgrade Documentation**: Step-by-step guides to enable privileged intents
- **Verification Guidance**: Complete 75+ server verification process documentation
- **Slash Commands**: Modern interaction-based commands
- **Event Handlers**: Real-time events (messages, members, voice, reactions)
- **Moderation Tools**: Content filtering, timeouts, kicks, bans
- **Voice Support**: Voice channel management
- **Rich Interactions**: Buttons, select menus, modals

## When to Use

- Building Discord bots for community management
- Automating server moderation and content filtering
- Creating interactive slash commands and tools
- Tracking member joins, roles, and activities
- Monitoring voice channels and presence
- Managing large-scale Discord communities
- Need intelligent intent detection and upgrade guidance
- Preparing for 75+ server verification

## Installation

```bash
cd .github/skills/ailey-soc-discord
npm install
```

## Quick Start

```bash
# Show comprehensive setup instructions
npm run discord setup

# Test bot connection
npm run discord test

# Detect current intent level
npm run discord detect

# Register slash commands
npm run discord register-commands

# Run bot with event handlers
npm run bot
```

## Workflows

### Workflow 1: Initial Setup

**Configure Discord Application:**

```bash
# Step 1: Show setup guide
npm run discord setup

# Step 2: Create .env file
cp .env.example .env

# Edit .env with your values:
# - DISCORD_BOT_TOKEN (from Developer Portal)
# - DISCORD_CLIENT_ID (your application ID)

# Step 3: Test connection
npm run discord test
```

**Expected Output:**
```
✓ Connection successful!

Your Discord Bot:
═══════════════════════════════════════
  Username: MyBot#1234
  Bot ID: 123456789012345678
  Servers: 3

Intent Level: Basic Bot

💡 Enable privileged intents for more features
```

**Register Slash Commands:**

```bash
# Register globally (takes ~1 hour to propagate)
npm run discord register-commands

# Register to specific guild (instant, for testing)
npm run discord register-commands -- --guild YOUR_GUILD_ID
```

**Verify Commands:**
- Go to Discord server
- Type `/` in any channel
- You should see: /ping, /serverinfo, /userinfo

---

### Workflow 2: Intent Detection

**Check Current Intent Level:**

```bash
npm run discord detect
```

**Example Output - Basic Bot:**
```
═══════════════════════════════════════════════════════════════
  DISCORD BOT INTENT DETECTION
═══════════════════════════════════════════════════════════════

🎯 Intent Level: BASIC BOT
   Servers: 5

Enabled Intents:
  ✅ GUILDS
  ✅ GUILD_MESSAGES
  ✅ GUILD_MESSAGE_REACTIONS
  ✅ GUILD_VOICE_STATES
  ✅ DIRECT_MESSAGES

Missing Privileged Intents:
  ❌ MESSAGE_CONTENT
  ❌ GUILD_MEMBERS
  ❌ GUILD_PRESENCES

Available Capabilities:
  ❌ Read message content (requires MESSAGE_CONTENT)
  ❌ Track member joins/leaves (requires GUILD_MEMBERS)
  ❌ See member status/activities (requires GUILD_PRESENCES)
  ✅ Moderation commands

Enabled Features:
  • Slash commands
  • Send messages
  • Manage roles/channels
  • Voice channels
  • Reactions
  • DM handling

📈 Unlock More Features:
  Enable privileged intents to unlock:
    • Read message content (content moderation)
    • Track member joins/leaves
    • See member status and activities

  Run "npm run discord setup" for enablement instructions.
```

**Example Output - Full Bot (75+ servers):**
```
🎯 Intent Level: PRIVILEGED ALL
   Servers: 127

Enabled Intents:
  ✅ GUILDS
  ✅ GUILD_MESSAGES
  ⭐ MESSAGE_CONTENT (privileged)
  ⭐ GUILD_MEMBERS (privileged)
  ⭐ GUILD_PRESENCES (privileged)

Available Capabilities:
  ✅ Read message content
  ✅ Track member joins/leaves
  ✅ See member status/activities
  ✅ Moderation commands

⚠️  VERIFICATION REQUIRED:

  Your bot is in 127 servers with privileged intents.
  You must verify your bot to continue using privileged intents.

  Steps:
    1. Go to Developer Portal
    2. Submit for verification
    3. Provide privacy policy and ToS
    4. Wait for approval (1-2 weeks)

  Run "npm run discord setup" for detailed verification guide.
```

**Check Specific Features:**

```bash
npm run discord features
```

Shows granular feature availability (read messages, track members, moderation, etc.)

---

### Workflow 3: Enable Privileged Intents (< 75 Servers)

**Enable MESSAGE_CONTENT Intent:**

1. **Go to Discord Developer Portal:**
   - https://discord.com/developers/applications
   - Select your application

2. **Enable Intent:**
   - Go to "Bot" tab
   - Scroll to "Privileged Gateway Intents"
   - Toggle "MESSAGE CONTENT INTENT" to ON
   - Click "Save Changes"

3. **Update Configuration:**
   ```bash
   # Edit .env
   DISCORD_INTENT_MESSAGE_CONTENT=true
   ```

4. **Restart Bot:**
   ```bash
   npm run discord detect
   ```

**Expected Output:**
```
🎯 Intent Level: PRIVILEGED CONTENT

Enabled Intents:
  ✅ GUILDS
  ✅ GUILD_MESSAGES
  ⭐ MESSAGE_CONTENT (privileged)

Available Capabilities:
  ✅ Read message content
  ✅ Moderation commands
```

**Enable All Privileged Intents:**

```env
# .env
DISCORD_INTENT_MEMBERS=true
DISCORD_INTENT_PRESENCES=true
DISCORD_INTENT_MESSAGE_CONTENT=true
```

Developer Portal: Enable all three intents → Save Changes

---

### Workflow 4: Bot Verification (75+ Servers)

**When Verification Required:**
- Bot reaches 75 servers
- **AND** has any privileged intent enabled
- Privileged intents stop working until verified

**Prepare Documentation:**

Before applying, create:

1. **Privacy Policy** (required):
   - Hosted on public URL
   - Explain data collection, usage, protection
   - User rights (deletion, access)
   - Can use template or create your own

2. **Terms of Service** (required):
   - Hosted on public URL
   - Bot usage terms
   - User responsibilities

**Submit Verification:**

1. **Go to Developer Portal:**
   - You'll see "Verification Required" banner
   - Click "Submit for Verification"

2. **Complete Form:**

   **Bot Information:**
   - Bot name: "MyBot"
   - Purpose: "Community management and moderation"
   - Functionality: "Automated moderation, member tracking, content filtering"
   - Target audience: "Discord server administrators"
   - Primary language/region

   **Privileged Intent Justification:**
   
   **MESSAGE_CONTENT:**
   ```
   Our bot needs to read message content for automated content moderation:
   - Filter profanity and spam
   - Detect and prevent harassment
   - Auto-moderate malicious links
   - Ensure safe server environment
   
   Data handling: Messages are not stored permanently. Only flagged content
   is logged for moderation review with 30-day retention.
   ```

   **GUILD_MEMBERS:**
   ```
   Our bot needs member tracking for:
   - Send welcome messages to new members
   - Track member count analytics (privacy-safe aggregates)
   - Member verification system
   
   Data handling: Only store user IDs and join dates. No personal information
   is retained beyond what's necessary for verification.
   ```

   **GUILD_PRESENCES:**
   ```
   Our bot needs presence data for:
   - Activity-based role assignment (e.g., "Active Member" role)
   - Track streaming status for community events
   - Member engagement analytics (aggregated, not individual tracking)
   
   Data handling: Presence data is processed in real-time and not stored.
   Only aggregate statistics are retained.
   ```

   **Data Handling:**
   - Storage: "Minimal data storage - only user IDs, message flags for moderation"
   - Retention: "30 days for moderation logs, indefinite for server configuration"
   - Security: "Encrypted database, access controls, regular security audits"
   - Compliance: "GDPR compliant - users can request data deletion"

   **URLs:**
   - Privacy Policy: https://yourdomain.com/privacy
   - Terms of Service: https://yourdomain.com/terms
   - Support Server: (optional)

3. **Submit**

4. **Wait for Review:**
   - Typical timeline: 1-2 weeks
   - Discord may request clarification
   - Respond promptly to follow-ups

5. **After Approval:**
   - Receive email confirmation
   - Privileged intents remain enabled
   - No need to reapply unless suspended

**Tips for Approval:**

✅ Clear, specific use cases
✅ Legitimate privacy policy and ToS
✅ Emphasis on user privacy
✅ Professional presentation
✅ Responsive to Discord's questions

❌ Vague justifications
❌ Requesting unused intents
❌ Ignoring follow-up requests

---

### Workflow 5: Running the Bot

**Start Bot:**

```bash
npm run bot
```

**Expected Output:**
```
🚀 Starting Discord Bot...

Connecting to Discord Gateway...

🤖 Bot is ready!

Logged in as: MyBot#1234
Bot ID: 123456789012345678
Servers: 5

Intent Level: Privileged Content

Bot is listening for events...
Press Ctrl+C to stop
```

**Bot Events:**

The bot automatically handles:

**Guild Events:**
```
✅ Joined server: MyServer (123456789012345678)
   Members: 1,234

❌ Left server: OldServer (987654321098765432)
```

**Member Events** (requires GUILD_MEMBERS):
```
👋 Member joined: User#1234 in MyServer
👋 Member left: User#5678 from MyServer
```

**Message Events** (requires MESSAGE_CONTENT for content):
```
📨 Message: User#1234: Hello, this is a test message...
```

**Voice Events:**
```
🔊 User#1234 joined voice: General Voice
🔇 User#5678 left voice: General Voice
```

**Presence Events** (requires GUILD_PRESENCES):
```
🟢 Presence update: User#1234 → online
```

**Slash Command Events:**
```
✅ /ping command executed by User#1234
✅ /serverinfo command executed by User#5678
```

**Graceful Shutdown:**
```bash
# Press Ctrl+C
^C

Shutting down bot...
Bot stopped.
```

---

### Workflow 6: Slash Commands

**Default Commands:**

**`/ping`**
```
Usage: /ping
Returns: Bot latency in milliseconds

Example:
User: /ping
Bot: 🏓 Pong! Latency: 42ms
```

**`/serverinfo`**
```
Usage: /serverinfo
Returns: Server details (name, ID, members, created date, channels, roles)

Example:
User: /serverinfo
Bot: [Embed with server information]
  • Server ID: 123456789012345678
  • Owner: @Admin#1234
  • Members: 1,234
  • Created: Jan 1, 2020
  • Channels: 50
  • Roles: 20
```

**`/userinfo [user]`**
```
Usage: /userinfo [user]
Options:
  user (optional): User to get info about (defaults to yourself)
Returns: User details (ID, created date, joined date, roles, status)

Example:
User: /userinfo @Friend#5678
Bot: [Embed with user information]
  • User ID: 987654321098765432
  • Account Created: Mar 15, 2019
  • Joined Server: Jun 20, 2023
  • Status: online  (if GUILD_PRESENCES enabled)
  • Roles: Member, Helper
```

**Test Commands in Discord:**

1. **Open Discord server**
2. **Type `/` in any channel**
3. **Select command from dropdown**
4. **Fill options (if any)**
5. **Press Enter**

---

### Workflow 7: Custom Slash Commands

**Add New Command:**

Edit [discord-client.ts](discord-client.ts#L300):

```typescript
export function getDefaultCommands(): CommandData[] {
  return [
    // Existing commands...
    
    // New custom command
    {
      name: 'roll',
      description: 'Roll a dice',
      options: [
        {
          name: 'sides',
          description: 'Number of sides (default 6)',
          type: 4, // INTEGER
          required: false
        }
      ]
    }
  ];
}
```

**Implement Handler:**

Edit [bot.ts](bot.ts#L100):

```typescript
bot.client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  switch (commandName) {
    case 'roll':
      const sides = interaction.options.getInteger('sides') || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      await interaction.reply(`🎲 You rolled: **${result}** (d${sides})`);
      break;
    
    // Other cases...
  }
});
```

**Register:**

```bash
npm run discord register-commands
```

**Test:**
```
User: /roll sides:20
Bot: 🎲 You rolled: **15** (d20)
```

---

### Workflow 8: Content Moderation (Requires MESSAGE_CONTENT)

**Enable MESSAGE_CONTENT Intent:**

1. Developer Portal → Bot → Privileged Gateway Intents
2. Toggle "MESSAGE CONTENT INTENT" to ON
3. Update .env: `DISCORD_INTENT_MESSAGE_CONTENT=true`
4. Restart bot

**Add Moderation Handler:**

Edit [bot.ts](bot.ts#L150):

```typescript
bot.client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const intents = await bot.detectIntentLevel();
  if (!intents.canReadMessages) {
    // Cannot read content without MESSAGE_CONTENT
    return;
  }
  
  // Profanity filter
  const badWords = ['badword1', 'badword2'];
  const content = message.content.toLowerCase();
  
  if (badWords.some(word => content.includes(word))) {
    await message.delete();
    await message.channel.send(`${message.author}, please watch your language!`);
    console.log(`Deleted message from ${message.author.tag} (profanity)`);
  }
  
  // Spam detection
  // ... implement spam logic
  
  // Link filtering
  if (content.includes('http://') || content.includes('https://')) {
    // Check if user has permission to post links
    const member = message.member;
    if (!member?.permissions.has('ManageMessages')) {
      await message.delete();
      await message.channel.send(`${message.author}, you don't have permission to post links.`);
    }
  }
});
```

**Moderation Commands:**

```typescript
// Timeout user
case 'timeout':
  const user = interaction.options.getUser('user', true);
  const duration = interaction.options.getInteger('duration', true); // minutes
  const member = interaction.guild?.members.cache.get(user.id);
  
  if (member) {
    await member.timeout(duration * 60 * 1000, 'Moderator timeout');
    await interaction.reply(`Timed out ${user.tag} for ${duration} minutes.`);
  }
  break;

// Kick user
case 'kick':
  const kickUser = interaction.options.getUser('user', true);
  const kickMember = interaction.guild?.members.cache.get(kickUser.id);
  
  if (kickMember) {
    await kickMember.kick('Moderator action');
    await interaction.reply(`Kicked ${kickUser.tag}.`);
  }
  break;

// Ban user
case 'ban':
  const banUser = interaction.options.getUser('user', true);
  
  await interaction.guild?.members.ban(banUser.id, { reason: 'Moderator action' });
  await interaction.reply(`Banned ${banUser.tag}.`);
  break;
```

---

### Workflow 9: Member Tracking (Requires GUILD_MEMBERS)

**Enable GUILD_MEMBERS Intent:**

1. Developer Portal → Bot → Enable "SERVER MEMBERS INTENT"
2. Update .env: `DISCORD_INTENT_MEMBERS=true`
3. Restart bot

**Welcome Messages:**

```typescript
bot.client.on('guildMemberAdd', async (member) => {
  console.log(`👋 Member joined: ${member.user.tag} in ${member.guild.name}`);
  
  // Send welcome message
  const systemChannel = member.guild.systemChannel;
  if (systemChannel && systemChannel.isTextBased()) {
    await systemChannel.send(
      `Welcome to ${member.guild.name}, ${member}! 🎉\n` +
      `You are member #${member.guild.memberCount}!`
    );
  }
  
  // Assign default role
  const welcomeRole = member.guild.roles.cache.find(r => r.name === 'Member');
  if (welcomeRole) {
    await member.roles.add(welcomeRole);
  }
});
```

**Member Leave:**

```typescript
bot.client.on('guildMemberRemove', async (member) => {
  console.log(`👋 Member left: ${member.user.tag} from ${member.guild.name}`);
  
  const systemChannel = member.guild.systemChannel;
  if (systemChannel && systemChannel.isTextBased()) {
    await systemChannel.send(`${member.user.tag} has left the server. 👋`);
  }
});
```

**Member Count Analytics:**

```typescript
case 'membercount':
  const guild = interaction.guild;
  if (!guild) return;
  
  const total = guild.memberCount;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = total - bots;
  
  await interaction.reply({
    embeds: [{
      title: 'Member Statistics',
      fields: [
        { name: 'Total Members', value: total.toString(), inline: true },
        { name: 'Humans', value: humans.toString(), inline: true },
        { name: 'Bots', value: bots.toString(), inline: true }
      ]
    }]
  });
  break;
```

---

### Workflow 10: Presence Tracking (Requires GUILD_PRESENCES)

**Enable GUILD_PRESENCES Intent:**

1. Developer Portal → Bot → Enable "PRESENCE INTENT"
2. Update .env: `DISCORD_INTENT_PRESENCES=true`
3. Restart bot

**Track Status Changes:**

```typescript
bot.client.on('presenceUpdate', (oldPresence, newPresence) => {
  const user = newPresence.user;
  if (!user) return;
  
  const oldStatus = oldPresence?.status || 'offline';
  const newStatus = newPresence.status;
  
  if (oldStatus !== newStatus) {
    console.log(`🟢 ${user.tag} changed status: ${oldStatus} → ${newStatus}`);
  }
  
  // Check activities
  const activities = newPresence.activities;
  if (activities.length > 0) {
    const activity = activities[0];
    console.log(`🎮 ${user.tag} is ${activity.type}: ${activity.name}`);
  }
});
```

**Activity-Based Roles:**

```typescript
bot.client.on('presenceUpdate', async (oldPresence, newPresence) => {
  const member = newPresence.member;
  if (!member) return;
  
  // Assign "Streaming" role if user is streaming
  const streamingRole = member.guild.roles.cache.find(r => r.name === 'Streaming');
  if (!streamingRole) return;
  
  const isStreaming = newPresence.activities.some(a => a.type === 1); // STREAMING
  
  if (isStreaming && !member.roles.cache.has(streamingRole.id)) {
    await member.roles.add(streamingRole);
    console.log(`Added Streaming role to ${member.user.tag}`);
  } else if (!isStreaming && member.roles.cache.has(streamingRole.id)) {
    await member.roles.remove(streamingRole);
    console.log(`Removed Streaming role from ${member.user.tag}`);
  }
});
```

---

## Intent Level Comparison

| Feature | Basic | + Members | + Presence | + Content | All |
|---------|-------|-----------|------------|-----------|-----|
| **Slash Commands** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Send Messages** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manage Roles/Channels** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Voice Channels** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Reactions** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Read Message Content** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Track Member Joins/Leaves** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Access Member List** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **See Member Status** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Track Activities** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Content Moderation** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Welcome Messages** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Activity-Based Roles** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Verification (75+)** | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |

**Legend:**
- ✅ = Available
- ❌ = Not available
- ⚠️ = Requires Discord verification

---

## Troubleshooting

### Error: "Invalid token"

**Cause:** Incorrect DISCORD_BOT_TOKEN

**Solution:**
1. Verify token in .env matches Developer Portal
2. Reset token in Developer Portal if needed
3. Ensure no extra spaces or quotes in .env
4. Check token wasn't committed to git (security!)

---

### Error: "Intents not available"

**Cause:** Intent enabled in .env but not in Developer Portal

**Solution:**
1. Go to Developer Portal → Bot tab
2. Enable intent under "Privileged Gateway Intents"
3. Click "Save Changes"
4. Restart bot

---

### Error: "Privileged intent blocked" (75+ servers)

**Cause:** Bot reached 75 servers, verification required

**Solution:**
1. Review verification requirements: `npm run discord setup`
2. Prepare privacy policy and ToS
3. Submit verification in Developer Portal
4. Wait for approval (1-2 weeks)
5. Respond promptly to Discord's follow-ups

---

### Slash commands not appearing

**Cause:** Commands not registered or Discord caching

**Solution:**
```bash
# Re-register commands
npm run discord register-commands

# For instant testing, register to specific guild
npm run discord register-commands -- --guild YOUR_GUILD_ID

# Wait a few minutes for Discord to update cache
# Try in different server
```

---

### Bot can see message events but not content

**Cause:** Missing MESSAGE_CONTENT intent

**This is expected!** Without MESSAGE_CONTENT intent:
- Bot receives message events
- But cannot read message.content
- Slash commands still work

**Solution:** Enable MESSAGE_CONTENT intent (see Workflow 3)

---

### Welcome messages not working

**Cause:** Missing GUILD_MEMBERS intent or permissions

**Solution:**
1. Enable GUILD_MEMBERS intent (see Workflow 9)
2. Verify bot has "View Channels" and "Send Messages" permissions
3. Check systemChannel exists

---

## Resources

- **Discord Developer Portal**: https://discord.com/developers/applications
- **Discord.js Documentation**: https://discord.js.org/
- **Gateway Intents Guide**: https://discord.com/developers/docs/topics/gateway#gateway-intents
- **Slash Commands**: https://discord.com/developers/docs/interactions/application-commands
- **Verification Guide**: https://support-dev.discord.com/hc/en-us/articles/360040720412
- **Discord API Docs**: https://discord.com/developers/docs/intro

---

version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.7
---
