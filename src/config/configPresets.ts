import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { Logger } from '../logger';
import { AICommandCenterConfig } from '../types/config';
import { ErrorHandler } from '../errorHandler';
import { SystemError } from '../errors/customErrors';

/**
 * Configuration Presets - Pre-defined configuration templates.
 */
export class ConfigPresets {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Get preset by name.
     */
    public getPreset(presetName: PresetName): AICommandCenterConfig {
        const presets: Record<PresetName, AICommandCenterConfig> = {
            minimal: this.getMinimalPreset(),
            development: this.getDevelopmentPreset(),
            production: this.getProductionPreset(),
            enterprise: this.getEnterprisePreset()
        };

        return presets[presetName];
    }

    /**
     * Minimal preset - Bare minimum configuration.
     */
    private getMinimalPreset(): AICommandCenterConfig {
        return {
            planning: {
                planPath: '.aicc',
                autoSaveInterval: 0,
                storyPointScale: 'fibonacci',
                sprintDurationWeeks: 2
            },
            logging: {
                level: 'warn',
                fileLoggingEnabled: false,
                retentionDays: 7,
                maxFileSizeMB: 10
            },
            integrations: {
                jira: {
                    enabled: false,
                    baseUrl: '',
                    email: '',
                    apiToken: '',
                    projectKey: '',
                    syncStrategy: 'bidirectional' as const,
                    conflictResolution: 'manual' as const,
                    autoSync: false,
                    syncInterval: 15,
                    webhookEnabled: false
                },
                confluence: {
                    enabled: false,
                    baseUrl: ''
                },
                gamma: {
                    enabled: false,
                    apiKey: ''
                }
            },
            mcp: {
                enabled: false,
                transport: 'stdio',
                port: 3000,
                logging: { enabled: true, level: 'info' as const },
                tools: { enabled: true, timeout: 30000 },
                resources: { enabled: true, cacheSize: 100 },
                prompts: { enabled: true }
            },
            ui: {
                showWelcomeMessage: false,
                theme: 'auto',
                confirmDelete: false
            },
            performance: {
                activationTimeoutMs: 500,
                apiTimeoutMs: 5000,
                trackPerformance: false
            }
        };
    }

    /**
     * Development preset - Optimized for development.
     */
    private getDevelopmentPreset(): AICommandCenterConfig {
        return {
            planning: {
                planPath: '.aicc',
                autoSaveInterval: 30000, // 30 seconds
                storyPointScale: 'fibonacci',
                sprintDurationWeeks: 2
            },
            logging: {
                level: 'debug',
                fileLoggingEnabled: true,
                retentionDays: 7,
                maxFileSizeMB: 50
            },
            integrations: {
                jira: {
                    enabled: false,
                    baseUrl: '',
                    email: '',
                    apiToken: '',
                    projectKey: '',
                    syncStrategy: 'bidirectional' as const,
                    conflictResolution: 'manual' as const,
                    autoSync: false,
                    syncInterval: 15,
                    webhookEnabled: false
                },
                confluence: {
                    enabled: false,
                    baseUrl: ''
                },
                gamma: {
                    enabled: false,
                    apiKey: ''
                }
            },
            mcp: {
                enabled: true,
                transport: 'stdio' as const,
                port: 3000,
                logging: {
                    enabled: true,
                    level: 'debug' as const
                },
                tools: {
                    enabled: true,
                    timeout: 30000
                },
                resources: {
                    enabled: true,
                    cacheSize: 100
                },
                prompts: {
                    enabled: true
                }
            },
            ui: {
                showWelcomeMessage: true,
                theme: 'auto',
                confirmDelete: true
            },
            performance: {
                activationTimeoutMs: 1000,
                apiTimeoutMs: 10000,
                trackPerformance: true
            }
        };
    }

    /**
     * Production preset - Optimized for production use.
     */
    private getProductionPreset(): AICommandCenterConfig {
        return {
            planning: {
                planPath: '.aicc',
                autoSaveInterval: 60000, // 1 minute
                storyPointScale: 'fibonacci',
                sprintDurationWeeks: 2
            },
            logging: {
                level: 'info',
                fileLoggingEnabled: true,
                retentionDays: 30,
                maxFileSizeMB: 20
            },
            integrations: {
                jira: {
                    enabled: false,
                    baseUrl: '',
                    email: '',
                    apiToken: '',
                    projectKey: '',
                    syncStrategy: 'bidirectional' as const,
                    conflictResolution: 'manual' as const,
                    autoSync: false,
                    syncInterval: 15,
                    webhookEnabled: false
                },
                confluence: {
                    enabled: false,
                    baseUrl: ''
                },
                gamma: {
                    enabled: false,
                    apiKey: ''
                }
            },
            mcp: {
                enabled: true,
                transport: 'stdio' as const,
                port: 3000,
                logging: {
                    enabled: true,
                    level: 'debug' as const
                },
                tools: {
                    enabled: true,
                    timeout: 30000
                },
                resources: {
                    enabled: true,
                    cacheSize: 100
                },
                prompts: {
                    enabled: true
                }
            },
            ui: {
                showWelcomeMessage: true,
                theme: 'auto',
                confirmDelete: true
            },
            performance: {
                activationTimeoutMs: 500,
                apiTimeoutMs: 5000,
                trackPerformance: true
            }
        };
    }

    /**
     * Enterprise preset - Full features for enterprise use.
     */
    private getEnterprisePreset(): AICommandCenterConfig {
        return {
            planning: {
                planPath: '.aicc',
                autoSaveInterval: 60000, // 1 minute
                storyPointScale: 'fibonacci',
                sprintDurationWeeks: 2
            },
            logging: {
                level: 'info',
                fileLoggingEnabled: true,
                retentionDays: 90,
                maxFileSizeMB: 50
            },
            integrations: {
                jira: {
                    enabled: true,
                    baseUrl: 'https://your-domain.atlassian.net',
                    email: 'user@example.com',
                    apiToken: 'your-api-token',
                    projectKey: 'PROJ',
                    syncStrategy: 'bidirectional' as const,
                    conflictResolution: 'manual' as const,
                    autoSync: true,
                    syncInterval: 15,
                    webhookEnabled: true,
                    webhookSecret: 'your-webhook-secret'
                },
                confluence: {
                    enabled: true,
                    baseUrl: 'https://your-company.atlassian.net/wiki'
                },
                gamma: {
                    enabled: false,
                    apiKey: ''
                }
            },
            mcp: {
                enabled: true,
                transport: 'http',
                port: 3000,
                logging: { enabled: true, level: 'info' as const },
                tools: { enabled: true, timeout: 30000 },
                resources: { enabled: true, cacheSize: 100 },
                prompts: { enabled: true }
            },
            ui: {
                showWelcomeMessage: true,
                theme: 'auto',
                confirmDelete: true
            },
            performance: {
                activationTimeoutMs: 500,
                apiTimeoutMs: 10000,
                trackPerformance: true
            }
        };
    }

    /**
     * Save preset to file.
     */
    public async savePreset(
        presetName: PresetName,
        targetPath: string
    ): Promise<void> {
        try {
            const preset = this.getPreset(presetName);
            const yamlContent = yaml.dump(preset, {
                indent: 2,
                lineWidth: -1,
                noRefs: true
            });

            await fs.writeFile(targetPath, yamlContent, 'utf8');

            this.logger.info('Preset saved to file', {
                component: 'ConfigPresets',
                presetName,
                targetPath
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'ConfigPresets.savePreset'
            );
            throw new SystemError('Failed to save preset', error instanceof Error ? error : undefined);
        }
    }

    /**
     * List available presets.
     */
    public listPresets(): PresetInfo[] {
        return [
            {
                name: 'minimal',
                description: 'Bare minimum configuration with minimal features',
                features: ['Basic planning', 'Minimal logging', 'No integrations']
            },
            {
                name: 'development',
                description: 'Development-friendly configuration with debug logging',
                features: ['Debug logging', 'Auto-save', 'Performance tracking', 'MCP enabled']
            },
            {
                name: 'production',
                description: 'Production-ready configuration with balanced settings',
                features: ['Info logging', 'Auto-save', 'Performance tracking', '30-day retention']
            },
            {
                name: 'enterprise',
                description: 'Enterprise configuration with all integrations',
                features: ['All integrations enabled', 'Extended logging', 'MCP HTTP', '90-day retention']
            }
        ];
    }

    /**
     * Get preset comparison.
     */
    public comparePresets(preset1: PresetName, preset2: PresetName): PresetComparison {
        const config1 = this.getPreset(preset1);
        const config2 = this.getPreset(preset2);

        return {
            preset1,
            preset2,
            differences: this.findDifferences(config1, config2)
        };
    }

    /**
     * Find differences between two configurations.
     */
    private findDifferences(
        config1: AICommandCenterConfig,
        config2: AICommandCenterConfig
    ): ConfigDifference[] {
        const differences: ConfigDifference[] = [];

        // Compare logging levels
        if (config1.logging.level !== config2.logging.level) {
            differences.push({
                path: 'logging.level',
                value1: config1.logging.level,
                value2: config2.logging.level
            });
        }

        // Compare auto-save intervals
        if (config1.planning.autoSaveInterval !== config2.planning.autoSaveInterval) {
            differences.push({
                path: 'planning.autoSaveInterval',
                value1: config1.planning.autoSaveInterval,
                value2: config2.planning.autoSaveInterval
            });
        }

        // Add more comparisons as needed...

        return differences;
    }
}

/**
 * Preset Types
 */
export type PresetName = 'minimal' | 'development' | 'production' | 'enterprise';

export interface PresetInfo {
    name: PresetName;
    description: string;
    features: string[];
}

export interface PresetComparison {
    preset1: PresetName;
    preset2: PresetName;
    differences: ConfigDifference[];
}

export interface ConfigDifference {
    path: string;
    value1: any;
    value2: any;
}
