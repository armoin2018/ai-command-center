/**
 * Keyboard Navigation Hook
 * 
 * Handles keyboard shortcuts for tree navigation
 */

import { useEffect } from 'react';
import { TreeNodeData } from '../types/tree';

interface KeyboardNavigationProps {
    nodes: TreeNodeData[];
    selectedNode: TreeNodeData | null;
    expandedNodes: Set<string>;
    onNodeSelect: (node: TreeNodeData) => void;
    onNodeToggle: (nodeId: string) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onRefresh: () => void;
}

export const useKeyboardNavigation = ({
    nodes,
    selectedNode,
    expandedNodes,
    onNodeSelect,
    onNodeToggle,
    onExpandAll,
    onCollapseAll,
    onRefresh
}: KeyboardNavigationProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if typing in input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Flatten tree for navigation
            const flattenTree = (treeNodes: TreeNodeData[], level = 0): Array<{ node: TreeNodeData; level: number }> => {
                const result: Array<{ node: TreeNodeData; level: number }> = [];
                for (const node of treeNodes) {
                    result.push({ node, level });
                    if (expandedNodes.has(node.id) && node.children && node.children.length > 0) {
                        result.push(...flattenTree(node.children, level + 1));
                    }
                }
                return result;
            };

            const flatNodes = flattenTree(nodes);
            const currentIndex = selectedNode 
                ? flatNodes.findIndex(({ node }) => node.id === selectedNode.id)
                : -1;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (flatNodes.length > 0) {
                        const nextIndex = (currentIndex + 1) % flatNodes.length;
                        onNodeSelect(flatNodes[nextIndex].node);
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (flatNodes.length > 0) {
                        const prevIndex = currentIndex <= 0 ? flatNodes.length - 1 : currentIndex - 1;
                        onNodeSelect(flatNodes[prevIndex].node);
                    }
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    if (selectedNode && selectedNode.children && selectedNode.children.length > 0) {
                        if (!expandedNodes.has(selectedNode.id)) {
                            onNodeToggle(selectedNode.id);
                        } else if (selectedNode.children[0]) {
                            onNodeSelect(selectedNode.children[0]);
                        }
                    }
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    if (selectedNode) {
                        if (expandedNodes.has(selectedNode.id) && selectedNode.children && selectedNode.children.length > 0) {
                            onNodeToggle(selectedNode.id);
                        } else {
                            // Find parent
                            const findParent = (treeNodes: TreeNodeData[]): TreeNodeData | null => {
                                for (const node of treeNodes) {
                                    if (node.children?.some(child => child.id === selectedNode.id)) {
                                        return node;
                                    }
                                    if (node.children) {
                                        const parent = findParent(node.children);
                                        if (parent) return parent;
                                    }
                                }
                                return null;
                            };
                            const parent = findParent(nodes);
                            if (parent) {
                                onNodeSelect(parent);
                            }
                        }
                    }
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (selectedNode && selectedNode.children && selectedNode.children.length > 0) {
                        onNodeToggle(selectedNode.id);
                    }
                    break;

                case 'e':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        onExpandAll();
                    }
                    break;

                case 'w':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        onCollapseAll();
                    }
                    break;

                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        onRefresh();
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    if (selectedNode) {
                        onNodeSelect(flatNodes[0]?.node || nodes[0]);
                    }
                    break;

                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, selectedNode, expandedNodes, onNodeSelect, onNodeToggle, onExpandAll, onCollapseAll, onRefresh]);
};
