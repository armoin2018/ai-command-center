/**
 * Confluence Integration Client
 *
 * REST API v2 client with Markdown ↔ Confluence XHTML storage format
 * conversion, bidirectional document sync, and auth configuration.
 *
 * Part of AICC-0159: Confluence Integration
 *   - AICC-0422: Implement Confluence API client (REST v2)
 *   - AICC-0423: Build Markdown ↔ Confluence Storage Format converter
 *   - AICC-0424: Implement content sync (push / pull)
 *   - AICC-0425: Build auth config UI (site URL, email, API token)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { EventBus } from '../services/eventBus';
import { EventChannels } from '../types/events';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Connection configuration for a Confluence Cloud instance.
 */
export interface ConfluenceConfig {
    /** Confluence site URL, e.g. https://mysite.atlassian.net */
    siteUrl: string;
    /** Atlassian account email address */
    email: string;
    /** Atlassian API token */
    apiToken: string;
    /** Default space key for operations */
    spaceKey: string;
}

/**
 * Represents a Confluence page.
 */
export interface ConfluencePage {
    /** Page ID */
    id: string;
    /** Page title */
    title: string;
    /** Space key the page belongs to */
    spaceKey: string;
    /** Version number (for optimistic concurrency) */
    version: number;
    /** Page body in Confluence storage format (XHTML) */
    body: string;
    /** Page status */
    status: 'current' | 'draft';
    /** Ancestor pages (parent chain) */
    ancestors?: { id: string }[];
    /** Page links */
    _links?: { webui: string };
}

/**
 * Paginated search result from CQL queries.
 */
export interface ConfluenceSearchResult {
    /** Matching pages */
    results: ConfluencePage[];
    /** Total number of matching results */
    totalSize: number;
    /** Zero-based offset of this page */
    start: number;
    /** Maximum results per page */
    limit: number;
}

/**
 * Result of a push/pull/sync operation.
 */
export interface SyncResult {
    /** Number of documents pushed to Confluence */
    pushed: number;
    /** Number of documents pulled from Confluence */
    pulled: number;
    /** Number of conflicts detected (both sides modified) */
    conflicts: number;
    /** Error messages */
    errors: string[];
}

/**
 * Mapping between a local file and a Confluence page.
 */
export interface SyncMapping {
    /** Absolute or workspace-relative path to local file */
    localPath: string;
    /** Confluence page ID */
    confluenceId: string;
    /** ISO timestamp of last successful sync */
    lastSyncedAt: string;
    /** SHA-256 hash of local file content at last sync */
    lastLocalHash: string;
    /** Sync direction */
    direction: 'push' | 'pull' | 'bidirectional';
}

// ─── Internal helpers ────────────────────────────────────────────────

/** Compute SHA-256 hash of a string. */
function sha256(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Build Basic auth header value. */
function basicAuth(email: string, apiToken: string): string {
    return `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
}

/**
 * Escape special HTML entities in text content.
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── ConfluenceClient ────────────────────────────────────────────────

/**
 * Singleton Confluence API client providing CRUD operations,
 * format conversion, and bidirectional document sync.
 */
export class ConfluenceClient {
    private static instance: ConfluenceClient | undefined;

    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    private config: ConfluenceConfig | undefined;

    /** Path to the sync-mappings file (relative to workspace root) */
    private static readonly SYNC_MAPPINGS_FILE = '.project/confluence-sync.json';

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
    }

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): ConfluenceClient {
        if (!ConfluenceClient.instance) {
            ConfluenceClient.instance = new ConfluenceClient();
        }
        return ConfluenceClient.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        ConfluenceClient.instance = undefined;
    }

    // ── Configuration (AICC-0425) ───────────────────────────────

    /**
     * Set the Confluence connection configuration.
     *
     * @param config - Site URL, email, API token, and default space key
     */
    public configure(config: ConfluenceConfig): void {
        // Normalise site URL — strip trailing slash
        const siteUrl = config.siteUrl.replace(/\/+$/, '');
        this.config = { ...config, siteUrl };

        this.logger.info('Confluence client configured', {
            component: 'ConfluenceClient',
            siteUrl,
            spaceKey: config.spaceKey,
        });

        // Emit config change event
        this.eventBus
            .emit(EventChannels.Integration.Config.Changed, {
                timestamp: Date.now(),
                source: 'ConfluenceClient',
                provider: 'confluence',
                setting: 'connection',
                newValue: { siteUrl, spaceKey: config.spaceKey },
            })
            .catch(() => { /* best-effort */ });
    }

    /**
     * Check whether the client has been configured with credentials.
     */
    public isConfigured(): boolean {
        return (
            this.config !== undefined &&
            this.config.siteUrl.length > 0 &&
            this.config.email.length > 0 &&
            this.config.apiToken.length > 0
        );
    }

    // ── CRUD Operations (AICC-0422) ─────────────────────────────

    /**
     * Get a single Confluence page by ID.
     *
     * @param pageId - The Confluence page ID
     * @returns The page content including body in storage format
     */
    public async getPage(pageId: string): Promise<ConfluencePage> {
        const data = await this.makeRequest(
            'GET',
            `/wiki/api/v2/pages/${encodeURIComponent(pageId)}?body-format=storage`,
        );

        return this.mapResponseToPage(data);
    }

    /**
     * Search Confluence pages using CQL (Confluence Query Language).
     *
     * @param query - CQL query string or text to search
     * @param spaceKey - Optional space key to narrow results
     * @param limit - Maximum number of results (default 25)
     * @returns Paginated search results
     */
    public async searchPages(
        query: string,
        spaceKey?: string,
        limit: number = 25,
    ): Promise<ConfluenceSearchResult> {
        const cql = spaceKey
            ? `space = "${spaceKey}" AND (title ~ "${query}" OR text ~ "${query}")`
            : `title ~ "${query}" OR text ~ "${query}"`;

        const params = new URLSearchParams({
            cql,
            limit: String(Math.min(limit, 100)),
        });

        const data = await this.makeRequest(
            'GET',
            `/wiki/rest/api/content/search?${params.toString()}`,
        );

        const results: ConfluencePage[] = Array.isArray(data.results)
            ? data.results.map((r: any) => this.mapResponseToPage(r))
            : [];

        return {
            results,
            totalSize: data.totalSize ?? results.length,
            start: data.start ?? 0,
            limit: data.limit ?? limit,
        };
    }

    /**
     * Create a new Confluence page.
     *
     * @param title - Page title
     * @param body - Page body in Confluence XHTML storage format
     * @param spaceKey - Space key where the page will be created
     * @param parentId - Optional parent page ID
     * @returns The created page
     */
    public async createPage(
        title: string,
        body: string,
        spaceKey: string,
        parentId?: string,
    ): Promise<ConfluencePage> {
        const requestBody: Record<string, unknown> = {
            spaceId: await this.resolveSpaceId(spaceKey),
            status: 'current',
            title,
            body: {
                representation: 'storage',
                value: body,
            },
        };

        if (parentId) {
            requestBody.parentId = parentId;
        }

        const data = await this.makeRequest('POST', '/wiki/api/v2/pages', requestBody);
        const page = this.mapResponseToPage(data);

        this.logger.info(`Created Confluence page "${title}" (${page.id})`, {
            component: 'ConfluenceClient',
            pageId: page.id,
            spaceKey,
        });

        return page;
    }

    /**
     * Update an existing Confluence page.
     *
     * @param pageId - The page ID to update
     * @param title - Updated title
     * @param body - Updated body in Confluence XHTML storage format
     * @param version - Current version number (for optimistic concurrency)
     * @returns The updated page
     */
    public async updatePage(
        pageId: string,
        title: string,
        body: string,
        version: number,
    ): Promise<ConfluencePage> {
        const requestBody = {
            id: pageId,
            status: 'current',
            title,
            body: {
                representation: 'storage',
                value: body,
            },
            version: {
                number: version + 1,
                message: `Updated via AI Command Center at ${new Date().toISOString()}`,
            },
        };

        const data = await this.makeRequest(
            'PUT',
            `/wiki/api/v2/pages/${encodeURIComponent(pageId)}`,
            requestBody,
        );
        const page = this.mapResponseToPage(data);

        this.logger.info(`Updated Confluence page "${title}" to v${version + 1}`, {
            component: 'ConfluenceClient',
            pageId,
        });

        return page;
    }

    /**
     * Delete a Confluence page.
     *
     * @param pageId - The page ID to delete
     */
    public async deletePage(pageId: string): Promise<void> {
        await this.makeRequest(
            'DELETE',
            `/wiki/api/v2/pages/${encodeURIComponent(pageId)}`,
        );

        this.logger.info(`Deleted Confluence page ${pageId}`, {
            component: 'ConfluenceClient',
            pageId,
        });
    }

    // ── Format Conversion (AICC-0423) ───────────────────────────

    /**
     * Convert Markdown content to Confluence XHTML storage format.
     *
     * Supported elements:
     *  - Headings (h1–h6)
     *  - Bold, italic, strikethrough, inline code
     *  - Ordered and unordered lists (nested)
     *  - Fenced code blocks with language annotation
     *  - Tables (pipe-delimited)
     *  - Links and images
     *  - Blockquotes
     *  - Horizontal rules
     *
     * @param markdown - Raw Markdown string
     * @returns Confluence XHTML storage format string
     */
    public markdownToConfluence(markdown: string): string {
        let html = markdown;

        // ── Fenced code blocks (must be processed first) ─────────
        html = html.replace(
            /```(\w+)?\n([\s\S]*?)```/g,
            (_match, lang: string | undefined, code: string) => {
                const language = lang ? ` ac:language="${escapeHtml(lang)}"` : '';
                return (
                    `<ac:structured-macro ac:name="code"${language ? ` ac:schema-version="1"` : ''}>` +
                    (lang
                        ? `<ac:parameter ac:name="language">${escapeHtml(lang)}</ac:parameter>`
                        : '') +
                    `<ac:plain-text-body><![CDATA[${code.replace(/\]\]>/g, ']]&gt;')}]]></ac:plain-text-body>` +
                    `</ac:structured-macro>`
                );
            },
        );

        // ── Tables ───────────────────────────────────────────────
        html = html.replace(
            /(?:^|\n)((?:\|[^\n]+\|\n)+)/g,
            (_match, tableBlock: string) => {
                const rows = tableBlock.trim().split('\n').filter((r) => r.trim().length > 0);
                if (rows.length === 0) { return ''; }

                // Detect and skip separator row (| --- | --- |)
                const isSeparator = (row: string) => /^\|[\s:-]+\|$/.test(row.replace(/\|/g, '|').trim());

                let result = '<table><tbody>';
                let isHeader = true;

                for (const row of rows) {
                    if (isSeparator(row)) { continue; }
                    const cells = row
                        .replace(/^\|/, '')
                        .replace(/\|$/, '')
                        .split('|')
                        .map((c) => c.trim());
                    const tag = isHeader ? 'th' : 'td';
                    result += '<tr>';
                    for (const cell of cells) {
                        result += `<${tag}>${escapeHtml(cell)}</${tag}>`;
                    }
                    result += '</tr>';
                    isHeader = false;
                }

                result += '</tbody></table>';
                return result;
            },
        );

        // ── Blockquotes ──────────────────────────────────────────
        html = html.replace(
            /(?:^|\n)((?:>\s?[^\n]*\n?)+)/g,
            (_match, block: string) => {
                const content = block
                    .split('\n')
                    .map((l) => l.replace(/^>\s?/, ''))
                    .join('\n')
                    .trim();
                return `<blockquote><p>${escapeHtml(content)}</p></blockquote>`;
            },
        );

        // ── Headings ─────────────────────────────────────────────
        html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

        // ── Horizontal rules ─────────────────────────────────────
        html = html.replace(/^---+$/gm, '<hr />');

        // ── Images ───────────────────────────────────────────────
        html = html.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            '<ac:image><ri:url ri:value="$2" /></ac:image>',
        );

        // ── Links ────────────────────────────────────────────────
        html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2">$1</a>',
        );

        // ── Inline formatting ────────────────────────────────────
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // ── Unordered lists ──────────────────────────────────────
        html = html.replace(
            /(?:^|\n)((?:[\t ]*[-*+]\s+[^\n]+\n?)+)/g,
            (_match, block: string) => {
                return this.convertListBlock(block, 'ul');
            },
        );

        // ── Ordered lists ────────────────────────────────────────
        html = html.replace(
            /(?:^|\n)((?:[\t ]*\d+\.\s+[^\n]+\n?)+)/g,
            (_match, block: string) => {
                return this.convertListBlock(block, 'ol');
            },
        );

        // ── Paragraphs (wrap remaining bare text lines) ──────────
        html = html.replace(
            /(?:^|\n\n)([^\n<][^\n]*(?:\n(?![<\n])[^\n]*)*)/g,
            (_match, text: string) => {
                const trimmed = text.trim();
                if (!trimmed) { return ''; }
                return `<p>${trimmed}</p>`;
            },
        );

        // ── Cleanup ──────────────────────────────────────────────
        html = html.replace(/\n{3,}/g, '\n\n').trim();

        return html;
    }

    /**
     * Convert Confluence XHTML storage format to Markdown.
     *
     * @param confluenceHtml - Confluence XHTML storage format string
     * @returns Markdown string
     */
    public confluenceToMarkdown(confluenceHtml: string): string {
        let md = confluenceHtml;

        // ── Code blocks ──────────────────────────────────────────
        md = md.replace(
            /<ac:structured-macro[^>]*ac:name="code"[^>]*>[\s\S]*?<ac:parameter ac:name="language">([^<]*)<\/ac:parameter>[\s\S]*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/g,
            (_match, lang: string, code: string) => `\`\`\`${lang}\n${code}\`\`\``,
        );
        md = md.replace(
            /<ac:structured-macro[^>]*ac:name="code"[^>]*>[\s\S]*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/g,
            (_match, code: string) => `\`\`\`\n${code}\`\`\``,
        );

        // ── Images ───────────────────────────────────────────────
        md = md.replace(
            /<ac:image[^>]*>[\s\S]*?<ri:url ri:value="([^"]*)"[^/]*\/>[\s\S]*?<\/ac:image>/g,
            '![]($1)',
        );

        // ── Tables ───────────────────────────────────────────────
        md = md.replace(
            /<table[^>]*><tbody>([\s\S]*?)<\/tbody><\/table>/g,
            (_match, tbody: string) => {
                const rows = tbody
                    .split(/<\/tr>/)
                    .filter((r) => r.trim().length > 0);
                const mdRows: string[] = [];

                for (let i = 0; i < rows.length; i++) {
                    const cells = rows[i]
                        .match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)
                        ?.map((c) => c.replace(/<\/?t[hd][^>]*>/g, '').trim()) ?? [];
                    mdRows.push(`| ${cells.join(' | ')} |`);

                    // Add separator after header row
                    if (i === 0) {
                        mdRows.push(`| ${cells.map(() => '---').join(' | ')} |`);
                    }
                }

                return mdRows.join('\n');
            },
        );

        // ── Blockquotes ──────────────────────────────────────────
        md = md.replace(
            /<blockquote>([\s\S]*?)<\/blockquote>/g,
            (_match, content: string) => {
                const text = content.replace(/<\/?p>/g, '').trim();
                return text
                    .split('\n')
                    .map((l) => `> ${l}`)
                    .join('\n');
            },
        );

        // ── Headings ─────────────────────────────────────────────
        md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, '# $1');
        md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, '## $1');
        md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, '### $1');
        md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/g, '#### $1');
        md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/g, '##### $1');
        md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/g, '###### $1');

        // ── Horizontal rules ─────────────────────────────────────
        md = md.replace(/<hr\s*\/?>/g, '---');

        // ── Links ────────────────────────────────────────────────
        md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)');

        // ── Inline formatting ────────────────────────────────────
        md = md.replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**');
        md = md.replace(/<em>([\s\S]*?)<\/em>/g, '*$1*');
        md = md.replace(/<del>([\s\S]*?)<\/del>/g, '~~$1~~');
        md = md.replace(/<code>([\s\S]*?)<\/code>/g, '`$1`');

        // ── Lists ────────────────────────────────────────────────
        md = md.replace(/<ul>([\s\S]*?)<\/ul>/g, (_match, content: string) => {
            return this.htmlListToMarkdown(content, '-');
        });
        md = md.replace(/<ol>([\s\S]*?)<\/ol>/g, (_match, content: string) => {
            return this.htmlListToMarkdown(content, '1.');
        });

        // ── Paragraphs ───────────────────────────────────────────
        md = md.replace(/<p>([\s\S]*?)<\/p>/g, '$1\n');

        // ── Strip remaining tags ─────────────────────────────────
        md = md.replace(/<[^>]+>/g, '');

        // ── Unescape HTML entities ───────────────────────────────
        md = md
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');

        // ── Normalise whitespace ─────────────────────────────────
        md = md.replace(/\n{3,}/g, '\n\n').trim();

        return md;
    }

    // ── Content Sync (AICC-0424) ────────────────────────────────

    /**
     * Push a local Markdown document to Confluence.
     *
     * If a sync mapping exists and the Confluence page already exists,
     * the page is updated. Otherwise a new page is created.
     *
     * @param localPath - Absolute path to local Markdown file
     * @param spaceKey - Confluence space key
     * @param parentId - Optional parent page ID
     * @returns Sync result with push count
     */
    public async pushDocument(
        localPath: string,
        spaceKey: string,
        parentId?: string,
    ): Promise<SyncResult> {
        const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

        try {
            // Emit sync start
            this.eventBus
                .emit(EventChannels.Integration.Sync.Started, {
                    timestamp: Date.now(),
                    source: 'ConfluenceClient',
                    provider: 'confluence',
                    direction: 'push',
                })
                .catch(() => { /* best-effort */ });

            const content = await fs.promises.readFile(localPath, 'utf8');
            const title = this.extractTitle(content, localPath);
            const confluenceBody = this.markdownToConfluence(content);
            const localHash = sha256(content);

            // Check for existing mapping
            const mappings = await this.loadSyncMappings();
            const existing = mappings.find((m) => m.localPath === localPath);

            let page: ConfluencePage;

            if (existing) {
                // Update existing page
                try {
                    const currentPage = await this.getPage(existing.confluenceId);
                    page = await this.updatePage(
                        existing.confluenceId,
                        title,
                        confluenceBody,
                        currentPage.version,
                    );
                } catch (err) {
                    // Page may have been deleted — create new
                    page = await this.createPage(title, confluenceBody, spaceKey, parentId);
                    existing.confluenceId = page.id;
                }

                existing.lastSyncedAt = new Date().toISOString();
                existing.lastLocalHash = localHash;
            } else {
                // Create new page
                page = await this.createPage(title, confluenceBody, spaceKey, parentId);

                mappings.push({
                    localPath,
                    confluenceId: page.id,
                    lastSyncedAt: new Date().toISOString(),
                    lastLocalHash: localHash,
                    direction: 'push',
                });
            }

            await this.saveSyncMappings(mappings);
            result.pushed = 1;

            // Emit sync completed
            this.eventBus
                .emit(EventChannels.Integration.Sync.Completed, {
                    timestamp: Date.now(),
                    source: 'ConfluenceClient',
                    provider: 'confluence',
                    direction: 'push',
                    itemCount: 1,
                    duration: 0,
                    success: true,
                })
                .catch(() => { /* best-effort */ });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Push failed for ${localPath}: ${msg}`);
            this.logger.error(`Push failed for ${localPath}`, {
                component: 'ConfluenceClient',
                error: msg,
            });

            this.eventBus
                .emit(EventChannels.Integration.Sync.Error, {
                    timestamp: Date.now(),
                    source: 'ConfluenceClient',
                    provider: 'confluence',
                    error: msg,
                })
                .catch(() => { /* best-effort */ });
        }

        return result;
    }

    /**
     * Pull a Confluence page to a local Markdown file.
     *
     * @param pageId - Confluence page ID
     * @param localPath - Absolute path where the Markdown file will be written
     * @returns Sync result with pull count
     */
    public async pullDocument(
        pageId: string,
        localPath: string,
    ): Promise<SyncResult> {
        const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

        try {
            this.eventBus
                .emit(EventChannels.Integration.Sync.Started, {
                    timestamp: Date.now(),
                    source: 'ConfluenceClient',
                    provider: 'confluence',
                    direction: 'pull',
                })
                .catch(() => { /* best-effort */ });

            const page = await this.getPage(pageId);
            const markdown = this.confluenceToMarkdown(page.body);

            // Ensure target directory exists
            const dir = path.dirname(localPath);
            await fs.promises.mkdir(dir, { recursive: true });

            // Atomic write — write to temp then rename
            const tmpPath = `${localPath}.tmp`;
            await fs.promises.writeFile(tmpPath, markdown, 'utf8');
            await fs.promises.rename(tmpPath, localPath);

            const localHash = sha256(markdown);

            // Update or create mapping
            const mappings = await this.loadSyncMappings();
            const existing = mappings.find((m) => m.confluenceId === pageId);

            if (existing) {
                existing.localPath = localPath;
                existing.lastSyncedAt = new Date().toISOString();
                existing.lastLocalHash = localHash;
            } else {
                mappings.push({
                    localPath,
                    confluenceId: pageId,
                    lastSyncedAt: new Date().toISOString(),
                    lastLocalHash: localHash,
                    direction: 'pull',
                });
            }

            await this.saveSyncMappings(mappings);
            result.pulled = 1;

            this.logger.info(`Pulled Confluence page ${pageId} → ${localPath}`, {
                component: 'ConfluenceClient',
                pageId,
            });

            this.eventBus
                .emit(EventChannels.Integration.Sync.Completed, {
                    timestamp: Date.now(),
                    source: 'ConfluenceClient',
                    provider: 'confluence',
                    direction: 'pull',
                    itemCount: 1,
                    duration: 0,
                    success: true,
                })
                .catch(() => { /* best-effort */ });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Pull failed for page ${pageId}: ${msg}`);
            this.logger.error(`Pull failed for page ${pageId}`, {
                component: 'ConfluenceClient',
                error: msg,
            });

            this.eventBus
                .emit(EventChannels.Integration.Sync.Error, {
                    timestamp: Date.now(),
                    source: 'ConfluenceClient',
                    provider: 'confluence',
                    error: msg,
                })
                .catch(() => { /* best-effort */ });
        }

        return result;
    }

    /**
     * Synchronise all mapped documents based on their configured direction.
     *
     * For each mapping:
     * - `push`: Pushes the local file to Confluence if the local hash differs
     * - `pull`: Pulls the Confluence page to local
     * - `bidirectional`: Detects conflicts, prefers newer content
     *
     * @param mappings - Array of sync mappings to process
     * @returns Aggregated sync result
     */
    public async syncAll(mappings: SyncMapping[]): Promise<SyncResult> {
        const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

        for (const mapping of mappings) {
            try {
                if (mapping.direction === 'push' || mapping.direction === 'bidirectional') {
                    // Check if local file has changed
                    let localContent: string;
                    try {
                        localContent = await fs.promises.readFile(mapping.localPath, 'utf8');
                    } catch {
                        result.errors.push(`Local file not found: ${mapping.localPath}`);
                        continue;
                    }

                    const currentHash = sha256(localContent);

                    if (currentHash !== mapping.lastLocalHash) {
                        if (mapping.direction === 'bidirectional') {
                            // In bidirectional mode, check if remote also changed
                            try {
                                const remotePage = await this.getPage(mapping.confluenceId);
                                const remoteMarkdown = this.confluenceToMarkdown(remotePage.body);
                                const remoteHash = sha256(remoteMarkdown);
                                const lastKnownRemoteHash = sha256(
                                    this.markdownToConfluence(
                                        await fs.promises.readFile(mapping.localPath, 'utf8'),
                                    ),
                                );

                                if (remoteHash !== lastKnownRemoteHash) {
                                    // Both sides changed — conflict
                                    result.conflicts++;
                                    result.errors.push(
                                        `Conflict for ${mapping.localPath} ↔ page ${mapping.confluenceId}`,
                                    );
                                    continue;
                                }
                            } catch {
                                // Page may not exist — push
                            }
                        }

                        // Push local → Confluence
                        const pushResult = await this.pushDocument(
                            mapping.localPath,
                            this.config?.spaceKey ?? '',
                        );
                        result.pushed += pushResult.pushed;
                        result.errors.push(...pushResult.errors);
                    }
                }

                if (mapping.direction === 'pull') {
                    const pullResult = await this.pullDocument(
                        mapping.confluenceId,
                        mapping.localPath,
                    );
                    result.pulled += pullResult.pulled;
                    result.errors.push(...pullResult.errors);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                result.errors.push(`Sync error for ${mapping.localPath}: ${msg}`);
            }
        }

        this.logger.info(
            `Sync complete: pushed=${result.pushed}, pulled=${result.pulled}, conflicts=${result.conflicts}`,
            { component: 'ConfluenceClient' },
        );

        return result;
    }

    // ── Auth Config UI (AICC-0425) ──────────────────────────────

    /**
     * Generate an HTML form for configuring Confluence connection.
     *
     * Returns a self-contained HTML string with fields for site URL,
     * email, API token, and space key. The form posts to a VS Code
     * webview message handler.
     *
     * @returns HTML string for the auth configuration form
     */
    public generateAuthConfigHtml(): string {
        const current = this.config;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confluence Configuration</title>
    <style>
        body {
            font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        .form-group { margin-bottom: 16px; }
        label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            font-size: 13px;
        }
        input[type="text"], input[type="password"], input[type="email"] {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border, #ccc);
            background: var(--vscode-input-background, #fff);
            color: var(--vscode-input-foreground, #000);
            border-radius: 2px;
            font-size: 13px;
            box-sizing: border-box;
        }
        button {
            padding: 8px 16px;
            background: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
        }
        button:hover { background: var(--vscode-button-hoverBackground, #005a9e); }
        .hint { font-size: 11px; color: var(--vscode-descriptionForeground, #888); margin-top: 2px; }
        .status { margin-top: 12px; padding: 8px; border-radius: 2px; }
        .status.connected { background: var(--vscode-testing-iconPassed, #4caf50); color: #fff; }
        .status.disconnected { background: var(--vscode-testing-iconFailed, #f44336); color: #fff; }
    </style>
</head>
<body>
    <h2>Confluence Integration</h2>
    <p>Configure your Atlassian Confluence Cloud connection.</p>

    <div class="form-group">
        <label for="siteUrl">Site URL</label>
        <input type="text" id="siteUrl" placeholder="https://yoursite.atlassian.net"
               value="${escapeHtml(current?.siteUrl ?? '')}" />
        <div class="hint">Your Confluence Cloud site URL</div>
    </div>

    <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="you@example.com"
               value="${escapeHtml(current?.email ?? '')}" />
        <div class="hint">Atlassian account email</div>
    </div>

    <div class="form-group">
        <label for="apiToken">API Token</label>
        <input type="password" id="apiToken" placeholder="Enter your API token" />
        <div class="hint">
            Generate at
            <a href="https://id.atlassian.com/manage-profile/security/api-tokens">
                Atlassian API Tokens
            </a>
        </div>
    </div>

    <div class="form-group">
        <label for="spaceKey">Default Space Key</label>
        <input type="text" id="spaceKey" placeholder="MYSPACE"
               value="${escapeHtml(current?.spaceKey ?? '')}" />
        <div class="hint">Default Confluence space for operations</div>
    </div>

    <button id="saveBtn">Save Configuration</button>
    <button id="testBtn" style="margin-left: 8px; background: var(--vscode-button-secondaryBackground, #5f6a79);">
        Test Connection
    </button>

    <div id="statusDiv" class="status" style="display: none;"></div>

    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('saveBtn').addEventListener('click', () => {
            vscode.postMessage({
                type: 'confluenceConfig',
                action: 'save',
                data: {
                    siteUrl: document.getElementById('siteUrl').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    apiToken: document.getElementById('apiToken').value,
                    spaceKey: document.getElementById('spaceKey').value.trim(),
                },
            });
        });

        document.getElementById('testBtn').addEventListener('click', () => {
            vscode.postMessage({
                type: 'confluenceConfig',
                action: 'test',
                data: {
                    siteUrl: document.getElementById('siteUrl').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    apiToken: document.getElementById('apiToken').value,
                    spaceKey: document.getElementById('spaceKey').value.trim(),
                },
            });
        });

        window.addEventListener('message', (event) => {
            const msg = event.data;
            if (msg.type === 'confluenceConfigResult') {
                const statusDiv = document.getElementById('statusDiv');
                statusDiv.style.display = 'block';
                statusDiv.className = 'status ' + (msg.success ? 'connected' : 'disconnected');
                statusDiv.textContent = msg.message;
            }
        });
    </script>
</body>
</html>`;
    }

    // ── Private: HTTP Client (AICC-0422) ────────────────────────

    /**
     * Make an authenticated HTTP request to the Confluence REST API.
     *
     * @param method - HTTP method
     * @param apiPath - API path (e.g. /wiki/api/v2/pages)
     * @param body - Optional request body
     * @returns Parsed JSON response
     * @throws Error on HTTP errors or missing configuration
     */
    private async makeRequest(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        apiPath: string,
        body?: unknown,
    ): Promise<any> {
        if (!this.config) {
            throw new Error('Confluence client is not configured. Call configure() first.');
        }

        const url = `${this.config.siteUrl}${apiPath}`;
        const headers: Record<string, string> = {
            'Authorization': basicAuth(this.config.email, this.config.apiToken),
            'Accept': 'application/json',
        };

        if (body) {
            headers['Content-Type'] = 'application/json';
        }

        this.logger.debug(`Confluence ${method} ${apiPath}`, {
            component: 'ConfluenceClient',
        });

        // Use dynamic import for fetch (Node 18+)
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            let errorBody = '';
            try {
                errorBody = await response.text();
            } catch { /* ignore */ }

            throw new Error(
                `Confluence API ${method} ${apiPath} failed with status ${response.status}: ${errorBody}`,
            );
        }

        // DELETE returns no body
        if (method === 'DELETE' || response.status === 204) {
            return {};
        }

        return response.json();
    }

    // ── Private: Sync Mapping Persistence ────────────────────────

    /**
     * Load sync mappings from `.project/confluence-sync.json`.
     */
    private async loadSyncMappings(): Promise<SyncMapping[]> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return [];
            }

            const filePath = path.join(
                workspaceFolders[0].uri.fsPath,
                ConfluenceClient.SYNC_MAPPINGS_FILE,
            );

            const raw = await fs.promises.readFile(filePath, 'utf8');
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch {
            // File doesn't exist yet or is invalid
            return [];
        }
    }

    /**
     * Persist sync mappings to `.project/confluence-sync.json` (atomic write).
     */
    private async saveSyncMappings(mappings: SyncMapping[]): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.logger.warn('No workspace folder — cannot save sync mappings', {
                component: 'ConfluenceClient',
            });
            return;
        }

        const dir = path.join(workspaceFolders[0].uri.fsPath, '.project');
        await fs.promises.mkdir(dir, { recursive: true });

        const filePath = path.join(dir, 'confluence-sync.json');
        const tmpPath = `${filePath}.tmp`;

        await fs.promises.writeFile(
            tmpPath,
            JSON.stringify(mappings, null, 2),
            'utf8',
        );
        await fs.promises.rename(tmpPath, filePath);
    }

    // ── Private: Helpers ─────────────────────────────────────────

    /**
     * Map a raw Confluence API response object to our ConfluencePage type.
     */
    private mapResponseToPage(data: any): ConfluencePage {
        return {
            id: String(data.id ?? ''),
            title: data.title ?? '',
            spaceKey: data.spaceId ?? data.space?.key ?? '',
            version: data.version?.number ?? data.version ?? 1,
            body:
                data.body?.storage?.value ??
                data.body?.value ??
                data.body ?? '',
            status: data.status === 'draft' ? 'draft' : 'current',
            ancestors: data.ancestors,
            _links: data._links,
        };
    }

    /**
     * Resolve a space key to a space ID via the v2 API.
     * Falls back to the key itself if resolution fails.
     */
    private async resolveSpaceId(spaceKey: string): Promise<string> {
        try {
            const data = await this.makeRequest(
                'GET',
                `/wiki/api/v2/spaces?keys=${encodeURIComponent(spaceKey)}&limit=1`,
            );
            if (data.results && data.results.length > 0) {
                return String(data.results[0].id);
            }
        } catch {
            this.logger.debug(`Could not resolve space key "${spaceKey}" to ID`, {
                component: 'ConfluenceClient',
            });
        }
        return spaceKey;
    }

    /**
     * Extract a title from Markdown content or fall back to filename.
     */
    private extractTitle(content: string, filePath: string): string {
        // Try first H1
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match) {
            return h1Match[1].trim();
        }

        // Try frontmatter title
        const fmMatch = content.match(/^---[\s\S]*?title:\s*(.+?)[\s\S]*?---/);
        if (fmMatch) {
            return fmMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        // Fall back to filename
        return path.basename(filePath, path.extname(filePath));
    }

    /**
     * Convert a Markdown list block (indented lines with - or 1.) to HTML.
     */
    private convertListBlock(block: string, tag: 'ul' | 'ol'): string {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        let html = `<${tag}>`;

        for (const line of lines) {
            const content = line.replace(/^\s*[-*+]\s+/, '').replace(/^\s*\d+\.\s+/, '').trim();
            html += `<li>${escapeHtml(content)}</li>`;
        }

        html += `</${tag}>`;
        return html;
    }

    /**
     * Convert an HTML list (extracted from Confluence) to Markdown lines.
     */
    private htmlListToMarkdown(html: string, marker: string): string {
        const items = html.match(/<li>([\s\S]*?)<\/li>/g) ?? [];
        return items
            .map((item) => {
                const content = item.replace(/<\/?li>/g, '').trim();
                return `${marker} ${content}`;
            })
            .join('\n');
    }
}
