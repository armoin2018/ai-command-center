/**
 * Smart Context Panel Renderer
 *
 * Generates HTML sections for displaying contextually-relevant planning
 * items in the secondary panel. Renders match cards with score badges,
 * item type icons, match reason tags, and configuration controls.
 *
 * Part of AICC-0142: Smart Context Engine
 *   - AICC-0144: Context panel section & thresholds
 *   - AICC-0390: Create context panel section in secondary panel
 *   - AICC-0391: Implement threshold configuration UI
 *   - AICC-0392: Build suggestion display with click-to-navigate
 */

import { Logger } from '../logger';
import { EventBus } from './eventBus';
import type {
    ContextMatch,
    ContextConfig,
    MatchReason,
} from './smartContextEngine';

// ─── Constants ───────────────────────────────────────────────────────

/** Icon map for planning item types (AICC-0390) */
const ITEM_TYPE_ICONS: Record<string, string> = {
    epic: '🎯',
    story: '📖',
    task: '✅',
    bug: '🐛',
};

/** CSS colour for each match reason type */
const REASON_COLORS: Record<string, string> = {
    file_path: '#4fc3f7',
    tag: '#81c784',
    content: '#ffb74d',
    import: '#ba68c8',
    comment: '#e57373',
    parent: '#90a4ae',
    recent: '#fff176',
};

/** Human-readable label for each match reason type */
const REASON_LABELS: Record<string, string> = {
    file_path: 'Path',
    tag: 'Tag',
    content: 'Content',
    import: 'Import',
    comment: 'Ref',
    parent: 'Parent',
    recent: 'Recent',
};

// ─── SmartContextPanelRenderer ───────────────────────────────────────

/**
 * Singleton renderer that produces HTML fragments for the Smart Context
 * section of the secondary panel.
 *
 * Subscribes to the {@link EventBus} to detect planning changes and
 * invalidate cached HTML.
 *
 * @example
 * ```ts
 * const renderer = SmartContextPanelRenderer.getInstance();
 * const html = renderer.renderContextSection(matches);
 * ```
 */
export class SmartContextPanelRenderer {

    // ── Singleton ────────────────────────────────────────────────

    private static instance: SmartContextPanelRenderer | undefined;

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): SmartContextPanelRenderer {
        if (!SmartContextPanelRenderer.instance) {
            SmartContextPanelRenderer.instance = new SmartContextPanelRenderer();
        }
        return SmartContextPanelRenderer.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        SmartContextPanelRenderer.instance = undefined;
    }

    // ── State ────────────────────────────────────────────────────

    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    /** Cached rendered HTML (invalidated on planning changes) */
    private cachedHtml: string | null = null;

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();

        // Invalidate cache on planning changes
        this.eventBus.subscribe('planning.*', () => {
            this.cachedHtml = null;
        });
    }

    /**
     * Return the cached HTML from the last render, or null if invalidated.
     */
    public getCachedHtml(): string | null {
        return this.cachedHtml;
    }

    // ── Primary Render (AICC-0390) ───────────────────────────────

    /**
     * Generate the full HTML for the Smart Context panel section.
     *
     * Renders a list of match cards ordered by relevance score,
     * each showing type icon, summary, score badge, and match reasons.
     *
     * @param matches - Array of context matches to display
     * @returns HTML string for the panel section
     */
    public renderContextSection(matches: ContextMatch[]): string {
        if (!matches || matches.length === 0) {
            return this.renderEmptyState();
        }

        this.logger.debug(`Rendering Smart Context section with ${matches.length} match(es)`, {
            component: 'SmartContextPanelRenderer',
        });

        const cards = matches.map((m) => this.renderMatchCard(m)).join('\n');

        const html = `
<div class="smart-context-section" id="smartContextSection">
    <div class="smart-context-header">
        <h4 class="smart-context-title">
            <span class="smart-context-icon">🔍</span>
            Related Items
            <span class="badge bg-secondary ms-2">${matches.length}</span>
        </h4>
        <button class="btn btn-sm btn-outline-secondary smart-context-settings-btn"
                onclick="toggleSmartContextConfig()"
                title="Configure Smart Context">
            ⚙️
        </button>
    </div>
    <div class="smart-context-cards">
        ${cards}
    </div>
</div>`;

        this.cachedHtml = html;
        return html;
    }

    // ── Match Card (AICC-0392) ───────────────────────────────────

    /**
     * Render a single match card with type icon, summary, score badge,
     * status indicator, and match reason tags.
     *
     * Includes a click handler that sends a command to reveal the item
     * in the planning tree.
     *
     * @param match - The context match to render
     * @returns HTML string for one card
     */
    private renderMatchCard(match: ContextMatch): string {
        const icon = ITEM_TYPE_ICONS[match.itemType] || '📋';
        const scoreBadgeColor = this.getScoreBadgeColor(match.score);
        const truncatedSummary = this.truncateSummary(match.summary, 80);
        const statusBadge = this.renderStatusBadge(match.status);
        const reasonTags = match.matchReasons
            .slice(0, 4) // Show at most 4 reason badges
            .map((r) => this.renderMatchReason(r))
            .join('');

        // Deduplicate reason count
        const extraReasons = match.matchReasons.length > 4
            ? `<span class="smart-context-reason-more">+${match.matchReasons.length - 4}</span>`
            : '';

        return `
<div class="smart-context-card" onclick="navigateToItem('${this.escapeHtml(match.itemId)}')" title="Click to reveal in planning tree">
    <div class="smart-context-card-header">
        <span class="smart-context-type-icon">${icon}</span>
        <span class="smart-context-item-id">${this.escapeHtml(match.itemId)}</span>
        <span class="smart-context-score-badge" style="background-color: ${scoreBadgeColor};">
            ${match.score}
        </span>
    </div>
    <div class="smart-context-card-body">
        <div class="smart-context-summary">${this.escapeHtml(truncatedSummary)}</div>
        <div class="smart-context-meta">
            ${statusBadge}
            <span class="smart-context-priority smart-context-priority-${this.escapeHtml(match.priority)}">
                ${this.escapeHtml(match.priority)}
            </span>
        </div>
    </div>
    <div class="smart-context-card-footer">
        <div class="smart-context-reasons">
            ${reasonTags}${extraReasons}
        </div>
    </div>
</div>`;
    }

    // ── Empty State (AICC-0390) ──────────────────────────────────

    /**
     * Render the empty state shown when no matches are found.
     * Includes a link to open Smart Context configuration.
     *
     * @returns HTML string for the empty state
     */
    public renderEmptyState(): string {
        return `
<div class="smart-context-section smart-context-empty" id="smartContextSection">
    <div class="smart-context-empty-icon">🔍</div>
    <div class="smart-context-empty-text">
        No related planning items found for this file.
    </div>
    <div class="smart-context-empty-hint">
        Items are matched based on file paths, tags, identifiers, and comments.
        <br/>
        <a href="#" onclick="toggleSmartContextConfig(); return false;" class="smart-context-config-link">
            Adjust thresholds &amp; weights
        </a>
    </div>
</div>`;
    }

    // ── Configuration Section (AICC-0391) ────────────────────────

    /**
     * Render the configuration panel for Smart Context thresholds
     * and weights.
     *
     * Provides:
     * - Toggle to enable / disable the engine
     * - Range slider for minimum score threshold
     * - Number input for maximum results
     * - Weight sliders for each match type
     *
     * @param config - Current context configuration
     * @returns HTML string for the configuration section
     */
    public renderConfigSection(config: ContextConfig): string {
        return `
<div class="smart-context-config" id="smartContextConfig" style="display: none;">
    <div class="smart-context-config-header">
        <h5>Smart Context Settings</h5>
        <button class="btn btn-sm btn-outline-secondary" onclick="toggleSmartContextConfig()">✕</button>
    </div>

    <!-- Enable / Disable Toggle -->
    <div class="smart-context-config-row">
        <label for="smartContextEnabled" class="form-label">Enabled</label>
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="smartContextEnabled"
                   ${config.enabled ? 'checked' : ''}
                   onchange="updateSmartContextConfig('enabled', this.checked)">
        </div>
    </div>

    <!-- Minimum Score Threshold -->
    <div class="smart-context-config-row">
        <label for="smartContextMinScore" class="form-label">
            Min Score: <span id="smartContextMinScoreValue">${config.minScore}</span>
        </label>
        <input type="range" class="form-range" id="smartContextMinScore"
               min="0" max="100" step="1" value="${config.minScore}"
               oninput="document.getElementById('smartContextMinScoreValue').textContent = this.value;"
               onchange="updateSmartContextConfig('minScore', parseInt(this.value))">
    </div>

    <!-- Max Results -->
    <div class="smart-context-config-row">
        <label for="smartContextMaxResults" class="form-label">Max Results</label>
        <input type="number" class="form-control form-control-sm" id="smartContextMaxResults"
               min="1" max="50" value="${config.maxResults}"
               onchange="updateSmartContextConfig('maxResults', parseInt(this.value))">
    </div>

    <!-- Debounce (ms) -->
    <div class="smart-context-config-row">
        <label for="smartContextDebounce" class="form-label">Debounce (ms)</label>
        <input type="number" class="form-control form-control-sm" id="smartContextDebounce"
               min="100" max="5000" step="100" value="${config.debounceMs}"
               onchange="updateSmartContextConfig('debounceMs', parseInt(this.value))">
    </div>

    <hr class="smart-context-config-divider">
    <h6 class="smart-context-config-subtitle">Match Weights</h6>

    <!-- File Path Weight -->
    <div class="smart-context-config-row">
        <label for="smartContextFilePathWeight" class="form-label">
            File Path: <span id="smartContextFilePathWeightValue">${config.filePathWeight}</span>
        </label>
        <input type="range" class="form-range" id="smartContextFilePathWeight"
               min="0" max="20" step="1" value="${config.filePathWeight}"
               oninput="document.getElementById('smartContextFilePathWeightValue').textContent = this.value;"
               onchange="updateSmartContextConfig('filePathWeight', parseInt(this.value))">
    </div>

    <!-- Tag Weight -->
    <div class="smart-context-config-row">
        <label for="smartContextTagWeight" class="form-label">
            Tag: <span id="smartContextTagWeightValue">${config.tagWeight}</span>
        </label>
        <input type="range" class="form-range" id="smartContextTagWeight"
               min="0" max="20" step="1" value="${config.tagWeight}"
               oninput="document.getElementById('smartContextTagWeightValue').textContent = this.value;"
               onchange="updateSmartContextConfig('tagWeight', parseInt(this.value))">
    </div>

    <!-- Content Weight -->
    <div class="smart-context-config-row">
        <label for="smartContextContentWeight" class="form-label">
            Content: <span id="smartContextContentWeightValue">${config.contentWeight}</span>
        </label>
        <input type="range" class="form-range" id="smartContextContentWeight"
               min="0" max="20" step="1" value="${config.contentWeight}"
               oninput="document.getElementById('smartContextContentWeightValue').textContent = this.value;"
               onchange="updateSmartContextConfig('contentWeight', parseInt(this.value))">
    </div>

    <!-- Import Weight -->
    <div class="smart-context-config-row">
        <label for="smartContextImportWeight" class="form-label">
            Import: <span id="smartContextImportWeightValue">${config.importWeight}</span>
        </label>
        <input type="range" class="form-range" id="smartContextImportWeight"
               min="0" max="20" step="1" value="${config.importWeight}"
               oninput="document.getElementById('smartContextImportWeightValue').textContent = this.value;"
               onchange="updateSmartContextConfig('importWeight', parseInt(this.value))">
    </div>

    <!-- Recent Weight -->
    <div class="smart-context-config-row">
        <label for="smartContextRecentWeight" class="form-label">
            Recent: <span id="smartContextRecentWeightValue">${config.recentWeight}</span>
        </label>
        <input type="range" class="form-range" id="smartContextRecentWeight"
               min="0" max="20" step="1" value="${config.recentWeight}"
               oninput="document.getElementById('smartContextRecentWeightValue').textContent = this.value;"
               onchange="updateSmartContextConfig('recentWeight', parseInt(this.value))">
    </div>
</div>`;
    }

    // ── Match Reason Badge ───────────────────────────────────────

    /**
     * Render a small coloured badge for a single match reason.
     *
     * @param reason - The match reason to render
     * @returns HTML string for the badge
     */
    public renderMatchReason(reason: MatchReason): string {
        const color = REASON_COLORS[reason.type] || '#90a4ae';
        const label = REASON_LABELS[reason.type] || reason.type;

        return `<span class="smart-context-reason-badge" style="background-color: ${color};" title="${this.escapeHtml(reason.detail)}">${label}</span>`;
    }

    // ── Score Badge Colour (AICC-0389) ───────────────────────────

    /**
     * Determine the badge background colour based on the score.
     *
     * - Green  (`#4caf50`): score > 80
     * - Yellow (`#ffeb3b`): score 50–80
     * - Orange (`#ff9800`): score 30–50
     * - Gray   (`#9e9e9e`): score < 30
     *
     * @param score - The composite match score
     * @returns CSS colour string
     */
    public getScoreBadgeColor(score: number): string {
        if (score > 80) {
            return '#4caf50';
        }
        if (score >= 50) {
            return '#ffeb3b';
        }
        if (score >= 30) {
            return '#ff9800';
        }
        return '#9e9e9e';
    }

    // ── Status Badge ─────────────────────────────────────────────

    /**
     * Render a coloured status badge for a planning item.
     *
     * @param status - The item status string
     * @returns HTML string for the status badge
     */
    private renderStatusBadge(status: string): string {
        const statusColors: Record<string, string> = {
            'todo': '#90a4ae',
            'ready': '#42a5f5',
            'pending': '#ffa726',
            'in-progress': '#66bb6a',
            'review': '#ab47bc',
            'done': '#4caf50',
        };

        const color = statusColors[status.toLowerCase()] || '#90a4ae';
        const displayStatus = status.replace(/-/g, ' ');

        return `<span class="smart-context-status-badge" style="background-color: ${color};">${this.escapeHtml(displayStatus)}</span>`;
    }

    // ── Styles ───────────────────────────────────────────────────

    /**
     * Generate the CSS styles for the Smart Context panel section.
     * Include this in the panel's `<style>` block.
     *
     * @returns CSS string
     */
    public getStyles(): string {
        return `
/* ── Smart Context Section ──────────────────────────────────── */

.smart-context-section {
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
}

.smart-context-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.smart-context-title {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
}

.smart-context-icon {
    font-size: 14px;
}

.smart-context-settings-btn {
    padding: 2px 6px;
    font-size: 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    opacity: 0.7;
}

.smart-context-settings-btn:hover {
    opacity: 1;
}

/* ── Match Cards ────────────────────────────────────────────── */

.smart-context-cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.smart-context-card {
    padding: 8px 10px;
    border: 1px solid var(--vscode-panel-border, #444);
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
    background-color: var(--vscode-editor-background, #1e1e1e);
}

.smart-context-card:hover {
    background-color: var(--vscode-list-hoverBackground, #2a2d2e);
    border-color: var(--vscode-focusBorder, #007acc);
}

.smart-context-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
}

.smart-context-type-icon {
    font-size: 14px;
    flex-shrink: 0;
}

.smart-context-item-id {
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-textLink-foreground, #3794ff);
    flex-shrink: 0;
}

.smart-context-score-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    color: #000;
    min-width: 24px;
    text-align: center;
}

.smart-context-card-body {
    margin-bottom: 4px;
}

.smart-context-summary {
    font-size: 12px;
    line-height: 1.3;
    color: var(--vscode-foreground, #ccc);
    margin-bottom: 4px;
}

.smart-context-meta {
    display: flex;
    align-items: center;
    gap: 6px;
}

.smart-context-status-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    color: #fff;
    text-transform: capitalize;
}

.smart-context-priority {
    font-size: 10px;
    text-transform: uppercase;
    opacity: 0.8;
}

.smart-context-priority-high {
    color: #e57373;
    font-weight: 600;
}

.smart-context-priority-medium {
    color: #ffb74d;
}

.smart-context-priority-low {
    color: #81c784;
}

/* ── Reason Badges ──────────────────────────────────────────── */

.smart-context-card-footer {
    margin-top: 4px;
}

.smart-context-reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
}

.smart-context-reason-badge {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 6px;
    color: #000;
    cursor: default;
}

.smart-context-reason-more {
    font-size: 9px;
    color: var(--vscode-descriptionForeground, #888);
    padding: 1px 4px;
}

/* ── Empty State ────────────────────────────────────────────── */

.smart-context-empty {
    text-align: center;
    padding: 20px 12px;
}

.smart-context-empty-icon {
    font-size: 28px;
    margin-bottom: 8px;
    opacity: 0.5;
}

.smart-context-empty-text {
    font-size: 12px;
    color: var(--vscode-descriptionForeground, #888);
    margin-bottom: 6px;
}

.smart-context-empty-hint {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #666);
    line-height: 1.4;
}

.smart-context-config-link {
    color: var(--vscode-textLink-foreground, #3794ff);
    text-decoration: none;
}

.smart-context-config-link:hover {
    text-decoration: underline;
}

/* ── Configuration Panel ────────────────────────────────────── */

.smart-context-config {
    padding: 10px 12px;
    border: 1px solid var(--vscode-panel-border, #444);
    border-radius: 6px;
    margin-top: 8px;
    background-color: var(--vscode-editor-background, #1e1e1e);
}

.smart-context-config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.smart-context-config-header h5 {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
}

.smart-context-config-row {
    margin-bottom: 10px;
}

.smart-context-config-row .form-label {
    font-size: 11px;
    margin-bottom: 3px;
    display: block;
    color: var(--vscode-foreground, #ccc);
}

.smart-context-config-divider {
    border-color: var(--vscode-panel-border, #333);
    margin: 12px 0;
}

.smart-context-config-subtitle {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
}
`;
    }

    // ── Helpers ───────────────────────────────────────────────────

    /**
     * Truncate a summary string to the given maximum length,
     * appending an ellipsis if truncated.
     *
     * @param text      - The text to truncate
     * @param maxLength - Maximum character length
     * @returns Truncated string
     */
    private truncateSummary(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 1).trimEnd() + '…';
    }

    /**
     * Escape HTML special characters to prevent XSS in rendered output.
     *
     * @param text - Raw text to escape
     * @returns HTML-safe string
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
