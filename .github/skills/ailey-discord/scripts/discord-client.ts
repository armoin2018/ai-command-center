import { 
  Client, 
  GatewayIntentBits, 
  Partials,
  REST,
  Routes,
  ActivityType,
  PresenceUpdateStatus,
  Guild,
  GuildMember,
  TextChannel,
  VoiceChannel,
  Message,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { config } from 'dotenv';

config();

// ============================================================================
// INTENT LEVEL ENUMS
// ============================================================================

export enum IntentLevel {
  BASIC = 'basic',                    // Standard intents only
  PRIVILEGED_MEMBERS = 'members',     // + GUILD_MEMBERS intent
  PRIVILEGED_PRESENCE = 'presence',   // + GUILD_PRESENCES intent
  PRIVILEGED_CONTENT = 'content',     // + MESSAGE_CONTENT intent
  PRIVILEGED_ALL = 'all'              // All privileged intents
}

export enum IntentStatus {
  AVAILABLE = 'available',
  REQUIRES_ENABLE = 'requires_enable',
  REQUIRES_VERIFICATION = 'requires_verification',
  NOT_AVAILABLE = 'not_available'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface DiscordConfig {
  token: string;
  client_id: string;
  intents: number;
  partials?: number[];
}

export interface IntentCapabilities {
  level: IntentLevel;
  levelName: string;
  status: IntentStatus;
  features: string[];
  enabledIntents: string[];
  privilegedIntents: string[];
  missingIntents: string[];
  serverCount: number;
  requiresVerification: boolean;
  canReadMessages: boolean;
  canTrackMembers: boolean;
  canSeePresence: boolean;
  canModerate: boolean;
}

export interface IntentInfo {
  level: IntentLevel;
  description: string;
  setupSteps: string[];
  requiredIntents: string[];
  verificationRequired: boolean;
  verificationThreshold: string;
  applicationUrl: string;
}

export interface ServerInfo {
  id: string;
  name: string;
  memberCount: number;
  channelCount: number;
  roleCount: number;
  ownerId: string;
  iconURL?: string;
  permissions: string[];
}

export interface CommandData {
  name: string;
  description: string;
  options?: any[];
  defaultPermission?: boolean;
  requiredPermissions?: bigint[];
}

// ============================================================================
// DISCORD CLIENT
// ============================================================================

export class DiscordBot {
  private client: Client;
  private config: DiscordConfig;
  private rest: REST;

  constructor(config: DiscordConfig) {
    this.config = config;
    
    // Create client with intents
    this.client = new Client({
      intents: config.intents,
      partials: config.partials || [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
      ]
    });

    this.rest = new REST({ version: '10' }).setToken(config.token);

    this.setupEventHandlers();
  }

  // ==========================================================================
  // INTENT DETECTION
  // ==========================================================================

  /**
   * Detect bot's current intent level and capabilities
   */
  async detectIntentLevel(): Promise<IntentCapabilities> {
    const intents = this.config.intents;
    const guilds = await this.getGuilds();
    const serverCount = guilds.length;

    // Determine which privileged intents are enabled
    const hasMembers = (intents & GatewayIntentBits.GuildMembers) !== 0;
    const hasPresences = (intents & GatewayIntentBits.GuildPresences) !== 0;
    const hasMessageContent = (intents & GatewayIntentBits.MessageContent) !== 0;

    const privilegedIntents: string[] = [];
    const missingIntents: string[] = [];

    if (hasMembers) privilegedIntents.push('GUILD_MEMBERS');
    else missingIntents.push('GUILD_MEMBERS');

    if (hasPresences) privilegedIntents.push('GUILD_PRESENCES');
    else missingIntents.push('GUILD_PRESENCES');

    if (hasMessageContent) privilegedIntents.push('MESSAGE_CONTENT');
    else missingIntents.push('MESSAGE_CONTENT');

    // Determine intent level
    let level: IntentLevel;
    if (hasMembers && hasPresences && hasMessageContent) {
      level = IntentLevel.PRIVILEGED_ALL;
    } else if (hasMessageContent) {
      level = IntentLevel.PRIVILEGED_CONTENT;
    } else if (hasPresences) {
      level = IntentLevel.PRIVILEGED_PRESENCE;
    } else if (hasMembers) {
      level = IntentLevel.PRIVILEGED_MEMBERS;
    } else {
      level = IntentLevel.BASIC;
    }

    return this.getIntentCapabilities(level, {
      serverCount,
      privilegedIntents,
      missingIntents,
      hasMembers,
      hasPresences,
      hasMessageContent
    });
  }

  /**
   * Get capabilities for specific intent level
   */
  getIntentCapabilities(
    level: IntentLevel,
    context: {
      serverCount: number;
      privilegedIntents: string[];
      missingIntents: string[];
      hasMembers: boolean;
      hasPresences: boolean;
      hasMessageContent: boolean;
    }
  ): IntentCapabilities {
    const { serverCount, privilegedIntents, missingIntents, hasMembers, hasPresences, hasMessageContent } = context;
    const requiresVerification = serverCount >= 75 && (hasMembers || hasPresences || hasMessageContent);

    const capabilities: Record<IntentLevel, Omit<IntentCapabilities, 'serverCount' | 'requiresVerification' | 'enabledIntents' | 'privilegedIntents' | 'missingIntents'>> = {
      [IntentLevel.BASIC]: {
        level: IntentLevel.BASIC,
        levelName: 'Basic Bot (Standard Intents)',
        status: IntentStatus.AVAILABLE,
        features: [
          'Receive guild events (server join/leave)',
          'Receive channel events (create/update/delete)',
          'Receive role events',
          'Receive emoji/sticker updates',
          'Send messages and embeds',
          'Slash commands and interactions',
          'Button and select menu components',
          'Voice channel operations',
          'Manage roles and channels'
        ],
        canReadMessages: false,
        canTrackMembers: false,
        canSeePresence: false,
        canModerate: true
      },

      [IntentLevel.PRIVILEGED_MEMBERS]: {
        level: IntentLevel.PRIVILEGED_MEMBERS,
        levelName: 'Members Intent Enabled',
        status: serverCount >= 75 ? IntentStatus.REQUIRES_VERIFICATION : IntentStatus.AVAILABLE,
        features: [
          'All basic features',
          'Track member joins/leaves',
          'Monitor member updates (roles, nickname)',
          'Access member list',
          'Member count tracking',
          'Advanced member moderation'
        ],
        canReadMessages: false,
        canTrackMembers: true,
        canSeePresence: false,
        canModerate: true
      },

      [IntentLevel.PRIVILEGED_PRESENCE]: {
        level: IntentLevel.PRIVILEGED_PRESENCE,
        levelName: 'Presence Intent Enabled',
        status: serverCount >= 75 ? IntentStatus.REQUIRES_VERIFICATION : IntentStatus.AVAILABLE,
        features: [
          'All basic features',
          'Track member status (online, idle, dnd, offline)',
          'See member activities (playing, streaming, listening)',
          'Monitor presence changes',
          'Rich presence integration'
        ],
        canReadMessages: false,
        canTrackMembers: false,
        canSeePresence: true,
        canModerate: true
      },

      [IntentLevel.PRIVILEGED_CONTENT]: {
        level: IntentLevel.PRIVILEGED_CONTENT,
        levelName: 'Message Content Intent Enabled',
        status: serverCount >= 75 ? IntentStatus.REQUIRES_VERIFICATION : IntentStatus.AVAILABLE,
        features: [
          'All basic features',
          'Read message content',
          'Content-based moderation',
          'Auto-moderation (profanity, spam)',
          'Message logging',
          'Command prefix detection',
          'Advanced filtering'
        ],
        canReadMessages: true,
        canTrackMembers: false,
        canSeePresence: false,
        canModerate: true
      },

      [IntentLevel.PRIVILEGED_ALL]: {
        level: IntentLevel.PRIVILEGED_ALL,
        levelName: 'All Privileged Intents Enabled',
        status: serverCount >= 75 ? IntentStatus.REQUIRES_VERIFICATION : IntentStatus.AVAILABLE,
        features: [
          'All basic features',
          'Read message content',
          'Track member joins/leaves',
          'Access member list',
          'See member status and activities',
          'Comprehensive moderation',
          'Advanced auto-moderation',
          'Full event tracking',
          'Member analytics'
        ],
        canReadMessages: true,
        canTrackMembers: true,
        canSeePresence: true,
        canModerate: true
      }
    };

    return {
      ...capabilities[level],
      serverCount,
      requiresVerification,
      enabledIntents: [
        'GUILDS',
        'GUILD_MESSAGES',
        ...privilegedIntents
      ],
      privilegedIntents,
      missingIntents
    };
  }

  /**
   * Check if specific feature is available
   */
  async checkFeatureAvailability(feature: string): Promise<{
    available: boolean;
    reason: string;
    upgradeInfo?: IntentInfo;
  }> {
    const currentIntents = await this.detectIntentLevel();

    const featureRequirements: Record<string, {
      intents: IntentLevel;
      permissions?: bigint;
    }> = {
      'read_messages': { intents: IntentLevel.PRIVILEGED_CONTENT },
      'track_members': { intents: IntentLevel.PRIVILEGED_MEMBERS },
      'see_presence': { intents: IntentLevel.PRIVILEGED_PRESENCE },
      'auto_moderation': { intents: IntentLevel.PRIVILEGED_CONTENT },
      'member_analytics': { intents: IntentLevel.PRIVILEGED_ALL },
      'kick_members': { 
        intents: IntentLevel.BASIC,
        permissions: PermissionFlagsBits.KickMembers 
      },
      'ban_members': { 
        intents: IntentLevel.BASIC,
        permissions: PermissionFlagsBits.BanMembers 
      },
      'manage_messages': {
        intents: IntentLevel.BASIC,
        permissions: PermissionFlagsBits.ManageMessages
      }
    };

    const requirement = featureRequirements[feature];
    
    if (!requirement) {
      return {
        available: false,
        reason: `Unknown feature: ${feature}`
      };
    }

    // Check intent requirement
    const levelOrder = [
      IntentLevel.BASIC,
      IntentLevel.PRIVILEGED_MEMBERS,
      IntentLevel.PRIVILEGED_PRESENCE,
      IntentLevel.PRIVILEGED_CONTENT,
      IntentLevel.PRIVILEGED_ALL
    ];

    const currentIndex = levelOrder.indexOf(currentIntents.level);
    const requiredIndex = levelOrder.indexOf(requirement.intents);

    if (currentIndex < requiredIndex) {
      return {
        available: false,
        reason: `Requires ${this.getIntentCapabilities(requirement.intents, {
          serverCount: currentIntents.serverCount,
          privilegedIntents: [],
          missingIntents: [],
          hasMembers: false,
          hasPresences: false,
          hasMessageContent: false
        }).levelName}`,
        upgradeInfo: this.getIntentUpgradePath(requirement.intents)
      };
    }

    // Check permission requirement (if any)
    if (requirement.permissions) {
      // This would check bot permissions in specific guild
      // For now, we assume permissions are available
    }

    return {
      available: true,
      reason: 'Feature is available'
    };
  }

  /**
   * Get upgrade path to enable privileged intents
   */
  getIntentUpgradePath(targetLevel: IntentLevel): IntentInfo {
    const upgradePaths: Record<IntentLevel, IntentInfo> = {
      [IntentLevel.BASIC]: {
        level: IntentLevel.BASIC,
        description: 'Basic bot with standard intents - no privileged intents required',
        setupSteps: [
          'Create application on Discord Developer Portal',
          'Create bot user',
          'Configure standard intents (no privileged intents needed)',
          'Generate invite link with permissions',
          'Add bot to server'
        ],
        requiredIntents: ['GUILDS', 'GUILD_MESSAGES'],
        verificationRequired: false,
        verificationThreshold: 'N/A',
        applicationUrl: 'https://discord.com/developers/applications'
      },

      [IntentLevel.PRIVILEGED_MEMBERS]: {
        level: IntentLevel.PRIVILEGED_MEMBERS,
        description: 'Enable GUILD_MEMBERS intent to track member joins/leaves and access member list',
        setupSteps: [
          'Go to Discord Developer Portal',
          'Select your application',
          'Go to "Bot" tab',
          'Scroll to "Privileged Gateway Intents"',
          'Enable "SERVER MEMBERS INTENT"',
          'Save changes',
          '',
          'If bot is in 75+ servers:',
          '  - You must verify your bot first',
          '  - See verification steps below',
          '',
          'Update bot code to include GUILD_MEMBERS intent',
          'Restart bot'
        ],
        requiredIntents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS'],
        verificationRequired: true,
        verificationThreshold: '75+ servers',
        applicationUrl: 'https://discord.com/developers/applications'
      },

      [IntentLevel.PRIVILEGED_PRESENCE]: {
        level: IntentLevel.PRIVILEGED_PRESENCE,
        description: 'Enable GUILD_PRESENCES intent to see member status and activities',
        setupSteps: [
          'Go to Discord Developer Portal',
          'Select your application',
          'Go to "Bot" tab',
          'Scroll to "Privileged Gateway Intents"',
          'Enable "PRESENCE INTENT"',
          'Save changes',
          '',
          'If bot is in 75+ servers:',
          '  - You must verify your bot first',
          '  - See verification steps below',
          '',
          'Update bot code to include GUILD_PRESENCES intent',
          'Restart bot'
        ],
        requiredIntents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_PRESENCES'],
        verificationRequired: true,
        verificationThreshold: '75+ servers',
        applicationUrl: 'https://discord.com/developers/applications'
      },

      [IntentLevel.PRIVILEGED_CONTENT]: {
        level: IntentLevel.PRIVILEGED_CONTENT,
        description: 'Enable MESSAGE_CONTENT intent to read message content for moderation and commands',
        setupSteps: [
          'Go to Discord Developer Portal',
          'Select your application',
          'Go to "Bot" tab',
          'Scroll to "Privileged Gateway Intents"',
          'Enable "MESSAGE CONTENT INTENT"',
          'Save changes',
          '',
          'If bot is in 75+ servers:',
          '  - You must verify your bot first',
          '  - See verification steps below',
          '',
          'Update bot code to include MESSAGE_CONTENT intent',
          'Restart bot'
        ],
        requiredIntents: ['GUILDS', 'GUILD_MESSAGES', 'MESSAGE_CONTENT'],
        verificationRequired: true,
        verificationThreshold: '75+ servers',
        applicationUrl: 'https://discord.com/developers/applications'
      },

      [IntentLevel.PRIVILEGED_ALL]: {
        level: IntentLevel.PRIVILEGED_ALL,
        description: 'Enable all privileged intents for comprehensive bot capabilities',
        setupSteps: [
          'Go to Discord Developer Portal',
          'Select your application',
          'Go to "Bot" tab',
          'Scroll to "Privileged Gateway Intents"',
          'Enable ALL three privileged intents:',
          '  ☑️ SERVER MEMBERS INTENT',
          '  ☑️ PRESENCE INTENT',
          '  ☑️ MESSAGE CONTENT INTENT',
          'Save changes',
          '',
          '═══════════════════════════════════════',
          'VERIFICATION REQUIRED FOR 75+ SERVERS:',
          '═══════════════════════════════════════',
          '',
          'Once your bot reaches 75 servers, you MUST verify:',
          '',
          '1. In Developer Portal, you\'ll see "Verification Required"',
          '2. Click "Submit for Verification"',
          '3. Complete verification form:',
          '',
          '   **Bot Information:**',
          '   - Bot purpose and functionality',
          '   - Why privileged intents are needed',
          '   - How you handle user data',
          '   - Privacy policy URL (required)',
          '   - Terms of service URL (required)',
          '',
          '   **Use Case Justification:**',
          '   - MESSAGE_CONTENT: "Content moderation, command parsing"',
          '   - GUILD_MEMBERS: "Member tracking, welcome messages"',
          '   - GUILD_PRESENCES: "Activity tracking, status monitoring"',
          '',
          '4. Submit application',
          '5. Wait for Discord review (typically 1-2 weeks)',
          '6. Address any follow-up questions',
          '7. Once approved, intents remain enabled',
          '',
          'Update bot code to include all privileged intents',
          'Restart bot'
        ],
        requiredIntents: [
          'GUILDS',
          'GUILD_MESSAGES',
          'GUILD_MEMBERS',
          'GUILD_PRESENCES',
          'MESSAGE_CONTENT'
        ],
        verificationRequired: true,
        verificationThreshold: '75+ servers',
        applicationUrl: 'https://discord.com/developers/applications'
      }
    };

    return upgradePaths[targetLevel];
  }

  // ==========================================================================
  // BOT SETUP
  // ==========================================================================

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('ready', () => {
      console.log(`✅ Bot logged in as ${this.client.user?.tag}`);
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  /**
   * Login to Discord
   */
  async login(): Promise<void> {
    await this.client.login(this.config.token);
  }

  /**
   * Logout from Discord
   */
  async logout(): Promise<void> {
    await this.client.destroy();
  }

  // ==========================================================================
  // SERVER OPERATIONS
  // ==========================================================================

  /**
   * Get guilds bot is in
   */
  async getGuilds(): Promise<Guild[]> {
    if (!this.client.isReady()) {
      throw new Error('Bot is not logged in');
    }
    return Array.from(this.client.guilds.cache.values());
  }

  /**
   * Get server information
   */
  async getServerInfo(guildId: string): Promise<ServerInfo> {
    const guild = await this.client.guilds.fetch(guildId);
    
    return {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      channelCount: guild.channels.cache.size,
      roleCount: guild.roles.cache.size,
      ownerId: guild.ownerId,
      iconURL: guild.iconURL() || undefined,
      permissions: []
    };
  }

  // ==========================================================================
  // SLASH COMMANDS
  // ==========================================================================

  /**
   * Register slash commands globally
   */
  async registerGlobalCommands(commands: CommandData[]): Promise<void> {
    try {
      console.log(`Registering ${commands.length} global slash commands...`);
      
      await this.rest.put(
        Routes.applicationCommands(this.config.client_id),
        { body: commands }
      );
      
      console.log('✅ Successfully registered global commands');
    } catch (error) {
      console.error('Failed to register commands:', error);
      throw error;
    }
  }

  /**
   * Register slash commands for specific guild
   */
  async registerGuildCommands(guildId: string, commands: CommandData[]): Promise<void> {
    try {
      console.log(`Registering ${commands.length} commands for guild ${guildId}...`);
      
      await this.rest.put(
        Routes.applicationGuildCommands(this.config.client_id, guildId),
        { body: commands }
      );
      
      console.log('✅ Successfully registered guild commands');
    } catch (error) {
      console.error('Failed to register guild commands:', error);
      throw error;
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Test connection
   */
  async testConnection(): Promise<{
    connected: boolean;
    user?: {
      tag: string;
      id: string;
      username: string;
      discriminator: string;
    };
    intents: IntentCapabilities;
    guilds: number;
  }> {
    try {
      if (!this.client.isReady()) {
        await this.login();
      }

      const intents = await this.detectIntentLevel();
      const guilds = await this.getGuilds();

      return {
        connected: true,
        user: {
          tag: this.client.user!.tag,
          id: this.client.user!.id,
          username: this.client.user!.username,
          discriminator: this.client.user!.discriminator
        },
        intents,
        guilds: guilds.length
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }

  /**
   * Get client instance
   */
  getClient(): Client {
    return this.client;
  }
}

// ============================================================================
// CONFIGURATION HELPER
// ============================================================================

export function loadConfig(): DiscordConfig {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    throw new Error('Missing required environment variables: DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID');
  }

  // Build intents based on environment configuration
  let intents = 
    GatewayIntentBits.Guilds |
    GatewayIntentBits.GuildMessages |
    GatewayIntentBits.GuildMessageReactions |
    GatewayIntentBits.GuildVoiceStates |
    GatewayIntentBits.DirectMessages;

  // Add privileged intents if configured
  if (process.env.DISCORD_INTENT_MEMBERS === 'true') {
    intents |= GatewayIntentBits.GuildMembers;
  }
  if (process.env.DISCORD_INTENT_PRESENCES === 'true') {
    intents |= GatewayIntentBits.GuildPresences;
  }
  if (process.env.DISCORD_INTENT_MESSAGE_CONTENT === 'true') {
    intents |= GatewayIntentBits.MessageContent;
  }

  return {
    token,
    client_id: clientId,
    intents
  };
}

/**
 * Default slash commands
 */
export function getDefaultCommands(): CommandData[] {
  return [
    {
      name: 'ping',
      description: 'Check bot latency'
    },
    {
      name: 'serverinfo',
      description: 'Get information about this server'
    },
    {
      name: 'userinfo',
      description: 'Get information about a user',
      options: [
        {
          name: 'user',
          description: 'The user to get info about',
          type: 6, // USER type
          required: false
        }
      ]
    }
  ];
}
