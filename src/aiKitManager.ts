import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { Logger } from './logger';

const execAsync = promisify(exec);

/**
 * AI Kit repository configuration
 */
export interface AIKitRepository {
    readonly url: string;
    readonly branch?: string; // default 'main'
    readonly deployments: AIKitDeployment[];
}

/**
 * Deployment configuration for AI Kit files
 */
export interface AIKitDeployment {
    readonly source: string; // Path within repo (supports glob patterns)
    readonly target: string; // Target path in workspace
    readonly type: 'file' | 'directory';
    readonly replace?: boolean; // Replace existing files, default false
}

/**
 * Progress callback for clone/pull operations
 */
export type ProgressCallback = (message: string, increment?: number) => void;

/**
 * AI Kit manager configuration
 */
export interface AIKitManagerConfig {
    cacheDirectory?: string; // default {extension}/cache
    defaultBranch?: string; // default 'main'
    enableAutoUpdate?: boolean; // default false
    updateInterval?: number; // milliseconds, default 3600000 (1 hour)
}

/**
 * AIKitManager handles cloning, updating, and deploying AI Kit repositories
 * from GitHub to the workspace based on configuration.
 * 
 * Requirements: Section 3.1
 */
export class AIKitManager implements vscode.Disposable {
    private readonly logger: Logger;
    private readonly config: Required<AIKitManagerConfig>;
    private cacheBasePath: string;
    private repositories: Map<string, AIKitRepository> = new Map();
    private updateTimer?: NodeJS.Timeout;
    private disposables: vscode.Disposable[] = [];

    constructor(
        extensionContext: vscode.ExtensionContext,
        config: AIKitManagerConfig = {}
    ) {
        this.logger = Logger.getInstance();
        this.config = {
            cacheDirectory: config.cacheDirectory ?? 'cache',
            defaultBranch: config.defaultBranch ?? 'main',
            enableAutoUpdate: config.enableAutoUpdate ?? false,
            updateInterval: config.updateInterval ?? 3600000
        };

        // Initialize cache directory
        this.cacheBasePath = path.join(
            extensionContext.globalStorageUri.fsPath,
            this.config.cacheDirectory
        );

        this.logger.info('AIKitManager initialized', {
            cacheBasePath: this.cacheBasePath,
            enableAutoUpdate: this.config.enableAutoUpdate
        });

        // Create cache directory if it doesn't exist
        if (!fs.existsSync(this.cacheBasePath)) {
            fs.mkdirSync(this.cacheBasePath, { recursive: true });
        }

        // Start auto-update if enabled
        if (this.config.enableAutoUpdate) {
            this.startAutoUpdate();
        }
    }

    /**
     * Add an AI Kit repository to manage
     */
    public addRepository(name: string, repository: AIKitRepository): void {
        this.repositories.set(name, repository);
        this.logger.info('Added AI Kit repository', {
            name,
            url: repository.url,
            branch: repository.branch,
            deployments: repository.deployments.length
        });
    }

    /**
     * Clone or update a repository
     */
    public async syncRepository(
        name: string,
        progressCallback?: ProgressCallback
    ): Promise<void> {
        const repository = this.repositories.get(name);
        if (!repository) {
            throw new Error(`Repository '${name}' not found`);
        }

        const branch = repository.branch || this.config.defaultBranch;
        const repoPath = this.getRepositoryPath(name, branch);

        this.logger.info('Syncing repository', { name, url: repository.url, branch });

        try {
            if (fs.existsSync(repoPath)) {
                // Update existing repository
                await this.pullRepository(repoPath, branch, progressCallback);
            } else {
                // Clone new repository
                await this.cloneRepository(
                    repository.url,
                    repoPath,
                    branch,
                    progressCallback
                );
            }

            this.logger.info('Repository synced successfully', { name });
        } catch (error) {
            this.logger.error('Failed to sync repository', {
                name,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Deploy files from repository to workspace
     */
    public async deployRepository(
        name: string,
        progressCallback?: ProgressCallback
    ): Promise<void> {
        const repository = this.repositories.get(name);
        if (!repository) {
            throw new Error(`Repository '${name}' not found`);
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const branch = repository.branch || this.config.defaultBranch;
        const repoPath = this.getRepositoryPath(name, branch);

        if (!fs.existsSync(repoPath)) {
            throw new Error(`Repository '${name}' not cloned. Run sync first.`);
        }

        this.logger.info('Deploying repository', { name, deployments: repository.deployments.length });

        for (let i = 0; i < repository.deployments.length; i++) {
            const deployment = repository.deployments[i];
            
            if (progressCallback) {
                progressCallback(
                    `Deploying ${deployment.source}...`,
                    (i / repository.deployments.length) * 100
                );
            }

            await this.deployFiles(
                repoPath,
                workspacePath,
                deployment
            );
        }

        if (progressCallback) {
            progressCallback('Deployment complete', 100);
        }

        this.logger.info('Repository deployed successfully', { name });
    }

    /**
     * Sync and deploy in one operation
     */
    public async syncAndDeploy(
        name: string,
        progressCallback?: ProgressCallback
    ): Promise<void> {
        await this.syncRepository(name, progressCallback);
        await this.deployRepository(name, progressCallback);
    }

    /**
     * Clone a repository
     */
    private async cloneRepository(
        url: string,
        targetPath: string,
        branch: string,
        progressCallback?: ProgressCallback
    ): Promise<void> {
        if (progressCallback) {
            progressCallback('Cloning repository...');
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        const command = `git clone --branch ${branch} --single-branch "${url}" "${targetPath}"`;
        
        this.logger.debug('Executing git clone', { command });

        try {
            const { stdout, stderr } = await execAsync(command);
            this.logger.debug('Git clone output', { stdout, stderr });
            
            if (progressCallback) {
                progressCallback('Clone complete');
            }
        } catch (error) {
            this.logger.error('Git clone failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Pull updates for a repository
     */
    private async pullRepository(
        repoPath: string,
        branch: string,
        progressCallback?: ProgressCallback
    ): Promise<void> {
        if (progressCallback) {
            progressCallback('Pulling updates...');
        }

        const commands = [
            `cd "${repoPath}"`,
            `git fetch origin ${branch}`,
            `git reset --hard origin/${branch}`
        ];

        const command = commands.join(' && ');
        
        this.logger.debug('Executing git pull', { command });

        try {
            const { stdout, stderr } = await execAsync(command);
            this.logger.debug('Git pull output', { stdout, stderr });
            
            if (progressCallback) {
                progressCallback('Pull complete');
            }
        } catch (error) {
            this.logger.error('Git pull failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to pull repository: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Deploy files based on deployment configuration
     */
    private async deployFiles(
        repoPath: string,
        workspacePath: string,
        deployment: AIKitDeployment
    ): Promise<void> {
        const sourcePath = path.join(repoPath, deployment.source);
        const targetPath = path.join(workspacePath, deployment.target);

        this.logger.debug('Deploying files', {
            source: sourcePath,
            target: targetPath,
            type: deployment.type,
            replace: deployment.replace
        });

        // Check if source exists
        if (!fs.existsSync(sourcePath)) {
            this.logger.warn('Source path not found, skipping', { sourcePath });
            return;
        }

        // Handle file vs directory
        if (deployment.type === 'file') {
            await this.deployFile(sourcePath, targetPath, deployment.replace ?? false);
        } else {
            await this.deployDirectory(sourcePath, targetPath, deployment.replace ?? false);
        }
    }

    /**
     * Deploy a single file
     */
    private async deployFile(
        sourcePath: string,
        targetPath: string,
        replace: boolean
    ): Promise<void> {
        // Check if target exists
        if (fs.existsSync(targetPath) && !replace) {
            this.logger.info('Target file exists and replace=false, skipping', { targetPath });
            return;
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        // Copy file
        fs.copyFileSync(sourcePath, targetPath);
        
        this.logger.debug('File deployed', { source: sourcePath, target: targetPath });
    }

    /**
     * Deploy a directory
     */
    private async deployDirectory(
        sourcePath: string,
        targetPath: string,
        replace: boolean
    ): Promise<void> {
        // Check if target exists
        if (fs.existsSync(targetPath) && !replace) {
            this.logger.info('Target directory exists and replace=false, skipping', { targetPath });
            return;
        }

        // Create target directory
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        // Copy directory contents recursively
        this.copyDirectoryRecursive(sourcePath, targetPath, replace);
        
        this.logger.debug('Directory deployed', { source: sourcePath, target: targetPath });
    }

    /**
     * Recursively copy directory contents
     */
    private copyDirectoryRecursive(
        source: string,
        target: string,
        replace: boolean
    ): void {
        const files = fs.readdirSync(source);

        for (const file of files) {
            const sourcePath = path.join(source, file);
            const targetPath = path.join(target, file);
            const stat = fs.statSync(sourcePath);

            if (stat.isDirectory()) {
                // Skip .git directories
                if (file === '.git') {
                    continue;
                }

                // Create directory if it doesn't exist
                if (!fs.existsSync(targetPath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                }

                // Recurse
                this.copyDirectoryRecursive(sourcePath, targetPath, replace);
            } else {
                // Copy file if it doesn't exist or replace is true
                if (!fs.existsSync(targetPath) || replace) {
                    fs.copyFileSync(sourcePath, targetPath);
                }
            }
        }
    }

    /**
     * Get the local path for a repository
     */
    private getRepositoryPath(name: string, branch: string): string {
        return path.join(this.cacheBasePath, name, branch);
    }

    /**
     * Start auto-update timer
     */
    private startAutoUpdate(): void {
        this.logger.info('Starting auto-update', {
            interval: this.config.updateInterval
        });

        this.updateTimer = setInterval(async () => {
            this.logger.info('Running scheduled repository updates');
            
            for (const [name] of this.repositories) {
                try {
                    await this.syncRepository(name);
                } catch (error) {
                    this.logger.error('Auto-update failed for repository', {
                        name,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }, this.config.updateInterval);
    }

    /**
     * Stop auto-update timer
     */
    private stopAutoUpdate(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
            this.logger.info('Stopped auto-update');
        }
    }

    /**
     * Get all managed repositories
     */
    public getRepositories(): ReadonlyMap<string, AIKitRepository> {
        return this.repositories;
    }

    /**
     * Remove a repository from management
     */
    public removeRepository(name: string): boolean {
        const removed = this.repositories.delete(name);
        if (removed) {
            this.logger.info('Removed repository', { name });
        }
        return removed;
    }

    /**
     * Clear all cached repositories
     */
    public async clearCache(): Promise<void> {
        this.logger.info('Clearing repository cache', {
            cacheBasePath: this.cacheBasePath
        });

        if (fs.existsSync(this.cacheBasePath)) {
            fs.rmSync(this.cacheBasePath, { recursive: true, force: true });
            fs.mkdirSync(this.cacheBasePath, { recursive: true });
        }

        this.logger.info('Cache cleared');
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.logger.info('AIKitManager disposing');
        this.stopAutoUpdate();
        this.repositories.clear();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
