import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { Logger } from './logger';
import { getPlatformPaths } from './utils/platformInfo';
import { WorkspaceIdentity, AutoLoadConfig } from './services/workspaceIdentity';

const execFileAsync = promisify(execFile);

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
 * Metadata for a single cached repository
 */
export interface CacheRepoMetadata {
    readonly name: string;
    readonly url: string;
    readonly branch: string;
    readonly lastUpdated: string; // ISO 8601
    readonly head: string; // git commit SHA
}

/**
 * Global cache metadata stored at {globalCachePath}/.cache-metadata.json
 */
export interface GlobalCacheMetadata {
    readonly version: '1.0.0';
    readonly repos: Record<string, CacheRepoMetadata>;
}

/**
 * Result of a global cache update operation
 */
export interface CacheUpdateResult {
    readonly updated: boolean;
    readonly previousHead: string;
    readonly newHead: string;
}

/**
 * Information about a single cached repository
 */
export interface CacheRepoInfo {
    readonly name: string;
    readonly branch: string;
    readonly sizeBytes: number;
    readonly lastUpdated: string;
    readonly head: string;
}

/**
 * Aggregate information about the global cache
 */
export interface CacheInfo {
    readonly totalSizeBytes: number;
    readonly repoCount: number;
    readonly repos: CacheRepoInfo[];
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

    /** Global cache directory shared across all workspaces */
    public readonly globalCachePath: string;

    /** Auto-load configuration */
    private autoLoadConfig: AutoLoadConfig = {
        enabled: false,
        defaultKits: [],
        onActivation: false
    };

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

        // Initialize per-extension cache directory
        this.cacheBasePath = path.join(
            extensionContext.globalStorageUri.fsPath,
            this.config.cacheDirectory
        );

        // Initialize global cache directory (platform-aware)
        this.globalCachePath = getPlatformPaths().globalCacheDir;

        this.logger.info('AIKitManager initialized', {
            cacheBasePath: this.cacheBasePath,
            globalCachePath: this.globalCachePath,
            enableAutoUpdate: this.config.enableAutoUpdate
        });

        // Create cache directories if they don't exist
        try {
            if (!fs.existsSync(this.cacheBasePath)) {
                fs.mkdirSync(this.cacheBasePath, { recursive: true });
            }
            if (!fs.existsSync(this.globalCachePath)) {
                fs.mkdirSync(this.globalCachePath, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to create cache directories', {
                cacheBasePath: this.cacheBasePath,
                globalCachePath: this.globalCachePath,
                error: error instanceof Error ? error.message : String(error)
            });
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
        try {
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to create parent directory for clone', {
                parentDir,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to create directory for repository clone: ${error instanceof Error ? error.message : String(error)}`);
        }

        this.logger.debug('Executing git clone', { url, branch, targetPath });

        try {
            const { stdout, stderr } = await execFileAsync('git', ['clone', '--branch', branch, '--single-branch', url, targetPath]);
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

        this.logger.debug('Executing git pull', { repoPath, branch });

        try {
            await execFileAsync('git', ['-C', repoPath, 'fetch', 'origin', branch]);
            const { stdout, stderr } = await execFileAsync('git', ['-C', repoPath, 'reset', '--hard', `origin/${branch}`]);
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

        try {
            // Ensure parent directory exists
            const parentDir = path.dirname(targetPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            // Copy file
            fs.copyFileSync(sourcePath, targetPath);
        
            this.logger.debug('File deployed', { source: sourcePath, target: targetPath });
        } catch (error) {
            this.logger.error('Failed to deploy file', {
                source: sourcePath,
                target: targetPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
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

        try {
            // Create target directory
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }

            // Copy directory contents recursively
            this.copyDirectoryRecursive(sourcePath, targetPath, replace);
        
            this.logger.debug('Directory deployed', { source: sourcePath, target: targetPath });
        } catch (error) {
            this.logger.error('Failed to deploy directory', {
                source: sourcePath,
                target: targetPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Recursively copy directory contents
     */
    private copyDirectoryRecursive(
        source: string,
        target: string,
        replace: boolean
    ): void {
        let files: string[];
        try {
            files = fs.readdirSync(source);
        } catch (error) {
            this.logger.error('Failed to read source directory for copy', {
                source,
                error: error instanceof Error ? error.message : String(error)
            });
            return;
        }

        for (const file of files) {
            const sourcePath = path.join(source, file);
            const targetPath = path.join(target, file);

            try {
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
            } catch (error) {
                this.logger.error('Failed to copy file during directory deploy', {
                    sourcePath,
                    targetPath,
                    error: error instanceof Error ? error.message : String(error)
                });
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

        try {
            if (fs.existsSync(this.cacheBasePath)) {
                fs.rmSync(this.cacheBasePath, { recursive: true, force: true });
                fs.mkdirSync(this.cacheBasePath, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to clear repository cache', {
                cacheBasePath: this.cacheBasePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }

        this.logger.info('Cache cleared');
    }

    // ─── Global Cache Operations (AICC-0096) ─────────────────────────

    /**
     * Clone a repository into the global cache directory.
     * Uses shallow clones (`--depth 1`) for faster initial setup.
     * The repo is stored at `{globalCachePath}/{name}/{branch}/`.
     * 
     * @param name - Unique name for the cached repository
     * @param url - Git repository URL
     * @param branch - Branch to clone (defaults to config default)
     */
    public async cloneToGlobalCache(
        name: string,
        url: string,
        branch?: string
    ): Promise<void> {
        const effectiveBranch = branch ?? this.config.defaultBranch;
        const targetPath = path.join(this.globalCachePath, name, effectiveBranch);

        this.logger.info('Cloning to global cache', {
            name,
            url,
            branch: effectiveBranch,
            targetPath
        });

        if (fs.existsSync(targetPath)) {
            this.logger.info('Repository already exists in global cache, skipping clone', { name });
            return;
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(targetPath);
        try {
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to create parent directory for global cache clone', {
                parentDir,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to create directory for global cache clone: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            await execFileAsync('git', ['clone', '--depth', '1', '--branch', effectiveBranch, '--single-branch', url, targetPath]);
            this.logger.info('Global cache clone complete', { name, branch: effectiveBranch });

            // Record metadata
            const head = await this.getGitHead(targetPath);
            await this.updateCacheMetadata(name, {
                name,
                url,
                branch: effectiveBranch,
                lastUpdated: new Date().toISOString(),
                head
            });
        } catch (error) {
            this.logger.error('Failed to clone to global cache', {
                name,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to clone '${name}' to global cache: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Update an existing repository in the global cache.
     * Performs `git fetch origin && git reset --hard origin/{branch}`.
     * 
     * @param name - Name of the cached repository
     * @param branch - Branch to update (defaults to config default)
     * @returns Update result with previous and new HEAD commit SHAs
     */
    public async updateGlobalCache(
        name: string,
        branch?: string
    ): Promise<CacheUpdateResult> {
        const effectiveBranch = branch ?? this.config.defaultBranch;
        const repoPath = path.join(this.globalCachePath, name, effectiveBranch);

        if (!fs.existsSync(repoPath)) {
            throw new Error(`Repository '${name}' (branch: ${effectiveBranch}) not found in global cache`);
        }

        this.logger.info('Updating global cache', { name, branch: effectiveBranch });

        const previousHead = await this.getGitHead(repoPath);

        try {
            await execFileAsync('git', ['-C', repoPath, 'fetch', 'origin', effectiveBranch]);
            await execFileAsync('git', ['-C', repoPath, 'reset', '--hard', `origin/${effectiveBranch}`]);
            const newHead = await this.getGitHead(repoPath);
            const updated = previousHead !== newHead;

            // Update metadata
            await this.updateCacheMetadata(name, {
                name,
                url: '', // preserved from existing metadata
                branch: effectiveBranch,
                lastUpdated: new Date().toISOString(),
                head: newHead
            });

            this.logger.info('Global cache updated', {
                name,
                updated,
                previousHead: previousHead.substring(0, 8),
                newHead: newHead.substring(0, 8)
            });

            return { updated, previousHead, newHead };
        } catch (error) {
            this.logger.error('Failed to update global cache', {
                name,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to update '${name}' in global cache: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get information about all repositories in the global cache.
     * 
     * @returns Aggregate cache info including total size, repo count,
     *          and per-repo details
     */
    public async getCacheInfo(): Promise<CacheInfo> {
        const metadata = await this.loadCacheMetadata();
        const repos: CacheRepoInfo[] = [];
        let totalSizeBytes = 0;

        if (!fs.existsSync(this.globalCachePath)) {
            return { totalSizeBytes: 0, repoCount: 0, repos: [] };
        }

        const entries = fs.readdirSync(this.globalCachePath);

        for (const entry of entries) {
            if (entry.startsWith('.')) {
                continue;
            }

            const entryPath = path.join(this.globalCachePath, entry);
            const stat = fs.statSync(entryPath);

            if (!stat.isDirectory()) {
                continue;
            }

            // Each entry is a repo name; iterate branches
            const branches = fs.readdirSync(entryPath);
            for (const branchDir of branches) {
                const branchPath = path.join(entryPath, branchDir);
                const branchStat = fs.statSync(branchPath);
                if (!branchStat.isDirectory()) {
                    continue;
                }

                const sizeBytes = this.getDirectorySizeBytes(branchPath);
                totalSizeBytes += sizeBytes;

                const metaKey = entry;
                const repoMeta = metadata.repos[metaKey];

                repos.push({
                    name: entry,
                    branch: branchDir,
                    sizeBytes,
                    lastUpdated: repoMeta?.lastUpdated ?? 'unknown',
                    head: repoMeta?.head ?? 'unknown'
                });
            }
        }

        this.logger.info('Cache info retrieved', {
            totalSizeBytes,
            repoCount: repos.length
        });

        return { totalSizeBytes, repoCount: repos.length, repos };
    }

    /**
     * Remove cached repositories that haven't been updated within
     * the specified number of days.
     * 
     * @param olderThanDays - Prune repos not updated within this many days
     * @returns Names of pruned repositories
     */
    public async pruneCache(olderThanDays: number): Promise<string[]> {
        const metadata = await this.loadCacheMetadata();
        const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const pruned: string[] = [];

        this.logger.info('Pruning global cache', { olderThanDays });

        for (const [name, meta] of Object.entries(metadata.repos)) {
            const lastUpdated = new Date(meta.lastUpdated).getTime();
            if (lastUpdated < cutoff) {
                const repoDir = path.join(this.globalCachePath, name);
                if (fs.existsSync(repoDir)) {
                    fs.rmSync(repoDir, { recursive: true, force: true });
                    pruned.push(name);
                    this.logger.info('Pruned stale cache entry', { name, lastUpdated: meta.lastUpdated });
                }
                delete metadata.repos[name];
            }
        }

        // Persist updated metadata
        await this.saveCacheMetadata(metadata);

        this.logger.info('Cache pruning complete', { prunedCount: pruned.length });
        return pruned;
    }

    /**
     * Calculate the total disk usage of the global cache in bytes.
     * 
     * @returns Total size in bytes
     */
    public getCacheSizeBytes(): number {
        if (!fs.existsSync(this.globalCachePath)) {
            return 0;
        }
        return this.getDirectorySizeBytes(this.globalCachePath);
    }

    // ─── Auto-Load Configuration (AICC-0098) ─────────────────────────

    /**
     * Configure auto-loading behaviour for AI Kits.
     * 
     * @param config - Auto-load configuration
     */
    public configureAutoLoad(config: AutoLoadConfig): void {
        this.autoLoadConfig = { ...config };
        this.logger.info('Auto-load configured', {
            enabled: config.enabled,
            defaultKits: config.defaultKits,
            onActivation: config.onActivation
        });
    }

    /**
     * Get the current auto-load configuration.
     */
    public getAutoLoadConfig(): AutoLoadConfig {
        return { ...this.autoLoadConfig };
    }

    /**
     * Get recommended kit names for a detected workspace identity.
     * Combines identity-based suggestions with configured default kits,
     * deduplicating the result.
     * 
     * @param identity - Detected workspace identity
     * @returns Array of recommended kit names
     */
    public getRecommendedKits(identity: WorkspaceIdentity): string[] {
        const recommended = new Set<string>(this.autoLoadConfig.defaultKits);
        for (const kit of identity.kitSuggestions) {
            recommended.add(kit);
        }
        return Array.from(recommended);
    }

    // ─── Global Cache Helpers ────────────────────────────────────────

    /**
     * Get the current HEAD commit SHA for a git repository.
     */
    private async getGitHead(repoPath: string): Promise<string> {
        try {
            const { stdout } = await execFileAsync('git', ['-C', repoPath, 'rev-parse', 'HEAD']);
            return stdout.trim();
        } catch {
            return 'unknown';
        }
    }

    /**
     * Load global cache metadata from disk.
     */
    private async loadCacheMetadata(): Promise<GlobalCacheMetadata> {
        const metaPath = path.join(this.globalCachePath, '.cache-metadata.json');
        if (!fs.existsSync(metaPath)) {
            return { version: '1.0.0', repos: {} };
        }
        try {
            const content = fs.readFileSync(metaPath, 'utf-8');
            return JSON.parse(content) as GlobalCacheMetadata;
        } catch {
            return { version: '1.0.0', repos: {} };
        }
    }

    /**
     * Save global cache metadata to disk.
     */
    private async saveCacheMetadata(metadata: GlobalCacheMetadata): Promise<void> {
        const metaPath = path.join(this.globalCachePath, '.cache-metadata.json');
        try {
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
        } catch (error) {
            this.logger.error('Failed to save cache metadata', {
                metaPath,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Update metadata for a single cached repository.
     * Merges with existing metadata preserving the url if not provided.
     */
    private async updateCacheMetadata(
        name: string,
        meta: CacheRepoMetadata
    ): Promise<void> {
        const metadata = await this.loadCacheMetadata();
        const existing = metadata.repos[name];

        // Preserve URL from existing metadata if the new one is empty
        const url = meta.url || existing?.url || '';

        // Metadata type is readonly so we reconstruct
        const updated: GlobalCacheMetadata = {
            version: '1.0.0',
            repos: {
                ...metadata.repos,
                [name]: {
                    name: meta.name,
                    url,
                    branch: meta.branch,
                    lastUpdated: meta.lastUpdated,
                    head: meta.head
                }
            }
        };

        await this.saveCacheMetadata(updated);
    }

    /**
     * Recursively calculate the size of a directory in bytes.
     */
    private getDirectorySizeBytes(dirPath: string): number {
        let totalSize = 0;

        try {
            const entries = fs.readdirSync(dirPath);
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry);
                const stat = fs.statSync(entryPath);
                if (stat.isDirectory()) {
                    totalSize += this.getDirectorySizeBytes(entryPath);
                } else {
                    totalSize += stat.size;
                }
            }
        } catch {
            // Permission or access error — skip
        }

        return totalSize;
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
