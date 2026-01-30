/**
 * TreeNode Component
 * 
 * Renders individual tree nodes with expand/collapse and selection
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { memo } from 'react';
import { TreeNodeData } from '../types/tree';
import './TreeNode.css';
import './TreeNode.selected.css';

interface TreeNodeProps {
    node: TreeNodeData;
    level: number;
    hasChildren: boolean;
    isExpanded: boolean;
    isSelected?: boolean;
    isChecked?: boolean;
    dropIndicator?: string;
    onToggle: () => void;
    onClick: () => void;
    onCheck?: (checked: boolean) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    onDragEnd?: () => void;
}

export const TreeNode: React.FC<TreeNodeProps> = memo(({
    node,
    level,
    hasChildren,
    isExpanded,
    isSelected = false,
    isChecked = false,
    dropIndicator = '',
    onToggle,
    onClick,
    onCheck,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd
}) => {
    const getIcon = () => {
        if (node.type === 'epic') return '📘';
        if (node.type === 'story') return '📄';
        if (node.type === 'bug') return '🐞';
        return '✅';
    };

    const getStatusColor = () => {
        const status = node.status?.toLowerCase();
        if (status === 'todo') return 'status-circle-todo';
        if (status === 'open') return 'status-circle-open';
        if (status === 'done') return 'status-circle-done';
        if (status === 'in-progress') return 'status-circle-in-progress';
        if (status === 'ready') return 'status-circle-ready';
        if (status === 'hold') return 'status-circle-hold';
        return 'status-circle-todo';
    };

    const getStatusBadgeColor = (status?: string) => {
        const s = status?.toLowerCase();
        if (s === 'todo') return 'warning';
        if (s === 'open') return 'primary';
        if (s === 'done') return 'success';
        if (s === 'in-progress') return 'info';
        if (s === 'ready') return 'secondary';
        if (s === 'hold') return 'secondary';
        return 'secondary';
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
    };

    const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (onCheck) {
            onCheck(e.target.checked);
        }
    };

    return (
        <div
            className={`
                tree-node tree-node-${node.type} 
                d-flex align-items-center py-2 px-3 border-bottom
                ${isSelected ? 'bg-primary text-white tree-node-selected' : 'bg-light hover-bg-secondary'} 
                ${dropIndicator}
            `}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
            onClick={handleClick}
            onContextMenu={onContextMenu}
            draggable={true}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            role="treeitem"
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-level={level + 1}
            aria-label={`${node.type}: ${node.title}, status: ${node.status}${node.assignee ? `, assigned to: ${node.assignee}` : ''}`}
            tabIndex={isSelected ? 0 : -1}
        >
            {onCheck && (
                <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={handleCheck}
                    onClick={(e) => e.stopPropagation()}
                    className="form-check-input me-2"
                    aria-label={`Select ${node.title}`}
                />
            )}
            {hasChildren && (
                <button 
                    className="btn btn-sm btn-link p-0 me-2 text-decoration-none" 
                    onClick={handleToggle}
                    type="button"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? '▼' : '▶'}
                </button>
            )}
            {!hasChildren && <span className="me-2" style={{ width: '20px', display: 'inline-block' }} aria-hidden="true"></span>}
            
            <span className={`status-circle rounded-circle me-2 ${getStatusColor()}`} aria-hidden="true"></span>
            <span className={`tree-node-icon me-2 icon-${node.type}`} aria-hidden="true">{getIcon()}</span>
            
            <div className="flex-grow-1">
                <span className="fw-bold">{node.id}:</span>
                <span className="ms-1">{node.title}</span>
            </div>
            
            <div className="tree-node-metadata d-flex gap-2 align-items-center">
                <span className={`badge bg-${getStatusBadgeColor(node.status)}`}>
                    {node.status}
                </span>
                {node.assignee && (
                    <span className="badge bg-secondary" title="Assignee">👤 {node.assignee}</span>
                )}
                {node.estimatedHours !== undefined && node.estimatedHours > 0 && (
                    <span className="badge bg-info" title="Estimated hours">🕐 {node.estimatedHours}h</span>
                )}
            </div>
        </div>
    );
});

TreeNode.displayName = 'TreeNode';
