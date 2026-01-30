import { useMemo } from 'react';
import { TreeNodeData } from '../types/tree';
import { FilterState } from '../components/FilterBar';

/**
 * Custom hook for optimized tree filtering
 * Uses memoization to avoid re-filtering on every render
 */
export const useTreeFiltering = (tree: TreeNodeData[], filters: FilterState): TreeNodeData[] => {
    return useMemo(() => {
        // No filters applied - return original tree
        if (!filters.search && filters.status.length === 0 && filters.type.length === 0 && filters.priority.length === 0) {
            return tree;
        }

        const filterNode = (node: TreeNodeData): TreeNodeData | null => {
            const matchesSearch = !filters.search ||
                node.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                node.id.toLowerCase().includes(filters.search.toLowerCase()) ||
                (node.description && node.description.toLowerCase().includes(filters.search.toLowerCase()));

            const matchesStatus = filters.status.length === 0 || filters.status.includes(node.status);
            const matchesType = filters.type.length === 0 || filters.type.includes(node.type);
            const matchesPriority = filters.priority.length === 0 || 
                (node.priority && filters.priority.includes(node.priority));

            // Filter children recursively
            let filteredChildren: TreeNodeData[] | undefined;
            if (node.children && node.children.length > 0) {
                filteredChildren = node.children
                    .map(child => filterNode(child))
                    .filter((child): child is TreeNodeData => child !== null);
            }

            // Include node if it matches OR if any children match
            const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;
            const nodeMatches = matchesSearch && matchesStatus && matchesType && matchesPriority;

            if (nodeMatches || hasMatchingChildren) {
                return {
                    ...node,
                    children: filteredChildren
                };
            }

            return null;
        };

        return tree
            .map(node => filterNode(node))
            .filter((node): node is TreeNodeData => node !== null);
    }, [tree, filters.search, filters.status, filters.type, filters.priority]);
};
