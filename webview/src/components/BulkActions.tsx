import React, { useState } from 'react';
import './BulkActions.css';

interface BulkActionsProps {
    selectedIds: string[];
    onBulkUpdate: (updates: any) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
    selectedIds,
    onBulkUpdate,
    onBulkDelete,
    onClearSelection
}) => {
    const [showActions, setShowActions] = useState(false);
    const [action, setAction] = useState<'status' | 'assignee' | 'tags' | 'priority' | 'delete' | null>(null);
    const [statusValue, setStatusValue] = useState('');
    const [assigneeValue, setAssigneeValue] = useState('');
    const [tagsValue, setTagsValue] = useState('');
    const [priorityValue, setPriorityValue] = useState('');

    if (selectedIds.length === 0) {
        return null;
    }

    const handleApply = () => {
        if (!action) return;

        if (action === 'delete') {
            if (window.confirm(`Delete ${selectedIds.length} items?`)) {
                onBulkDelete();
            }
            return;
        }

        const updates: any = {};
        
        if (action === 'status' && statusValue) {
            updates.status = statusValue;
        } else if (action === 'assignee' && assigneeValue) {
            updates.assignee = assigneeValue;
        } else if (action === 'tags' && tagsValue) {
            updates.tags = tagsValue.split(',').map(t => t.trim()).filter(t => t);
        } else if (action === 'priority' && priorityValue) {
            updates.priority = priorityValue;
        }

        if (Object.keys(updates).length > 0) {
            onBulkUpdate(updates);
            setAction(null);
            setShowActions(false);
        }
    };

    return (
        <div className="bulk-actions">
            <div className="bulk-actions-header">
                <span className="selection-count">
                    {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
                </span>
                <button onClick={onClearSelection} className="btn-clear">
                    Clear Selection
                </button>
            </div>

            {!showActions && (
                <div className="bulk-actions-buttons">
                    <button onClick={() => { setAction('status'); setShowActions(true); }}>
                        Change Status
                    </button>
                    <button onClick={() => { setAction('assignee'); setShowActions(true); }}>
                        Assign To
                    </button>
                    <button onClick={() => { setAction('tags'); setShowActions(true); }}>
                        Add Tags
                    </button>
                    <button onClick={() => { setAction('priority'); setShowActions(true); }}>
                        Set Priority
                    </button>
                    <button onClick={() => { setAction('delete'); handleApply(); }} className="btn-danger">
                        Delete
                    </button>
                </div>
            )}

            {showActions && action === 'status' && (
                <div className="bulk-action-form">
                    <label>Status:</label>
                    <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
                        <option value="">Select status...</option>
                        <option value="todo">Todo</option>
                        <option value="ready">Ready</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                    </select>
                    <button onClick={handleApply}>Apply</button>
                    <button onClick={() => { setShowActions(false); setAction(null); }}>Cancel</button>
                </div>
            )}

            {showActions && action === 'assignee' && (
                <div className="bulk-action-form">
                    <label>Assignee:</label>
                    <input 
                        type="text" 
                        placeholder="Enter name..." 
                        value={assigneeValue}
                        onChange={(e) => setAssigneeValue(e.target.value)}
                    />
                    <button onClick={handleApply}>Apply</button>
                    <button onClick={() => { setShowActions(false); setAction(null); }}>Cancel</button>
                </div>
            )}

            {showActions && action === 'tags' && (
                <div className="bulk-action-form">
                    <label>Tags (comma-separated):</label>
                    <input 
                        type="text" 
                        placeholder="tag1, tag2, tag3..." 
                        value={tagsValue}
                        onChange={(e) => setTagsValue(e.target.value)}
                    />
                    <button onClick={handleApply}>Apply</button>
                    <button onClick={() => { setShowActions(false); setAction(null); }}>Cancel</button>
                </div>
            )}

            {showActions && action === 'priority' && (
                <div className="bulk-action-form">
                    <label>Priority:</label>
                    <select value={priorityValue} onChange={(e) => setPriorityValue(e.target.value)}>
                        <option value="">Select priority...</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                    <button onClick={handleApply}>Apply</button>
                    <button onClick={() => { setShowActions(false); setAction(null); }}>Cancel</button>
                </div>
            )}
        </div>
    );
};
