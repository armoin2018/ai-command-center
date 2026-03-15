/**
 * Microsoft Teams Integration Types
 *
 * Core type definitions for Microsoft Teams integration via Microsoft Graph API.
 */

export interface TeamsConfig {
    /** Whether this integration is enabled */
    enabled: boolean;
    /** Azure AD tenant ID */
    tenantId: string;
    /** Azure AD application (client) ID */
    clientId: string;
    /** Client secret — stored in VS Code SecretStorage */
    clientSecret: string;
    /** Default team ID for operations */
    defaultTeamId?: string;
}

export interface TeamsChannel {
    /** Channel unique identifier */
    id: string;
    /** Display name of the channel */
    displayName: string;
    /** Optional channel description */
    description?: string;
    /** Membership type: standard, private, or shared */
    membershipType: 'standard' | 'private' | 'shared';
}

export interface TeamsMessage {
    /** Message unique identifier */
    id: string;
    /** Message body */
    body: {
        /** Message content */
        content: string;
        /** Content type: text or html */
        contentType: 'text' | 'html';
    };
    /** Sender information */
    from?: {
        user?: {
            /** Display name of the sender */
            displayName: string;
        };
    };
    /** ISO 8601 timestamp when the message was created */
    createdDateTime: string;
}

export interface TeamsChatMessage {
    /** Chat message unique identifier */
    id: string;
    /** Chat identifier */
    chatId: string;
    /** Message body */
    body: {
        /** Message content */
        content: string;
        /** Content type: text or html */
        contentType: 'text' | 'html';
    };
    /** Sender information */
    from?: {
        user?: {
            /** Display name of the sender */
            displayName: string;
        };
    };
}

export interface TeamsWebhookSubscription {
    /** Subscription unique identifier */
    id: string;
    /** Resource path being subscribed to */
    resource: string;
    /** Types of changes to receive: created, updated, deleted */
    changeType: string;
    /** URL that receives webhook notifications */
    notificationUrl: string;
    /** ISO 8601 timestamp when the subscription expires */
    expirationDateTime: string;
}
