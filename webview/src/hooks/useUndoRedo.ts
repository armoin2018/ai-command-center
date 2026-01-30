import { useEffect, useRef, useCallback } from 'react';
import { OperationHistory, Operation, createInverseOperation, createForwardOperation } from '../utils/operationHistory';

interface UseUndoRedoOptions {
    onUndo: (message: any) => void;
    onRedo: (message: any) => void;
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

/**
 * Custom hook for undo/redo functionality
 * Manages operation history and keyboard shortcuts
 */
export const useUndoRedo = ({ onUndo, onRedo, onHistoryChange }: UseUndoRedoOptions) => {
    const historyRef = useRef(new OperationHistory());

    const notifyHistoryChange = useCallback(() => {
        if (onHistoryChange) {
            onHistoryChange(
                historyRef.current.canUndo(),
                historyRef.current.canRedo()
            );
        }
    }, [onHistoryChange]);

    /**
     * Track a new operation
     */
    const trackOperation = useCallback((operation: Operation) => {
        historyRef.current.push(operation);
        notifyHistoryChange();
    }, [notifyHistoryChange]);

    /**
     * Undo the last operation
     */
    const undo = useCallback(() => {
        const operation = historyRef.current.undo();
        if (operation) {
            const inverseMessage = createInverseOperation(operation);
            if (inverseMessage) {
                onUndo(inverseMessage);
                notifyHistoryChange();
            }
        }
    }, [onUndo, notifyHistoryChange]);

    /**
     * Redo the previously undone operation
     */
    const redo = useCallback(() => {
        const operation = historyRef.current.redo();
        if (operation) {
            const forwardMessage = createForwardOperation(operation);
            if (forwardMessage) {
                onRedo(forwardMessage);
                notifyHistoryChange();
            }
        }
    }, [onRedo, notifyHistoryChange]);

    /**
     * Clear all history
     */
    const clearHistory = useCallback(() => {
        historyRef.current.clear();
        notifyHistoryChange();
    }, [notifyHistoryChange]);

    /**
     * Setup keyboard shortcuts for undo/redo
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo: Ctrl/Cmd + Z (without Shift)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo: Ctrl/Cmd + Shift + Z
            else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
                e.preventDefault();
                redo();
            }
            // Alternative Redo: Ctrl/Cmd + Y
            else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return {
        trackOperation,
        undo,
        redo,
        clearHistory,
        canUndo: historyRef.current.canUndo(),
        canRedo: historyRef.current.canRedo(),
        historySize: historyRef.current.size()
    };
};
