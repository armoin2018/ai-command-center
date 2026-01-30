/**
 * Secrets Management Service
 * 
 * Secure storage for API keys, tokens using VS Code SecretStorage API
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';

export interface SecretMetadata {
    key: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

export class SecretsManager {
    private context: vscode.ExtensionContext;
    private logger: Logger;
    private metadataKey = 'aicc.secrets.metadata';

    constructor(context: vscode.ExtensionContext, logger: Logger) {
        this.context = context;
        this.logger = logger;
    }

    /**
     * Store a secret securely
     */
    async store(key: string, value: string, metadata?: Partial<SecretMetadata>): Promise<void> {
        try {
            // Store the secret value
            await this.context.secrets.store(key, value);

            // Store metadata
            const allMetadata = await this.getAllMetadata();
            allMetadata[key] = {
                key,
                description: metadata?.description || '',
                createdAt: new Date(),
                updatedAt: new Date(),
                expiresAt: metadata?.expiresAt
            };
            await this.saveMetadata(allMetadata);

            this.logger.info('Secret stored', {
                component: 'SecretsManager',
                key
            });
        } catch (error) {
            this.logger.error('Failed to store secret', {
                component: 'SecretsManager',
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Retrieve a secret
     */
    async retrieve(key: string): Promise<string | undefined> {
        try {
            // Check if expired
            const metadata = await this.getMetadata(key);
            if (metadata?.expiresAt && metadata.expiresAt < new Date()) {
                this.logger.warn('Secret expired', {
                    component: 'SecretsManager',
                    key
                });
                await this.delete(key);
                return undefined;
            }

            const value = await this.context.secrets.get(key);
            
            if (value) {
                this.logger.info('Secret retrieved', {
                    component: 'SecretsManager',
                    key
                });
            }

            return value;
        } catch (error) {
            this.logger.error('Failed to retrieve secret', {
                component: 'SecretsManager',
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return undefined;
        }
    }

    /**
     * Delete a secret
     */
    async delete(key: string): Promise<void> {
        try {
            await this.context.secrets.delete(key);

            // Remove metadata
            const allMetadata = await this.getAllMetadata();
            delete allMetadata[key];
            await this.saveMetadata(allMetadata);

            this.logger.info('Secret deleted', {
                component: 'SecretsManager',
                key
            });
        } catch (error) {
            this.logger.error('Failed to delete secret', {
                component: 'SecretsManager',
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Update a secret
     */
    async update(key: string, value: string): Promise<void> {
        try {
            const metadata = await this.getMetadata(key);
            if (!metadata) {
                throw new Error(`Secret not found: ${key}`);
            }

            await this.context.secrets.store(key, value);

            // Update metadata
            const allMetadata = await this.getAllMetadata();
            allMetadata[key].updatedAt = new Date();
            await this.saveMetadata(allMetadata);

            this.logger.info('Secret updated', {
                component: 'SecretsManager',
                key
            });
        } catch (error) {
            this.logger.error('Failed to update secret', {
                component: 'SecretsManager',
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * List all secret keys
     */
    async listKeys(): Promise<string[]> {
        const metadata = await this.getAllMetadata();
        return Object.keys(metadata);
    }

    /**
     * Get metadata for a secret
     */
    async getMetadata(key: string): Promise<SecretMetadata | undefined> {
        const allMetadata = await this.getAllMetadata();
        return allMetadata[key];
    }

    /**
     * Check if a secret exists
     */
    async exists(key: string): Promise<boolean> {
        const value = await this.context.secrets.get(key);
        return value !== undefined;
    }

    /**
     * Rotate a secret (generate new value and update)
     */
    async rotate(key: string, newValue: string): Promise<void> {
        const oldValue = await this.retrieve(key);
        if (!oldValue) {
            throw new Error(`Secret not found: ${key}`);
        }

        // Store old value with rotated key
        const rotatedKey = `${key}.rotated.${Date.now()}`;
        await this.store(rotatedKey, oldValue, {
            description: `Rotated from ${key}`,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });

        // Update with new value
        await this.update(key, newValue);

        this.logger.info('Secret rotated', {
            component: 'SecretsManager',
            key,
            rotatedKey
        });
    }

    /**
     * Clean up expired secrets
     */
    async cleanupExpired(): Promise<number> {
        const allMetadata = await this.getAllMetadata();
        const now = new Date();
        let count = 0;

        for (const [key, metadata] of Object.entries(allMetadata)) {
            if (metadata.expiresAt && metadata.expiresAt < now) {
                await this.delete(key);
                count++;
            }
        }

        this.logger.info('Expired secrets cleaned up', {
            component: 'SecretsManager',
            count
        });

        return count;
    }

    /**
     * Export secrets (for backup - BE CAREFUL)
     */
    async exportSecrets(): Promise<{ [key: string]: string }> {
        const keys = await this.listKeys();
        const secrets: { [key: string]: string } = {};

        for (const key of keys) {
            const value = await this.retrieve(key);
            if (value) {
                secrets[key] = value;
            }
        }

        this.logger.warn('Secrets exported - handle with care!', {
            component: 'SecretsManager',
            count: Object.keys(secrets).length
        });

        return secrets;
    }

    /**
     * Import secrets (from backup)
     */
    async importSecrets(secrets: { [key: string]: string }, overwrite: boolean = false): Promise<number> {
        let count = 0;

        for (const [key, value] of Object.entries(secrets)) {
            const exists = await this.exists(key);
            
            if (!exists || overwrite) {
                await this.store(key, value, {
                    description: 'Imported from backup'
                });
                count++;
            }
        }

        this.logger.info('Secrets imported', {
            component: 'SecretsManager',
            count
        });

        return count;
    }

    /**
     * Get all metadata
     */
    private async getAllMetadata(): Promise<{ [key: string]: SecretMetadata }> {
        const json = this.context.globalState.get<string>(this.metadataKey, '{}');
        const data = JSON.parse(json);
        
        // Convert date strings back to Date objects
        for (const key in data) {
            data[key].createdAt = new Date(data[key].createdAt);
            data[key].updatedAt = new Date(data[key].updatedAt);
            if (data[key].expiresAt) {
                data[key].expiresAt = new Date(data[key].expiresAt);
            }
        }
        
        return data;
    }

    /**
     * Save all metadata
     */
    private async saveMetadata(metadata: { [key: string]: SecretMetadata }): Promise<void> {
        const json = JSON.stringify(metadata);
        await this.context.globalState.update(this.metadataKey, json);
    }

    /**
     * Show secret management UI
     */
    async showManagementUI(): Promise<void> {
        const keys = await this.listKeys();

        if (keys.length === 0) {
            vscode.window.showInformationMessage('No secrets stored');
            return;
        }

        const items = await Promise.all(keys.map(async (key) => {
            const metadata = await this.getMetadata(key);
            return {
                label: key,
                description: metadata?.description || '',
                detail: `Updated: ${metadata?.updatedAt.toLocaleString()}`,
                key
            };
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a secret to manage'
        });

        if (!selected) return;

        const action = await vscode.window.showQuickPick([
            { label: 'View Metadata', value: 'view' },
            { label: 'Update Value', value: 'update' },
            { label: 'Rotate', value: 'rotate' },
            { label: 'Delete', value: 'delete' }
        ], {
            placeHolder: `What would you like to do with ${selected.key}?`
        });

        if (!action) return;

        switch (action.value) {
            case 'view':
                const metadata = await this.getMetadata(selected.key);
                vscode.window.showInformationMessage(JSON.stringify(metadata, null, 2));
                break;

            case 'update':
                const newValue = await vscode.window.showInputBox({
                    prompt: 'Enter new secret value',
                    password: true
                });
                if (newValue) {
                    await this.update(selected.key, newValue);
                    vscode.window.showInformationMessage(`Secret "${selected.key}" updated`);
                }
                break;

            case 'rotate':
                const rotatedValue = await vscode.window.showInputBox({
                    prompt: 'Enter new secret value for rotation',
                    password: true
                });
                if (rotatedValue) {
                    await this.rotate(selected.key, rotatedValue);
                    vscode.window.showInformationMessage(`Secret "${selected.key}" rotated`);
                }
                break;

            case 'delete':
                const confirm = await vscode.window.showWarningMessage(
                    `Delete secret "${selected.key}"?`,
                    { modal: true },
                    'Delete'
                );
                if (confirm === 'Delete') {
                    await this.delete(selected.key);
                    vscode.window.showInformationMessage(`Secret "${selected.key}" deleted`);
                }
                break;
        }
    }
}
