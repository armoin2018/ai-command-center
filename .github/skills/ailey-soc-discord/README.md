# Discord Bot Integration Manager

Comprehensive Discord bot with intelligent Gateway intent detection, slash commands, and moderation tools.

## Features

- 🎯 **Intent Detection**: Automatically detects enabled Gateway intents (GUILD_MEMBERS, GUILD_PRESENCES, MESSAGE_CONTENT)
- 📊 **5 Intent Levels**: Adapts features based on configuration
- 🔐 **Verification Guidance**: Complete 75+ server verification process
- ⚡ **Slash Commands**: Modern interaction-based commands
- 📡 **Real-time Events**: Messages, members, voice, reactions, presence
- 🛡️ **Moderation Tools**: Content filtering, timeouts, kicks, bans
- 🎤 **Voice Support**: Voice channel management
- 🎨 **Rich Interactions**: Buttons, select menus, modals

## Quick Start

```bash
# Install dependencies
npm install

# Setup guide
npm run discord setup

# Configure
cp .env.example .env
# Edit .env with your bot token and client ID

# Test connection
npm run discord test

# Detect intent level
npm run discord detect

# Register slash commands
npm run discord register-commands

# Run bot
npm run bot
```

## Intent Levels

| Level | Intents | Features | Verification |
|-------|---------|----------|--------------|
| **Basic Bot** | Standard only | Commands, messages, roles, voice | ✅ None |
| **+ Members** | + GUILD_MEMBERS | Track joins/leaves, member list | ⚠️ 75+ servers |
| **+ Presence** | + GUILD_PRESENCES | Status, activities | ⚠️ 75+ servers |
| **+ Content** | + MESSAGE_CONTENT | Read message text, moderation | ⚠️ 75+ servers |
| **All Privileged** | All three | Full features | ⚠️ 75+ servers |

**⚠️ Important**: Bots in 75+ servers with privileged intents MUST be verified with Discord.

## Commands

```bash
# CLI Commands
npm run discord setup           # Show setup instructions
npm run discord test            # Test bot connection
npm run discord detect          # Detect intent level
npm run discord features        # List available features
npm run discord register-commands  # Register slash commands

# Run Bot
npm run bot                     # Start bot with event handlers
```

## Slash Commands

Default commands available in Discord:

- **`/ping`** - Check bot latency
- **`/serverinfo`** - Display server information
- **`/userinfo [user]`** - Display user information

## Configuration

### Environment Variables (.env)

```env
# Required
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# Privileged Intents (must also enable in Developer Portal)
DISCORD_INTENT_MEMBERS=false          # Track member joins/leaves
DISCORD_INTENT_PRESENCES=false        # See member status/activities
DISCORD_INTENT_MESSAGE_CONTENT=false  # Read message content
```

### Enabling Privileged Intents

**For bots in < 75 servers:**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application → Bot tab
3. Scroll to "Privileged Gateway Intents"
4. Toggle desired intent(s) ON
5. Click "Save Changes"
6. Update .env to match
7. Restart bot

**For bots in 75+ servers:**

- Must complete Discord verification process
- Prepare privacy policy and terms of service
- Submit verification form in Developer Portal
- Wait 1-2 weeks for approval
- Run `npm run discord setup` for detailed guide

## Intent Capabilities

### Basic Bot (Standard Intents)

**Available:**
- ✅ Slash commands
- ✅ Send messages
- ✅ Manage roles/channels
- ✅ Voice channels
- ✅ Reactions
- ✅ DM handling

**Not Available:**
- ❌ Read message content
- ❌ Track member joins/leaves
- ❌ See member status

### + GUILD_MEMBERS Intent

**Additional:**
- ✅ Member join/leave events
- ✅ Access member list
- ✅ Welcome messages
- ✅ Member analytics

### + GUILD_PRESENCES Intent

**Additional:**
- ✅ See online/idle/dnd status
- ✅ Track activities (playing, streaming)
- ✅ Activity-based roles
- ✅ Presence analytics

### + MESSAGE_CONTENT Intent

**Additional:**
- ✅ Read message text
- ✅ Content moderation
- ✅ Spam filtering
- ✅ Auto-moderation

## Example Usage

### Detect Intent Level

```bash
$ npm run discord detect

═══════════════════════════════════════════════════════════════
  DISCORD BOT INTENT DETECTION
═══════════════════════════════════════════════════════════════

🎯 Intent Level: PRIVILEGED CONTENT
   Servers: 12

Enabled Intents:
  ✅ GUILDS
  ✅ GUILD_MESSAGES
  ⭐ MESSAGE_CONTENT (privileged)

Available Capabilities:
  ✅ Read message content
  ❌ Track members (requires GUILD_MEMBERS)
  ❌ See presence (requires GUILD_PRESENCES)
  ✅ Moderation commands

📈 Unlock More Features:
  Enable GUILD_MEMBERS for member tracking
  Enable GUILD_PRESENCES for presence monitoring
```

### Running the Bot

```bash
$ npm run bot

🚀 Starting Discord Bot...

🤖 Bot is ready!

Logged in as: MyBot#1234
Bot ID: 123456789012345678
Servers: 12

Intent Level: Privileged Content

Bot is listening for events...
Press Ctrl+C to stop

📨 Message: User#1234: Hello bot!
✅ /ping command executed by User#5678
👍 User#9012 reacted 👍
```

## Verification Process (75+ Servers)

When your bot reaches 75 servers with privileged intents:

1. **Prepare Documentation:**
   - Create privacy policy (public URL)
   - Create terms of service (public URL)
   - Document use cases for each intent

2. **Submit Verification:**
   - Developer Portal will show "Verification Required"
   - Complete verification form
   - Justify each privileged intent
   - Provide privacy policy and ToS URLs

3. **Wait for Review:**
   - Typical timeline: 1-2 weeks
   - Discord may request clarification
   - Respond promptly

4. **Approval:**
   - Receive email confirmation
   - Privileged intents remain enabled
   - No need to reapply unless suspended

For detailed verification guide: `npm run discord setup`

## Troubleshooting

### "Invalid token"
→ Verify DISCORD_BOT_TOKEN in .env
→ Reset token in Developer Portal if needed

### "Intents not available"
→ Enable intents in Developer Portal (Bot tab)
→ Update .env to match
→ Restart bot

### "Privileged intent blocked" (75+ servers)
→ Complete verification process
→ Run: `npm run discord setup`

### Slash commands not appearing
→ Run: `npm run discord register-commands`
→ Wait a few minutes (Discord caching)
→ For instant testing: `--guild YOUR_GUILD_ID`

### Bot sees events but not message content
→ This is expected without MESSAGE_CONTENT intent
→ Enable intent or use slash commands instead

## Resources

- **Setup Guide**: `npm run discord setup`
- **Developer Portal**: https://discord.com/developers/applications
- **Discord.js Docs**: https://discord.js.org/
- **Verification Guide**: https://support-dev.discord.com/hc/en-us/articles/360040720412

## License

Part of the ai-ley kit.

---

**Need help?** Run `npm run discord setup` for comprehensive instructions.
