/**
 * Integration Manager
 * 
 * Generic coordinator for multiple external service integrations.
 * Provides unified interface for:
 * - Managing integration lifecycle (initialize, connect, disconnect)
 * - Coordinating multi-step workflows across integrations
 * - Health monitoring and status reporting
 * - Configuration management
 * - Event propagation
 */

import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { ConfigManager } from '../configManager';
import { SecretsManager } from '../services/secretsManager';
import { PlanningManager } from '../planning/planningManager';
import { WorkspaceManager } from '../planning/workspaceManager';
import { logger } from '../logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type IntegrationType = 'jira' | 'confluence' | 'gamma' | 'github';

export type IntegrationStatus = 
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error'
    | 'disabled';

export interface IntegrationConfig {
    /** Whether this integration is enabled */
    enabled: boolean;
    
    /** Integration-specific configuration */
    config: Record<string, any>;
    
    /** Auto-sync settings */
    autoSync?: {
        enabled: boolean;
        intervalMinutes: number;
    };
}

export interface IntegrationState {
    /** Current connection status */
    status: IntegrationStatus;
    
    /** Last error message (if status is 'error') */
    lastError?: string;
    
    /** Last successful connection timestamp */
    lastConnected?: Date;
    
    /** Last sync timestamp */
    lastSync?: Date;
    
    /** Whether a sync is currently in progress */
    syncing: boolean;
}

export interface IntegrationInfo {
    type: IntegrationType;
    name: string;
    description: string;
    icon: string;
    state: IntegrationState;
    config: IntegrationConfig;
}

export interface SyncOptions {
    /** Direction of sync */
    direction: 'push' | 'pull' | 'bidirectional';
    
    /** Only sync items modified since this date */
    since?: Date;
    
    /** Specific item IDs to sync */
    itemIds?: string[];
    
    /** Force full sync even if no changes detected */
    force?: boolean;
    
    /** Dry run - don't make actual changes */
    dryRun?: boolean;
}

export interface SyncResult {
    success: boolean;
    itemsSynced: number;
    itemsFailed: number;
    errors: string[];
    duration: number;
    timestamp: Date;
}

export interface WorkflowStep {
    integration: IntegrationType;
    action: string;
    params: Record<string, any>;
}

export interface WorkflowResult {
    success: boolean;
    stepsCompleted: number;
    stepsTotal: number;
    results: Array<{ step: WorkflowStep; success: boolean; result?: any; error?: string }>;
    duration: number;
}

// ============================================================================
// Integration Interface (implemented by each integration)
// ============================================================================

export interface IIntegration {
    /** Get integration type identifier */
    getType(): IntegrationType;
    
    /** Get display name */
    getName(): string;
    
    /** Get description */
    getDescription(): string;
    
    /** Get icon name */
    getIcon(): string;
    
    /** Initialize the integration */
    initialize(): Promise<boolean>;
    
    /** Test connection */
    testConnection(): Promise<{ success: boolean; message: string }>;
    
    /** Get current state */
    getState(): IntegrationState;
    
    /** Sync data with external service */
    sync(options: SyncOptions): Promise<SyncResult>;
    
    /** Execute a specific action */
    executeAction(action: string, params: Record<string, any>): Promise<any>;
    
    /** Get available actions */
    getAvailableActions(): string[];
    
    /** Dispose/cleanup */
    dispose(): void;
}

// ============================================================================
// Events
// ============================================================================

export interface IntegrationManagerEvents {
    'integration:registered': (type: IntegrationType) => void;
    'integration:unregistered': (type: IntegrationType) => void;
    'integration:statusChanged': (type: IntegrationType, status: IntegrationStatus) => void;
    'integration:connected': (type: IntegrationType) => void;
    'integration:disconnected': (type: IntegrationType) => void;
    'integration:error': (type: IntegrationType, error: string) => void;
    'sync:started': (type: IntegrationType) => void;
    'sync:completed': (type: IntegrationType, result: SyncResult) => void;
    'sync:failed': (type: IntegrationType, error: string) => void;
    'workflow:started': (name: string) => void;
    'workflow:completed': (name: string, result: WorkflowResult) => void;
    'workflow:failed': (name: string, error: string) => void;
}

// ============================================================================
// Integration Manager Implementation
// ============================================================================

export class IntegrationManager extends EventEmitter {
    private static instance: IntegrationManager | null = null;
    
    private configManager: ConfigManager;
    
    /** Secrets manager - stored for future integration use */
    // @ts-ignore - stored for future use
    private _secretsManager: SecretsManager;
    
    /** Planning manager - stored for future integration use */
    // @ts-ignore - stored for future use
    private _planningManager: PlanningManager;
    
    /** Workspace manager - stored for future integration use */
    // @ts-ignore - stored for future use
    private _workspaceManager: WorkspaceManager;
    
    /** Extension context - stored for future integration use */
    // @ts-ignore - stored for future use
    private _context: vscode.ExtensionContext;
    
    /** Registered integrations */
    private integrations: Map<IntegrationType, IIntegration> = new Map();
    
    /** Integration states */
    private states: Map<IntegrationType, IntegrationState> = new Map();
    
    /** Auto-sync timers */
    private autoSyncTimers: Map<IntegrationType, NodeJS.Timeout> = new Map();
    
    /** Initialization state */
    private initialized: boolean = false;

    // ========================================================================
    // Constructor & Singleton
    // ========================================================================

    private constructor(
        context: vscode.ExtensionContext,
        configManager: ConfigManager,
        secretsManager: SecretsManager,
        planningManager: PlanningManager,
        workspaceManager: WorkspaceManager
    ) {
        super();
        this._context = context;
        this.configManager = configManager;
        this._secretsManager = secretsManager;
        this._planningManager = planningManager;
        this._workspaceManager = workspaceManager;
        
        logger.info('IntegrationManager created', { component: 'IntegrationManager' });
    }

    /**
     * Get singleton instance
     */
    public static getInstance(
        context?: vscode.ExtensionContext,
        configManager?: ConfigManager,
        secretsManager?: SecretsManager,
        planningManager?: PlanningManager,
        workspaceManager?: WorkspaceManager
    ): IntegrationManager {
        if (!IntegrationManager.instance) {
            if (!context || !configManager || !secretsManager || !planningManager || !workspaceManager) {
                throw new Error('IntegrationManager not initialized. Provide all dependencies on first call.');
            }
            IntegrationManager.instance = new IntegrationManager(
                context,
                configManager,
                secretsManager,
                planningManager,
                workspaceManager
            );
        }
        return IntegrationManager.instance;
    }

    /**
     * Reset singleton (for testing)
     */
    public static resetInstance(): void {
        if (IntegrationManager.instance) {
            IntegrationManager.instance.dispose();
            IntegrationManager.instance = null;
        }
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize all enabled integrations
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            logger.warn('IntegrationManager already initialized', { component: 'IntegrationManager' });
            return;
        }

        logger.info('Initializing IntegrationManager', { component: 'IntegrationManager' });

        // Initialize each registered integration
        for (const [type, integration] of this.integrations) {
            try {
                const config = this.getIntegrationConfig(type);
                
                if (!config.enabled) {
                    this.updateState(type, { status: 'disabled', syncing: false });
                    continue;
                }

                this.updateState(type, { status: 'connecting', syncing: false });
                
                const success = await integration.initialize();
                
                if (success) {
                    this.updateState(type, { 
                        status: 'connected', 
                        syncing: false,
                        lastConnected: new Date()
                    });
                    this.emit('integration:connected', type);
                    
                    // Start auto-sync if enabled
                    this.startAutoSync(type);
                } else {
                    this.updateState(type, { 
                        status: 'error', 
                        syncing: false,
                        lastError: 'Initialization failed'
                    });
                }
            } catch (error: any) {
                logger.error('Failed to initialize integration', {
                    component: 'IntegrationManager',
                    type,
                    error: error.message
                });
                
                this.updateState(type, { 
                    status: 'error', 
                    syncing: false,
                    lastError: error.message
                });
                this.emit('integration:error', type, error.message);
            }
        }

        this.initialized = true;
        logger.info('IntegrationManager initialized', {
            component: 'IntegrationManager',
            integrationCount: this.integrations.size
        });
    }

    // ========================================================================
    // Integration Registration
    // ========================================================================

    /**
     * Register an integration
     */
    registerIntegration(integration: IIntegration): void {
        const type = integration.getType();
        
        if (this.integrations.has(type)) {
            logger.warn('Integration already registered, replacing', {
                component: 'IntegrationManager',
                type
            });
            this.unregisterIntegration(type);
        }

        this.integrations.set(type, integration);
        this.states.set(type, {
            status: 'disconnected',
            syncing: false
        });

        logger.info('Integration registered', {
            component: 'IntegrationManager',
            type,
            name: integration.getName()
        });

        this.emit('integration:registered', type);
    }

    /**
     * Unregister an integration
     */
    unregisterIntegration(type: IntegrationType): void {
        const integration = this.integrations.get(type);
        
        if (integration) {
            this.stopAutoSync(type);
            integration.dispose();
            this.integrations.delete(type);
            this.states.delete(type);

            logger.info('Integration unregistered', {
                component: 'IntegrationManager',
                type
            });

            this.emit('integration:unregistered', type);
        }
    }

    /**
     * Get registered integration
     */
    getIntegration(type: IntegrationType): IIntegration | undefined {
        return this.integrations.get(type);
    }

    /**
     * Get all registered integrations
     */
    getAllIntegrations(): IIntegration[] {
        return Array.from(this.integrations.values());
    }

    /**
     * Check if integration is registered
     */
    hasIntegration(type: IntegrationType): boolean {
        return this.integrations.has(type);
    }

    // ========================================================================
    // Status & State
    // ========================================================================

    /**
     * Get integration state
     */
    getState(type: IntegrationType): IntegrationState | undefined {
        return this.states.get(type);
    }

    /**
     * Get all integration info
     */
    getAllIntegrationInfo(): IntegrationInfo[] {
        const result: IntegrationInfo[] = [];

        for (const [type, integration] of this.integrations) {
            result.push({
                type,
                name: integration.getName(),
                description: integration.getDescription(),
                icon: integration.getIcon(),
                state: this.states.get(type) || { status: 'disconnected', syncing: false },
                config: this.getIntegrationConfig(type)
            });
        }

        return result;
    }

    /**
     * Update integration state
     */
    private updateState(type: IntegrationType, updates: Partial<IntegrationState>): void {
        const currentState = this.states.get(type) || { status: 'disconnected', syncing: false };
        const newState = { ...currentState, ...updates };
        
        this.states.set(type, newState);

        if (updates.status && updates.status !== currentState.status) {
            this.emit('integration:statusChanged', type, updates.status);
        }
    }

    /**
     * Get integration configuration from config manager
     */
    private getIntegrationConfig(type: IntegrationType): IntegrationConfig {
        const config = this.configManager.getConfig();
        const integrations = config.integrations as Record<string, any> | undefined;
        const integrationConfig = integrations?.[type];

        return {
            enabled: integrationConfig?.enabled || false,
            config: integrationConfig || {},
            autoSync: integrationConfig?.autoSync
        };
    }

    // ========================================================================
    // Connection Management
    // ========================================================================

    /**
     * Connect to an integration
     */
    async connect(type: IntegrationType): Promise<boolean> {
        const integration = this.integrations.get(type);
        
        if (!integration) {
            throw new Error(`Integration not registered: ${type}`);
        }

        try {
            this.updateState(type, { status: 'connecting' });

            const success = await integration.initialize();

            if (success) {
                const testResult = await integration.testConnection();
                
                if (testResult.success) {
                    this.updateState(type, {
                        status: 'connected',
                        lastConnected: new Date(),
                        lastError: undefined
                    });
                    this.emit('integration:connected', type);
                    this.startAutoSync(type);
                    return true;
                } else {
                    throw new Error(testResult.message);
                }
            } else {
                throw new Error('Initialization failed');
            }
        } catch (error: any) {
            logger.error('Failed to connect integration', {
                component: 'IntegrationManager',
                type,
                error: error.message
            });

            this.updateState(type, {
                status: 'error',
                lastError: error.message
            });
            this.emit('integration:error', type, error.message);
            return false;
        }
    }

    /**
     * Disconnect from an integration
     */
    disconnect(type: IntegrationType): void {
        this.stopAutoSync(type);
        this.updateState(type, { status: 'disconnected' });
        this.emit('integration:disconnected', type);

        logger.info('Integration disconnected', {
            component: 'IntegrationManager',
            type
        });
    }

    /**
     * Test connection for an integration
     */
    async testConnection(type: IntegrationType): Promise<{ success: boolean; message: string }> {
        const integration = this.integrations.get(type);
        
        if (!integration) {
            return { success: false, message: `Integration not registered: ${type}` };
        }

        return integration.testConnection();
    }

    // ========================================================================
    // Sync Operations
    // ========================================================================

    /**
     * Sync a specific integration
     */
    async sync(type: IntegrationType, options: Partial<SyncOptions> = {}): Promise<SyncResult> {
        const integration = this.integrations.get(type);
        
        if (!integration) {
            throw new Error(`Integration not registered: ${type}`);
        }

        const state = this.states.get(type);
        if (state?.syncing) {
            throw new Error(`Sync already in progress for ${type}`);
        }

        const startTime = Date.now();
        const fullOptions: SyncOptions = {
            direction: 'bidirectional',
            force: false,
            dryRun: false,
            ...options
        };

        try {
            this.updateState(type, { syncing: true });
            this.emit('sync:started', type);

            logger.info('Starting sync', {
                component: 'IntegrationManager',
                type,
                options: fullOptions
            });

            const result = await integration.sync(fullOptions);

            this.updateState(type, {
                syncing: false,
                lastSync: new Date()
            });

            this.emit('sync:completed', type, result);

            logger.info('Sync completed', {
                component: 'IntegrationManager',
                type,
                itemsSynced: result.itemsSynced,
                itemsFailed: result.itemsFailed,
                durationMs: result.duration
            });

            return result;
        } catch (error: any) {
            this.updateState(type, { syncing: false });
            this.emit('sync:failed', type, error.message);

            logger.error('Sync failed', {
                component: 'IntegrationManager',
                type,
                error: error.message
            });

            return {
                success: false,
                itemsSynced: 0,
                itemsFailed: 0,
                errors: [error.message],
                duration: Date.now() - startTime,
                timestamp: new Date()
            };
        }
    }

    /**
     * Sync all connected integrations
     */
    async syncAll(options: Partial<SyncOptions> = {}): Promise<Map<IntegrationType, SyncResult>> {
        const results = new Map<IntegrationType, SyncResult>();

        for (const [type, _] of this.integrations) {
            const state = this.states.get(type);
            
            if (state?.status === 'connected') {
                try {
                    const result = await this.sync(type, options);
                    results.set(type, result);
                } catch (error: any) {
                    results.set(type, {
                        success: false,
                        itemsSynced: 0,
                        itemsFailed: 0,
                        errors: [error.message],
                        duration: 0,
                        timestamp: new Date()
                    });
                }
            }
        }

        return results;
    }

    // ========================================================================
    // Auto-Sync
    // ========================================================================

    /**
     * Start auto-sync for an integration
     */
    private startAutoSync(type: IntegrationType): void {
        const config = this.getIntegrationConfig(type);
        
        if (!config.autoSync?.enabled) {
            return;
        }

        this.stopAutoSync(type); // Clear any existing timer

        const intervalMs = config.autoSync.intervalMinutes * 60 * 1000;
        
        const timer = setInterval(async () => {
            const state = this.states.get(type);
            
            if (state?.status === 'connected' && !state.syncing) {
                try {
                    await this.sync(type, { direction: 'bidirectional' });
                } catch (error: any) {
                    logger.error('Auto-sync failed', {
                        component: 'IntegrationManager',
                        type,
                        error: error.message
                    });
                }
            }
        }, intervalMs);

        this.autoSyncTimers.set(type, timer);

        logger.info('Auto-sync started', {
            component: 'IntegrationManager',
            type,
            intervalMinutes: config.autoSync.intervalMinutes
        });
    }

    /**
     * Stop auto-sync for an integration
     */
    private stopAutoSync(type: IntegrationType): void {
        const timer = this.autoSyncTimers.get(type);
        
        if (timer) {
            clearInterval(timer);
            this.autoSyncTimers.delete(type);

            logger.info('Auto-sync stopped', {
                component: 'IntegrationManager',
                type
            });
        }
    }

    // ========================================================================
    // Workflow Execution
    // ========================================================================

    /**
     * Execute a multi-step workflow across integrations
     */
    async executeWorkflow(name: string, steps: WorkflowStep[]): Promise<WorkflowResult> {
        const startTime = Date.now();
        const results: WorkflowResult['results'] = [];

        logger.info('Starting workflow', {
            component: 'IntegrationManager',
            name,
            stepCount: steps.length
        });

        this.emit('workflow:started', name);

        for (const step of steps) {
            const integration = this.integrations.get(step.integration);
            
            if (!integration) {
                results.push({
                    step,
                    success: false,
                    error: `Integration not registered: ${step.integration}`
                });
                continue;
            }

            try {
                const result = await integration.executeAction(step.action, step.params);
                results.push({ step, success: true, result });
            } catch (error: any) {
                results.push({ step, success: false, error: error.message });
                
                // Stop workflow on first failure
                logger.error('Workflow step failed', {
                    component: 'IntegrationManager',
                    name,
                    step,
                    error: error.message
                });
                break;
            }
        }

        const workflowResult: WorkflowResult = {
            success: results.every(r => r.success),
            stepsCompleted: results.filter(r => r.success).length,
            stepsTotal: steps.length,
            results,
            duration: Date.now() - startTime
        };

        if (workflowResult.success) {
            this.emit('workflow:completed', name, workflowResult);
            logger.info('Workflow completed', {
                component: 'IntegrationManager',
                name,
                stepsCompleted: workflowResult.stepsCompleted,
                durationMs: workflowResult.duration
            });
        } else {
            const failedStep = results.find(r => !r.success);
            this.emit('workflow:failed', name, failedStep?.error || 'Unknown error');
        }

        return workflowResult;
    }

    // ========================================================================
    // Action Execution
    // ========================================================================

    /**
     * Execute an action on a specific integration
     */
    async executeAction(
        type: IntegrationType,
        action: string,
        params: Record<string, any>
    ): Promise<any> {
        const integration = this.integrations.get(type);
        
        if (!integration) {
            throw new Error(`Integration not registered: ${type}`);
        }

        const state = this.states.get(type);
        if (state?.status !== 'connected') {
            throw new Error(`Integration not connected: ${type}`);
        }

        logger.info('Executing integration action', {
            component: 'IntegrationManager',
            type,
            action
        });

        return integration.executeAction(action, params);
    }

    /**
     * Get available actions for an integration
     */
    getAvailableActions(type: IntegrationType): string[] {
        const integration = this.integrations.get(type);
        return integration?.getAvailableActions() || [];
    }

    // ========================================================================
    // Health & Metrics
    // ========================================================================

    /**
     * Get health status of all integrations
     */
    async getHealthStatus(): Promise<Map<IntegrationType, { healthy: boolean; message: string }>> {
        const status = new Map<IntegrationType, { healthy: boolean; message: string }>();

        for (const [type, integration] of this.integrations) {
            const state = this.states.get(type);
            
            if (state?.status === 'disabled') {
                status.set(type, { healthy: true, message: 'Disabled' });
                continue;
            }

            if (state?.status !== 'connected') {
                status.set(type, { 
                    healthy: false, 
                    message: state?.lastError || 'Not connected' 
                });
                continue;
            }

            try {
                const testResult = await integration.testConnection();
                status.set(type, { 
                    healthy: testResult.success, 
                    message: testResult.message 
                });
            } catch (error: any) {
                status.set(type, { healthy: false, message: error.message });
            }
        }

        return status;
    }

    // ========================================================================
    // Lifecycle
    // ========================================================================

    /**
     * Dispose all integrations and cleanup
     */
    dispose(): void {
        logger.info('Disposing IntegrationManager', { component: 'IntegrationManager' });

        // Stop all auto-sync timers
        for (const [type, _] of this.autoSyncTimers) {
            this.stopAutoSync(type);
        }

        // Dispose all integrations
        for (const [type, integration] of this.integrations) {
            try {
                integration.dispose();
            } catch (error: any) {
                logger.error('Error disposing integration', {
                    component: 'IntegrationManager',
                    type,
                    error: error.message
                });
            }
        }

        this.integrations.clear();
        this.states.clear();
        this.removeAllListeners();
        this.initialized = false;

        logger.info('IntegrationManager disposed', { component: 'IntegrationManager' });
    }
}

// ============================================================================
// Export
// ============================================================================

export default IntegrationManager;
