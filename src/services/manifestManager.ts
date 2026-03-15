/**
 * Manifest Manager Service
 * 
 * Provides manifest-based file tracking for AI Kit deployments.
 * Enables surgical install/uninstall with SHA-256 hash integrity
 * verification, modification detection, and corruption scanning.
 * 
 * Part of AICC-0097: Manifest-Based File Tracking
 *   - AICC-0269: File hash tracking
 *   - AICC-0270: Surgical install/uninstall
 *   - AICC-0271: Manifest validation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../logger';
import { AIKitDeployment } from '../aiKitManager';
import {
    KitManifest,
    ManifestFileEntry,
    ManifestValidationResult,
    CorruptionReport,
    UninstallResult
} from '../types/manifest';

/** Directory name under workspace root for manifest storage */
const MANIFEST_DIR = '.project/manifests';

/**
 * ManifestManager handles manifest-based file tracking for AI Kit
 * deployments. Each installed kit gets a manifest file recording
 * every deployed file with its SHA-256 hash, enabling:
 * 
 * - Detection of user modifications after install
 * - Surgical uninstall that preserves user-edited files
 * - Corruption and integrity scanning
 */
export class ManifestManager {
    private readonly logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    // ─── Hash Tracking (AICC-0269) ───────────────────────────────────

    /**
     * Compute the SHA-256 hash of a file's content.
     * 
     * @param filePath - Absolute path to the file
     * @returns Hex-encoded SHA-256 hash string
     * @throws Error if the file cannot be read
     */
    public async computeFileHash(filePath: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to compute hash for ${filePath}: ${message}`);
        }
    }

    /**
     * Detect files that have been modified by the user since installation.
     * Compares current on-disk hashes against the manifest's recorded hashes.
     * 
     * @param manifest - The kit manifest to check
     * @param workspacePath - Absolute path to the workspace root
     * @returns Array of ManifestFileEntry objects whose on-disk hash differs
     */
    public async detectModifications(
        manifest: KitManifest,
        workspacePath: string
    ): Promise<ManifestFileEntry[]> {
        const modified: ManifestFileEntry[] = [];

        for (const entry of manifest.files) {
            const absolutePath = path.join(workspacePath, entry.targetPath);

            if (!fs.existsSync(absolutePath)) {
                // File is missing — treat as not modified (will show in corruption scan)
                continue;
            }

            try {
                const currentHash = await this.computeFileHash(absolutePath);
                if (currentHash !== entry.hash) {
                    modified.push({ ...entry, modified: true });
                }
            } catch (error) {
                this.logger.warn('Failed to check file modification', {
                    targetPath: entry.targetPath,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        this.logger.info('Modification detection complete', {
            kitName: manifest.kitName,
            totalFiles: manifest.files.length,
            modifiedCount: modified.length
        });

        return modified;
    }

    // ─── Surgical Install / Uninstall (AICC-0270) ────────────────────

    /**
     * Install a kit by deploying files and creating a tracking manifest.
     * 
     * @param kitName - Unique kit identifier
     * @param deployments - Array of deployment configurations
     * @param sourcePath - Absolute path to the cloned repository
     * @param workspacePath - Absolute path to the workspace root
     * @param repoUrl - Source repository URL
     * @param repoBranch - Source branch name
     * @param kitVersion - Kit version string
     * @returns The created KitManifest
     */
    public async installKit(
        kitName: string,
        deployments: AIKitDeployment[],
        sourcePath: string,
        workspacePath: string,
        repoUrl: string = '',
        repoBranch: string = 'main',
        kitVersion: string = '0.0.0'
    ): Promise<KitManifest> {
        this.logger.info('Installing kit with manifest tracking', {
            kitName,
            deploymentCount: deployments.length
        });

        const now = new Date().toISOString();
        const files: ManifestFileEntry[] = [];

        for (const deployment of deployments) {
            const sourceFullPath = path.join(sourcePath, deployment.source);

            if (!fs.existsSync(sourceFullPath)) {
                this.logger.warn('Source path not found, skipping deployment', {
                    source: deployment.source
                });
                continue;
            }

            const stat = fs.statSync(sourceFullPath);
            if (stat.isDirectory()) {
                const entries = await this.deployDirectoryTracked(
                    sourceFullPath,
                    deployment.source,
                    deployment.target,
                    workspacePath,
                    deployment.replace ?? false,
                    now
                );
                files.push(...entries);
            } else {
                const entry = await this.deployFileTracked(
                    sourceFullPath,
                    deployment.source,
                    deployment.target,
                    workspacePath,
                    deployment.replace ?? false,
                    now
                );
                if (entry) {
                    files.push(entry);
                }
            }
        }

        const manifest: KitManifest = {
            version: '1.0.0',
            kitName,
            kitVersion,
            sourceRepo: repoUrl,
            sourceBranch: repoBranch,
            installedAt: now,
            updatedAt: now,
            files
        };

        // Persist the manifest
        await this.saveManifest(manifest, workspacePath);

        this.logger.info('Kit installed successfully', {
            kitName,
            fileCount: files.length
        });

        return manifest;
    }

    /**
     * Uninstall a kit by removing only files whose hashes match the manifest.
     * Files modified by the user are skipped to prevent data loss.
     * 
     * @param kitName - Kit identifier to uninstall
     * @param workspacePath - Absolute path to the workspace root
     * @returns Object with arrays of removed and skipped file paths
     */
    public async uninstallKit(
        kitName: string,
        workspacePath: string
    ): Promise<UninstallResult> {
        const manifest = await this.loadManifest(kitName, workspacePath);
        if (!manifest) {
            throw new Error(`No manifest found for kit '${kitName}'`);
        }

        this.logger.info('Uninstalling kit', {
            kitName,
            trackedFiles: manifest.files.length
        });

        const removed: string[] = [];
        const skipped: string[] = [];

        for (const entry of manifest.files) {
            const absolutePath = path.join(workspacePath, entry.targetPath);

            if (!fs.existsSync(absolutePath)) {
                // Already gone
                removed.push(entry.targetPath);
                continue;
            }

            try {
                const currentHash = await this.computeFileHash(absolutePath);
                if (currentHash === entry.hash) {
                    // File unchanged — safe to remove
                    fs.unlinkSync(absolutePath);
                    removed.push(entry.targetPath);

                    // Clean up empty parent directories
                    this.cleanEmptyParents(absolutePath, workspacePath);
                } else {
                    // User modified — skip
                    skipped.push(entry.targetPath);
                    this.logger.info('Skipping user-modified file', {
                        targetPath: entry.targetPath
                    });
                }
            } catch (error) {
                this.logger.warn('Failed to process file during uninstall', {
                    targetPath: entry.targetPath,
                    error: error instanceof Error ? error.message : String(error)
                });
                skipped.push(entry.targetPath);
            }
        }

        // Remove the manifest file itself
        const manifestPath = this.getManifestPath(kitName, workspacePath);
        if (fs.existsSync(manifestPath)) {
            fs.unlinkSync(manifestPath);
        }

        this.logger.info('Kit uninstalled', {
            kitName,
            removedCount: removed.length,
            skippedCount: skipped.length
        });

        return { removed, skipped };
    }

    // ─── Manifest Validation (AICC-0271) ─────────────────────────────

    /**
     * Validate a manifest object against the expected schema.
     * 
     * @param manifest - The manifest to validate
     * @returns Validation result with errors array
     */
    public validateManifest(manifest: KitManifest): ManifestValidationResult {
        const errors: string[] = [];

        if (manifest.version !== '1.0.0') {
            errors.push(`Unsupported manifest version: ${manifest.version}`);
        }
        if (!manifest.kitName || typeof manifest.kitName !== 'string') {
            errors.push('kitName is required and must be a string');
        }
        if (!manifest.kitVersion || typeof manifest.kitVersion !== 'string') {
            errors.push('kitVersion is required and must be a string');
        }
        if (typeof manifest.sourceRepo !== 'string') {
            errors.push('sourceRepo must be a string');
        }
        if (typeof manifest.sourceBranch !== 'string') {
            errors.push('sourceBranch must be a string');
        }
        if (!manifest.installedAt || isNaN(Date.parse(manifest.installedAt))) {
            errors.push('installedAt must be a valid ISO 8601 timestamp');
        }
        if (!manifest.updatedAt || isNaN(Date.parse(manifest.updatedAt))) {
            errors.push('updatedAt must be a valid ISO 8601 timestamp');
        }
        if (!Array.isArray(manifest.files)) {
            errors.push('files must be an array');
        } else {
            for (let i = 0; i < manifest.files.length; i++) {
                const file = manifest.files[i];
                if (!file.sourcePath || typeof file.sourcePath !== 'string') {
                    errors.push(`files[${i}].sourcePath is required`);
                }
                if (!file.targetPath || typeof file.targetPath !== 'string') {
                    errors.push(`files[${i}].targetPath is required`);
                }
                if (!file.hash || typeof file.hash !== 'string' || !/^[a-f0-9]{64}$/.test(file.hash)) {
                    errors.push(`files[${i}].hash must be a valid SHA-256 hex string`);
                }
                if (typeof file.size !== 'number' || file.size < 0) {
                    errors.push(`files[${i}].size must be a non-negative number`);
                }
                if (!file.installedAt || isNaN(Date.parse(file.installedAt))) {
                    errors.push(`files[${i}].installedAt must be a valid ISO 8601 timestamp`);
                }
                if (typeof file.modified !== 'boolean') {
                    errors.push(`files[${i}].modified must be a boolean`);
                }
            }
        }

        const result: ManifestValidationResult = {
            valid: errors.length === 0,
            errors
        };

        this.logger.info('Manifest validation complete', {
            kitName: manifest.kitName,
            valid: result.valid,
            errorCount: errors.length
        });

        return result;
    }

    /**
     * Detect file corruption and drift for an installed kit.
     * 
     * @param kitName - Kit identifier to scan
     * @param workspacePath - Absolute path to the workspace root
     * @returns Report of missing, corrupted, and extra files
     */
    public async detectCorruption(
        kitName: string,
        workspacePath: string
    ): Promise<CorruptionReport> {
        const manifest = await this.loadManifest(kitName, workspacePath);
        if (!manifest) {
            throw new Error(`No manifest found for kit '${kitName}'`);
        }

        const missing: string[] = [];
        const corrupted: string[] = [];
        const extra: string[] = [];

        // Check all manifest entries against disk
        const trackedPaths = new Set<string>();

        for (const entry of manifest.files) {
            const absolutePath = path.join(workspacePath, entry.targetPath);
            trackedPaths.add(entry.targetPath);

            if (!fs.existsSync(absolutePath)) {
                missing.push(entry.targetPath);
                continue;
            }

            try {
                const currentHash = await this.computeFileHash(absolutePath);
                if (currentHash !== entry.hash) {
                    corrupted.push(entry.targetPath);
                }
            } catch {
                corrupted.push(entry.targetPath);
            }
        }

        // Scan deployment target directories for extra (untracked) files
        const targetDirs = new Set<string>();
        for (const entry of manifest.files) {
            targetDirs.add(path.dirname(entry.targetPath));
        }

        for (const dir of targetDirs) {
            const absoluteDir = path.join(workspacePath, dir);
            if (!fs.existsSync(absoluteDir)) {
                continue;
            }

            try {
                const dirFiles = fs.readdirSync(absoluteDir);
                for (const file of dirFiles) {
                    const relativePath = path.join(dir, file);
                    const absolutePath = path.join(absoluteDir, file);
                    const stat = fs.statSync(absolutePath);
                    if (stat.isFile() && !trackedPaths.has(relativePath)) {
                        extra.push(relativePath);
                    }
                }
            } catch {
                // Directory read failed — skip
            }
        }

        this.logger.info('Corruption detection complete', {
            kitName,
            missingCount: missing.length,
            corruptedCount: corrupted.length,
            extraCount: extra.length
        });

        return { missing, corrupted, extra };
    }

    // ─── Manifest Persistence ────────────────────────────────────────

    /**
     * Load a kit manifest from disk.
     * 
     * @param kitName - Kit identifier
     * @param workspacePath - Absolute path to the workspace root
     * @returns The parsed manifest, or null if not found
     */
    public async loadManifest(
        kitName: string,
        workspacePath: string
    ): Promise<KitManifest | null> {
        const manifestPath = this.getManifestPath(kitName, workspacePath);

        if (!fs.existsSync(manifestPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(content) as KitManifest;
            return manifest;
        } catch (error) {
            this.logger.error('Failed to load manifest', {
                kitName,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * List all installed kit manifests in a workspace.
     * 
     * @param workspacePath - Absolute path to the workspace root
     * @returns Array of kit names that have manifests
     */
    public async listInstalledKits(workspacePath: string): Promise<string[]> {
        const manifestDir = path.join(workspacePath, MANIFEST_DIR);
        if (!fs.existsSync(manifestDir)) {
            return [];
        }

        try {
            const files = fs.readdirSync(manifestDir);
            return files
                .filter(f => f.endsWith('.manifest.json'))
                .map(f => f.replace('.manifest.json', ''));
        } catch {
            return [];
        }
    }

    // ─── Private Helpers ─────────────────────────────────────────────

    /**
     * Save a manifest to disk.
     */
    private async saveManifest(
        manifest: KitManifest,
        workspacePath: string
    ): Promise<void> {
        const manifestPath = this.getManifestPath(manifest.kitName, workspacePath);
        const manifestDir = path.dirname(manifestPath);

        if (!fs.existsSync(manifestDir)) {
            fs.mkdirSync(manifestDir, { recursive: true });
        }

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        this.logger.debug('Manifest saved', { path: manifestPath });
    }

    /**
     * Get the absolute path for a kit's manifest file.
     */
    private getManifestPath(kitName: string, workspacePath: string): string {
        return path.join(workspacePath, MANIFEST_DIR, `${kitName}.manifest.json`);
    }

    /**
     * Deploy a single file with manifest tracking.
     */
    private async deployFileTracked(
        sourceAbsolute: string,
        sourceRelative: string,
        targetRelative: string,
        workspacePath: string,
        replace: boolean,
        timestamp: string
    ): Promise<ManifestFileEntry | null> {
        const targetAbsolute = path.join(workspacePath, targetRelative);

        if (fs.existsSync(targetAbsolute) && !replace) {
            this.logger.info('Target file exists and replace=false, skipping', {
                targetPath: targetRelative
            });
            return null;
        }

        // Ensure parent directory
        const parentDir = path.dirname(targetAbsolute);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.copyFileSync(sourceAbsolute, targetAbsolute);

        const hash = await this.computeFileHash(targetAbsolute);
        const stat = fs.statSync(targetAbsolute);

        return {
            sourcePath: sourceRelative,
            targetPath: targetRelative,
            hash,
            size: stat.size,
            installedAt: timestamp,
            modified: false
        };
    }

    /**
     * Deploy a directory recursively with manifest tracking.
     */
    private async deployDirectoryTracked(
        sourceAbsolute: string,
        sourceRelative: string,
        targetRelative: string,
        workspacePath: string,
        replace: boolean,
        timestamp: string
    ): Promise<ManifestFileEntry[]> {
        const entries: ManifestFileEntry[] = [];
        const files = fs.readdirSync(sourceAbsolute);

        for (const file of files) {
            if (file === '.git') {
                continue;
            }

            const childSourceAbsolute = path.join(sourceAbsolute, file);
            const childSourceRelative = path.join(sourceRelative, file);
            const childTargetRelative = path.join(targetRelative, file);
            const stat = fs.statSync(childSourceAbsolute);

            if (stat.isDirectory()) {
                const childEntries = await this.deployDirectoryTracked(
                    childSourceAbsolute,
                    childSourceRelative,
                    childTargetRelative,
                    workspacePath,
                    replace,
                    timestamp
                );
                entries.push(...childEntries);
            } else {
                const entry = await this.deployFileTracked(
                    childSourceAbsolute,
                    childSourceRelative,
                    childTargetRelative,
                    workspacePath,
                    replace,
                    timestamp
                );
                if (entry) {
                    entries.push(entry);
                }
            }
        }

        return entries;
    }

    /**
     * Remove empty parent directories up to the workspace root.
     */
    private cleanEmptyParents(filePath: string, workspacePath: string): void {
        let dir = path.dirname(filePath);
        const normalized = path.normalize(workspacePath);

        while (dir !== normalized && dir.startsWith(normalized)) {
            try {
                const contents = fs.readdirSync(dir);
                if (contents.length === 0) {
                    fs.rmdirSync(dir);
                    dir = path.dirname(dir);
                } else {
                    break;
                }
            } catch {
                break;
            }
        }
    }
}
