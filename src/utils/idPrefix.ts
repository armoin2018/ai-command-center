/**
 * Utility for reading the workspace-configurable planning ID prefix.
 *
 * The prefix is stored in `aicc.idPrefix` (default "ARMOIN") and is
 * used to construct and validate IDs like `ARMOIN-001`.
 */

import * as vscode from 'vscode';

const DEFAULT_PREFIX = 'ARMOIN';

/**
 * Get the configured ID prefix for planning items.
 * Falls back to "ARMOIN" if not set.
 */
export function getIdPrefix(): string {
    const config = vscode.workspace.getConfiguration('aicc');
    return config.get<string>('idPrefix', DEFAULT_PREFIX);
}

/**
 * Build a RegExp that validates a planning item ID against the
 * configured prefix.  Example result: /^ARMOIN-\d{3}$/
 */
export function getIdPattern(): RegExp {
    const prefix = getIdPrefix().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${prefix}-\\d{3}$`);
}

/**
 * Return a human-friendly description of the expected ID format,
 * e.g. "ARMOIN-XXX".
 */
export function getIdFormatDescription(): string {
    return `${getIdPrefix()}-XXX`;
}
