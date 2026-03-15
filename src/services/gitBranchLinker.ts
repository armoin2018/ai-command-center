/**
 * Git Branch Auto-Linker
 *
 * Watches the VS Code Git extension for branch changes, detects branches
 * whose names contain AICC-NNNN item IDs, and automatically links them
 * to the corresponding planning items in PLAN.json. Also detects merges
 * into main/master and updates item status to Done.
 *
 * Part of AICC-0122: Git Branch Auto-Linking
 *   - AICC-0123: Branch pattern detection & auto-linking
 *     - AICC-0336: Implement branch name regex pattern matcher
 *     - AICC-0337: Integrate with VS Code Git API for branch events
 *     - AICC-0338: Wire auto-link: branch → planning item gitRepoBranch
 *   - AICC-0124: Branch merge detection & multi-branch support
 *     - AICC-0339: Implement merge event detection
 *     - AICC-0340: Add automatic status update on merge to main
 *     - AICC-0341: Support multi-branch linking for stories
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';
import { EventBus } from '../services/eventBus';
import {
    EventChannels,
    type PlanningItemEvent,
    type PlanningStatusChangeEvent,
} from '../types/events';
import {
    ItemType,
    type IPlanData,
} from '../planning/types';

// ─── Git Extension API Types ─────────────────────────────────────────
// These types mirror the VS Code Git extension's exported API.
// The actual typings come from the `vscode.git` extension at runtime.

/**
 * Minimal Git extension API surface needed by this module.
 */
interface GitExtensionAPI {
    readonly state: 'uninitialized' | 'initialized';
    readonly onDidChangeState: vscode.Event<'uninitialized' | 'initialized'>;
    readonly repositories: Repository[];
    readonly onDidOpenRepository: vscode.Event<Repository>;
    readonly onDidCloseRepository: vscode.Event<Repository>;
}

/**
 * Minimal Repository interface from the Git extension.
 */
interface Repository {
    readonly rootUri: vscode.Uri;
    readonly state: RepositoryState;
    readonly onDidChangeState: vscode.Event<void>;
}

/**
 * Minimal RepositoryState interface.
 */
interface RepositoryState {
    readonly HEAD: Branch | undefined;
    readonly refs: Ref[];
    readonly remotes: Remote[];
    readonly onDidChange: vscode.Event<void>;
}

/**
 * Minimal Branch interface.
 */
interface Branch {
    readonly name?: string;
    readonly commit?: string;
    readonly upstream?: { name: string; commit?: string };
}

/**
 * Minimal Ref interface.
 */
interface Ref {
    readonly type: number; // 0 = Head, 1 = RemoteHead, 2 = Tag
    readonly name?: string;
    readonly commit?: string;
    readonly remote?: string;
}

/**
 * Minimal Remote interface.
 */
interface Remote {
    readonly name: string;
    readonly fetchUrl?: string;
    readonly pushUrl?: string;
}

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Represents a link between a git branch and a planning item.
 */
export interface BranchLink {
    /** The full branch name (e.g. "feature/AICC-0042-login-flow") */
    branchName: string;
    /** Absolute path to the git repository root */
    repoPath: string;
    /** ISO 8601 timestamp when the branch was linked */
    linkedAt: string;
    /** ISO 8601 timestamp when the branch was merged (if detected) */
    mergedAt?: string;
    /** The target branch it was merged into (e.g. "main") */
    mergeTarget?: string;
}

/**
 * Internal map of item ID → linked branches.
 */
type BranchLinkMap = Map<string, BranchLink[]>;

// ─── Constants ───────────────────────────────────────────────────────

/**
 * Regex pattern to extract an AICC-NNNN item ID from a branch name.
 *
 * Supports common prefixes: feature, bugfix, hotfix, fix, chore, epic.
 * The prefix/separator is optional so bare "AICC-0042" in any branch works.
 *
 * @example
 * "feature/AICC-0042-login-flow"  → "AICC-0042"
 * "bugfix/AICC-0099"              → "AICC-0099"
 * "AICC-0001-some-thing"          → "AICC-0001"
 */
const BRANCH_ITEM_PATTERN =
    /(?:feature|bugfix|hotfix|fix|chore|epic)\/?(AICC-\d{4})/i;

/**
 * Fallback: match AICC-NNNN anywhere in the branch name.
 */
const BRANCH_ITEM_FALLBACK = /(AICC-\d{4})/i;

/**
 * Branch names considered "main" for merge detection.
 */
const MAIN_BRANCHES = new Set(['main', 'master', 'develop', 'release']);

/**
 * Debounce interval for branch-change events (ms).
 */
const BRANCH_CHANGE_DEBOUNCE_MS = 1000;

// ─── GitBranchLinker ─────────────────────────────────────────────────

/**
 * Singleton service that watches for git branch changes and automatically
 * links branches to planning items when the branch name contains an
 * AICC-NNNN identifier.
 *
 * Implements `vscode.Disposable` for clean teardown.
 *
 * @example
 * ```ts
 * const linker = GitBranchLinker.getInstance();
 * await linker.initialize();
 *
 * // Later, check linked branches for an item
 * const links = linker.getLinkedBranches('AICC-0042');
 * ```
 */
export class GitBranchLinker implements vscode.Disposable {
    private static instance: GitBranchLinker;
    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    /** All known branch links, keyed by item ID */
    private readonly branchLinks: BranchLinkMap = new Map();

    /** Disposables for event subscriptions */
    private readonly disposables: vscode.Disposable[] = [];

    /** Git extension API reference */
    private gitApi: GitExtensionAPI | null = null;

    /** Track the last seen branch per repo to detect changes */
    private readonly lastBranchPerRepo: Map<string, string> = new Map();

    /** Debounce timers per repository */
    private readonly debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    /** Whether the linker has been initialised */
    private initialised = false;

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();

        this.logger.info('GitBranchLinker created', {
            component: 'GitBranchLinker',
        });
    }

    /**
     * Get or create the singleton instance.
     * @returns The GitBranchLinker singleton
     */
    public static getInstance(): GitBranchLinker {
        if (!GitBranchLinker.instance) {
            GitBranchLinker.instance = new GitBranchLinker();
        }
        return GitBranchLinker.instance;
    }

    // ─── Lifecycle ───────────────────────────────────────────────

    /**
     * Initialise the linker by acquiring the VS Code Git extension API
     * and setting up branch-change watchers for all open repositories.
     *
     * Safe to call multiple times; subsequent calls are no-ops.
     *
     * @returns Promise that resolves once initialisation is complete
     */
    public async initialize(): Promise<void> {
        if (this.initialised) {
            this.logger.debug('GitBranchLinker already initialised', {
                component: 'GitBranchLinker',
            });
            return;
        }

        try {
            this.gitApi = await this.getGitApi();

            if (!this.gitApi) {
                this.logger.warn(
                    'Git extension not available — branch linking disabled',
                    { component: 'GitBranchLinker' },
                );
                return;
            }

            // Load persisted branch links from plan data
            await this.loadPersistedLinks();

            // Watch existing repositories
            for (const repo of this.gitApi.repositories) {
                this.watchRepository(repo);
            }

            // Watch for new repositories
            this.disposables.push(
                this.gitApi.onDidOpenRepository((repo: Repository) => {
                    this.logger.info('New git repository opened, watching', {
                        component: 'GitBranchLinker',
                        repoPath: repo.rootUri.fsPath,
                    });
                    this.watchRepository(repo);
                }),
            );

            this.initialised = true;

            this.logger.info('GitBranchLinker initialised', {
                component: 'GitBranchLinker',
                repoCount: this.gitApi.repositories.length,
                existingLinks: this.branchLinks.size,
            });
        } catch (error) {
            this.logger.error('Failed to initialise GitBranchLinker', {
                component: 'GitBranchLinker',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Dispose all subscriptions and timers.
     */
    public dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;

        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        this.initialised = false;

        this.logger.info('GitBranchLinker disposed', {
            component: 'GitBranchLinker',
        });
    }

    // ─── Git API Acquisition ─────────────────────────────────────

    /**
     * Acquire the VS Code Git extension API.
     *
     * @returns The GitExtensionAPI, or null if the extension is not available
     */
    private async getGitApi(): Promise<GitExtensionAPI | null> {
        try {
            const gitExtension = vscode.extensions.getExtension<{
                getAPI(version: number): GitExtensionAPI;
            }>('vscode.git');

            if (!gitExtension) {
                this.logger.warn('vscode.git extension not found', {
                    component: 'GitBranchLinker',
                });
                return null;
            }

            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }

            const api = gitExtension.exports.getAPI(1);

            if (api.state !== 'initialized') {
                // Wait for initialisation
                await new Promise<void>((resolve) => {
                    const sub = api.onDidChangeState((state) => {
                        if (state === 'initialized') {
                            sub.dispose();
                            resolve();
                        }
                    });
                    // Timeout after 10s
                    setTimeout(() => {
                        sub.dispose();
                        resolve();
                    }, 10_000);
                });
            }

            return api;
        } catch (error) {
            this.logger.error('Failed to acquire Git API', {
                component: 'GitBranchLinker',
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    // ─── Repository Watching ─────────────────────────────────────

    /**
     * Set up a branch-change watcher on a repository.
     *
     * @param repo - The git repository to watch
     */
    private watchRepository(repo: Repository): void {
        const repoPath = repo.rootUri.fsPath;

        // Record the current branch
        const currentBranch = repo.state.HEAD?.name;
        if (currentBranch) {
            this.lastBranchPerRepo.set(repoPath, currentBranch);

            // Auto-link on initial scan
            const itemId = this.detectItemId(currentBranch);
            if (itemId) {
                this.linkBranchToItem(itemId, currentBranch, repoPath).catch(
                    (err) =>
                        this.logger.warn('Initial branch link failed', {
                            component: 'GitBranchLinker',
                            error: String(err),
                        }),
                );
            }
        }

        // Subscribe to state changes (HEAD, refs, etc.)
        const sub = repo.state.onDidChange(() => {
            this.debouncedBranchChange(repo);
        });

        this.disposables.push(sub);

        this.logger.debug('Watching repository for branch changes', {
            component: 'GitBranchLinker',
            repoPath,
            currentBranch: currentBranch ?? '(detached)',
        });
    }

    /**
     * Debounce rapid state-change events from a repository.
     *
     * @param repo - The repository that changed
     */
    private debouncedBranchChange(repo: Repository): void {
        const repoPath = repo.rootUri.fsPath;

        const existing = this.debounceTimers.get(repoPath);
        if (existing) {
            clearTimeout(existing);
        }

        const timer = setTimeout(() => {
            this.debounceTimers.delete(repoPath);
            this.onBranchChange(repo).catch((err) =>
                this.logger.error('Branch change handler error', {
                    component: 'GitBranchLinker',
                    error: String(err),
                }),
            );
        }, BRANCH_CHANGE_DEBOUNCE_MS);

        this.debounceTimers.set(repoPath, timer);
    }

    // ─── Branch Change Detection ─────────────────────────────────

    /**
     * Called when the HEAD of a repository changes. Detects whether the
     * new branch contains an AICC-NNNN item ID and links it accordingly.
     * Also checks whether the previous branch was merged.
     *
     * @param repo - The repository whose HEAD changed
     */
    public async onBranchChange(repo: Repository): Promise<void> {
        const repoPath = repo.rootUri.fsPath;
        const newBranch = repo.state.HEAD?.name;
        const previousBranch = this.lastBranchPerRepo.get(repoPath);

        // Update tracking
        if (newBranch) {
            this.lastBranchPerRepo.set(repoPath, newBranch);
        }

        // If branch didn't actually change, skip
        if (newBranch === previousBranch) {
            return;
        }

        this.logger.debug('Branch change detected', {
            component: 'GitBranchLinker',
            repoPath,
            previousBranch: previousBranch ?? '(none)',
            newBranch: newBranch ?? '(detached)',
        });

        // 1. Check if previous branch was merged into a main branch
        if (previousBranch && newBranch && this.isMainBranch(newBranch)) {
            await this.detectMerge(repo, previousBranch, newBranch);
        }

        // 2. Link new branch if it contains an item ID
        if (newBranch) {
            const itemId = this.detectItemId(newBranch);
            if (itemId) {
                await this.linkBranchToItem(itemId, newBranch, repoPath);

                // Show a subtle notification
                vscode.window.setStatusBarMessage(
                    `$(git-branch) Linked ${newBranch} → ${itemId}`,
                    5000,
                );
            }
        }
    }

    // ─── Item ID Detection ───────────────────────────────────────

    /**
     * Extract an AICC-NNNN item ID from a branch name.
     *
     * Tries the strict pattern first (with conventional prefix),
     * then falls back to matching AICC-NNNN anywhere in the name.
     *
     * @param branchName - The full branch name
     * @returns The extracted item ID (e.g. "AICC-0042"), or null
     */
    public detectItemId(branchName: string): string | null {
        // Try strict pattern first
        const strictMatch = branchName.match(BRANCH_ITEM_PATTERN);
        if (strictMatch) {
            return strictMatch[1].toUpperCase();
        }

        // Fallback: AICC-NNNN anywhere
        const fallbackMatch = branchName.match(BRANCH_ITEM_FALLBACK);
        if (fallbackMatch) {
            return fallbackMatch[1].toUpperCase();
        }

        return null;
    }

    // ─── Branch Linking ──────────────────────────────────────────

    /**
     * Link a branch to a planning item by updating the item's
     * `gitRepoBranch` field and adding to the internal links map.
     *
     * Supports multi-branch linking: a single item (e.g. a story) can
     * have multiple branches linked to it.
     *
     * @param itemId - The AICC-NNNN item ID
     * @param branchName - The branch name to link
     * @param repoPath - The git repository root path
     */
    public async linkBranchToItem(
        itemId: string,
        branchName: string,
        repoPath: string,
    ): Promise<void> {
        try {
            // Check if already linked
            const existingLinks = this.branchLinks.get(itemId) ?? [];
            const alreadyLinked = existingLinks.some(
                (l) => l.branchName === branchName && l.repoPath === repoPath,
            );
            if (alreadyLinked) {
                this.logger.debug('Branch already linked, skipping', {
                    component: 'GitBranchLinker',
                    itemId,
                    branchName,
                });
                return;
            }

            // Create link record
            const link: BranchLink = {
                branchName,
                repoPath,
                linkedAt: new Date().toISOString(),
            };

            // Add to in-memory map
            if (!this.branchLinks.has(itemId)) {
                this.branchLinks.set(itemId, []);
            }
            this.branchLinks.get(itemId)!.push(link);

            // Update PLAN.json
            await this.updatePlanItemBranch(itemId, branchName);

            // Emit event
            await this.emitUpdatedEvent(itemId, 'branch_linked');

            this.logger.info('Branch linked to planning item', {
                component: 'GitBranchLinker',
                itemId,
                branchName,
                repoPath,
                totalLinksForItem: this.branchLinks.get(itemId)?.length ?? 0,
            });
        } catch (error) {
            this.logger.error('Failed to link branch to item', {
                component: 'GitBranchLinker',
                itemId,
                branchName,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // ─── Merge Detection ─────────────────────────────────────────

    /**
     * Detect whether a previously checked-out branch was merged into
     * the current (target) branch. This is inferred when:
     * 1. The user switches from a feature branch to main/master
     * 2. The feature branch's last commit is reachable from main
     *
     * Since we cannot run git commands directly, we use a heuristic:
     * if the user was on a feature branch and switched to main, we
     * check whether the feature branch ref is still present. If the
     * branch ref is gone (deleted after merge) or if main's commit
     * has advanced, we consider it merged.
     *
     * @param repo - The git repository
     * @param previousBranch - The branch the user was on
     * @param targetBranch - The branch the user switched to (main/master)
     */
    public async detectMerge(
        repo: Repository,
        previousBranch: string,
        targetBranch: string,
    ): Promise<void> {
        const itemId = this.detectItemId(previousBranch);
        if (!itemId) {
            return;
        }

        try {
            // Check if the previous branch still exists as a local ref
            const branchStillExists = repo.state.refs.some(
                (ref) =>
                    ref.type === 0 && // Local head
                    ref.name === previousBranch,
            );

            if (!branchStillExists) {
                // Branch was deleted — strong indicator of a merge
                this.logger.info('Branch deleted after switching to main — likely merged', {
                    component: 'GitBranchLinker',
                    itemId,
                    previousBranch,
                    targetBranch,
                });

                await this.onMergeDetected(itemId, previousBranch, targetBranch);
            } else {
                // Branch still exists — could be a simple switch.
                // In a future enhancement, we could shell out to `git merge-base`
                // to confirm. For now, log and skip.
                this.logger.debug('Branch still exists after switch to main — not auto-marking as merged', {
                    component: 'GitBranchLinker',
                    itemId,
                    previousBranch,
                    targetBranch,
                });
            }
        } catch (error) {
            this.logger.error('Merge detection error', {
                component: 'GitBranchLinker',
                itemId,
                previousBranch,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Handle a detected merge: update the branch link with merge info
     * and set the planning item status to Done.
     *
     * @param itemId - The AICC-NNNN item ID
     * @param branchName - The merged branch name
     * @param targetBranch - The branch it was merged into (e.g. "main")
     */
    public async onMergeDetected(
        itemId: string,
        branchName: string,
        targetBranch: string,
    ): Promise<void> {
        try {
            const now = new Date().toISOString();

            // Update the branch link record
            const links = this.branchLinks.get(itemId);
            if (links) {
                const link = links.find((l) => l.branchName === branchName);
                if (link) {
                    link.mergedAt = now;
                    link.mergeTarget = targetBranch;
                }
            }

            // Update planning item status to Done
            const previousStatus = await this.updatePlanItemStatusOnMerge(
                itemId,
                targetBranch,
            );

            // Emit status changed event
            if (previousStatus && previousStatus !== 'done') {
                await this.emitStatusChangedEvent(
                    itemId,
                    previousStatus,
                    'done',
                );
            }

            // Show notification
            vscode.window.showInformationMessage(
                `🎉 Branch "${branchName}" merged to ${targetBranch} — ${itemId} marked as Done`,
            );

            this.logger.info('Merge detected and item updated', {
                component: 'GitBranchLinker',
                itemId,
                branchName,
                targetBranch,
            });
        } catch (error) {
            this.logger.error('Failed to handle merge event', {
                component: 'GitBranchLinker',
                itemId,
                branchName,
                targetBranch,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // ─── Query API ───────────────────────────────────────────────

    /**
     * Get all branches linked to a planning item.
     *
     * @param itemId - The AICC-NNNN item ID
     * @returns Array of BranchLink records (may be empty)
     */
    public getLinkedBranches(itemId: string): BranchLink[] {
        return this.branchLinks.get(itemId.toUpperCase()) ?? [];
    }

    /**
     * Get the total number of linked items.
     * @returns Count of items with at least one linked branch
     */
    public getLinkedItemCount(): number {
        return this.branchLinks.size;
    }

    /**
     * Get a summary of all branch links for diagnostics.
     * @returns Record of itemId → branch names
     */
    public getLinkSummary(): Record<string, string[]> {
        const summary: Record<string, string[]> = {};
        for (const [itemId, links] of this.branchLinks) {
            summary[itemId] = links.map((l) => l.branchName);
        }
        return summary;
    }

    // ─── PLAN.json I/O ──────────────────────────────────────────

    /**
     * Update the `gitRepoBranch` field on a planning item in PLAN.json.
     *
     * @param itemId - The item ID to update
     * @param branchName - The branch name to set
     */
    private async updatePlanItemBranch(
        itemId: string,
        branchName: string,
    ): Promise<void> {
        try {
            const planData = await this.loadPlanData();
            if (!planData) {
                this.logger.warn('No PLAN.json found — cannot update branch link', {
                    component: 'GitBranchLinker',
                    itemId,
                });
                return;
            }

            const item = planData.items.find(
                (i) => i.id.toUpperCase() === itemId.toUpperCase(),
            );
            if (!item) {
                this.logger.warn('Item not found in PLAN.json', {
                    component: 'GitBranchLinker',
                    itemId,
                });
                return;
            }

            // Set branch (keep existing if already set to a different branch)
            // For multi-branch: we set the most recent branch
            (item as any).gitRepoBranch = branchName;
            item.lastUpdatedOn = new Date().toISOString();

            // If the item is in "todo" or "ready", auto-move to "in-progress"
            if (item.status === 'todo' || item.status === 'ready') {
                const previousStatus = item.status;
                (item as any).status = 'in-progress';

                this.logger.info('Auto-updating item status on branch checkout', {
                    component: 'GitBranchLinker',
                    itemId,
                    previousStatus,
                    newStatus: 'in-progress',
                });

                // Emit status change event
                await this.emitStatusChangedEvent(itemId, previousStatus, 'in-progress');
            }

            await this.savePlanData(planData);
        } catch (error) {
            this.logger.error('Failed to update plan item branch', {
                component: 'GitBranchLinker',
                itemId,
                branchName,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Update a planning item's status to "done" when its branch is merged.
     *
     * @param itemId - The item ID
     * @param targetBranch - The target branch (for logging)
     * @returns The previous status, or null if item not found
     */
    private async updatePlanItemStatusOnMerge(
        itemId: string,
        targetBranch: string,
    ): Promise<string | null> {
        try {
            const planData = await this.loadPlanData();
            if (!planData) {
                return null;
            }

            const item = planData.items.find(
                (i) => i.id.toUpperCase() === itemId.toUpperCase(),
            );
            if (!item) {
                return null;
            }

            const previousStatus = item.status;

            // Only update if not already done
            if (previousStatus !== 'done') {
                (item as any).status = 'done';
                (item as any).deliveredOn = new Date().toISOString();
                item.lastUpdatedOn = new Date().toISOString();

                await this.savePlanData(planData);

                this.logger.info('Item status updated to done on merge', {
                    component: 'GitBranchLinker',
                    itemId,
                    previousStatus,
                    targetBranch,
                });
            }

            return previousStatus;
        } catch (error) {
            this.logger.error('Failed to update item status on merge', {
                component: 'GitBranchLinker',
                itemId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Load persisted branch links from PLAN.json on startup.
     * Scans all items with a `gitRepoBranch` field and populates
     * the in-memory map.
     */
    private async loadPersistedLinks(): Promise<void> {
        try {
            const planData = await this.loadPlanData();
            if (!planData) {
                return;
            }

            let linkCount = 0;
            for (const item of planData.items) {
                if (item.gitRepoBranch) {
                    const link: BranchLink = {
                        branchName: item.gitRepoBranch,
                        repoPath: '', // Unknown from persisted data
                        linkedAt: item.lastUpdatedOn || item.createdOn,
                    };

                    if (!this.branchLinks.has(item.id)) {
                        this.branchLinks.set(item.id, []);
                    }
                    this.branchLinks.get(item.id)!.push(link);
                    linkCount++;
                }
            }

            if (linkCount > 0) {
                this.logger.info('Loaded persisted branch links', {
                    component: 'GitBranchLinker',
                    linkCount,
                });
            }
        } catch (error) {
            this.logger.warn('Failed to load persisted branch links', {
                component: 'GitBranchLinker',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Load PLAN.json from the workspace.
     *
     * @returns Parsed plan data, or null if not found
     */
    private async loadPlanData(): Promise<IPlanData | null> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }

            const planPath = path.join(
                workspaceFolders[0].uri.fsPath,
                '.project',
                'PLAN.json',
            );

            if (!fs.existsSync(planPath)) {
                return null;
            }

            const content = fs.readFileSync(planPath, 'utf-8');
            return JSON.parse(content) as IPlanData;
        } catch (error) {
            this.logger.error('Failed to load PLAN.json', {
                component: 'GitBranchLinker',
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Save plan data to PLAN.json.
     *
     * @param planData - The data to write
     */
    private async savePlanData(planData: IPlanData): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder available');
        }

        const planPath = path.join(
            workspaceFolders[0].uri.fsPath,
            '.project',
            'PLAN.json',
        );

        planData.metadata.updatedAt = new Date().toISOString();
        fs.writeFileSync(planPath, JSON.stringify(planData, null, 2), 'utf-8');
    }

    // ─── EventBus Integration ────────────────────────────────────

    /**
     * Emit a planning.*.updated event.
     *
     * @param itemId - The item ID
     * @param action - Description of the update action
     */
    private async emitUpdatedEvent(
        itemId: string,
        action: string,
    ): Promise<void> {
        try {
            const planData = await this.loadPlanData();
            const item = planData?.items.find(
                (i) => i.id.toUpperCase() === itemId.toUpperCase(),
            );
            if (!item) {
                return;
            }

            const channel = this.getUpdatedChannel(item.type);
            if (!channel) {
                return;
            }

            const event: PlanningItemEvent = {
                timestamp: Date.now(),
                source: 'GitBranchLinker',
                itemId: item.id,
                itemType: item.type as 'epic' | 'story' | 'task' | 'bug',
                action: 'updated',
                after: { ...(item as unknown as Record<string, unknown>), _updateAction: action },
            };

            await this.eventBus.emit(channel, event);
        } catch (error) {
            this.logger.warn('Failed to emit updated event', {
                component: 'GitBranchLinker',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Emit a planning.*.statusChanged event.
     *
     * @param itemId - The item ID
     * @param previousStatus - The old status
     * @param newStatus - The new status
     */
    private async emitStatusChangedEvent(
        itemId: string,
        previousStatus: string,
        newStatus: string,
    ): Promise<void> {
        try {
            const planData = await this.loadPlanData();
            const item = planData?.items.find(
                (i) => i.id.toUpperCase() === itemId.toUpperCase(),
            );
            if (!item) {
                return;
            }

            const channel = this.getStatusChangedChannel(item.type);
            if (!channel) {
                return;
            }

            const event: PlanningStatusChangeEvent = {
                timestamp: Date.now(),
                source: 'GitBranchLinker',
                itemId: item.id,
                itemType: item.type as 'epic' | 'story' | 'task' | 'bug',
                previousStatus,
                newStatus,
            };

            await this.eventBus.emit(channel, event);
        } catch (error) {
            this.logger.warn('Failed to emit status changed event', {
                component: 'GitBranchLinker',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Get the updated channel for an item type.
     * @param type - The item type
     * @returns Channel string or null
     */
    private getUpdatedChannel(type: ItemType | string): string | null {
        switch (type) {
            case ItemType.Epic:
                return EventChannels.Planning.Epic.Updated;
            case ItemType.Story:
                return EventChannels.Planning.Story.Updated;
            case ItemType.Task:
                return EventChannels.Planning.Task.Updated;
            case ItemType.Bug:
                return EventChannels.Planning.Task.Updated;
            default:
                return null;
        }
    }

    /**
     * Get the status changed channel for an item type.
     * @param type - The item type
     * @returns Channel string or null
     */
    private getStatusChangedChannel(type: ItemType | string): string | null {
        switch (type) {
            case ItemType.Epic:
                return EventChannels.Planning.Epic.StatusChanged;
            case ItemType.Story:
                return EventChannels.Planning.Story.StatusChanged;
            case ItemType.Task:
                return EventChannels.Planning.Task.StatusChanged;
            case ItemType.Bug:
                return EventChannels.Planning.Task.StatusChanged;
            default:
                return null;
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────

    /**
     * Check whether a branch name is considered a main/default branch.
     *
     * @param branchName - The branch name to check
     * @returns True if the branch is main, master, develop, or release
     */
    private isMainBranch(branchName: string): boolean {
        return MAIN_BRANCHES.has(branchName.toLowerCase());
    }
}
