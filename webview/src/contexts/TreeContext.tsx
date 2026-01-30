/**
 * Tree Context Provider
 * 
 * Manages planning tree state and provides tree operations to components
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useVSCode } from '../hooks/useVSCode';

interface TreeNode {
    id: string;
    title: string;
    type: 'epic' | 'story' | 'task';
    status: string;
    estimatedHours: number;
    children?: TreeNode[];
    expanded?: boolean;
}

interface TreeState {
    epics: TreeNode[];
    totalStoryPoints: number;
    completionPercentage: number;
    loading: boolean;
    error: string | null;
}

interface TreeContextValue extends TreeState {
    expandNode: (nodeId: string) => void;
    collapseNode: (nodeId: string) => void;
    toggleNode: (nodeId: string) => void;
    selectNode: (nodeId: string) => void;
    refreshTree: () => void;
    selectedNodeId: string | null;
}

const TreeContext = createContext<TreeContextValue | undefined>(undefined);

export const TreeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { postMessage, onMessage } = useVSCode();
    const [state, setState] = useState<TreeState>({
        epics: [],
        totalStoryPoints: 0,
        completionPercentage: 0,
        loading: true,
        error: null
    });
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Request tree data on mount
    useEffect(() => {
        refreshTree();
    }, []);

    // Listen for tree data updates
    useEffect(() => {
        const cleanup = onMessage((message) => {
            if (message.type === 'treeData') {
                setState({
                    epics: message.payload.tree.epics || [],
                    totalStoryPoints: message.payload.tree.totalStoryPoints || 0,
                    completionPercentage: message.payload.tree.completionPercentage || 0,
                    loading: false,
                    error: null
                });
            } else if (message.type === 'error') {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: message.payload.message
                }));
            }
        });

        return cleanup;
    }, [onMessage]);

    const refreshTree = useCallback(() => {
        setState(prev => ({ ...prev, loading: true }));
        postMessage({ type: 'log', payload: { level: 'info', message: 'Requesting tree refresh' } });
    }, [postMessage]);

    const expandNode = useCallback((nodeId: string) => {
        setExpandedNodes(prev => new Set(prev).add(nodeId));
    }, []);

    const collapseNode = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
        });
    }, []);

    const toggleNode = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const selectNode = useCallback((nodeId: string) => {
        setSelectedNodeId(nodeId);
    }, []);

    const value: TreeContextValue = {
        ...state,
        selectedNodeId,
        expandNode,
        collapseNode,
        toggleNode,
        selectNode,
        refreshTree
    };

    return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
};

export const useTree = (): TreeContextValue => {
    const context = useContext(TreeContext);
    if (!context) {
        throw new Error('useTree must be used within TreeProvider');
    }
    return context;
};
