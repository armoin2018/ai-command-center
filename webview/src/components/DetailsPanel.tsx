/**
 * Details Panel Component
 * 
 * Displays detailed information about selected epic/story/task
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { useState, memo } from 'react';
import { TreeNodeData } from '../types/tree';
import './DetailsPanel.css';

interface DetailsPanelProps {
    node: TreeNodeData | null;
    onClose: () => void;
    onUpdate: (updates: any) => void;
    onDelete: () => void;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = memo(({ node, onClose, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedAssignee, setEditedAssignee] = useState('');
    const [editedStatus, setEditedStatus] = useState<any>('');

    if (!node) {
        return null;
    }

    const handleEdit = () => {
        setEditedTitle(node.title);
        setEditedDescription(node.description || '');
        setEditedAssignee(node.assignee || '');
        setEditedStatus(node.status);
        setIsEditing(true);
    };

    const handleSave = () => {
        onUpdate({
            title: editedTitle,
            description: editedDescription,
            assignee: editedAssignee,
            status: editedStatus
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleDeleteClick = () => {
        if (confirm(`Are you sure you want to delete this ${node.type}?`)) {
            onDelete();
        }
    };

    const getTypeIcon = () => {
        switch (node.type) {
            case 'epic': return '📋';
            case 'story': return '📖';
            case 'task': return '✓';
            default: return '•';
        }
    };

    const getStatusColor = () => {
        switch (node.status) {
            case 'done': return '#4caf50';
            case 'review': return '#9c27b0';
            case 'in-progress': return '#2196f3';
            case 'ready': return '#00bcd4';
            case 'pending': return '#ff9800';
            case 'todo': return '#9e9e9e';
            default: return '#9e9e9e';
        }
    };

    return (
        <div className="details-panel">
            <div className="details-header">
                <div className="details-title">
                    <span className="details-icon">{getTypeIcon()}</span>
                    <span className="details-type">{node.type.toUpperCase()}</span>
                </div>
                <button className="details-close" onClick={onClose} title="Close">×</button>
            </div>

            <div className="details-content">
                {isEditing ? (
                    <div className="details-edit-form">
                        <div className="form-group">
                            <label htmlFor="details-title-input">Title</label>
                            <input
                                id="details-title-input"
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="form-input"
                                aria-label="Edit item title"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="details-status-input">Status</label>
                            <select
                                id="details-status-input"
                                value={editedStatus}
                                onChange={(e) => setEditedStatus(e.target.value)}
                                className="form-input"
                                aria-label="Edit item status"
                            >
                                <option value="todo">Todo</option>
                                <option value="ready">Ready</option>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="details-assignee-input">Assignee</label>
                            <input
                                id="details-assignee-input"
                                type="text"
                                value={editedAssignee}
                                onChange={(e) => setEditedAssignee(e.target.value)}
                                className="form-input"
                                placeholder="Person assigned to this item"
                                aria-label="Edit assignee"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="details-description-input">Description</label>
                            <textarea
                                id="details-description-input"
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="form-textarea"
                                rows={4}
                                aria-label="Edit item description"
                            />
                        </div>
                        <div className="form-actions">
                            <button onClick={handleSave} className="btn btn-primary">Save</button>
                            <button onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="details-view">
                        <div className="details-field">
                            <label>Title</label>
                            <div className="field-value">{node.title}</div>
                        </div>

                        <div className="details-field">
                            <label>ID</label>
                            <div className="field-value field-code">{node.id}</div>
                        </div>

                        <div className="details-field">
                            <label>Status</label>
                            <div className="field-value">
                                <span 
                                    className="status-badge" 
                                    style={{ backgroundColor: getStatusColor() }}
                                >
                                    {node.status}
                                </span>
                            </div>
                        </div>

                        {node.assignee && (
                            <div className="details-field">
                                <label>Assignee</label>
                                <div className="field-value">{node.assignee}</div>
                            </div>
                        )}

                        {node.description && (
                            <div className="details-field">
                                <label>Description</label>
                                <div className="field-value">{node.description}</div>
                            </div>
                        )}

                        {node.estimatedHours !== undefined && node.estimatedHours > 0 && (
                            <div className="details-field">
                                <label>Estimated Hours</label>
                                <div className="field-value">{node.estimatedHours}h</div>
                            </div>
                        )}

                        {node.actualHours !== undefined && node.actualHours > 0 && (
                            <div className="details-field">
                                <label>Actual Hours</label>
                                <div className="field-value">{node.actualHours}h</div>
                            </div>
                        )}

                        {node.gitRepoUrl && (
                            <div className="details-field">
                                <label>Git Repository</label>
                                <div className="field-value">
                                    <a href={node.gitRepoUrl} target="_blank" rel="noopener noreferrer">
                                        {node.gitRepoUrl}
                                    </a>
                                    {node.gitRepoBranch && ` (${node.gitRepoBranch})`}
                                </div>
                            </div>
                        )}

                        {node.assignedAgent && (
                            <div className="details-field">
                                <label>AI Agent</label>
                                <div className="field-value">{node.assignedAgent}</div>
                            </div>
                        )}

                        {node.acceptanceCriteria && node.acceptanceCriteria.length > 0 && (
                            <div className="details-field">
                                <label>Acceptance Criteria</label>
                                <div className="field-value">
                                    <ul>
                                        {node.acceptanceCriteria.map((criterion, idx) => (
                                            <li key={idx}>{criterion}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {node.comments && node.comments.length > 0 && (
                            <div className="details-field">
                                <label>Comments</label>
                                <div className="field-value">
                                    {node.comments.map((comment, idx) => (
                                        <div key={idx} className="comment">
                                            <strong>{comment.author}</strong> - <em>{new Date(comment.timestamp).toLocaleString()}</em>
                                            <p>{comment.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {node.children && node.children.length > 0 && (
                            <div className="details-field">
                                <label>Children</label>
                                <div className="field-value">{node.children.length} items</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!isEditing && (
                <div className="details-footer">
                    <button onClick={handleEdit} className="btn btn-primary">Edit</button>
                    <button onClick={handleDeleteClick} className="btn btn-danger">Delete</button>
                </div>
            )}
        </div>
    );
});

DetailsPanel.displayName = 'DetailsPanel';
