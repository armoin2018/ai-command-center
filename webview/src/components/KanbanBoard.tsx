/**
 * Kanban Board View Component
 * 
 * Interactive Kanban board with drag-drop status columns
 */

import React, { useState, useMemo } from 'react';
import { TreeNodeData } from '../types/tree';
import './KanbanBoard.css';

interface KanbanBoardProps {
    tree: TreeNodeData[];
    onSelectNode: (node: TreeNodeData) => void;
    onUpdateStatus: (nodeId: string, status: string) => void;
}

interface KanbanColumn {
    id: string;
    title: string;
    status: string;
    items: TreeNodeData[];
    wipLimit?: number;
}

interface KanbanCard {
    node: TreeNodeData;
    depth: number;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    tree,
    onSelectNode,
    onUpdateStatus
}) => {
    const [draggedItem, setDraggedItem] = useState<TreeNodeData | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<'type' | 'priority'>('type');
    const [showCompleted, setShowCompleted] = useState(true);

    // Flatten tree to get all items
    const allItems = useMemo(() => {
        const items: KanbanCard[] = [];
        
        const traverse = (nodes: TreeNodeData[], depth: number = 0) => {
            for (const node of nodes) {
                items.push({ node, depth });
                if (node.children) {
                    traverse(node.children, depth + 1);
                }
            }
        };
        
        traverse(tree);
        return items;
    }, [tree]);

    // Define Kanban columns
    const columns: KanbanColumn[] = useMemo(() => {
        const cols: KanbanColumn[] = [
            {
                id: 'todo',
                title: 'To Do',
                status: 'todo',
                items: [],
                wipLimit: undefined
            },
            {
                id: 'in-progress',
                title: 'In Progress',
                status: 'in-progress',
                items: [],
                wipLimit: 5
            },
            {
                id: 'pending',
                title: 'Blocked',
                status: 'pending',
                items: [],
                wipLimit: undefined
            },
            {
                id: 'done',
                title: 'Done',
                status: 'done',
                items: [],
                wipLimit: undefined
            }
        ];

        // Filter items by completion visibility
        const visibleItems = showCompleted 
            ? allItems 
            : allItems.filter(item => item.node.status !== 'done');

        // Distribute items into columns
        for (const { node } of visibleItems) {
            const column = cols.find(c => c.status === node.status);
            if (column) {
                column.items.push(node);
            }
        }

        return cols;
    }, [allItems, showCompleted]);

    // Group items within columns
    const getGroupedItems = (items: TreeNodeData[]) => {
        if (groupBy === 'type') {
            const groups = new Map<string, TreeNodeData[]>();
            for (const item of items) {
                const type = item.type;
                if (!groups.has(type)) {
                    groups.set(type, []);
                }
                groups.get(type)!.push(item);
            }
            return groups;
        } else if (groupBy === 'priority') {
            const groups = new Map<string, TreeNodeData[]>();
            const priorities = ['critical', 'high', 'medium', 'low'];
            for (const priority of priorities) {
                groups.set(priority, []);
            }
            groups.set('none', []); // For items without priority
            
            for (const item of items) {
                const priority = item.priority || 'none';
                groups.get(priority)?.push(item);
            }
            return groups;
        }
        return new Map([['all', items]]);
    };

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, item: TreeNodeData) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnId);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        
        if (draggedItem) {
            const column = columns.find(c => c.id === columnId);
            if (column) {
                // Check WIP limit
                if (column.wipLimit && column.items.length >= column.wipLimit) {
                    alert(`Cannot move: WIP limit of ${column.wipLimit} reached for ${column.title}`);
                    setDraggedItem(null);
                    setDragOverColumn(null);
                    return;
                }

                onUpdateStatus(draggedItem.id, column.status);
            }
        }
        
        setDraggedItem(null);
        setDragOverColumn(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverColumn(null);
    };

    // Get card color by type
    const getCardColor = (type: string): string => {
        switch (type) {
            case 'epic': return '#7c4dff';
            case 'story': return '#2196f3';
            case 'task': return '#4caf50';
            default: return '#9e9e9e';
        }
    };

    // Get priority indicator
    const getPriorityIndicator = (priority?: string): string => {
        switch (priority) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '';
        }
    };

    return (
        <div className="kanban-board">
            <div className="kanban-header">
                <h2>📊 Kanban Board</h2>
                <div className="kanban-controls">
                    <div className="group-selector">
                        <label>Group by:</label>
                        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'type' | 'priority')}>
                            <option value="type">Type</option>
                            <option value="priority">Priority</option>
                        </select>
                    </div>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                        />
                        Show completed
                    </label>
                </div>
            </div>

            <div className="kanban-columns">
                {columns.map(column => (
                    <div
                        key={column.id}
                        className={`kanban-column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        <div className="kanban-column-header">
                            <h3>{column.title}</h3>
                            <span className="item-count">
                                {column.items.length}
                                {column.wipLimit && ` / ${column.wipLimit}`}
                            </span>
                        </div>

                        <div className="kanban-cards">
                            {groupBy === 'type' || groupBy === 'priority' ? (
                                Array.from(getGroupedItems(column.items)).map(([groupName, items]) => (
                                    items.length > 0 && (
                                        <div key={groupName} className="kanban-group">
                                            <div className="group-header">
                                                {groupName}
                                            </div>
                                            {items.map(item => (
                                                <div
                                                    key={item.id}
                                                    className={`kanban-card ${draggedItem?.id === item.id ? 'dragging' : ''}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => onSelectNode(item)}
                                                    style={{ borderLeftColor: getCardColor(item.type) }}
                                                >
                                                    <div className="card-header">
                                                        <span className="card-type">{item.type}</span>
                                                        <span className={`status-badge ${item.status}`}>
                                                            {item.status}
                                                        </span>
                                                        {item.priority && (
                                                            <span className="card-priority">
                                                                {getPriorityIndicator(item.priority)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="card-title">{item.title}</div>
                                                    {item.estimatedHours && (
                                                        <div className="card-footer">
                                                            <span className="story-points">
                                                                {item.estimatedHours} hrs
                                                            </span>
                                                        </div>
                                                    )}
                                                    {item.tags && item.tags.length > 0 && (
                                                        <div className="card-tags">
                                                            {item.tags.slice(0, 2).map(tag => (
                                                                <span key={tag} className="tag">{tag}</span>
                                                            ))}
                                                            {item.tags.length > 2 && (
                                                                <span className="tag">+{item.tags.length - 2}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ))
                            ) : (
                                column.items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`kanban-card ${draggedItem?.id === item.id ? 'dragging' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => onSelectNode(item)}
                                        style={{ borderLeftColor: getCardColor(item.type) }}
                                    >
                                        <div className="card-header">
                                            <span className="card-type">{item.type}</span>
                                            <span className={`status-badge ${item.status}`}>
                                                {item.status}
                                            </span>
                                            {item.priority && (
                                                <span className="card-priority">
                                                    {getPriorityIndicator(item.priority)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="card-title">{item.title}</div>
                                        {item.estimatedHours && (
                                            <div className="story-points">
                                                <span className="story-points-badge">
                                                    {item.estimatedHours} hrs
                                                </span>
                                            </div>
                                        )}
                                        {item.tags && item.tags.length > 0 && (
                                            <div className="card-tags">
                                                {item.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="tag">{tag}</span>
                                                ))}
                                                {item.tags.length > 2 && (
                                                    <span className="tag">+{item.tags.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {column.wipLimit && column.items.length >= column.wipLimit && (
                            <div className="wip-limit-warning">
                                ⚠️ WIP limit reached
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
