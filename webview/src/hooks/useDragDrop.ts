/**
 * Drag-and-Drop Hook
 * 
 * Provides drag-and-drop functionality for tree reordering
 */

import { useState } from 'react';
import { TreeNodeData } from '../types/tree';

export interface DragState {
    draggedNode: TreeNodeData | null;
    dragOverNode: TreeNodeData | null;
    dropPosition: 'before' | 'after' | 'inside' | null;
}

export const useDragDrop = (
    onReorder: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void
) => {
    const [dragState, setDragState] = useState<DragState>({
        draggedNode: null,
        dragOverNode: null,
        dropPosition: null
    });

    const handleDragStart = (e: React.DragEvent, node: TreeNodeData) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', node.id);
        setDragState(prev => ({ ...prev, draggedNode: node }));
    };

    const handleDragOver = (e: React.DragEvent, node: TreeNodeData) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!dragState.draggedNode || dragState.draggedNode.id === node.id) {
            return;
        }

        // Calculate drop position based on mouse Y position
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        
        let position: 'before' | 'after' | 'inside' | null = null;
        
        if (y < height / 3) {
            position = 'before';
        } else if (y > (2 * height) / 3) {
            position = 'after';
        } else {
            // Only allow 'inside' for epics and stories (not tasks)
            if (node.type === 'epic' || node.type === 'story') {
                position = 'inside';
            } else {
                position = y < height / 2 ? 'before' : 'after';
            }
        }

        setDragState(prev => ({
            ...prev,
            dragOverNode: node,
            dropPosition: position
        }));
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        const relatedTarget = e.relatedTarget as HTMLElement;
        const currentTarget = e.currentTarget as HTMLElement;
        
        // Only clear if actually leaving the element
        if (!currentTarget.contains(relatedTarget)) {
            setDragState(prev => ({
                ...prev,
                dragOverNode: null,
                dropPosition: null
            }));
        }
    };

    const handleDrop = (e: React.DragEvent, node: TreeNodeData) => {
        e.preventDefault();
        e.stopPropagation();

        if (!dragState.draggedNode || !dragState.dropPosition) {
            return;
        }

        // Validate drop - can't drop a node onto itself or its descendants
        if (dragState.draggedNode.id === node.id) {
            setDragState({ draggedNode: null, dragOverNode: null, dropPosition: null });
            return;
        }

        // Validate hierarchy - can't drop epic into story or task
        if (dragState.draggedNode.type === 'epic' && node.type !== 'epic' && dragState.dropPosition === 'inside') {
            setDragState({ draggedNode: null, dragOverNode: null, dropPosition: null });
            return;
        }

        // Validate hierarchy - can't drop story into task
        if (dragState.draggedNode.type === 'story' && node.type === 'task' && dragState.dropPosition === 'inside') {
            setDragState({ draggedNode: null, dragOverNode: null, dropPosition: null });
            return;
        }

        onReorder(dragState.draggedNode.id, node.id, dragState.dropPosition);
        setDragState({ draggedNode: null, dragOverNode: null, dropPosition: null });
    };

    const handleDragEnd = () => {
        setDragState({ draggedNode: null, dragOverNode: null, dropPosition: null });
    };

    const getDropIndicatorClass = (node: TreeNodeData): string => {
        if (!dragState.dragOverNode || dragState.dragOverNode.id !== node.id || !dragState.dropPosition) {
            return '';
        }

        return `drop-${dragState.dropPosition}`;
    };

    return {
        dragState,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
        getDropIndicatorClass
    };
};
