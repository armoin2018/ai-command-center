/**
 * TypeScript interfaces for AI Command Center configuration.
 */

export interface PlanningConfig {
    planPath: string;
    autoSaveInterval: number;
    storyPointScale: 'fibonacci' | 'linear';
    sprintDurationWeeks: number;
}

export interface LoggingConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    fileLoggingEnabled: boolean;
    retentionDays: number;
    maxFileSizeMB: number;
}

export interface JiraConfig {
    enabled: boolean;
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
    syncStrategy: 'push' | 'pull' | 'bidirectional';
    conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'merge';
    autoSync: boolean;
    syncInterval: number; // minutes
    webhookEnabled: boolean;
    webhookSecret?: string;
}

export interface ConfluenceConfig {
    enabled: boolean;
    baseUrl: string;
}

export interface GammaConfig {
    enabled: boolean;
    apiKey: string;
}

export interface IntegrationsConfig {
    jira: JiraConfig;
    confluence: ConfluenceConfig;
    gamma: GammaConfig;
}

export interface MCPConfig {
    enabled: boolean;
    transport: 'stdio' | 'http' | 'https' | 'websocket';
    port?: number;
    logging: {
        enabled: boolean;
        level: 'debug' | 'info' | 'warn' | 'error';
    };
    tools: {
        enabled: boolean;
        timeout: number;
    };
    resources: {
        enabled: boolean;
        cacheSize: number;
    };
    prompts: {
        enabled: boolean;
    };
}

export interface UIConfig {
    showWelcomeMessage: boolean;
    theme: 'light' | 'dark' | 'auto';
    confirmDelete: boolean;
}

export interface PerformanceConfig {
    activationTimeoutMs: number;
    apiTimeoutMs: number;
    trackPerformance: boolean;
}

/**
 * Complete AI Command Center configuration interface.
 */
export interface AICommandCenterConfig {
    planning: PlanningConfig;
    logging: LoggingConfig;
    integrations: IntegrationsConfig;
    mcp: MCPConfig;
    ui: UIConfig;
    performance: PerformanceConfig;
}
