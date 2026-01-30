import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Agent information detected from installed extensions
 */
export interface AgentInfo {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly isActive: boolean;
    readonly extensionId: string;
}

/**
 * Callback invoked when agent status changes
 */
export type AgentChangeCallback = (agents: AgentInfo[]) => void;

/**
 * Configuration for AgentDetector
 */
export interface AgentDetectorConfig {
    pollingInterval?: number; // milliseconds, default 30000 (30 seconds)
    enableAutoDetection?: boolean; // default true
    watchedExtensions?: string[]; // default ['GitHub.copilot-chat']
}

/**
 * AgentDetector monitors installed VS Code extensions to detect AI agents
 * such as GitHub Copilot Chat and notifies listeners of changes.
 * 
 * Requirements: Section 4.1
 */
export class AgentDetector implements vscode.Disposable {
    private readonly logger: Logger;
    private readonly config: Required<AgentDetectorConfig>;
    private readonly callbacks: Set<AgentChangeCallback> = new Set();
    private pollingTimer?: NodeJS.Timeout;
    private lastKnownAgents: AgentInfo[] = [];
    private disposables: vscode.Disposable[] = [];

    constructor(config: AgentDetectorConfig = {}) {
        this.logger = Logger.getInstance();
        this.config = {
            pollingInterval: config.pollingInterval ?? 30000,
            enableAutoDetection: config.enableAutoDetection ?? true,
            watchedExtensions: config.watchedExtensions ?? ['GitHub.copilot-chat']
        };

        this.logger.info('AgentDetector initialized', {
            pollingInterval: this.config.pollingInterval,
            watchedExtensions: this.config.watchedExtensions
        });

        // Initial detection
        this.detectAgents();

        // Start polling if enabled
        if (this.config.enableAutoDetection) {
            this.startPolling();
        }

        // Watch for extension installation/uninstallation
        this.disposables.push(
            vscode.extensions.onDidChange(() => {
                this.logger.debug('Extension change detected, triggering agent detection');
                this.detectAgents();
            })
        );
    }

    /**
     * Register a callback to be notified when agent status changes
     */
    public onChange(callback: AgentChangeCallback): vscode.Disposable {
        this.callbacks.add(callback);
        this.logger.debug('Agent change callback registered', {
            callbackCount: this.callbacks.size
        });

        // Immediately notify with current state
        callback(this.lastKnownAgents);

        // Return disposable to allow unregistration
        return new vscode.Disposable(() => {
            this.callbacks.delete(callback);
            this.logger.debug('Agent change callback unregistered', {
                callbackCount: this.callbacks.size
            });
        });
    }

    /**
     * Manually trigger agent detection (useful for debugging or user-initiated refresh)
     */
    public async refresh(): Promise<AgentInfo[]> {
        this.logger.info('Manual agent refresh triggered');
        return this.detectAgents();
    }

    /**
     * Get currently detected agents without triggering detection
     */
    public getAgents(): readonly AgentInfo[] {
        return [...this.lastKnownAgents];
    }

    /**
     * Check if a specific agent is currently active
     */
    public isAgentActive(extensionId: string): boolean {
        return this.lastKnownAgents.some(
            agent => agent.extensionId === extensionId && agent.isActive
        );
    }

    /**
     * Detect installed agents by scanning extensions
     */
    private detectAgents(): AgentInfo[] {
        const detectedAgents: AgentInfo[] = [];

        for (const extensionId of this.config.watchedExtensions) {
            const extension = vscode.extensions.getExtension(extensionId);
            
            if (extension) {
                const agentInfo: AgentInfo = {
                    id: extensionId.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
                    name: extension.packageJSON?.displayName || extensionId,
                    version: extension.packageJSON?.version || 'unknown',
                    isActive: extension.isActive,
                    extensionId: extensionId
                };

                detectedAgents.push(agentInfo);
                
                this.logger.debug('Agent detected', {
                    extensionId,
                    name: agentInfo.name,
                    version: agentInfo.version,
                    isActive: agentInfo.isActive
                });
            } else {
                this.logger.debug('Agent extension not found', { extensionId });
            }
        }

        // Check if agents changed
        if (this.hasAgentsChanged(detectedAgents)) {
            this.logger.info('Agent status changed', {
                previous: this.lastKnownAgents.map(a => a.extensionId),
                current: detectedAgents.map(a => a.extensionId)
            });

            this.lastKnownAgents = detectedAgents;
            this.notifyCallbacks(detectedAgents);
        }

        return detectedAgents;
    }

    /**
     * Compare current agents with previously detected agents
     */
    private hasAgentsChanged(newAgents: AgentInfo[]): boolean {
        if (newAgents.length !== this.lastKnownAgents.length) {
            return true;
        }

        // Check if any agent status changed
        for (const newAgent of newAgents) {
            const oldAgent = this.lastKnownAgents.find(a => a.extensionId === newAgent.extensionId);
            if (!oldAgent || 
                oldAgent.version !== newAgent.version ||
                oldAgent.isActive !== newAgent.isActive) {
                return true;
            }
        }

        return false;
    }

    /**
     * Notify all registered callbacks
     */
    private notifyCallbacks(agents: AgentInfo[]): void {
        this.callbacks.forEach(callback => {
            try {
                callback(agents);
            } catch (error) {
                this.logger.error('Error in agent change callback', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }

    /**
     * Start polling for agent changes
     */
    private startPolling(): void {
        if (this.pollingTimer) {
            return; // Already polling
        }

        this.logger.debug('Starting agent polling', {
            interval: this.config.pollingInterval
        });

        this.pollingTimer = setInterval(() => {
            this.detectAgents();
        }, this.config.pollingInterval);
    }

    /**
     * Stop polling for agent changes
     */
    private stopPolling(): void {
        if (this.pollingTimer) {
            this.logger.debug('Stopping agent polling');
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.logger.info('AgentDetector disposing');
        this.stopPolling();
        this.callbacks.clear();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
