/**
 * Natural Language Planning Parser
 *
 * Parses natural language chat input into structured planning intents,
 * extracts attributes (priority, assignee, story points, tags, type),
 * and builds confirmation messages for the user.
 *
 * Part of AICC-0119: Natural Language Planning
 *   - AICC-0120: NL → Epic/Story creation with attribute extraction
 *   - AICC-0329: Design NL parsing prompt for planning items
 *   - AICC-0330: Implement attribute extraction from parsed NL
 *   - AICC-0331: Build confirmation flow UI in chat
 *   - AICC-0332: Wire confirmed items to planning CRUD
 */

import { Logger } from '../logger';
import {
    Priority,
    ItemType,
    StoryStatus,
    TaskStatus,
    EpicStatus,
} from '../planning/types';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * The structured intent parsed from a natural language request.
 */
export interface ParsedPlanningIntent {
    /** Detected intent category */
    intentType: PlanningIntentType;
    /** Extracted title for the item (create intents) */
    title: string;
    /** Extracted description or remaining text */
    description: string;
    /** Extracted attributes from NL text */
    attributes: PlanningAttributes;
    /** The original raw input text */
    rawInput: string;
    /** Confidence score 0-1 for intent classification */
    confidence: number;
    /** Query string for query intents */
    query?: string;
    /** Pipeline name for trigger intents */
    pipelineName?: string;
    /** Target item ID for update intents */
    targetItemId?: string;
    /** New status for update_status intents */
    newStatus?: string;
}

/**
 * Supported planning intent types.
 */
export type PlanningIntentType =
    | 'create_epic'
    | 'create_story'
    | 'create_task'
    | 'create_bug'
    | 'query_items'
    | 'update_status'
    | 'trigger_pipeline';

/**
 * Attributes extracted from natural language text.
 */
export interface PlanningAttributes {
    /** Detected priority level */
    priority?: Priority;
    /** Detected item type */
    itemType?: ItemType;
    /** Story points / effort estimate */
    storyPoints?: number;
    /** Assignee username */
    assignee?: string;
    /** Extracted tags */
    tags?: string[];
    /** Parent epic ID if referenced */
    parentEpicId?: string;
    /** Parent story ID if referenced */
    parentStoryId?: string;
    /** Estimated hours */
    estimatedHours?: number;
    /** Due date if mentioned */
    deliverByDate?: string;
}

/**
 * Partial plan item structure suitable for PlanningManager CRUD calls.
 */
export interface PartialPlanItem {
    type: ItemType;
    title: string;
    description: string;
    priority?: Priority;
    status: string;
    assignee?: string;
    tags?: string[];
    estimatedHours?: number;
    deliverByDate?: string | null;
    epicId?: string | null;
    order: number;
}

// ─── Regex Patterns ──────────────────────────────────────────────────

/** Priority detection patterns mapping NL phrases to Priority enum values */
const PRIORITY_PATTERNS: Array<{ pattern: RegExp; priority: Priority }> = [
    { pattern: /\b(?:p0|critical|blocker|showstopper)\b/i, priority: Priority.High },
    { pattern: /\b(?:p1|high\s*priority|urgent|important|high\s*pri)\b/i, priority: Priority.High },
    { pattern: /\b(?:p2|medium\s*priority|moderate|normal|medium\s*pri)\b/i, priority: Priority.Medium },
    { pattern: /\b(?:p3|low\s*priority|minor|nice\s*to\s*have|low\s*pri)\b/i, priority: Priority.Low },
];

/** Item type detection patterns mapping NL phrases to ItemType enum values */
const ITEM_TYPE_PATTERNS: Array<{ pattern: RegExp; type: ItemType }> = [
    { pattern: /\b(?:epic\s+(?:for|about|to|called|named|titled))\b/i, type: ItemType.Epic },
    { pattern: /\bcreate\s+(?:an?\s+)?epic\b/i, type: ItemType.Epic },
    { pattern: /\bnew\s+epic\b/i, type: ItemType.Epic },
    { pattern: /\b(?:story\s+(?:for|about|to|called|named|titled))\b/i, type: ItemType.Story },
    { pattern: /\bcreate\s+(?:an?\s+)?(?:user\s+)?story\b/i, type: ItemType.Story },
    { pattern: /\bnew\s+(?:user\s+)?story\b/i, type: ItemType.Story },
    { pattern: /\b(?:task\s+(?:for|about|to|called|named|titled))\b/i, type: ItemType.Task },
    { pattern: /\bcreate\s+(?:an?\s+)?task\b/i, type: ItemType.Task },
    { pattern: /\bnew\s+task\b/i, type: ItemType.Task },
    { pattern: /\b(?:bug\s+(?:for|about|in|called|named|titled))\b/i, type: ItemType.Bug },
    { pattern: /\bcreate\s+(?:an?\s+)?bug\b/i, type: ItemType.Bug },
    { pattern: /\bnew\s+bug\b/i, type: ItemType.Bug },
    { pattern: /\breport\s+(?:an?\s+)?bug\b/i, type: ItemType.Bug },
    { pattern: /\bfile\s+(?:an?\s+)?bug\b/i, type: ItemType.Bug },
];

/** Story point extraction patterns */
const STORY_POINTS_PATTERNS: RegExp[] = [
    /(\d+)\s*(?:story\s*)?(?:points?|sp)\b/i,
    /\bpoints?\s*:\s*(\d+)/i,
    /\bsp\s*:\s*(\d+)/i,
    /\bestimate(?:d)?\s*:\s*(\d+)\s*(?:points?|sp)?\b/i,
];

/** Assignee extraction patterns */
const ASSIGNEE_PATTERNS: RegExp[] = [
    /\bassign(?:ed)?\s+to\s+@?([\w.-]+)/i,
    /\bfor\s+@([\w.-]+)/i,
    /\bowner\s*:\s*@?([\w.-]+)/i,
    /\b@([\w.-]+)\s+(?:should|will|can|to)\b/i,
];

/** Tag extraction patterns */
const TAG_PATTERNS: RegExp[] = [
    /#([\w-]+)/g,
    /\btags?\s*:\s*([\w-]+(?:\s*,\s*[\w-]+)*)/i,
    /\btagged\s+(?:with|as)\s+([\w-]+(?:\s*,\s*[\w-]+)*)/i,
    /\blabel(?:s|ed)?\s*:\s*([\w-]+(?:\s*,\s*[\w-]+)*)/i,
];

/** Parent epic reference patterns */
const PARENT_EPIC_PATTERNS: RegExp[] = [
    /\b(?:under|in|for|parent)\s+(?:epic\s+)?(AICC-\d{4})/i,
    /\bepic\s+(AICC-\d{4})/i,
    /\b(AICC-\d{4})\s+epic\b/i,
];

/** Parent story reference patterns */
const PARENT_STORY_PATTERNS: RegExp[] = [
    /\b(?:under|in|for|parent)\s+(?:story\s+)?(AICC-\d{4})/i,
    /\bstory\s+(AICC-\d{4})/i,
];

/** Estimated hours patterns */
const HOURS_PATTERNS: RegExp[] = [
    /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i,
    /\bestimate(?:d)?\s*:\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)?\b/i,
];

/** Due date patterns */
const DUE_DATE_PATTERNS: RegExp[] = [
    /\b(?:due|by|before|deadline)\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
    /\b(?:due|by|before|deadline)\s+(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/i,
];

/** Intent detection: query patterns */
const QUERY_INTENT_PATTERNS: RegExp[] = [
    /\b(?:show|list|find|search|get|what|which|how\s+many)\b.*\b(?:items?|stories|tasks?|epics?|bugs?)\b/i,
    /\b(?:items?|stories|tasks?|epics?|bugs?)\b.*\b(?:status|assigned|priority|tagged)\b/i,
    /\bstatus\s+of\b/i,
    /\bwhat(?:'s| is| are)\s+(?:the\s+)?(?:status|progress)\b/i,
];

/** Intent detection: update status patterns */
const UPDATE_STATUS_PATTERNS: RegExp[] = [
    /\b(?:move|change|set|update|mark)\s+(?:item\s+)?(AICC-\d{4})\s+(?:to|as|status)\s+(\w[\w-]*)/i,
    /\b(?:move|change|set|update|mark)\s+(?:item\s+)?(AICC-\d{4})\s+(?:to|as)\s+(\w[\w-]*)/i,
    /\b(AICC-\d{4})\s+(?:is|to)\s+(?:now\s+)?(\w[\w-]*)/i,
];

/** Intent detection: pipeline trigger patterns */
const PIPELINE_TRIGGER_PATTERNS: RegExp[] = [
    /\b(?:run|trigger|execute|start|launch)\s+(?:the\s+)?(?:pipeline|workflow|skill)\s+(?:called\s+|named\s+)?([\w-]+)/i,
    /\b(?:pipeline|workflow|skill)\s+([\w-]+)\s+(?:run|trigger|execute|start|launch)/i,
];

// ─── NlPlanningParser ────────────────────────────────────────────────

/**
 * Singleton service that parses natural language chat input into structured
 * planning intents with attribute extraction.
 *
 * @example
 * ```ts
 * const parser = NlPlanningParser.getInstance();
 * const intent = await parser.parseRequest('Create a high priority story about user login');
 * console.log(intent.intentType); // 'create_story'
 * console.log(intent.attributes.priority); // Priority.High
 * ```
 */
export class NlPlanningParser {
    private static instance: NlPlanningParser;
    private readonly logger: Logger;

    private constructor() {
        this.logger = Logger.getInstance();
        this.logger.info('NlPlanningParser initialized', {
            component: 'NlPlanningParser',
        });
    }

    /**
     * Get or create the singleton instance.
     * @returns The NlPlanningParser singleton
     */
    public static getInstance(): NlPlanningParser {
        if (!NlPlanningParser.instance) {
            NlPlanningParser.instance = new NlPlanningParser();
        }
        return NlPlanningParser.instance;
    }

    // ─── Public API ──────────────────────────────────────────────

    /**
     * Parse a natural language request into a structured planning intent.
     *
     * Determines intent type (create, query, update, pipeline trigger),
     * extracts a title and description, and pulls attributes like priority,
     * assignee, story points, and tags from the text.
     *
     * @param text - The raw natural language input from the user
     * @returns A fully populated ParsedPlanningIntent
     */
    public async parseRequest(text: string): Promise<ParsedPlanningIntent> {
        const start = Date.now();
        const trimmed = text.trim();

        this.logger.debug('Parsing NL planning request', {
            component: 'NlPlanningParser',
            inputLength: trimmed.length,
        });

        try {
            // 1. Detect intent type
            const { intentType, confidence } = this.detectIntentType(trimmed);

            // 2. Extract all attributes
            const attributes = this.extractAttributes(trimmed);

            // 3. Extract title and description based on intent
            const { title, description } = this.extractTitleAndDescription(trimmed, intentType);

            // 4. Build the intent object
            const intent: ParsedPlanningIntent = {
                intentType,
                title,
                description,
                attributes,
                rawInput: trimmed,
                confidence,
            };

            // 5. Populate intent-specific fields
            this.populateIntentSpecificFields(intent, trimmed);

            const duration = Date.now() - start;
            this.logger.debug('NL planning request parsed', {
                component: 'NlPlanningParser',
                intentType,
                confidence,
                duration,
                title: title.substring(0, 60),
            });

            return intent;
        } catch (error) {
            this.logger.error('Failed to parse NL planning request', {
                component: 'NlPlanningParser',
                error: error instanceof Error ? error.message : String(error),
                input: trimmed.substring(0, 100),
            });
            throw error;
        }
    }

    /**
     * Extract planning attributes from natural language text.
     *
     * Scans for priority, item type, story points, assignee, tags,
     * parent references, estimated hours, and due dates.
     *
     * @param text - The raw natural language input
     * @returns Extracted PlanningAttributes
     */
    public extractAttributes(text: string): PlanningAttributes {
        const attrs: PlanningAttributes = {};

        attrs.priority = this.extractPriority(text);
        attrs.itemType = this.extractItemType(text);
        attrs.storyPoints = this.extractStoryPoints(text);
        attrs.assignee = this.extractAssignee(text);
        attrs.tags = this.extractTags(text);
        attrs.parentEpicId = this.extractParentEpicId(text);
        attrs.parentStoryId = this.extractParentStoryId(text);
        attrs.estimatedHours = this.extractEstimatedHours(text);
        attrs.deliverByDate = this.extractDueDate(text);

        return attrs;
    }

    /**
     * Generate a markdown confirmation message for the user to review
     * before committing the parsed intent to PLAN.json.
     *
     * @param intent - The parsed planning intent to confirm
     * @returns Markdown-formatted confirmation string
     */
    public generateConfirmationMessage(intent: ParsedPlanningIntent): string {
        const lines: string[] = [];

        lines.push('## 📝 Confirm Planning Item Creation\n');
        lines.push(`**Type:** ${this.formatItemType(intent.intentType)}`);
        lines.push(`**Title:** ${intent.title}`);

        if (intent.description) {
            lines.push(`**Description:** ${intent.description}`);
        }

        lines.push('');
        lines.push('### Attributes');
        lines.push('');
        lines.push('| Field | Value |');
        lines.push('|-------|-------|');

        if (intent.attributes.priority) {
            lines.push(`| Priority | ${intent.attributes.priority} |`);
        }
        if (intent.attributes.assignee) {
            lines.push(`| Assignee | @${intent.attributes.assignee} |`);
        }
        if (intent.attributes.storyPoints !== undefined) {
            lines.push(`| Story Points | ${intent.attributes.storyPoints} |`);
        }
        if (intent.attributes.estimatedHours !== undefined) {
            lines.push(`| Estimated Hours | ${intent.attributes.estimatedHours} |`);
        }
        if (intent.attributes.tags && intent.attributes.tags.length > 0) {
            lines.push(`| Tags | ${intent.attributes.tags.map(t => `\`${t}\``).join(', ')} |`);
        }
        if (intent.attributes.parentEpicId) {
            lines.push(`| Parent Epic | ${intent.attributes.parentEpicId} |`);
        }
        if (intent.attributes.parentStoryId) {
            lines.push(`| Parent Story | ${intent.attributes.parentStoryId} |`);
        }
        if (intent.attributes.deliverByDate) {
            lines.push(`| Due Date | ${intent.attributes.deliverByDate} |`);
        }

        lines.push('');
        lines.push(`**Confidence:** ${(intent.confidence * 100).toFixed(0)}%\n`);
        lines.push('---');
        lines.push('');
        lines.push('✅ Reply **yes** or **confirm** to create this item.');
        lines.push('❌ Reply **no** or **cancel** to discard.');
        lines.push('✏️  Reply with changes to modify before creating.');

        return lines.join('\n');
    }

    /**
     * Convert a parsed intent into a partial plan item structure suitable
     * for passing to PlanningManager CRUD methods.
     *
     * @param intent - The confirmed planning intent
     * @returns Partial plan item ready for PlanningManager
     */
    public buildPlanItem(intent: ParsedPlanningIntent): PartialPlanItem {
        const itemType = this.intentTypeToItemType(intent.intentType);
        const defaultStatus = this.getDefaultStatus(itemType);

        const item: PartialPlanItem = {
            type: itemType,
            title: intent.title,
            description: intent.description || '',
            status: defaultStatus,
            order: 0,
        };

        if (intent.attributes.priority) {
            item.priority = intent.attributes.priority;
        }
        if (intent.attributes.assignee) {
            item.assignee = intent.attributes.assignee;
        }
        if (intent.attributes.tags && intent.attributes.tags.length > 0) {
            item.tags = intent.attributes.tags;
        }
        if (intent.attributes.estimatedHours !== undefined) {
            item.estimatedHours = intent.attributes.estimatedHours;
        }
        if (intent.attributes.deliverByDate) {
            item.deliverByDate = intent.attributes.deliverByDate;
        }
        if (intent.attributes.parentEpicId) {
            item.epicId = intent.attributes.parentEpicId;
        }

        return item;
    }

    /**
     * Check whether a given text looks like a planning-related request
     * (as opposed to a general chat question).
     *
     * @param text - The raw input text
     * @returns True if the text likely contains a planning intent
     */
    public isPlanningRelated(text: string): boolean {
        const planningKeywords =
            /\b(?:create|add|new|make|build|file|report|show|list|find|search|get|move|change|set|update|mark|status|run|trigger|execute|pipeline)\b/i;
        const itemKeywords =
            /\b(?:epic|story|task|bug|item|backlog|sprint|points?|assignee|priority)\b/i;

        return planningKeywords.test(text) && itemKeywords.test(text);
    }

    // ─── Intent Detection ────────────────────────────────────────

    /**
     * Detect the intent type from the input text.
     *
     * @param text - The input text
     * @returns Object with intentType and confidence score
     */
    private detectIntentType(text: string): {
        intentType: PlanningIntentType;
        confidence: number;
    } {
        // Check pipeline trigger first (most specific)
        for (const pattern of PIPELINE_TRIGGER_PATTERNS) {
            if (pattern.test(text)) {
                return { intentType: 'trigger_pipeline', confidence: 0.9 };
            }
        }

        // Check update status
        for (const pattern of UPDATE_STATUS_PATTERNS) {
            if (pattern.test(text)) {
                return { intentType: 'update_status', confidence: 0.85 };
            }
        }

        // Check query intent
        for (const pattern of QUERY_INTENT_PATTERNS) {
            if (pattern.test(text)) {
                return { intentType: 'query_items', confidence: 0.8 };
            }
        }

        // Check create intents by item type
        const detectedType = this.extractItemType(text);
        if (detectedType) {
            const hasCreateVerb = /\b(?:create|add|new|make|build|file|report)\b/i.test(text);
            const confidence = hasCreateVerb ? 0.9 : 0.7;

            switch (detectedType) {
                case ItemType.Epic:
                    return { intentType: 'create_epic', confidence };
                case ItemType.Story:
                    return { intentType: 'create_story', confidence };
                case ItemType.Task:
                    return { intentType: 'create_task', confidence };
                case ItemType.Bug:
                    return { intentType: 'create_bug', confidence };
            }
        }

        // Fallback: if it has a create verb, default to story
        if (/\b(?:create|add|new|make|build)\b/i.test(text)) {
            return { intentType: 'create_story', confidence: 0.5 };
        }

        // Default: treat as query
        return { intentType: 'query_items', confidence: 0.4 };
    }

    /**
     * Populate intent-specific fields (query, pipelineName, targetItemId, newStatus).
     *
     * @param intent - The intent object to populate
     * @param text - The raw input text
     */
    private populateIntentSpecificFields(
        intent: ParsedPlanningIntent,
        text: string,
    ): void {
        switch (intent.intentType) {
            case 'query_items':
                intent.query = text;
                break;

            case 'trigger_pipeline': {
                for (const pattern of PIPELINE_TRIGGER_PATTERNS) {
                    const match = text.match(pattern);
                    if (match) {
                        intent.pipelineName = match[1];
                        break;
                    }
                }
                break;
            }

            case 'update_status': {
                for (const pattern of UPDATE_STATUS_PATTERNS) {
                    const match = text.match(pattern);
                    if (match) {
                        intent.targetItemId = match[1];
                        intent.newStatus = match[2].toLowerCase();
                        break;
                    }
                }
                break;
            }
        }
    }

    // ─── Attribute Extraction ────────────────────────────────────

    /**
     * Extract priority from text.
     * @param text - Input text
     * @returns Detected Priority or undefined
     */
    private extractPriority(text: string): Priority | undefined {
        for (const { pattern, priority } of PRIORITY_PATTERNS) {
            if (pattern.test(text)) {
                return priority;
            }
        }
        return undefined;
    }

    /**
     * Extract item type from text.
     * @param text - Input text
     * @returns Detected ItemType or undefined
     */
    private extractItemType(text: string): ItemType | undefined {
        for (const { pattern, type } of ITEM_TYPE_PATTERNS) {
            if (pattern.test(text)) {
                return type;
            }
        }
        return undefined;
    }

    /**
     * Extract story points from text.
     * @param text - Input text
     * @returns Detected story points or undefined
     */
    private extractStoryPoints(text: string): number | undefined {
        for (const pattern of STORY_POINTS_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                const points = parseInt(match[1], 10);
                if (points > 0 && points <= 100) {
                    return points;
                }
            }
        }
        return undefined;
    }

    /**
     * Extract assignee from text.
     * @param text - Input text
     * @returns Detected assignee username or undefined
     */
    private extractAssignee(text: string): string | undefined {
        for (const pattern of ASSIGNEE_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }

    /**
     * Extract tags from text.
     * @param text - Input text
     * @returns Array of extracted tags, or undefined if none found
     */
    private extractTags(text: string): string[] | undefined {
        const tags = new Set<string>();

        // Extract hashtags
        const hashtagRegex = /#([\w-]+)/g;
        let match: RegExpExecArray | null;
        while ((match = hashtagRegex.exec(text)) !== null) {
            tags.add(match[1].toLowerCase());
        }

        // Extract comma-separated tags from "tags: x, y" patterns
        for (const pattern of TAG_PATTERNS.slice(1)) {
            const tagMatch = text.match(pattern);
            if (tagMatch) {
                const tagList = tagMatch[1].split(/\s*,\s*/);
                for (const tag of tagList) {
                    const cleaned = tag.trim().toLowerCase();
                    if (cleaned) {
                        tags.add(cleaned);
                    }
                }
            }
        }

        return tags.size > 0 ? Array.from(tags) : undefined;
    }

    /**
     * Extract parent epic ID from text.
     * @param text - Input text
     * @returns Detected AICC-NNNN epic ID or undefined
     */
    private extractParentEpicId(text: string): string | undefined {
        for (const pattern of PARENT_EPIC_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }
        return undefined;
    }

    /**
     * Extract parent story ID from text.
     * @param text - Input text
     * @returns Detected AICC-NNNN story ID or undefined
     */
    private extractParentStoryId(text: string): string | undefined {
        for (const pattern of PARENT_STORY_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }
        return undefined;
    }

    /**
     * Extract estimated hours from text.
     * @param text - Input text
     * @returns Detected hours or undefined
     */
    private extractEstimatedHours(text: string): number | undefined {
        for (const pattern of HOURS_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                const hours = parseFloat(match[1]);
                if (hours > 0 && hours <= 1000) {
                    return hours;
                }
            }
        }
        return undefined;
    }

    /**
     * Extract due date from text.
     * @param text - Input text
     * @returns ISO 8601 date string or undefined
     */
    private extractDueDate(text: string): string | undefined {
        for (const pattern of DUE_DATE_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                // Try to parse as ISO date first
                const isoMatch = match[1].match(/^\d{4}-\d{2}-\d{2}$/);
                if (isoMatch) {
                    return match[1];
                }

                // Try to parse natural date (e.g., "March 15, 2026")
                try {
                    const parsed = new Date(match[1]);
                    if (!isNaN(parsed.getTime())) {
                        return parsed.toISOString().split('T')[0];
                    }
                } catch {
                    // Ignore parse failures
                }
            }
        }
        return undefined;
    }

    // ─── Title / Description Extraction ──────────────────────────

    /**
     * Extract a clean title and description from the input text
     * based on the detected intent type.
     *
     * @param text - The raw input text
     * @param intentType - The detected intent type
     * @returns Object with title and description
     */
    private extractTitleAndDescription(
        text: string,
        intentType: PlanningIntentType,
    ): { title: string; description: string } {
        if (!intentType.startsWith('create_')) {
            return { title: '', description: text };
        }

        let cleaned = text;

        // Remove create/add/new verbs and type keywords
        cleaned = cleaned.replace(
            /\b(?:create|add|new|make|build|file|report)\s+(?:an?\s+)?(?:user\s+)?(?:epic|story|task|bug)\s*/i,
            '',
        );
        // Remove "for", "about", "to", "called", "named", "titled" leader
        cleaned = cleaned.replace(/^(?:for|about|to|called|named|titled)\s+/i, '');

        // Remove extracted attributes from text to get clean title
        cleaned = this.stripAttributes(cleaned);

        // Trim and capitalize
        cleaned = cleaned.trim();
        if (cleaned.length > 0) {
            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }

        // Split into title (first sentence) and description (rest)
        const sentenceEnd = cleaned.search(/[.!?]\s/);
        let title: string;
        let description: string;

        if (sentenceEnd > 0 && sentenceEnd < 120) {
            title = cleaned.substring(0, sentenceEnd + 1).trim();
            description = cleaned.substring(sentenceEnd + 2).trim();
        } else if (cleaned.length > 120) {
            // Find a natural break point
            const breakPoint = cleaned.lastIndexOf(' ', 120);
            title = cleaned.substring(0, breakPoint > 40 ? breakPoint : 120).trim();
            description = cleaned.substring(title.length).trim();
        } else {
            title = cleaned;
            description = '';
        }

        return { title, description };
    }

    /**
     * Strip known attribute patterns from text to produce a cleaner title.
     *
     * @param text - Text to clean
     * @returns Text with attribute references removed
     */
    private stripAttributes(text: string): string {
        let cleaned = text;

        // Remove priority phrases
        cleaned = cleaned.replace(
            /\b(?:p[0-3]|critical|blocker|showstopper|high\s*priority|urgent|important|medium\s*priority|moderate|normal|low\s*priority|minor|nice\s*to\s*have|high\s*pri|medium\s*pri|low\s*pri)\b/gi,
            '',
        );
        // Remove assignee references
        cleaned = cleaned.replace(/\b(?:assign(?:ed)?\s+to\s+@?[\w.-]+|for\s+@[\w.-]+|owner\s*:\s*@?[\w.-]+)\b/gi, '');
        // Remove story points
        cleaned = cleaned.replace(/\b\d+\s*(?:story\s*)?(?:points?|sp)\b/gi, '');
        // Remove hashtags
        cleaned = cleaned.replace(/#[\w-]+/g, '');
        // Remove tag declarations
        cleaned = cleaned.replace(/\btags?\s*:\s*[\w-]+(?:\s*,\s*[\w-]+)*/gi, '');
        // Remove hour estimates
        cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)\b/gi, '');
        // Remove due dates
        cleaned = cleaned.replace(/\b(?:due|by|before|deadline)\s*:?\s*\S+/gi, '');
        // Remove parent references
        cleaned = cleaned.replace(/\b(?:under|in|for|parent)\s+(?:epic|story)\s+AICC-\d{4}/gi, '');
        // Collapse whitespace
        cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

        return cleaned;
    }

    // ─── Helpers ─────────────────────────────────────────────────

    /**
     * Convert an intent type to the corresponding ItemType enum value.
     * @param intentType - The planning intent type
     * @returns The ItemType enum value
     */
    private intentTypeToItemType(intentType: PlanningIntentType): ItemType {
        switch (intentType) {
            case 'create_epic':
                return ItemType.Epic;
            case 'create_story':
                return ItemType.Story;
            case 'create_task':
                return ItemType.Task;
            case 'create_bug':
                return ItemType.Bug;
            default:
                return ItemType.Story;
        }
    }

    /**
     * Get the default status string for a new item of a given type.
     * @param itemType - The ItemType enum value
     * @returns The default status string
     */
    private getDefaultStatus(itemType: ItemType): string {
        switch (itemType) {
            case ItemType.Epic:
                return EpicStatus.Todo;
            case ItemType.Story:
                return StoryStatus.Todo;
            case ItemType.Task:
                return TaskStatus.Todo;
            case ItemType.Bug:
                return TaskStatus.Todo;
            default:
                return StoryStatus.Todo;
        }
    }

    /**
     * Format the intent type into a human-readable item type label.
     * @param intentType - The planning intent type
     * @returns Human-readable type label
     */
    private formatItemType(intentType: PlanningIntentType): string {
        switch (intentType) {
            case 'create_epic':
                return '🏔️ Epic';
            case 'create_story':
                return '📖 Story';
            case 'create_task':
                return '✅ Task';
            case 'create_bug':
                return '🐛 Bug';
            default:
                return '📋 Item';
        }
    }
}
