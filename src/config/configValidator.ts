import { Logger } from '../logger';
import { ConfigManager } from '../configManager';
import { AICommandCenterConfig } from '../types/config';
import { ErrorHandler } from '../errorHandler';
import { UserError } from '../errors/customErrors';

/**
 * Configuration Validator - Validates configuration against schema.
 */
export class ConfigValidator {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Validate complete configuration.
     */
    public validate(config: AICommandCenterConfig): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate planning config
        if (config.planning.planPath.trim().length === 0) {
            errors.push('planning.planPath cannot be empty');
        }

        if (config.planning.autoSaveInterval < 0) {
            errors.push('planning.autoSaveInterval must be >= 0');
        }

        if (config.planning.autoSaveInterval > 0 && config.planning.autoSaveInterval < 10000) {
            warnings.push('planning.autoSaveInterval < 10s may impact performance');
        }

        if (!['fibonacci', 'linear', 'tshirt'].includes(config.planning.storyPointScale)) {
            errors.push('planning.storyPointScale must be: fibonacci, linear, or tshirt');
        }

        if (config.planning.sprintDurationWeeks < 1 || config.planning.sprintDurationWeeks > 8) {
            errors.push('planning.sprintDurationWeeks must be between 1-8');
        }

        // Validate logging config
        const validLogLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLogLevels.includes(config.logging.level)) {
            errors.push(`logging.level must be one of: ${validLogLevels.join(', ')}`);
        }

        if (config.logging.retentionDays < 1) {
            errors.push('logging.retentionDays must be >= 1');
        }

        if (config.logging.maxFileSizeMB < 1 || config.logging.maxFileSizeMB > 100) {
            errors.push('logging.maxFileSizeMB must be between 1-100');
        }

        // Validate integrations
        if (config.integrations.jira.enabled) {
            if (!config.integrations.jira.baseUrl) {
                errors.push('jira.baseUrl is required when Jira is enabled');
            } else if (!this.isValidUrl(config.integrations.jira.baseUrl)) {
                errors.push('jira.baseUrl must be a valid URL');
            }

            if (!config.integrations.jira.email) {
                warnings.push('jira.email should be set when Jira is enabled');
            }
        }

        if (config.integrations.confluence.enabled) {
            if (!config.integrations.confluence.baseUrl) {
                errors.push('confluence.baseUrl is required when Confluence is enabled');
            } else if (!this.isValidUrl(config.integrations.confluence.baseUrl)) {
                errors.push('confluence.baseUrl must be a valid URL');
            }
        }

        if (config.integrations.gamma.enabled) {
            if (!config.integrations.gamma.apiKey) {
                errors.push('gamma.apiKey is required when Gamma is enabled');
            }
        }

        // Validate MCP config
        if (config.mcp.enabled) {
            if (config.mcp.port && (config.mcp.port < 1024 || config.mcp.port > 65535)) {
                errors.push('mcp.port must be between 1024-65535');
            }

            if (!['http', 'stdio', 'https', 'websocket'].includes(config.mcp.transport)) {
                errors.push('mcp.transport must be: http, stdio, https, or websocket');
            }
        }

        // Validate UI config
        if (!['auto', 'light', 'dark'].includes(config.ui.theme)) {
            errors.push('ui.theme must be: auto, light, or dark');
        }

        // Validate performance config
        if (config.performance.activationTimeoutMs < 100 || config.performance.activationTimeoutMs > 10000) {
            errors.push('performance.activationTimeoutMs must be between 100-10000');
        }

        if (config.performance.apiTimeoutMs < 1000 || config.performance.apiTimeoutMs > 60000) {
            errors.push('performance.apiTimeoutMs must be between 1000-60000');
        }

        this.logger.debug('Configuration validation completed', {
            component: 'ConfigValidator',
            errorCount: errors.length,
            warningCount: warnings.length
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate partial configuration updates.
     */
    public validatePartial(updates: Partial<AICommandCenterConfig>): ValidationResult {
        const currentConfig = ConfigManager.getInstance().getConfig();
        const mergedConfig = { ...currentConfig, ...updates };
        return this.validate(mergedConfig);
    }

    /**
     * Check if URL is valid.
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get configuration health score (0-100).
     */
    public getHealthScore(config: AICommandCenterConfig): number {
        const result = this.validate(config);
        
        if (!result.isValid) {
            return Math.max(0, 100 - (result.errors.length * 10));
        }

        return Math.max(0, 100 - (result.warnings.length * 5));
    }

    /**
     * Get configuration recommendations.
     */
    public getRecommendations(config: AICommandCenterConfig): string[] {
        const recommendations: string[] = [];

        // Performance recommendations
        if (!config.performance.trackPerformance) {
            recommendations.push('Enable performance tracking to monitor extension performance');
        }

        if (config.logging.level === 'debug') {
            recommendations.push('Consider using "info" log level in production for better performance');
        }

        if (config.planning.autoSaveInterval === 0) {
            recommendations.push('Enable auto-save to prevent data loss');
        }

        // Integration recommendations
        const enabledIntegrations = [
            config.integrations.jira.enabled,
            config.integrations.confluence.enabled,
            config.integrations.gamma.enabled
        ].filter(Boolean).length;

        if (enabledIntegrations === 0) {
            recommendations.push('Consider enabling integrations (Jira, Confluence, or Gamma) for enhanced collaboration');
        }

        // MCP recommendations
        if (!config.mcp.enabled) {
            recommendations.push('Enable MCP server for AI agent integration capabilities');
        }

        return recommendations;
    }
}

/**
 * Validation Result Interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate and throw if invalid.
 */
export async function validateConfigOrThrow(config: AICommandCenterConfig, logger: Logger): Promise<void> {
    const validator = new ConfigValidator(logger);
    const result = validator.validate(config);

    if (!result.isValid) {
        const errorMessage = `Configuration validation failed:\n${result.errors.join('\n')}`;
        
        await ErrorHandler.handleError(
            new UserError(errorMessage),
            'validateConfigOrThrow'
        );

        throw new UserError(errorMessage);
    }

    if (result.warnings.length > 0) {
        logger.warn('Configuration validation warnings', {
            component: 'ConfigValidator',
            warnings: result.warnings
        });
    }
}
