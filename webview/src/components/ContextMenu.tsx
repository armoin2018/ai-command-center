/**
 * Context Menu Component
 * 
 * Displays right-click context menu for tree nodes
 */

import React, { useEffect, useRef } from 'react';
import { ContextMenuPosition, ContextMenuAction } from '../hooks/useContextMenu';
import './ContextMenu.css';

interface ContextMenuProps {
    position: ContextMenuPosition;
    actions: ContextMenuAction[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ position, actions, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Adjust position if menu would go off screen
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let { x, y } = position;

            if (x + rect.width > viewportWidth) {
                x = viewportWidth - rect.width - 5;
            }
            if (y + rect.height > viewportHeight) {
                y = viewportHeight - rect.height - 5;
            }

            menuRef.current.style.left = `${x}px`;
            menuRef.current.style.top = `${y}px`;
        }
    }, [position]);

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ left: position.x, top: position.y }}
            onClick={(e) => e.stopPropagation()}
        >
            {actions.map((action, index) => {
                if (action.separator) {
                    return <div key={`sep-${index}`} className="context-menu-separator" />;
                }

                return (
                    <button
                        key={index}
                        className={`context-menu-item ${action.disabled ? 'context-menu-item-disabled' : ''}`}
                        onClick={action.action}
                        disabled={action.disabled}
                    >
                        {action.icon && <span className="context-menu-icon">{action.icon}</span>}
                        <span className="context-menu-label">{action.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
