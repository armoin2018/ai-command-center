/**
 * VSIX Version Upgrade Checker (REQ-VUPG-001 – REQ-VUPG-005)
 *
 * Monitors the workspace repository's package.json for version changes.
 * Also watches git refs to detect pull/merge events that may update the version.
 * Additionally watches ~/.vscode/cache/ai-command-center/*.vsix for pre-built
 * VSIX files that are newer than the installed version.
 * When a newer version is detected, prompts the user to install or rebuild.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Logger } from '../logger';

const logger = Logger.getInstance();

/** Default periodic check interval: 5 minutes */
const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** Cache directory for pre-built VSIX files */
const VSIX_CACHE_DIR = path.join(os.homedir(), '.vscode', 'cache', 'ai-command-center');

export class VersionUpgradeChecker implements vscode.Disposable {
    private packageWatcher?: vscode.FileSystemWatcher;
    private gitWatcher?: vscode.FileSystemWatcher;
    private cacheWatcher?: vscode.FileSystemWatcher;
    private periodicTimer?: ReturnType<typeof setInterval>;
    private workspaceRoot: string;
    private disposed = false;
    /** Track the last version we already prompted the user about */
    private lastPromptedVersion?: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Start watching for version changes in the workspace package.json,
     * git ref changes (pull/merge/checkout), and cached VSIX files.
     */
    start(): void {
        // Watch package.json for direct edits
        const pkgPattern = new vscode.RelativePattern(this.workspaceRoot, 'package.json');
        this.packageWatcher = vscode.workspace.createFileSystemWatcher(pkgPattern);
        this.packageWatcher.onDidChange(() => this.checkForUpgrade());

        // Watch git refs to detect pull/merge/fetch events (REQ-VUPG-005)
        const gitDir = path.join(this.workspaceRoot, '.git');
        if (fs.existsSync(gitDir)) {
            // Watch HEAD and refs/heads for branch changes from pull/merge
            const gitPattern = new vscode.RelativePattern(
                this.workspaceRoot,
                '.git/{HEAD,refs/heads/**,FETCH_HEAD,MERGE_HEAD}'
            );
            this.gitWatcher = vscode.workspace.createFileSystemWatcher(gitPattern);
            this.gitWatcher.onDidChange(() => this.checkForUpgrade());
            this.gitWatcher.onDidCreate(() => this.checkForUpgrade());
        }

        // Watch cache directory for new VSIX files
        this.startCacheWatcher();

        // Periodic check (REQ-VUPG-001)
        this.periodicTimer = setInterval(
            () => this.checkForUpgrade(),
            DEFAULT_CHECK_INTERVAL_MS
        );

        // Run an initial check on startup
        this.checkForUpgrade();

        logger.info('Version upgrade checker started', { workspaceRoot: this.workspaceRoot });
    }

    /**
     * Watch the VSIX cache directory for new or updated .vsix files.
     */
    private startCacheWatcher(): void {
        // Ensure cache directory exists so the watcher can be created
        if (!fs.existsSync(VSIX_CACHE_DIR)) {
            try {
                fs.mkdirSync(VSIX_CACHE_DIR, { recursive: true });
            } catch (err) {
                logger.warn('Could not create VSIX cache directory', { path: VSIX_CACHE_DIR, error: String(err) });
                return;
            }
        }

        const cachePattern = new vscode.RelativePattern(VSIX_CACHE_DIR, '*.vsix');
        this.cacheWatcher = vscode.workspace.createFileSystemWatcher(cachePattern);
        this.cacheWatcher.onDidCreate(() => this.checkForUpgrade());
        this.cacheWatcher.onDidChange(() => this.checkForUpgrade());

        logger.info('VSIX cache watcher started', { path: VSIX_CACHE_DIR });
    }

    /**
     * Compare repo version and cached VSIX versions against the installed extension version.
     * Cached VSIX files take priority since they can be installed directly.
     */
    async checkForUpgrade(): Promise<void> {
        try {
            const installedVersion = this.getInstalledVersion();
            if (!installedVersion) { return; }

            // Check cached VSIX files first — direct install, no build needed
            const cachedVsix = this.getNewestCachedVsix();
            if (cachedVsix && cachedVsix.version !== this.lastPromptedVersion
                && this.isNewer(cachedVsix.version, installedVersion)) {
                logger.info('Newer VSIX found in cache', {
                    version: cachedVsix.version,
                    file: cachedVsix.file,
                    installed: installedVersion
                });
                this.lastPromptedVersion = cachedVsix.version;

                const choice = await vscode.window.showInformationMessage(
                    `AI Command Center v${cachedVsix.version} is ready to install (installed: v${installedVersion}).`,
                    'Install Now',
                    'Remind Later',
                    'Dismiss'
                );

                if (choice === 'Install Now') {
                    await this.installFromCache(cachedVsix.filePath);
                } else if (choice === 'Remind Later') {
                    this.lastPromptedVersion = undefined;
                }
                return;
            }

            // Fall back to repo package.json version check
            const repoVersion = this.getRepoVersion();
            if (!repoVersion) { return; }

            // Skip if we already prompted for this version (REQ-VUPG-004)
            if (repoVersion === this.lastPromptedVersion) { return; }

            if (this.isNewer(repoVersion, installedVersion)) {
                logger.info('New version detected in repo', { repo: repoVersion, installed: installedVersion });
                this.lastPromptedVersion = repoVersion;

                const choice = await vscode.window.showInformationMessage(
                    `AI Command Center v${repoVersion} is available (installed: v${installedVersion}). Upgrade now?`,
                    'Upgrade Now',
                    'Remind Later',
                    'Dismiss'
                );

                if (choice === 'Upgrade Now') {
                    await this.buildAndInstall();
                } else if (choice === 'Remind Later') {
                    // Reset so we prompt again on next periodic check
                    this.lastPromptedVersion = undefined;
                }
                // 'Dismiss' keeps lastPromptedVersion set — won't re-prompt for this version
            }
        } catch (err) {
            logger.warn('Version upgrade check failed', { error: err instanceof Error ? err.message : String(err) });
        }
    }

    /**
     * Scan the cache directory for .vsix files and return the newest one
     * that is newer than the currently installed version.
     */
    private getNewestCachedVsix(): { version: string; file: string; filePath: string } | undefined {
        if (!fs.existsSync(VSIX_CACHE_DIR)) { return undefined; }

        try {
            const files = fs.readdirSync(VSIX_CACHE_DIR)
                .filter(f => f.endsWith('.vsix'));

            if (files.length === 0) { return undefined; }

            let newest: { version: string; file: string; filePath: string; mtime: number } | undefined;

            for (const file of files) {
                const version = this.extractVersionFromVsixFilename(file);
                if (!version) { continue; }

                const filePath = path.join(VSIX_CACHE_DIR, file);
                const stat = fs.statSync(filePath);
                const mtime = stat.mtimeMs;

                if (!newest || this.isNewer(version, newest.version) ||
                    (version === newest.version && mtime > newest.mtime)) {
                    newest = { version, file, filePath, mtime };
                }
            }

            return newest ? { version: newest.version, file: newest.file, filePath: newest.filePath } : undefined;
        } catch (err) {
            logger.warn('Failed to scan VSIX cache directory', { error: String(err) });
            return undefined;
        }
    }

    /**
     * Extract a semver version from a VSIX filename.
     * Supports patterns like: ai-command-center-1.2.3.vsix, name-1.0.0-beta.1.vsix
     */
    private extractVersionFromVsixFilename(filename: string): string | undefined {
        // Match version pattern: digits.digits.digits (with optional pre-release)
        const match = filename.match(/(\d+\.\d+\.\d+)(?:[-.]\w+)?\.vsix$/);
        return match ? match[1] : undefined;
    }

    /**
     * Read version from the workspace's package.json.
     */
    private getRepoVersion(): string | undefined {
        try {
            const pkgPath = path.join(this.workspaceRoot, 'package.json');
            const content = fs.readFileSync(pkgPath, 'utf-8');
            const pkg = JSON.parse(content);
            return pkg.version;
        } catch {
            return undefined;
        }
    }

    /**
     * Get the currently installed extension version.
     */
    private getInstalledVersion(): string | undefined {
        const ext = vscode.extensions.getExtension('ai-command-center.ai-command-center')
            ?? vscode.extensions.getExtension('bmcdonnell.ai-command-center');
        return ext?.packageJSON?.version;
    }

    /**
     * Semver comparison: returns true when `a` is strictly newer than `b`.
     */
    private isNewer(a: string, b: string): boolean {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const na = pa[i] ?? 0;
            const nb = pb[i] ?? 0;
            if (na > nb) { return true; }
            if (na < nb) { return false; }
        }
        return false;
    }

    /**
     * Install a VSIX directly from the cache directory.
     */
    private async installFromCache(vsixPath: string): Promise<void> {
        if (!fs.existsSync(vsixPath)) {
            vscode.window.showErrorMessage(`VSIX file not found: ${vsixPath}`);
            return;
        }

        try {
            await vscode.commands.executeCommand(
                'workbench.extensions.installExtension',
                vscode.Uri.file(vsixPath)
            );
            logger.info('Installed VSIX from cache', { path: vsixPath });

            const choice = await vscode.window.showInformationMessage(
                'AI Command Center has been updated. Reload to activate the new version?',
                'Reload Now',
                'Later'
            );
            if (choice === 'Reload Now') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } catch (err) {
            logger.error('Failed to install VSIX from cache', { error: String(err) });
            // Fall back to terminal-based install
            const terminal = vscode.window.createTerminal({ name: 'VSIX Install', cwd: VSIX_CACHE_DIR });
            terminal.show();
            terminal.sendText(`code --install-extension "${vsixPath}"`);
        }
    }

    /**
     * Run the build-vsix.sh script, install the result, and
     * copy the built VSIX to the cache directory.
     */
    private async buildAndInstall(): Promise<void> {
        const scriptPath = path.join(this.workspaceRoot, 'build-vsix.sh');
        if (!fs.existsSync(scriptPath)) {
            vscode.window.showErrorMessage('build-vsix.sh not found in workspace root.');
            return;
        }

        // Ensure cache directory exists
        if (!fs.existsSync(VSIX_CACHE_DIR)) {
            fs.mkdirSync(VSIX_CACHE_DIR, { recursive: true });
        }

        const terminal = vscode.window.createTerminal({ name: 'VSIX Build & Install', cwd: this.workspaceRoot });
        terminal.show();
        // Build, install, and copy to cache
        terminal.sendText(
            `bash "${scriptPath}" && ` +
            `code --install-extension *.vsix && ` +
            `cp -f *.vsix "${VSIX_CACHE_DIR}/"`
        );

        logger.info('Triggered VSIX build, install & cache via terminal');
    }

    dispose(): void {
        if (this.disposed) { return; }
        this.disposed = true;
        this.packageWatcher?.dispose();
        this.gitWatcher?.dispose();
        this.cacheWatcher?.dispose();
        if (this.periodicTimer) {
            clearInterval(this.periodicTimer);
            this.periodicTimer = undefined;
        }
    }
}
