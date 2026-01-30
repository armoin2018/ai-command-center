/**
 * Context Menu Hook
 * 
 * Handles right-click context menus for tree nodes
 */

import { useEffect, useState } from 'react';
import { TreeNodeData } from '../types/tree';

export interface ContextMenuPosition {
    x: number;
    y: number;
}

export interface ContextMenuAction {
    label?: string;
    icon?: string;
    action?: () => void;
    disabled?: boolean;
    separator?: boolean;
}

interface UseContextMenuReturn {
    menuPosition: ContextMenuPosition | null;
    menuNode: TreeNodeData | null;
    menuActions: ContextMenuAction[];
    handleContextMenu: (e: React.MouseEvent, node: TreeNodeData) => void;
    closeMenu: () => void;
}

interface UseContextMenuProps {
    onCreateStory?: (epicId: string) => void;
    onCreateTask?: (storyId: string) => void;
    onEdit?: (node: TreeNodeData) => void;
    onDelete?: (node: TreeNodeData) => void;
    onDuplicate?: (node: TreeNodeData) => void;
    onChangeStatus?: (node: TreeNodeData, status: string) => void;
    onRun?: (node: TreeNodeData) => void;
}

export const useContextMenu = ({
    onCreateStory,
    onCreateTask,
    onEdit,
    onDelete,
    onDuplicate,
    onChangeStatus,
    onRun
}: UseContextMenuProps): UseContextMenuReturn => {
    const [menuPosition, setMenuPosition] = useState<ContextMenuPosition | null>(null);
    const [menuNode, setMenuNode] = useState<TreeNodeData | null>(null);

    const handleContextMenu = (e: React.MouseEvent, node: TreeNodeData) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setMenuNode(node);
    };

    const closeMenu = () => {
        setMenuPosition(null);
        setMenuNode(null);
    };

    // Close menu on click outside or escape
    useEffect(() => {
        const handleClick = () => closeMenu();
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeMenu();
        };

        if (menuPosition) {
            document.addEventListener('click', handleClick);
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.removeEventListener('click', handleClick);
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [menuPosition]);

    const menuActions: ContextMenuAction[] = !menuNode ? [] : [
        // Create actions
        ...(menuNode.type === 'epic' && onCreateStory ? [{
            label: 'Create Story',
            icon: '📖',
            action: () => {
                onCreateStory(menuNode.id);
                closeMenu();
            }
        }] : []),
        ...(menuNode.type === 'story' && onCreateTask ? [{
            label: 'Create Task',
            icon: '✓',
            action: () => {
                onCreateTask(menuNode.id);
                closeMenu();
            }
        }] : []),
        
        // Separator
        ...((menuNode.type === 'epic' || menuNode.type === 'story') ? [{ separator: true } as ContextMenuAction] : []),
        
        // Edit actions
        ...(onEdit ? [{
            label: 'Edit',
            icon: '✏️',
            action: () => {
                onEdit(menuNode);
                closeMenu();
            }
        }] : []),
        ...(onRun ? [{
            label: 'Run',
            icon: '▶️',
            action: () => {
                onRun(menuNode);
                closeMenu();
            }
        }] : []),
        ...(onDuplicate ? [{
            label: 'Duplicate',
            icon: '📋',
            action: () => {
                onDuplicate(menuNode);
                closeMenu();
            }
        }] : []),
        
        // Separator
        { separator: true },
        
        // Status actions
        ...(onChangeStatus ? [
            {
                label: 'Mark as In Progress',
                icon: '▶️',
                action: () => {
                    onChangeStatus(menuNode, 'in-progress');
                    closeMenu();
                },
                disabled: menuNode.status === 'in-progress'
            },
            {
                label: 'Mark as Completed',
                icon: '✅',
                action: () => {
                    onChangeStatus(menuNode, 'done');
                    closeMenu();
                },
                disabled: menuNode.status === 'done'
            },
            {
                label: 'Mark as Blocked',
                icon: '🚫',
                action: () => {
                    onChangeStatus(menuNode, 'pending');
                    closeMenu();
                },
                disabled: menuNode.status === 'pending'
            }
        ] : []),
        
        // Separator
        { separator: true },
        
        // Delete action
        ...(onDelete ? [{
            label: 'Delete',
            icon: '🗑️',
            action: () => {
                onDelete(menuNode);
                closeMenu();
            }
        }] : [])
    ];

    return {
        menuPosition,
        menuNode,
        menuActions,
        handleContextMenu,
        closeMenu
    };
};
