import React from 'react';
import { TreeNodeData } from '../types/tree';
import './SelectableTree.css';

interface SelectableTreeProps {
    tree: TreeNodeData[];
    expandedNodes: Set<string>;
    selectedNodes: Set<string>;
    onToggleExpand: (nodeId: string) => void;
    onToggleSelect: (nodeId: string) => void;
    onSelectAll: () => void;
    onSelectNone: () => void;
}

export const SelectableTree: React.FC<SelectableTreeProps> = ({
    tree,
    expandedNodes,
    selectedNodes,
    onToggleExpand,
    onToggleSelect,
    onSelectAll,
    onSelectNone
}) => {
    const renderNode = (node: TreeNodeData, level: number = 0): React.ReactNode => {
        const isExpanded = expandedNodes.has(node.id);
        const isSelected = selectedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={node.id} className="selectable-node">
                <div 
                    className={`node-row ${isSelected ? 'selected' : ''}`}
                    style={{ paddingLeft: `${level * 20}px` }}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(node.id)}
                        className="node-checkbox"
                    />

                    {hasChildren && (
                        <button
                            onClick={() => onToggleExpand(node.id)}
                            className="expand-button"
                        >
                            {isExpanded ? '▼' : '▶'}
                        </button>
                    )}

                    <span className={`node-type-badge ${node.type}`}>
                        {node.type === 'epic' ? '🎯' : node.type === 'story' ? '📘' : '✅'}
                    </span>

                    <span className="node-name">{node.title}</span>

                    <span className={`node-status ${node.status}`}>
                        {node.status}
                    </span>

                    {node.priority && (
                        <span className={`node-priority ${node.priority}`}>
                            {node.priority}
                        </span>
                    )}

                    {node.estimatedHours && (
                        <span className="node-points">{node.estimatedHours} pts</span>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <div className="node-children">
                        {node.children!.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="selectable-tree">
            <div className="selection-toolbar">
                <button onClick={onSelectAll} className="select-btn">
                    Select All
                </button>
                <button onClick={onSelectNone} className="select-btn">
                    Select None
                </button>
            </div>

            <div className="tree-nodes">
                {tree.map(node => renderNode(node))}
            </div>
        </div>
    );
};
