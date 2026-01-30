/**
 * Custom error classes for AI Command Center.
 * Provides error classification for appropriate handling and user messaging.
 */

/**
 * User-facing errors caused by invalid user input or actions.
 * Should display friendly, actionable messages to the user.
 */
export class UserError extends Error {
    constructor(
        message: string,
        public readonly userMessage?: string
    ) {
        super(message);
        this.name = 'UserError';
        Object.setPrototypeOf(this, UserError.prototype);
    }
}

/**
 * Internal system errors caused by bugs or unexpected conditions.
 * Should log stack traces and show generic error messages.
 */
export class SystemError extends Error {
    constructor(
        message: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'SystemError';
        Object.setPrototypeOf(this, SystemError.prototype);
    }
}

/**
 * Errors from external services (Jira, Confluence, Gamma, etc.).
 * Should include service name and status code for debugging.
 */
export class ExternalError extends Error {
    constructor(
        message: string,
        public readonly service: string,
        public readonly statusCode?: number
    ) {
        super(message);
        this.name = 'ExternalError';
        Object.setPrototypeOf(this, ExternalError.prototype);
    }
}
