/**
 * Collaborative Editing Indicators Component
 * 
 * Visual indicators for concurrent editing
 */

import React, { useEffect, useState } from 'react';
import './CollaborativeIndicators.css';

export interface EditingIndicator {
    itemId: string;
    editors: string[];
    isLocked: boolean;
    lockOwner?: string;
}

interface CollaborativeIndicatorsProps {
    itemId: string;
    currentUser: string;
    onRequestEdit?: () => void;
}

export const CollaborativeIndicators: React.FC<CollaborativeIndicatorsProps> = ({
    itemId,
    currentUser,
    onRequestEdit
}) => {
    const [indicator, setIndicator] = useState<EditingIndicator | null>(null);

    useEffect(() => {
        // Request editing indicator from extension
        window.postMessage({
            type: 'getEditingIndicator',
            payload: { itemId }
        }, '*');

        // Listen for updates
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'editingIndicatorUpdate' && message.payload.itemId === itemId) {
                setIndicator(message.payload.indicator);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [itemId]);

    if (!indicator || indicator.editors.length === 0) {
        return null;
    }

    const otherEditors = indicator.editors.filter(e => e !== currentUser);
    const isCurrentUserEditing = indicator.editors.includes(currentUser);

    return (
        <div className="collaborative-indicators">
            {indicator.isLocked && (
                <div className="lock-indicator">
                    <span className="lock-icon">🔒</span>
                    <span className="lock-text">
                        {indicator.lockOwner === currentUser
                            ? 'You have locked this item'
                            : `Locked by ${indicator.lockOwner}`}
                    </span>
                </div>
            )}

            {otherEditors.length > 0 && (
                <div className="concurrent-editors">
                    <span className="editor-icon">✏️</span>
                    <span className="editor-text">
                        {otherEditors.length === 1
                            ? `${otherEditors[0]} is editing`
                            : `${otherEditors.length} others are editing`}
                    </span>
                    {!isCurrentUserEditing && (
                        <button 
                            className="join-edit-btn"
                            onClick={onRequestEdit}
                            title="Start editing"
                        >
                            Join
                        </button>
                    )}
                </div>
            )}

            {isCurrentUserEditing && !indicator.isLocked && (
                <div className="editing-status">
                    <span className="status-icon">✓</span>
                    <span className="status-text">You are editing</span>
                </div>
            )}
        </div>
    );
};

/**
 * Conflict Resolution Dialog Component
 */
interface ConflictDialogProps {
    itemName: string;
    otherEditors: string[];
    onContinue: () => void;
    onCancel: () => void;
    onViewChanges: () => void;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
    itemName,
    otherEditors,
    onContinue,
    onCancel,
    onViewChanges
}) => {
    return (
        <div className="conflict-dialog-overlay">
            <div className="conflict-dialog">
                <div className="conflict-dialog-header">
                    <h3>⚠️ Concurrent Editing Detected</h3>
                </div>

                <div className="conflict-dialog-body">
                    <p>
                        <strong>{itemName}</strong> is currently being edited by:
                    </p>
                    <ul className="editor-list">
                        {otherEditors.map((editor, index) => (
                            <li key={index}>{editor}</li>
                        ))}
                    </ul>
                    <p className="conflict-warning">
                        Continuing may cause conflicts. Consider coordinating with other editors.
                    </p>
                </div>

                <div className="conflict-dialog-actions">
                    <button 
                        className="btn-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={onViewChanges}
                    >
                        View Changes
                    </button>
                    <button 
                        className="btn-primary"
                        onClick={onContinue}
                    >
                        Continue Editing
                    </button>
                </div>
            </div>
        </div>
    );
};
