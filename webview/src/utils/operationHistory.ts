/**
 * Operation History Manager
 * Tracks CRUD operations and supports undo/redo functionality
 */

export type OperationType = 'create' | 'update' | 'delete' | 'reorder';

export interface Operation {
    type: OperationType;
    itemType: 'epic' | 'story' | 'task';
    timestamp: number;
    data: {
        id?: string;
        name?: string;
        parentId?: string | null;
        beforeState?: any;
        afterState?: any;
        oldIndex?: number;
        newIndex?: number;
    };
}

export class OperationHistory {
    private history: Operation[] = [];
    private currentIndex: number = -1;
    private maxSize: number = 50;

    /**
     * Add a new operation to history
     * Clears any redo operations when a new operation is added
     */
    push(operation: Operation): void {
        // Remove any operations after current index (redo stack)
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Add new operation
        this.history.push({
            ...operation,
            timestamp: Date.now()
        });

        // Enforce max size by removing oldest operations
        if (this.history.length > this.maxSize) {
            this.history = this.history.slice(this.history.length - this.maxSize);
        }

        this.currentIndex = this.history.length - 1;
    }

    /**
     * Get the operation to undo
     * Returns null if nothing to undo
     */
    getUndoOperation(): Operation | null {
        if (!this.canUndo()) {
            return null;
        }
        return this.history[this.currentIndex];
    }

    /**
     * Get the operation to redo
     * Returns null if nothing to redo
     */
    getRedoOperation(): Operation | null {
        if (!this.canRedo()) {
            return null;
        }
        return this.history[this.currentIndex + 1];
    }

    /**
     * Move back one operation in history
     */
    undo(): Operation | null {
        const operation = this.getUndoOperation();
        if (operation) {
            this.currentIndex--;
        }
        return operation;
    }

    /**
     * Move forward one operation in history
     */
    redo(): Operation | null {
        const operation = this.getRedoOperation();
        if (operation) {
            this.currentIndex++;
        }
        return operation;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.history = [];
        this.currentIndex = -1;
    }

    /**
     * Get current history state for debugging
     */
    getState(): { history: Operation[]; currentIndex: number } {
        return {
            history: [...this.history],
            currentIndex: this.currentIndex
        };
    }

    /**
     * Get history size
     */
    size(): number {
        return this.history.length;
    }
}

/**
 * Create inverse operation for undo
 */
export function createInverseOperation(operation: Operation): any {
    switch (operation.type) {
        case 'create':
            // Undo create = delete
            return {
                type: 'deleteItem',
                payload: {
                    itemType: operation.itemType,
                    id: operation.data.id
                }
            };
        
        case 'delete':
            // Undo delete = recreate with previous state
            return {
                type: 'create' + operation.itemType.charAt(0).toUpperCase() + operation.itemType.slice(1),
                payload: operation.data.beforeState
            };
        
        case 'update':
            // Undo update = restore previous state
            return {
                type: 'update' + operation.itemType.charAt(0).toUpperCase() + operation.itemType.slice(1),
                payload: {
                    id: operation.data.id,
                    ...operation.data.beforeState
                }
            };
        
        case 'reorder':
            // Undo reorder = move back to original position
            return {
                type: 'reorder',
                payload: {
                    itemId: operation.data.id,
                    oldIndex: operation.data.newIndex,
                    newIndex: operation.data.oldIndex,
                    parentId: operation.data.parentId
                }
            };
        
        default:
            return null;
    }
}

/**
 * Create forward operation for redo
 */
export function createForwardOperation(operation: Operation): any {
    switch (operation.type) {
        case 'create':
            return {
                type: 'create' + operation.itemType.charAt(0).toUpperCase() + operation.itemType.slice(1),
                payload: operation.data.afterState || operation.data
            };
        
        case 'delete':
            return {
                type: 'deleteItem',
                payload: {
                    itemType: operation.itemType,
                    id: operation.data.id
                }
            };
        
        case 'update':
            return {
                type: 'update' + operation.itemType.charAt(0).toUpperCase() + operation.itemType.slice(1),
                payload: {
                    id: operation.data.id,
                    ...operation.data.afterState
                }
            };
        
        case 'reorder':
            return {
                type: 'reorder',
                payload: {
                    itemId: operation.data.id,
                    oldIndex: operation.data.oldIndex,
                    newIndex: operation.data.newIndex,
                    parentId: operation.data.parentId
                }
            };
        
        default:
            return null;
    }
}
