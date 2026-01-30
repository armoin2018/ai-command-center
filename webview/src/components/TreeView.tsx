/**
 * TreeView Component
 * 
 * Main tree visualization with hierarchical rendering
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { memo } from 'react';
import { TreeNode } from './TreeNode';
import { TreeNodeData } from '../types/tree';
import './TreeView.css';

interface TreeViewProps {
    tree: TreeNodeData[];
    expandedNodes: Set<string>;
    selectedNodeId: string | null;
    onToggleExpand: (nodeId: string) => void;
    onSelectNode: (node: TreeNodeData) => void;
    onContextMenu?: (e: React.MouseEvent, node: TreeNodeData) => void;
    onDragStart?: (e: React.DragEvent, node: TreeNodeData) => void;
    onDragOver?: (e: React.DragEvent, node: TreeNodeData) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent, node: TreeNodeData) => void;
    onDragEnd?: () => void;
    getDropIndicatorClass?: (node: TreeNodeData) => string;
}

export const TreeView: React.FC<TreeViewProps> = memo(({
    tree,
    expandedNodes,
    selectedNodeId,
    onToggleExpand,
    onSelectNode,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    getDropIndicatorClass
}) => {
    const renderNode = (node: TreeNodeData, level: number = 0): React.ReactNode => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedNodeId === node.id;
        const dropIndicator = getDropIndicatorClass ? getDropIndicatorClass(node) : '';

        return (
            <React.Fragment key={node.id}>
                <TreeNode
                    node={node}
                    level={level}
                    hasChildren={!!hasChildren}
                    isExpanded={isExpanded}
                    isSelected={isSelected}
                    dropIndicator={dropIndicator}
                    onToggle={() => onToggleExpand(node.id)}
                    onClick={() => onSelectNode(node)}
                    onContextMenu={onContextMenu ? (e) => onContextMenu(e, node) : undefined}
                    onDragStart={onDragStart ? (e) => onDragStart(e, node) : undefined}
                    onDragOver={onDragOver ? (e) => onDragOver(e, node) : undefined}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop ? (e) => onDrop(e, node) : undefined}
                    onDragEnd={onDragEnd}
                />
                
                {hasChildren && isExpanded && node.children!.map((child: TreeNodeData) =>
                    renderNode(child, level + 1)
                )}
            </React.Fragment>
        );
    };

    if (tree.length === 0) {
        return (
            <div className="tree-view-container">
                <div className="tree-empty">
                    <p>No items to display. Create an epic to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tree-view-container">
            <div className="tree-view">
                {tree.map((node) => renderNode(node))}
            </div>
        </div>
    );
});

TreeView.displayName = 'TreeView';
