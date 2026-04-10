#!/usr/bin/env node

import { DiscordBot, loadConfig } from './discord-client.js';
import chalk from 'chalk';

const config = loadConfig();
const bot = new DiscordBot(config);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

bot.client.once('ready', async () => {
  console.log(chalk.green.bold('\n🤖 Bot is ready!\n'));
  console.log(chalk.cyan(`Logged in as: ${bot.client.user?.tag}`));
  console.log(chalk.cyan(`Bot ID: ${bot.client.user?.id}`));
  console.log(chalk.cyan(`Servers: ${bot.client.guilds.cache.size}`));
  console.log();
  
  // Detect intent level
  try {
    const intents = await bot.detectIntentLevel();
    console.log(chalk.bold(`Intent Level: ${intents.levelName}`));
    console.log();
    
    if (intents.requiresVerification) {
      console.log(chalk.yellow.bold('⚠️  VERIFICATION REQUIRED'));
      console.log(chalk.yellow(`Your bot is in ${intents.serverCount} servers with privileged intents.`));
      console.log(chalk.yellow('You must verify your bot to continue using privileged intents.'));
      console.log(chalk.gray('Run: npm run discord setup\n'));
    }
    
    if (intents.missingIntents.length > 0) {
      console.log(chalk.gray('Missing privileged intents:'));
      intents.missingIntents.forEach(intent => {
        console.log(chalk.gray(`  • ${intent}`));
      });
      console.log(chalk.gray('\nRun: npm run discord detect - for upgrade instructions\n'));
    }
    
    console.log(chalk.green('Bot is listening for events...'));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));
    
  } catch (error) {
    console.error(chalk.red('Intent detection failed:'), error);
  }
});

bot.client.on('error', (error) => {
  console.error(chalk.red('Client error:'), error);
});

bot.client.on('warn', (info) => {
  console.warn(chalk.yellow('Client warning:'), info);
});

// ============================================================================
// GUILD EVENTS
// ============================================================================

bot.client.on('guildCreate', (guild) => {
  console.log(chalk.green(`✅ Joined server: ${guild.name} (${guild.id})`));
  console.log(chalk.gray(`   Members: ${guild.memberCount}`));
});

bot.client.on('guildDelete', (guild) => {
  console.log(chalk.red(`❌ Left server: ${guild.name} (${guild.id})`));
});

// ============================================================================
// MEMBER EVENTS (Requires GUILD_MEMBERS intent)
// ============================================================================

bot.client.on('guildMemberAdd', (member) => {
  console.log(chalk.cyan(`👋 Member joined: ${member.user.tag} in ${member.guild.name}`));
  
  // Send welcome message (if bot has permission)
  const systemChannel = member.guild.systemChannel;
  if (systemChannel && systemChannel.isTextBased()) {
    systemChannel.send(`Welcome to the server, ${member}! 🎉`).catch(() => {});
  }
});

bot.client.on('guildMemberRemove', (member) => {
  console.log(chalk.gray(`👋 Member left: ${member.user.tag} from ${member.guild.name}`));
});

// ============================================================================
// MESSAGE EVENTS
// ============================================================================

bot.client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if we have MESSAGE_CONTENT intent
  const intents = await bot.detectIntentLevel();
  
  if (!intents.canReadMessages) {
    // Without MESSAGE_CONTENT, we see message event but not content
    console.log(chalk.gray(`📨 Message event received (content hidden without MESSAGE_CONTENT intent)`));
    return;
  }
  
  // Log message (only if MESSAGE_CONTENT enabled)
  console.log(chalk.gray(`📨 Message: ${message.author.tag}: ${message.content.substring(0, 50)}...`));
  
  // Simple ping command (prefix-based)
  if (message.content === '!ping') {
    message.reply('Pong! Use slash commands: /ping').catch(() => {});
  }
});

// ============================================================================
// INTERACTION EVENTS (Slash Commands)
// ============================================================================

bot.client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  try {
    switch (commandName) {
      case 'ping':
        await interaction.reply(`🏓 Pong! Latency: ${bot.client.ws.ping}ms`);
        console.log(chalk.green(`✅ /ping command executed by ${interaction.user.tag}`));
        break;
        
      case 'serverinfo':
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply('This command can only be used in a server.');
          return;
        }
        
        await interaction.reply({
          embeds: [{
            title: `Server Information: ${guild.name}`,
            fields: [
              { name: 'Server ID', value: guild.id, inline: true },
              { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
              { name: 'Members', value: guild.memberCount.toString(), inline: true },
              { name: 'Created', value: guild.createdAt.toDateString(), inline: true },
              { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
              { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true }
            ],
            color: 0x5865F2,
            thumbnail: { url: guild.iconURL() || '' }
          }]
        });
        
        console.log(chalk.green(`✅ /serverinfo command executed by ${interaction.user.tag}`));
        break;
        
      case 'userinfo':
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild?.members.cache.get(user.id);
        
        const fields: any[] = [
          { name: 'User ID', value: user.id, inline: true },
          { name: 'Account Created', value: user.createdAt.toDateString(), inline: true }
        ];
        
        if (member) {
          fields.push({ name: 'Joined Server', value: member.joinedAt?.toDateString() || 'Unknown', inline: true });
          
          const intents = await bot.detectIntentLevel();
          if (intents.canSeePresence && member.presence) {
            fields.push({ name: 'Status', value: member.presence.status, inline: true });
          }
          
          const roles = member.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.name)
            .join(', ') || 'None';
          fields.push({ name: 'Roles', value: roles.substring(0, 100), inline: false });
        }
        
        await interaction.reply({
          embeds: [{
            title: `User Information: ${user.tag}`,
            fields,
            color: 0x5865F2,
            thumbnail: { url: user.displayAvatarURL() }
          }]
        });
        
        console.log(chalk.green(`✅ /userinfo command executed by ${interaction.user.tag}`));
        break;
        
      default:
        await interaction.reply('Command not implemented.');
    }
  } catch (error) {
    console.error(chalk.red(`Error executing ${commandName}:`), error);
    
    const errorMessage = 'There was an error executing this command.';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
    }
  }
});

// ============================================================================
// PRESENCE EVENTS (Requires GUILD_PRESENCES intent)
// ============================================================================

bot.client.on('presenceUpdate', (oldPresence, newPresence) => {
  const user = newPresence.user?.tag || 'Unknown';
  const status = newPresence.status;
  console.log(chalk.cyan(`🟢 Presence update: ${user} → ${status}`));
});

// ============================================================================
// VOICE EVENTS
// ============================================================================

bot.client.on('voiceStateUpdate', (oldState, newState) => {
  if (!oldState.channelId && newState.channelId) {
    console.log(chalk.blue(`🔊 ${newState.member?.user.tag} joined voice: ${newState.channel?.name}`));
  } else if (oldState.channelId && !newState.channelId) {
    console.log(chalk.gray(`🔇 ${oldState.member?.user.tag} left voice: ${oldState.channel?.name}`));
  }
});

// ============================================================================
// REACTION EVENTS
// ============================================================================

bot.client.on('messageReactionAdd', (reaction, user) => {
  console.log(chalk.gray(`👍 ${user.tag} reacted ${reaction.emoji.name}`));
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\nShutting down bot...'));
  await bot.logout();
  console.log(chalk.green('Bot stopped.\n'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n\nShutting down bot...'));
  await bot.logout();
  console.log(chalk.green('Bot stopped.\n'));
  process.exit(0);
});

// ============================================================================
// START BOT
// ============================================================================

console.log(chalk.cyan.bold('\n🚀 Starting Discord Bot...\n'));
console.log(chalk.gray('Connecting to Discord Gateway...'));
console.log();

bot.login().catch((error) => {
  console.error(chalk.red.bold('\n❌ Failed to start bot\n'));
  console.error(chalk.red('Error:'), error.message);
  console.error();
  console.error(chalk.yellow('Please check:'));
  console.error('  1. DISCORD_BOT_TOKEN is correct in .env');
  console.error('  2. Bot has been invited to at least one server');
  console.error('  3. Token has not been reset');
  console.error();
  console.error(chalk.gray('Run: npm run discord setup - for help\n'));
  process.exit(1);
});
