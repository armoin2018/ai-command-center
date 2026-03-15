/**
 * Slack Integration Types
 *
 * Core type definitions for Slack integration via Slack Web API.
 */

export interface SlackConfig {
    /** Whether this integration is enabled */
    enabled: boolean;
    /** Bot User OAuth Token (xoxb-...) — stored in VS Code SecretStorage */
    botToken: string;
    /** App-Level Token (xapp-...) — stored in VS Code SecretStorage */
    appToken?: string;
    /** Signing Secret for verifying requests — stored in VS Code SecretStorage */
    signingSecret?: string;
    /** Default channel ID for operations */
    defaultChannelId?: string;
}

export interface SlackChannel {
    /** Channel unique identifier */
    id: string;
    /** Channel name (without #) */
    name: string;
    /** Whether this is a public channel */
    is_channel: boolean;
    /** Whether this is a private channel */
    is_private: boolean;
    /** Channel topic */
    topic?: {
        value: string;
    };
    /** Channel purpose */
    purpose?: {
        value: string;
    };
    /** Number of members */
    num_members?: number;
}

export interface SlackMessage {
    /** Message timestamp (unique ID) */
    ts: string;
    /** Message text content */
    text: string;
    /** User ID of the sender */
    user?: string;
    /** Channel ID */
    channel?: string;
    /** Thread parent timestamp (if threaded) */
    thread_ts?: string;
    /** Message attachments */
    attachments?: any[];
    /** Block Kit blocks */
    blocks?: any[];
}

export interface SlackUser {
    /** User unique identifier */
    id: string;
    /** Username */
    name: string;
    /** Full display name */
    real_name: string;
    /** User profile information */
    profile: {
        /** Email address */
        email?: string;
        /** 72px avatar URL */
        image_72?: string;
    };
}

export interface SlashCommand {
    /** The slash command name (e.g., /deploy) */
    command: string;
    /** Text after the command */
    text: string;
    /** Trigger ID for opening modals */
    trigger_id: string;
    /** User ID who invoked the command */
    user_id: string;
    /** Channel ID where the command was used */
    channel_id: string;
    /** URL for sending delayed responses */
    response_url: string;
}

export interface SlashCommandResponse {
    /** Response text */
    text?: string;
    /** Block Kit blocks */
    blocks?: any[];
    /** How to display the response */
    response_type: 'in_channel' | 'ephemeral';
}

export interface SlashCommandHandler {
    /** Handler display name */
    name: string;
    /** Handler description */
    description: string;
    /** Execute the command and return a response */
    execute(cmd: SlashCommand): Promise<SlashCommandResponse>;
}

export interface SlackWebhookEvent {
    /** Event type identifier */
    type: string;
    /** Nested event data */
    event?: {
        /** Inner event type */
        type: string;
        /** Channel where the event occurred */
        channel?: string;
        /** User who triggered the event */
        user?: string;
        /** Text content associated with the event */
        text?: string;
        /** Timestamp of the event */
        ts?: string;
    };
    /** URL verification challenge string */
    challenge?: string;
}
