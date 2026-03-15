/**
 * Smart Context Engine Service
 *
 * Auto-surfaces relevant planning items based on the active editor file.
 * When a developer opens or edits a file, the engine analyzes file content
 * (imports, tags, identifiers, comments) and matches against plan items
 * to surface related stories, tasks, and bugs in a panel section.
 *
 * Part of AICC-0142: Smart Context Engine
 *   - AICC-0143: Active file detection & tag-based matching
 *   - AICC-0386: Implement active file detection via editor events
 *   - AICC-0387: Build tag extraction service from file content
 *   - AICC-0388: Implement matching algorithm against planning items
 *   - AICC-0389: Add relevance scoring with configurable thresholds
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';
import { EventBus } from './eventBus';
import { type IPlanData, type PlanningItem } from '../planning/types';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Reason why a planning item matched the current file context.
 */
export interface MatchReason {
    /** Category of the match */
    type: 'file_path' | 'tag' | 'content' | 'import' | 'comment' | 'parent' | 'recent';
    /** Human-readable detail describing the specific match */
    detail: string;
    /** Numeric weight contributing to the overall score */
    weight: number;
}

/**
 * A planning item that matched the current file context.
 */
export interface ContextMatch {
    /** Planning item ID (e.g. "AICC-0142") */
    itemId: string;
    /** Item type (epic, story, task, bug) */
    itemType: string;
    /** Item summary / title */
    summary: string;
    /** Current status of the item */
    status: string;
    /** Composite relevance score */
    score: number;
    /** Individual reasons that contributed to the match */
    matchReasons: MatchReason[];
    /** Priority of the planning item */
    priority: string;
}

/**
 * Configuration for the Smart Context Engine.
 * Values are read from `aicc.smartContext.*` VS Code settings.
 */
export interface ContextConfig {
    /** Whether the engine is active */
    enabled: boolean;
    /** Minimum composite score to include a match */
    minScore: number;
    /** Maximum number of matches to surface */
    maxResults: number;
    /** Debounce delay for editor change events (ms) */
    debounceMs: number;
    /** Weight multiplier for file-path matches */
    filePathWeight: number;
    /** Weight multiplier for tag matches */
    tagWeight: number;
    /** Weight multiplier for content / identifier matches */
    contentWeight: number;
    /** Weight multiplier for import-path matches */
    importWeight: number;
    /** Weight multiplier for recently-interacted items */
    recentWeight: number;
}

/**
 * Extracted context information from the currently active file.
 */
export interface FileContext {
    /** Absolute file path */
    filePath: string;
    /** Workspace-relative file path */
    relativePath: string;
    /** Language identifier (typescript, javascript, python, etc.) */
    language: string;
    /** Import / require paths found in the file */
    imports: string[];
    /** Tags extracted from JSDoc, hashtags, and AICC references */
    tags: string[];
    /** Significant identifiers (class names, function names, exports) */
    identifiers: string[];
    /** Comment text blocks found in the file */
    comments: string[];
}

// ─── Default Configuration ───────────────────────────────────────────

const DEFAULT_CONFIG: ContextConfig = {
    enabled: true,
    minScore: 5,
    maxResults: 15,
    debounceMs: 500,
    filePathWeight: 10,
    tagWeight: 5,
    contentWeight: 3,
    importWeight: 4,
    recentWeight: 2,
};

// ─── Weight Constants for Direct References ──────────────────────────

/** Weight for a direct AICC-NNNN reference found in file comments */
const DIRECT_REFERENCE_WEIGHT = 15;

/** Weight for parent-item propagation */
const PARENT_PROPAGATION_WEIGHT = 2;

// ─── SmartContextEngine ──────────────────────────────────────────────

/**
 * Singleton service that analyses the currently active editor file and
 * matches its content against planning items to surface contextually
 * relevant stories, tasks, and bugs.
 *
 * Integrates with the {@link EventBus} to react to planning mutations
 * and invalidate cached matches.
 *
 * @example
 * ```ts
 * const engine = SmartContextEngine.getInstance();
 * engine.initialize();
 * const matches = engine.getCurrentMatches();
 * ```
 */
export class SmartContextEngine implements vscode.Disposable {

    // ── Singleton ────────────────────────────────────────────────

    private static instance: SmartContextEngine | undefined;

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): SmartContextEngine {
        if (!SmartContextEngine.instance) {
            SmartContextEngine.instance = new SmartContextEngine();
        }
        return SmartContextEngine.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        if (SmartContextEngine.instance) {
            SmartContextEngine.instance.dispose();
        }
        SmartContextEngine.instance = undefined;
    }

    // ── State ────────────────────────────────────────────────────

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly disposables: vscode.Disposable[] = [];

    /** Debounce timer handle for editor change events */
    private debounceTimer: ReturnType<typeof setTimeout> | undefined;

    /** Cached matches for the most recently analysed file */
    private currentMatches: ContextMatch[] = [];

    /** Absolute path of the last analysed file (for dedup) */
    private lastAnalysedPath: string | undefined;

    /** Set of item IDs the user has recently interacted with */
    private readonly recentItemIds: Set<string> = new Set();

    /** Maximum number of recent items to track */
    private static readonly MAX_RECENT_ITEMS = 50;

    /** Event emitter for match change notifications */
    private readonly _onMatchesChanged = new vscode.EventEmitter<ContextMatch[]>();

    /** Fires whenever the current set of context matches changes. */
    public readonly onMatchesChanged: vscode.Event<ContextMatch[]> = this._onMatchesChanged.event;

    // ── Constructor ──────────────────────────────────────────────

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
    }

    // ── Initialisation (AICC-0386) ───────────────────────────────

    /**
     * Register editor change listeners and subscribe to planning events.
     * Call once after the extension is activated.
     */
    public initialize(): void {
        const config = this.getConfig();
        if (!config.enabled) {
            this.logger.info('Smart Context Engine is disabled via configuration', {
                component: 'SmartContextEngine',
            });
            return;
        }

        this.logger.info('Initializing Smart Context Engine', {
            component: 'SmartContextEngine',
            minScore: config.minScore,
            maxResults: config.maxResults,
            debounceMs: config.debounceMs,
        });

        // Listen for active editor changes (AICC-0386)
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                this.onActiveEditorChanged(editor);
            }),
        );

        // Listen for document saves to re-analyse
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document === document) {
                    this.onActiveEditorChanged(activeEditor);
                }
            }),
        );

        // Subscribe to planning item changes to invalidate cache
        this.subscribeToPlanning();

        // Analyse the currently active editor immediately
        if (vscode.window.activeTextEditor) {
            this.onActiveEditorChanged(vscode.window.activeTextEditor);
        }

        this.logger.info('Smart Context Engine initialized', {
            component: 'SmartContextEngine',
        });
    }

    // ── Editor Change Handling (AICC-0386) ───────────────────────

    /**
     * Debounced handler for active editor changes.
     * Analyses the new editor's document and updates current matches.
     *
     * @param editor - The newly active text editor, or undefined if none
     */
    public onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
        // Clear previous debounce
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }

        if (!editor) {
            this.clearMatches();
            return;
        }

        // Skip non-file schemes (output, debug console, etc.)
        if (editor.document.uri.scheme !== 'file') {
            return;
        }

        // Debounce rapid editor switches
        const config = this.getConfig();
        this.debounceTimer = setTimeout(async () => {
            try {
                await this.analyzeAndMatch(editor.document);
            } catch (error) {
                this.logger.error('Error analysing active file for context matches', {
                    component: 'SmartContextEngine',
                    filePath: editor.document.uri.fsPath,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }, config.debounceMs);
    }

    // ── Core Analysis Pipeline ───────────────────────────────────

    /**
     * Run the full analysis pipeline: extract file context, find matches,
     * filter and sort, then emit change event.
     *
     * @param document - The text document to analyse
     */
    private async analyzeAndMatch(document: vscode.TextDocument): Promise<void> {
        const filePath = document.uri.fsPath;

        // Skip re-analysis if the path hasn't changed
        if (filePath === this.lastAnalysedPath) {
            // But allow re-analysis on save (path unchanged)
        }

        const start = Date.now();

        this.logger.debug(`Analysing file for context matches: ${filePath}`, {
            component: 'SmartContextEngine',
        });

        const fileContext = this.analyzeFile(document);
        const matches = await this.findMatches(fileContext);
        const config = this.getConfig();
        const filtered = this.filterAndSort(matches, config);

        this.currentMatches = filtered;
        this.lastAnalysedPath = filePath;

        const duration = Date.now() - start;

        this.logger.debug(`Context analysis complete`, {
            component: 'SmartContextEngine',
            filePath: fileContext.relativePath,
            totalCandidates: matches.length,
            matchesAfterFilter: filtered.length,
            duration,
        });

        this._onMatchesChanged.fire(filtered);
    }

    // ── File Context Extraction (AICC-0387) ──────────────────────

    /**
     * Extract structured context information from a text document.
     *
     * Parses imports, identifiers, tags, and comments to build a
     * {@link FileContext} object used for matching.
     *
     * @param document - The VS Code text document to analyse
     * @returns Extracted file context
     */
    public analyzeFile(document: vscode.TextDocument): FileContext {
        const text = document.getText();
        const language = document.languageId;
        const filePath = document.uri.fsPath;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath ?? '';
        const relativePath = workspaceRoot
            ? path.relative(workspaceRoot, filePath)
            : path.basename(filePath);

        return {
            filePath,
            relativePath: relativePath.replace(/\\/g, '/'),
            language,
            imports: this.extractImports(text, language),
            tags: this.extractTags(text),
            identifiers: this.extractIdentifiers(text, language),
            comments: this.extractComments(text, language),
        };
    }

    /**
     * Parse import / require paths from file content.
     *
     * Supports:
     * - ES module: `import { X } from 'path'` / `import X from 'path'`
     * - Dynamic import: `import('path')`
     * - CommonJS: `require('path')`
     *
     * @param text - Raw file content
     * @param language - Language identifier
     * @returns Array of resolved import path strings
     */
    public extractImports(text: string, language: string): string[] {
        const imports: Set<string> = new Set();

        if (['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(language)) {
            // Static ES imports: import { X } from 'path' or import X from 'path'
            const esImportRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
            let match: RegExpExecArray | null;
            while ((match = esImportRegex.exec(text)) !== null) {
                imports.add(match[1]);
            }

            // Dynamic imports: import('path')
            const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
            while ((match = dynamicImportRegex.exec(text)) !== null) {
                imports.add(match[1]);
            }

            // CommonJS: require('path')
            const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
            while ((match = requireRegex.exec(text)) !== null) {
                imports.add(match[1]);
            }

            // Re-exports: export { X } from 'path'
            const reExportRegex = /export\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
            while ((match = reExportRegex.exec(text)) !== null) {
                imports.add(match[1]);
            }
        } else if (language === 'python') {
            // Python: import X / from X import Y
            const pyImportRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
            let match: RegExpExecArray | null;
            while ((match = pyImportRegex.exec(text)) !== null) {
                imports.add(match[1] || match[2]);
            }
        }

        return Array.from(imports);
    }

    /**
     * Extract tags from file content.
     *
     * Detects:
     * - AICC-NNNN references (e.g. `AICC-0142`)
     * - JSDoc tags: `@tag`, `@see`, `@link`
     * - Hashtags: `#tag-name`
     * - TODO / FIXME annotations
     *
     * @param text - Raw file content
     * @returns Array of normalised tag strings
     */
    public extractTags(text: string): string[] {
        const tags: Set<string> = new Set();

        // AICC-NNNN references
        const aiccRefRegex = /\bAICC-\d{3,5}\b/g;
        let match: RegExpExecArray | null;
        while ((match = aiccRefRegex.exec(text)) !== null) {
            tags.add(match[0]);
        }

        // JSDoc @tag values: @see, @link, @todo, @fixme, @tag
        const jsdocTagRegex = /@(see|link|todo|fixme|tag)\s+(\S+)/gi;
        while ((match = jsdocTagRegex.exec(text)) !== null) {
            tags.add(`@${match[1].toLowerCase()}:${match[2]}`);
        }

        // Hashtags in comments: #some-tag (at least 2 chars after #)
        const hashtagRegex = /#([a-zA-Z][a-zA-Z0-9_-]{1,})/g;
        while ((match = hashtagRegex.exec(text)) !== null) {
            tags.add(`#${match[1].toLowerCase()}`);
        }

        // TODO / FIXME annotations
        const todoRegex = /\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.{0,60})/g;
        while ((match = todoRegex.exec(text)) !== null) {
            tags.add(`${match[1]}:${match[2].trim()}`);
        }

        return Array.from(tags);
    }

    /**
     * Extract significant identifiers (class names, function names,
     * exported symbols) from file content.
     *
     * @param text - Raw file content
     * @param language - Language identifier
     * @returns Array of identifier strings
     */
    public extractIdentifiers(text: string, language: string): string[] {
        const identifiers: Set<string> = new Set();

        if (['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(language)) {
            // Class declarations
            const classRegex = /\bclass\s+([A-Z][a-zA-Z0-9_]*)/g;
            let match: RegExpExecArray | null;
            while ((match = classRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }

            // Interface / type declarations (TS)
            const interfaceRegex = /\b(?:interface|type)\s+([A-Z][a-zA-Z0-9_]*)/g;
            while ((match = interfaceRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }

            // Function declarations (named)
            const funcRegex = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            while ((match = funcRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }

            // Exported const / let / var
            const exportedVarRegex = /\bexport\s+(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            while ((match = exportedVarRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }

            // Exported functions / classes
            const exportedFuncRegex = /\bexport\s+(?:default\s+)?(?:function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            while ((match = exportedFuncRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }

            // Arrow function assignments: const name = (
            const arrowRegex = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;
            while ((match = arrowRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }

            // Enum declarations (TS)
            const enumRegex = /\benum\s+([A-Z][a-zA-Z0-9_]*)/g;
            while ((match = enumRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }
        } else if (language === 'python') {
            // Python class / function definitions
            const pyClassRegex = /\bclass\s+([A-Z][a-zA-Z0-9_]*)/g;
            let match: RegExpExecArray | null;
            while ((match = pyClassRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }
            const pyFuncRegex = /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
            while ((match = pyFuncRegex.exec(text)) !== null) {
                identifiers.add(match[1]);
            }
        }

        return Array.from(identifiers);
    }

    /**
     * Extract comment blocks from file content.
     *
     * @param text - Raw file content
     * @param language - Language identifier
     * @returns Array of comment text strings
     */
    public extractComments(text: string, language: string): string[] {
        const comments: string[] = [];

        if (['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(language)) {
            // Single-line comments: // ...
            const singleLineRegex = /\/\/\s*(.*)/g;
            let match: RegExpExecArray | null;
            while ((match = singleLineRegex.exec(text)) !== null) {
                const comment = match[1].trim();
                if (comment.length > 2) {
                    comments.push(comment);
                }
            }

            // Multi-line / JSDoc comments: /* ... */ and /** ... */
            const multiLineRegex = /\/\*\*?([\s\S]*?)\*\//g;
            while ((match = multiLineRegex.exec(text)) !== null) {
                const cleaned = match[1]
                    .split('\n')
                    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
                    .filter((line) => line.length > 0)
                    .join(' ');
                if (cleaned.length > 2) {
                    comments.push(cleaned);
                }
            }
        } else if (language === 'python') {
            // Python single-line comments
            const pyCommentRegex = /#\s*(.*)/g;
            let match: RegExpExecArray | null;
            while ((match = pyCommentRegex.exec(text)) !== null) {
                const comment = match[1].trim();
                if (comment.length > 2) {
                    comments.push(comment);
                }
            }

            // Python docstrings (triple-quoted)
            const docstringRegex = /"""([\s\S]*?)"""|'''([\s\S]*?)'''/g;
            while ((match = docstringRegex.exec(text)) !== null) {
                const content = (match[1] || match[2]).trim();
                if (content.length > 2) {
                    comments.push(content);
                }
            }
        }

        return comments;
    }

    // ── Matching Algorithm (AICC-0388) ───────────────────────────

    /**
     * Match the extracted file context against all planning items.
     *
     * Applies multiple matching strategies with configurable weights:
     * - **File path matching** — item `contexts` vs `relativePath` (weight: filePathWeight)
     * - **Tag matching** — extracted tags vs item `tags` (weight: tagWeight)
     * - **Content matching** — identifiers vs item `summary` / `description` (weight: contentWeight)
     * - **Import matching** — import paths vs item `contexts` (weight: importWeight)
     * - **Direct reference** — AICC-NNNN in comments (weight: 15)
     * - **Recent interaction** — recently viewed items (weight: recentWeight)
     *
     * @param fileContext - The extracted file context
     * @returns Array of all matches (unfiltered, unsorted)
     */
    public async findMatches(fileContext: FileContext): Promise<ContextMatch[]> {
        const planData = await this.loadPlanData();
        if (!planData || planData.items.length === 0) {
            return [];
        }

        const config = this.getConfig();
        const matches: ContextMatch[] = [];

        for (const item of planData.items) {
            const reasons = this.computeMatchReasons(item, fileContext, config, planData);

            if (reasons.length === 0) {
                continue;
            }

            const score = this.scoreMatch(reasons);
            const title = (item as any).title || (item as any).summary || item.id;
            const status = (item as any).status || 'unknown';
            const priority = (item as any).priority || 'medium';

            matches.push({
                itemId: item.id,
                itemType: item.type,
                summary: title,
                status,
                score,
                matchReasons: reasons,
                priority,
            });
        }

        return matches;
    }

    /**
     * Compute all match reasons for a single planning item against
     * the current file context.
     *
     * @param item     - Planning item to evaluate
     * @param ctx      - Extracted file context
     * @param config   - Current configuration with weights
     * @param planData - Full plan data (for parent look-ups)
     * @returns Array of match reasons (may be empty)
     */
    private computeMatchReasons(
        item: PlanningItem,
        ctx: FileContext,
        config: ContextConfig,
        planData: IPlanData,
    ): MatchReason[] {
        const reasons: MatchReason[] = [];

        // ── 1. File-path matching (AICC-0388) ────────────────────
        this.matchFilePaths(item, ctx, config, reasons);

        // ── 2. Tag matching (AICC-0387) ──────────────────────────
        this.matchTags(item, ctx, config, reasons);

        // ── 3. Content / identifier matching ─────────────────────
        this.matchContent(item, ctx, config, reasons);

        // ── 4. Import-path matching ──────────────────────────────
        this.matchImports(item, ctx, config, reasons);

        // ── 5. Direct AICC-NNNN reference in comments ───────────
        this.matchDirectReferences(item, ctx, reasons);

        // ── 6. Parent propagation ────────────────────────────────
        this.matchParent(item, ctx, config, planData, reasons);

        // ── 7. Recent interaction boost (AICC-0389) ──────────────
        this.matchRecent(item, config, reasons);

        return reasons;
    }

    /**
     * Compare the file's relative path against the item's `contexts`
     * array (file path associations stored in planning items).
     */
    private matchFilePaths(
        item: PlanningItem,
        ctx: FileContext,
        config: ContextConfig,
        reasons: MatchReason[],
    ): void {
        const contexts: string[] = (item as any).contexts ?? [];
        if (contexts.length === 0) {
            return;
        }

        for (const itemPath of contexts) {
            const normalised = itemPath.replace(/\\/g, '/');

            // Exact match
            if (normalised === ctx.relativePath) {
                reasons.push({
                    type: 'file_path',
                    detail: `Exact path match: ${normalised}`,
                    weight: config.filePathWeight,
                });
                continue;
            }

            // Partial / directory match: file is inside a listed directory
            if (ctx.relativePath.startsWith(normalised + '/') || normalised.startsWith(ctx.relativePath.replace(/\/[^/]+$/, '') + '/')) {
                reasons.push({
                    type: 'file_path',
                    detail: `Directory match: ${normalised}`,
                    weight: Math.round(config.filePathWeight * 0.6),
                });
            }

            // Basename match (same filename in different directory)
            const itemBasename = path.basename(normalised);
            const fileBasename = path.basename(ctx.relativePath);
            if (itemBasename === fileBasename && itemBasename !== 'index.ts' && itemBasename !== 'index.js') {
                reasons.push({
                    type: 'file_path',
                    detail: `Basename match: ${itemBasename}`,
                    weight: Math.round(config.filePathWeight * 0.4),
                });
            }
        }
    }

    /**
     * Compare extracted tags against the planning item's `tags` array.
     */
    private matchTags(
        item: PlanningItem,
        ctx: FileContext,
        config: ContextConfig,
        reasons: MatchReason[],
    ): void {
        const itemTags: string[] = (item as any).tags ?? [];
        if (itemTags.length === 0 || ctx.tags.length === 0) {
            return;
        }

        const normalisedItemTags = itemTags.map((t: string) => t.toLowerCase());
        const normalisedFileTags = ctx.tags.map((t) => t.toLowerCase());

        for (const fileTag of normalisedFileTags) {
            for (const itemTag of normalisedItemTags) {
                // Exact tag match
                if (fileTag === itemTag || fileTag.includes(itemTag) || itemTag.includes(fileTag)) {
                    reasons.push({
                        type: 'tag',
                        detail: `Tag match: "${itemTag}"`,
                        weight: config.tagWeight,
                    });
                }
            }
        }
    }

    /**
     * Check whether extracted identifiers appear in the item's
     * `title` or `description`.
     */
    private matchContent(
        item: PlanningItem,
        ctx: FileContext,
        config: ContextConfig,
        reasons: MatchReason[],
    ): void {
        if (ctx.identifiers.length === 0) {
            return;
        }

        const title = ((item as any).title || '').toLowerCase();
        const description = ((item as any).description || '').toLowerCase();
        const combined = `${title} ${description}`;

        for (const identifier of ctx.identifiers) {
            // Skip very short identifiers (likely noise)
            if (identifier.length < 4) {
                continue;
            }

            const lowerIdent = identifier.toLowerCase();

            if (combined.includes(lowerIdent)) {
                reasons.push({
                    type: 'content',
                    detail: `Identifier "${identifier}" found in item text`,
                    weight: config.contentWeight,
                });
            }
        }
    }

    /**
     * Check whether imported module paths relate to item `contexts`.
     */
    private matchImports(
        item: PlanningItem,
        ctx: FileContext,
        config: ContextConfig,
        reasons: MatchReason[],
    ): void {
        const contexts: string[] = (item as any).contexts ?? [];
        if (contexts.length === 0 || ctx.imports.length === 0) {
            return;
        }

        for (const importPath of ctx.imports) {
            // Skip node_modules imports
            if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
                continue;
            }

            // Resolve the import relative to the file's directory
            const resolvedImport = this.resolveImportPath(importPath, ctx.filePath);

            for (const contextPath of contexts) {
                const normalisedContext = contextPath.replace(/\\/g, '/');

                if (
                    resolvedImport.includes(normalisedContext) ||
                    normalisedContext.includes(resolvedImport) ||
                    path.basename(resolvedImport) === path.basename(normalisedContext).replace(/\.\w+$/, '')
                ) {
                    reasons.push({
                        type: 'import',
                        detail: `Import "${importPath}" relates to context "${normalisedContext}"`,
                        weight: config.importWeight,
                    });
                }
            }
        }
    }

    /**
     * Check for direct `AICC-NNNN` references in file comments.
     */
    private matchDirectReferences(
        item: PlanningItem,
        ctx: FileContext,
        reasons: MatchReason[],
    ): void {
        const itemId = item.id.toUpperCase();
        const allText = ctx.comments.join(' ') + ' ' + ctx.tags.join(' ');

        if (allText.toUpperCase().includes(itemId)) {
            reasons.push({
                type: 'comment',
                detail: `Direct reference to ${item.id} in file`,
                weight: DIRECT_REFERENCE_WEIGHT,
            });
        }
    }

    /**
     * If a matched item's parent (epicId) also has file-path associations
     * relevant to this file, propagate a parent reason.
     */
    private matchParent(
        item: PlanningItem,
        ctx: FileContext,
        _config: ContextConfig,
        planData: IPlanData,
        reasons: MatchReason[],
    ): void {
        const epicId: string | null | undefined = (item as any).epicId;
        if (!epicId) {
            return;
        }

        const parent = planData.items.find((i) => i.id === epicId);
        if (!parent) {
            return;
        }

        const parentContexts: string[] = (parent as any).contexts ?? [];
        for (const parentPath of parentContexts) {
            const normalised = parentPath.replace(/\\/g, '/');
            if (
                ctx.relativePath.startsWith(normalised + '/') ||
                normalised === ctx.relativePath
            ) {
                reasons.push({
                    type: 'parent',
                    detail: `Parent ${parent.id} has context matching this file`,
                    weight: PARENT_PROPAGATION_WEIGHT,
                });
                break; // One parent reason is enough
            }
        }
    }

    /**
     * Boost items the user has recently interacted with.
     */
    private matchRecent(
        item: PlanningItem,
        config: ContextConfig,
        reasons: MatchReason[],
    ): void {
        if (this.recentItemIds.has(item.id)) {
            reasons.push({
                type: 'recent',
                detail: `Recently interacted with ${item.id}`,
                weight: config.recentWeight,
            });
        }
    }

    // ── Scoring (AICC-0389) ──────────────────────────────────────

    /**
     * Compute a composite score from an array of match reasons.
     * The score is the sum of each reason's weight.
     *
     * @param reasons - Array of match reasons
     * @returns Composite numeric score
     */
    public scoreMatch(reasons: MatchReason[]): number {
        return reasons.reduce((sum, r) => sum + r.weight, 0);
    }

    /**
     * Apply minimum-score filter, sort by score descending, and limit
     * to `maxResults`.
     *
     * @param matches - Unfiltered match array
     * @param config  - Current engine configuration
     * @returns Filtered and sorted matches
     */
    public filterAndSort(matches: ContextMatch[], config: ContextConfig): ContextMatch[] {
        return matches
            .filter((m) => m.score >= config.minScore)
            .sort((a, b) => {
                // Primary: score descending
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                // Secondary: priority (high > medium > low)
                const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
                const pa = priorityOrder[a.priority] ?? 0;
                const pb = priorityOrder[b.priority] ?? 0;
                return pb - pa;
            })
            .slice(0, config.maxResults);
    }

    // ── Configuration ────────────────────────────────────────────

    /**
     * Read the Smart Context Engine configuration from VS Code settings.
     * Falls back to {@link DEFAULT_CONFIG} for any missing values.
     *
     * @returns Resolved configuration object
     */
    public getConfig(): ContextConfig {
        const cfg = vscode.workspace.getConfiguration('aicc.smartContext');

        return {
            enabled: cfg.get<boolean>('enabled', DEFAULT_CONFIG.enabled),
            minScore: cfg.get<number>('minScore', DEFAULT_CONFIG.minScore),
            maxResults: cfg.get<number>('maxResults', DEFAULT_CONFIG.maxResults),
            debounceMs: cfg.get<number>('debounceMs', DEFAULT_CONFIG.debounceMs),
            filePathWeight: cfg.get<number>('filePathWeight', DEFAULT_CONFIG.filePathWeight),
            tagWeight: cfg.get<number>('tagWeight', DEFAULT_CONFIG.tagWeight),
            contentWeight: cfg.get<number>('contentWeight', DEFAULT_CONFIG.contentWeight),
            importWeight: cfg.get<number>('importWeight', DEFAULT_CONFIG.importWeight),
            recentWeight: cfg.get<number>('recentWeight', DEFAULT_CONFIG.recentWeight),
        };
    }

    // ── Public Accessors ─────────────────────────────────────────

    /**
     * Return the most recently computed context matches.
     *
     * @returns Cached array of context matches (may be empty)
     */
    public getCurrentMatches(): ContextMatch[] {
        return this.currentMatches;
    }

    /**
     * Track a planning item as recently interacted with.
     * Called when the user clicks on or navigates to an item.
     *
     * @param itemId - The planning item ID to mark as recent
     */
    public trackRecentInteraction(itemId: string): void {
        this.recentItemIds.add(itemId);

        // Evict oldest entries if over the limit
        if (this.recentItemIds.size > SmartContextEngine.MAX_RECENT_ITEMS) {
            const oldest = this.recentItemIds.values().next().value;
            if (oldest !== undefined) {
                this.recentItemIds.delete(oldest);
            }
        }
    }

    /**
     * Force a re-analysis of the current active editor.
     * Useful after configuration changes or plan updates.
     */
    public async refresh(): Promise<void> {
        this.lastAnalysedPath = undefined; // Reset dedup guard
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.scheme === 'file') {
            await this.analyzeAndMatch(editor.document);
        }
    }

    // ── Internal Helpers ─────────────────────────────────────────

    /**
     * Resolve a relative import path to a workspace-relative path.
     *
     * @param importPath - The import string from the source file
     * @param fromFile   - Absolute path of the file containing the import
     * @returns Normalised workspace-relative path
     */
    private resolveImportPath(importPath: string, fromFile: string): string {
        const dir = path.dirname(fromFile);
        const resolved = path.resolve(dir, importPath);

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath ?? '';

        return workspaceRoot
            ? path.relative(workspaceRoot, resolved).replace(/\\/g, '/')
            : resolved.replace(/\\/g, '/');
    }

    /**
     * Load plan data from `.project/PLAN.json`.
     * Mirrors the approach used by {@link NlPlanningChatHandler}.
     *
     * @returns Parsed plan data or null if unavailable
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
            this.logger.error('Failed to load PLAN.json for context matching', {
                component: 'SmartContextEngine',
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Clear current matches and notify listeners.
     */
    private clearMatches(): void {
        if (this.currentMatches.length > 0) {
            this.currentMatches = [];
            this.lastAnalysedPath = undefined;
            this._onMatchesChanged.fire([]);
        }
    }

    /**
     * Subscribe to planning event channels to invalidate the cache
     * when items are created, updated, or deleted.
     */
    private subscribeToPlanning(): void {
        // Subscribe to all planning item events via wildcard
        const sub = this.eventBus.subscribe('planning.*', () => {
            this.logger.debug('Planning event received — invalidating context cache', {
                component: 'SmartContextEngine',
            });
            // Re-analyse on next tick to allow plan data to flush
            setTimeout(() => {
                this.refresh().catch((err) => {
                    this.logger.error('Failed to refresh context after planning event', {
                        component: 'SmartContextEngine',
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
            }, 200);
        });

        this.disposables.push(sub);
    }

    // ── Disposable ───────────────────────────────────────────────

    /**
     * Clean up all listeners, timers, and subscriptions.
     */
    public dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }

        this._onMatchesChanged.dispose();

        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;

        this.currentMatches = [];
        this.lastAnalysedPath = undefined;
        this.recentItemIds.clear();

        this.logger.info('Smart Context Engine disposed', {
            component: 'SmartContextEngine',
        });
    }
}
