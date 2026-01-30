/**
 * State Persistence Hook
 * 
 * Persists and restores WebView state to/from localStorage
 */

import { useEffect } from 'react';
import { TreeNodeData } from '../types/tree';
import { FilterState } from '../components/FilterBar';

export interface PersistedState {
    expandedNodes: string[];
    selectedNodeId: string | null;
    filters: FilterState;
}

const STORAGE_KEY = 'aicc-webview-state';

export const useStatePersistence = (
    expandedNodes: Set<string>,
    selectedNode: TreeNodeData | null,
    filters: FilterState,
    setExpandedNodes: (nodes: Set<string>) => void,
    setFilters: (filters: FilterState) => void
) => {
    // Load state on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const state: PersistedState = JSON.parse(saved);
                
                // Restore expanded nodes
                if (state.expandedNodes && state.expandedNodes.length > 0) {
                    setExpandedNodes(new Set(state.expandedNodes));
                }
                
                // Restore filters
                if (state.filters) {
                    setFilters(state.filters);
                }
            }
        } catch (error) {
            console.error('Failed to load persisted state:', error);
        }
    }, []);

    // Save state on changes
    useEffect(() => {
        try {
            const state: PersistedState = {
                expandedNodes: Array.from(expandedNodes),
                selectedNodeId: selectedNode?.id || null,
                filters
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to persist state:', error);
        }
    }, [expandedNodes, selectedNode, filters]);
};
