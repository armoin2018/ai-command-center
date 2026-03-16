/**
 * Kit Bootstrap Service
 *
 * Handles first-load bootstrapping of AI Kit catalog entries:
 *   1. Copies `.github/aicc/catalog/{kit}` → `.my/aicc/catalog/{kit}` (if missing)
 *   2. Clones (or fetches) the kit repository into `~/.vscode/cache/{kitName}`
 *   3. Installs kit files into the workspace based on the folderMapping in structure.json
 *
 * This runs once per kit on first activation and is idempotent on subsequent loads.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { Logger } from '../logger';

const execFileAsync = promisify(execFile);

// ─── Types ───────────────────────────────────────────────────────────

/** Folder mapping from structure.json */
export interface KitFolderMapping {
    readonly source: string;
    readonly target: string;
    readonly type: 'file' | 'folder';
    readonly evolveEnabled: boolean;
    readonly forceReplace: boolean;
    readonly supportedAgentic?: string[];
}

/** Minimal structure.json schema for bootstrap purposes */
export interface KitStructure {
    readonly name: string;
    readonly repo: string;
    readonly branch: string;
    readonly refreshEnabled: boolean;
    readonly evolveEnabled: boolean;
    readonly refreshInterval: string;
    readonly folderMapping: KitFolderMapping;
    readonly bundles?: KitBundle[];
    readonly dependencies?: string[];
}

/** Bundle definition in structure.json */
export interface KitBundle {
    readonly name: string;
    readonly enabled: boolean;
    readonly assets: string[];
}

/** Result of a bootstrap operation */
export interface BootstrapResult {
    readonly kitName: string;
    readonly catalogCopied: boolean;
    readonly repoCloned: boolean;
    readonly repoUpdated: boolean;
    readonly filesInstalled: number;
    readonly errors: string[];
}

// ─── Service ─────────────────────────────────────────────────────────

export class KitBootstrapService {
    private readonly logger: Logger;
    private readonly workspaceRoot: string;
    /** Global cache directory: ~/.vscode/cache */
    private readonly globalCacheDir: string;

    constructor(workspaceRoot: string) {
        this.logger = Logger.getInstance();
        this.workspaceRoot = workspaceRoot;
        this.globalCacheDir = path.join(os.homedir(), '.vscode', 'cache');
    }

    // ─── Public API ──────────────────────────────────────────────────

    /**
     * Bootstrap all kits found in `.github/aicc/catalog/`.
     * For each kit directory, runs the full bootstrap pipeline.
     */
    public async bootstrapAllKits(
        progress?: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<BootstrapResult[]> {
        const results: BootstrapResult[] = [];
        const catalogSourceDir = path.join(this.workspaceRoot, '.github', 'aicc', 'catalog');

        if (!fs.existsSync(catalogSourceDir)) {
            this.logger.info('No catalog directory found, skipping kit bootstrap', {
                expected: catalogSourceDir
            });
            return results;
        }

        // List kit directories in catalog (skip files like _schema.inventory.yaml)
        const entries = fs.readdirSync(catalogSourceDir, { withFileTypes: true });
        const kitDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('_'));

        for (let i = 0; i < kitDirs.length; i++) {
            const kitDir = kitDirs[i];
            progress?.report({
                message: `Bootstrapping kit: ${kitDir.name}`,
                increment: (1 / kitDirs.length) * 100
            });

            try {
                const result = await this.bootstrapKit(kitDir.name);
                results.push(result);
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                this.logger.error('Kit bootstrap failed', { kit: kitDir.name, error: errMsg });
                results.push({
                    kitName: kitDir.name,
                    catalogCopied: false,
                    repoCloned: false,
                    repoUpdated: false,
                    filesInstalled: 0,
                    errors: [errMsg]
                });
            }
        }

        return results;
    }

    /**
     * Bootstrap a single kit by name.
     *
     * Steps:
     *   1. Copy catalog entry to `.my/` (if not already present)
     *   2. Clone or fetch the repository into `~/.vscode/cache/{kitName}`
     *   3. Install files from the cached repo into the workspace based on folderMapping
     */
    public async bootstrapKit(kitName: string): Promise<BootstrapResult> {
        const errors: string[] = [];
        let catalogCopied = false;
        let repoCloned = false;
        let repoUpdated = false;
        let filesInstalled = 0;

        this.logger.info('Starting kit bootstrap', { kitName });

        // ── Step 1: Copy catalog entry to .my/ ──────────────────────
        try {
            catalogCopied = await this.copyCatalogEntry(kitName);
        } catch (error) {
            const msg = `Catalog copy failed: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(msg);
            this.logger.error(msg, { kitName });
        }

        // ── Step 2: Read structure.json from .my/ (fallback to .github/) ──
        const structure = this.loadStructure(kitName);
        if (!structure) {
            errors.push(`No structure.json found for kit '${kitName}'`);
            return { kitName, catalogCopied, repoCloned, repoUpdated, filesInstalled, errors };
        }

        // ── Step 3: Clone or fetch the repository ───────────────────
        const repoResult = await this.syncRepository(structure);
        repoCloned = repoResult.cloned;
        repoUpdated = repoResult.updated;
        if (repoResult.error) {
            errors.push(repoResult.error);
        }

        // ── Step 4: Install kit files based on folderMapping ────────
        if (repoCloned || repoUpdated || repoResult.alreadyCached) {
            try {
                filesInstalled = await this.installKit(structure);
            } catch (error) {
                const msg = `Kit install failed: ${error instanceof Error ? error.message : String(error)}`;
                errors.push(msg);
                this.logger.error(msg, { kitName });
            }
        }

        const result: BootstrapResult = {
            kitName,
            catalogCopied,
            repoCloned,
            repoUpdated,
            filesInstalled,
            errors
        };

        this.logger.info('Kit bootstrap complete', result);
        return result;
    }

    // ─── Step 1: Catalog Copy ────────────────────────────────────────

    /**
     * Copy `.github/aicc/catalog/{kitName}` → `.my/aicc/catalog/{kitName}`
     * Only copies if the `.my/` target does not already exist.
     *
     * @returns true if a copy was performed, false if target already exists
     */
    private async copyCatalogEntry(kitName: string): Promise<boolean> {
        const sourceDir = path.join(this.workspaceRoot, '.github', 'aicc', 'catalog', kitName);
        const targetDir = path.join(this.workspaceRoot, '.my', 'aicc', 'catalog', kitName);

        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Catalog source not found: ${sourceDir}`);
        }

        // If .my/ already has the catalog entry, skip
        if (fs.existsSync(targetDir)) {
            this.logger.info('Catalog entry already exists in .my/, skipping copy', {
                kitName,
                targetDir
            });
            return false;
        }

        // Create target directory
        fs.mkdirSync(targetDir, { recursive: true });

        // Recursively copy all files
        this.copyDirectoryRecursive(sourceDir, targetDir);

        this.logger.info('Catalog entry copied to .my/', { kitName, sourceDir, targetDir });
        return true;
    }

    // ─── Step 2: Load Structure ──────────────────────────────────────

    /**
     * Load structure.json for a kit.
     * Prefers `.my/aicc/catalog/{kitName}/structure.json` (user overrides),
     * falls back to `.github/aicc/catalog/{kitName}/structure.json`.
     */
    private loadStructure(kitName: string): KitStructure | null {
        const paths = [
            path.join(this.workspaceRoot, '.my', 'aicc', 'catalog', kitName, 'structure.json'),
            path.join(this.workspaceRoot, '.github', 'aicc', 'catalog', kitName, 'structure.json')
        ];

        for (const p of paths) {
            if (fs.existsSync(p)) {
                try {
                    const content = fs.readFileSync(p, 'utf-8');
                    const parsed = JSON.parse(content) as KitStructure;
                    this.logger.debug('Loaded structure.json', { kitName, path: p });
                    return parsed;
                } catch (error) {
                    this.logger.error('Failed to parse structure.json', {
                        kitName,
                        path: p,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }

        return null;
    }

    // ─── Step 3: Repository Sync ─────────────────────────────────────

    /**
     * Clone the kit repo into `~/.vscode/cache/{kitName}` or fetch updates
     * if it already exists.
     */
    private async syncRepository(structure: KitStructure): Promise<{
        cloned: boolean;
        updated: boolean;
        alreadyCached: boolean;
        error?: string;
    }> {
        const kitName = structure.name;
        const repoUrl = structure.repo;
        const branch = structure.branch || 'main';
        const repoPath = path.join(this.globalCacheDir, kitName);

        // Ensure global cache directory exists
        if (!fs.existsSync(this.globalCacheDir)) {
            fs.mkdirSync(this.globalCacheDir, { recursive: true });
        }

        try {
            if (fs.existsSync(path.join(repoPath, '.git'))) {
                // Repository already cached — fetch updates
                this.logger.info('Repository already cached, fetching updates', {
                    kitName,
                    repoPath,
                    branch
                });

                try {
                    await execFileAsync('git', ['-C', repoPath, 'fetch', 'origin', branch]);
                    await execFileAsync('git', ['-C', repoPath, 'reset', '--hard', `origin/${branch}`]);
                    this.logger.info('Repository updated successfully', { kitName });
                    return { cloned: false, updated: true, alreadyCached: true };
                } catch (fetchError) {
                    // Fetch failed but repo exists — still usable
                    const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
                    this.logger.warn('Fetch failed, using existing cache', { kitName, error: msg });
                    return { cloned: false, updated: false, alreadyCached: true, error: `Fetch warning: ${msg}` };
                }
            } else {
                // Fresh clone
                this.logger.info('Cloning repository', { kitName, repoUrl, branch, repoPath });

                // Remove any partial/corrupt directory
                if (fs.existsSync(repoPath)) {
                    fs.rmSync(repoPath, { recursive: true, force: true });
                }

                await execFileAsync('git', [
                    'clone',
                    '--depth', '1',
                    '--branch', branch,
                    '--single-branch',
                    repoUrl,
                    repoPath
                ]);

                this.logger.info('Repository cloned successfully', { kitName, repoPath });
                return { cloned: true, updated: false, alreadyCached: false };
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error('Repository sync failed', { kitName, error: msg });
            return { cloned: false, updated: false, alreadyCached: fs.existsSync(repoPath), error: msg };
        }
    }

    // ─── Step 4: Kit Installation ────────────────────────────────────

    /**
     * Install kit files from the cached repo into the workspace
     * based on the `folderMapping` in structure.json.
     *
     * @returns Number of files installed
     */
    private async installKit(structure: KitStructure): Promise<number> {
        const kitName = structure.name;
        const repoPath = path.join(this.globalCacheDir, kitName);
        const mapping = structure.folderMapping;

        if (!mapping) {
            this.logger.warn('No folderMapping defined in structure.json', { kitName });
            return 0;
        }

        const sourcePath = path.join(repoPath, mapping.source);
        const targetPath = path.join(this.workspaceRoot, mapping.target);

        if (!fs.existsSync(sourcePath)) {
            this.logger.warn('Mapping source path not found in cached repo', {
                kitName,
                sourcePath
            });
            return 0;
        }

        this.logger.info('Installing kit files', {
            kitName,
            source: mapping.source,
            target: mapping.target,
            type: mapping.type,
            forceReplace: mapping.forceReplace
        });

        let filesInstalled = 0;

        if (mapping.type === 'file') {
            // Single file mapping
            await this.installFile(sourcePath, targetPath, mapping.forceReplace);
            filesInstalled = 1;
        } else {
            // Directory mapping — recursively install
            filesInstalled = await this.installDirectory(sourcePath, targetPath, mapping.forceReplace);
        }

        this.logger.info('Kit files installed', { kitName, filesInstalled });
        return filesInstalled;
    }

    /**
     * Install a single file from source to target.
     * Respects forceReplace — skips if target exists and forceReplace is false.
     */
    private async installFile(
        sourcePath: string,
        targetPath: string,
        forceReplace: boolean
    ): Promise<void> {
        if (fs.existsSync(targetPath) && !forceReplace) {
            this.logger.debug('File exists and forceReplace=false, skipping', { targetPath });
            return;
        }

        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, targetPath);
        this.logger.debug('File installed', { sourcePath, targetPath });
    }

    /**
     * Recursively install a directory from source to target.
     * Skips `.git` directories. Respects forceReplace for individual files.
     *
     * @returns Number of files installed
     */
    private async installDirectory(
        sourcePath: string,
        targetPath: string,
        forceReplace: boolean
    ): Promise<number> {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        let count = 0;
        const entries = fs.readdirSync(sourcePath, { withFileTypes: true });

        for (const entry of entries) {
            // Skip git internals
            if (entry.name === '.git' || entry.name === '.DS_Store') {
                continue;
            }

            const src = path.join(sourcePath, entry.name);
            const tgt = path.join(targetPath, entry.name);

            if (entry.isDirectory()) {
                count += await this.installDirectory(src, tgt, forceReplace);
            } else {
                if (fs.existsSync(tgt) && !forceReplace) {
                    // Don't overwrite existing user files
                    continue;
                }
                const parentDir = path.dirname(tgt);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
                fs.copyFileSync(src, tgt);
                count++;
            }
        }

        return count;
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    /**
     * Recursively copy a directory.
     */
    private copyDirectoryRecursive(source: string, target: string): void {
        const entries = fs.readdirSync(source, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name === '.DS_Store') {
                continue;
            }

            const srcPath = path.join(source, entry.name);
            const tgtPath = path.join(target, entry.name);

            if (entry.isDirectory()) {
                if (!fs.existsSync(tgtPath)) {
                    fs.mkdirSync(tgtPath, { recursive: true });
                }
                this.copyDirectoryRecursive(srcPath, tgtPath);
            } else {
                fs.copyFileSync(srcPath, tgtPath);
            }
        }
    }

    /**
     * Check whether a kit has already been bootstrapped
     * (i.e. .my/aicc/catalog/{kitName}/structure.json exists).
     */
    public isKitBootstrapped(kitName: string): boolean {
        const structurePath = path.join(
            this.workspaceRoot,
            '.my', 'aicc', 'catalog', kitName, 'structure.json'
        );
        return fs.existsSync(structurePath);
    }
}
