/**
 * ShortcutsPanel Component
 * 
 * Displays keyboard shortcuts documentation in a modal panel
 */

import React from 'react';
import './ShortcutsPanel.css';

interface Shortcut {
    key: string;
    description: string;
    category: string;
}

interface ShortcutsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS: Shortcut[] = [
    // Navigation
    { key: '↑ / ↓', description: 'Navigate tree items', category: 'Navigation' },
    { key: '← / →', description: 'Collapse / Expand item', category: 'Navigation' },
    { key: 'Enter', description: 'Open selected item details', category: 'Navigation' },
    { key: 'Escape', description: 'Close panel or clear selection', category: 'Navigation' },
    
    // Actions
    { key: 'Ctrl/Cmd + N', description: 'Create new epic', category: 'Actions' },
    { key: 'Ctrl/Cmd + R', description: 'Refresh tree', category: 'Actions' },
    { key: 'Ctrl/Cmd + F', description: 'Focus search', category: 'Actions' },
    { key: 'Ctrl/Cmd + E', description: 'Expand all nodes', category: 'Actions' },
    { key: 'Ctrl/Cmd + Shift + E', description: 'Collapse all nodes', category: 'Actions' },
    
    // Item Operations
    { key: 'Ctrl/Cmd + Enter', description: 'Save changes', category: 'Item Operations' },
    { key: 'Delete', description: 'Delete selected item', category: 'Item Operations' },
    { key: 'Ctrl/Cmd + D', description: 'Duplicate item', category: 'Item Operations' },
    { key: 'Ctrl/Cmd + Z', description: 'Undo', category: 'Item Operations' },
    { key: 'Ctrl/Cmd + Shift + Z', description: 'Redo', category: 'Item Operations' },
    
    // Export
    { key: 'Ctrl/Cmd + S', description: 'Export as JSON', category: 'Export' },
    { key: 'Ctrl/Cmd + Shift + S', description: 'Export as YAML', category: 'Export' },
    { key: 'Ctrl/Cmd + P', description: 'Export as Markdown', category: 'Export' },
    
    // View
    { key: 'Ctrl/Cmd + /', description: 'Toggle shortcuts panel', category: 'View' },
    { key: 'Ctrl/Cmd + B', description: 'Toggle statistics panel', category: 'View' },
    { key: 'F2', description: 'Rename selected item', category: 'View' },
];

export const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)));

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div 
            className="shortcuts-backdrop" 
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
        >
            <div className="shortcuts-panel">
                <div className="shortcuts-header">
                    <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
                    <button 
                        className="shortcuts-close" 
                        onClick={onClose}
                        aria-label="Close shortcuts panel"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="shortcuts-content">
                    {categories.map(category => (
                        <div key={category} className="shortcuts-category">
                            <h3 className="shortcuts-category-title">{category}</h3>
                            <div className="shortcuts-list">
                                {SHORTCUTS
                                    .filter(s => s.category === category)
                                    .map((shortcut, index) => (
                                        <div key={index} className="shortcut-item">
                                            <kbd className="shortcut-key">{shortcut.key}</kbd>
                                            <span className="shortcut-description">{shortcut.description}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="shortcuts-footer">
                    <p className="shortcuts-tip">
                        Press <kbd>Ctrl/Cmd + /</kbd> to toggle this panel anytime
                    </p>
                </div>
            </div>
        </div>
    );
};
