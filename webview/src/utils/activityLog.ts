/**
 * Activity Log
 * 
 * Tracks and displays user actions with undo capability
 */

export type ActionType = 
    | 'create' 
    | 'edit' 
    | 'delete' 
    | 'bulk-edit' 
    | 'bulk-delete' 
    | 'sync' 
    | 'import' 
    | 'export';

export interface ActivityLogEntry {
    id: string;
    timestamp: string;
    action: ActionType;
    target: string;
    details: string;
    previousState?: any;
    canUndo: boolean;
}

export class ActivityLog {
    private static readonly STORAGE_KEY = 'activityLog';
    private static readonly MAX_ENTRIES = 100;

    /**
     * Add entry to activity log
     */
    static addEntry(
        action: ActionType,
        target: string,
        details: string,
        previousState?: any
    ): ActivityLogEntry {
        const entry: ActivityLogEntry = {
            id: `activity-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action,
            target,
            details,
            previousState,
            canUndo: !!previousState
        };

        const log = this.getLog();
        log.unshift(entry);
        const trimmed = log.slice(0, this.MAX_ENTRIES);
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
        
        return entry;
    }

    /**
     * Get activity log
     */
    static getLog(): ActivityLogEntry[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Get log filtered by action type
     */
    static getByAction(action: ActionType): ActivityLogEntry[] {
        return this.getLog().filter(entry => entry.action === action);
    }

    /**
     * Get recent entries (last n)
     */
    static getRecent(count: number = 10): ActivityLogEntry[] {
        return this.getLog().slice(0, count);
    }

    /**
     * Clear activity log
     */
    static clear(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Export log to JSON
     */
    static export(): string {
        return JSON.stringify(this.getLog(), null, 2);
    }

    /**
     * Get action icon
     */
    static getActionIcon(action: ActionType): string {
        switch (action) {
            case 'create': return '➕';
            case 'edit': return '✏️';
            case 'delete': return '🗑️';
            case 'bulk-edit': return '📝';
            case 'bulk-delete': return '🗑️';
            case 'sync': return '🔄';
            case 'import': return '📥';
            case 'export': return '📤';
        }
    }

    /**
     * Get action label
     */
    static getActionLabel(action: ActionType): string {
        switch (action) {
            case 'create': return 'Created';
            case 'edit': return 'Edited';
            case 'delete': return 'Deleted';
            case 'bulk-edit': return 'Bulk Edit';
            case 'bulk-delete': return 'Bulk Delete';
            case 'sync': return 'Synced';
            case 'import': return 'Imported';
            case 'export': return 'Exported';
        }
    }
}
