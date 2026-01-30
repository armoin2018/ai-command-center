import React, { useState } from 'react';
import { TreeNodeData } from '../types/tree';
import './BulkOperations.css';

interface BulkOperationsProps {
    selectedNodes: Set<string>;
    allNodes: TreeNodeData[];
    onBulkEdit: (nodeIds: string[], updates: Partial<TreeNodeData>) => void;
    onBulkDelete: (nodeIds: string[]) => void;
    onClearSelection: () => void;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
    selectedNodes,
    allNodes,
    onBulkEdit,
    onBulkDelete,
    onClearSelection
}) => {
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [editField, setEditField] = useState<'status' | 'priority' | 'tags'>('status');
    const [editValue, setEditValue] = useState('');

    if (selectedNodes.size === 0) {
        return null;
    }

    const handleBulkEdit = () => {
        if (!editValue) {
            return;
        }

        const updates: Partial<TreeNodeData> = {};
        
        if (editField === 'tags') {
            // Add tag to existing tags
            updates.tags = [editValue];
        } else {
            updates[editField] = editValue as any;
        }

        onBulkEdit(Array.from(selectedNodes), updates);
        setShowEditPanel(false);
        setEditValue('');
    };

    const handleBulkDelete = () => {
        if (window.confirm(`Delete ${selectedNodes.size} selected item(s)? This cannot be undone.`)) {
            onBulkDelete(Array.from(selectedNodes));
        }
    };

    const getSelectedNodeDetails = () => {
        const nodes = allNodes.filter(n => selectedNodes.has(n.id));
        const types = new Set(nodes.map(n => n.type));
        const statuses = new Set(nodes.map(n => n.status));
        
        return {
            count: selectedNodes.size,
            types: Array.from(types),
            statuses: Array.from(statuses)
        };
    };

    const details = getSelectedNodeDetails();

    return (
        <div className="bulk-operations-bar">
            <div className="bulk-info">
                <span className="bulk-count">{details.count} selected</span>
                {details.types.length > 0 && (
                    <span className="bulk-types">
                        {details.types.join(', ')}
                    </span>
                )}
            </div>

            <div className="bulk-actions">
                <button
                    onClick={() => setShowEditPanel(!showEditPanel)}
                    className="bulk-action-btn edit-btn"
                    title="Edit selected items"
                >
                    ✏️ Edit
                </button>

                <button
                    onClick={handleBulkDelete}
                    className="bulk-action-btn delete-btn"
                    title="Delete selected items"
                >
                    🗑️ Delete
                </button>

                <button
                    onClick={onClearSelection}
                    className="bulk-action-btn clear-btn"
                    title="Clear selection"
                >
                    ✖️ Clear
                </button>
            </div>

            {showEditPanel && (
                <div className="bulk-edit-panel">
                    <select
                        id="bulk-edit-field-select"
                        value={editField}
                        onChange={(e) => {
                            setEditField(e.target.value as any);
                            setEditValue('');
                        }}
                        className="edit-field-select"
                        aria-label="Select field to edit"
                    >
                        <option value="status">Status</option>
                        <option value="priority">Priority</option>
                        <option value="tags">Add Tag</option>
                    </select>

                    {editField === 'status' && (
                        <select
                            id="bulk-edit-status-select"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="edit-value-select"
                            aria-label="Select status value"
                        >
                            <option value="">Select status...</option>
                            <option value="todo">Not Started</option>
                            <option value="in-progress">In Progress</option>
                            <option value="pending">Blocked</option>
                            <option value="done">Completed</option>
                        </select>
                    )}

                    {editField === 'priority' && (
                        <select
                            id="bulk-edit-priority-select"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="edit-value-select"
                            aria-label="Select priority value"
                        >
                            <option value="">Select priority...</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    )}

                    {editField === 'tags' && (
                        <input
                            id="bulk-edit-tag-input"
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Enter tag..."
                            className="edit-value-input"
                            aria-label="Enter tag to add"
                        />
                    )}

                    <button
                        onClick={handleBulkEdit}
                        disabled={!editValue}
                        className="apply-edit-btn"
                    >
                        Apply to {selectedNodes.size} item{selectedNodes.size !== 1 ? 's' : ''}
                    </button>
                </div>
            )}
        </div>
    );
};
