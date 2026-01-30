/**
 * jQuery-Style Tree Component
 * 
 * Wrapper component that uses jQuery for DOM manipulation
 * and Bootstrap for visual styling
 */

import React, { useEffect, useRef } from 'react';
import { $, Tagify } from '../utils/libraries';
import { TreeNodeData } from '../types/tree';

interface JQueryTreeProps {
  tree: TreeNodeData[];
  expandedNodes: Set<string>;
  selectedNode: TreeNodeData | null;
  onNodeToggle: (nodeId: string) => void;
  onNodeClick: (node: TreeNodeData) => void;
  onNodeContextMenu: (node: TreeNodeData, e: React.MouseEvent) => void;
}

export const JQueryTree: React.FC<JQueryTreeProps> = ({
  tree,
  expandedNodes,
  selectedNode,
  onNodeToggle,
  onNodeClick,
  onNodeContextMenu
}) => {
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!treeRef.current) return;

    const $tree = $(treeRef.current);
    $tree.empty();

    const renderNode = (node: TreeNodeData, level: number = 0): JQuery<HTMLElement> => {
      const isExpanded = expandedNodes.has(node.id);
      const isSelected = selectedNode?.id === node.id;
      const hasChildren = node.children && node.children.length > 0;

      // Create node container with Bootstrap classes
      const $nodeContainer = $('<div>')
        .addClass('tree-node-container')
        .attr('data-node-id', node.id)
        .attr('data-node-type', node.type);

      // Create node element
      const $node = $('<div>')
        .addClass('d-flex align-items-center py-2 px-3 border-bottom')
        .addClass(isSelected ? 'bg-primary text-white' : 'bg-light')
        .addClass('tree-node')
        .css('padding-left', `${level * 20 + 12}px`)
        .attr('role', 'treeitem')
        .attr('aria-level', level + 1);

      // Expand/collapse button
      if (hasChildren) {
        const $toggleBtn = $('<button>')
          .addClass('btn btn-sm btn-link p-0 me-2')
          .attr('type', 'button')
          .attr('aria-expanded', String(isExpanded))
          .html(isExpanded ? '▼' : '▶')
          .on('click', (e) => {
            e.stopPropagation();
            onNodeToggle(node.id);
          });
        $node.append($toggleBtn);
      } else {
        $node.append($('<span>').addClass('me-2').css('width', '20px'));
      }

      // Status badge
      const statusColors: Record<string, string> = {
        'todo': 'warning',
        'open': 'primary',
        'done': 'success',
        'in-progress': 'info',
        'ready': 'secondary',
        'hold': 'secondary'
      };
      const badgeColor = statusColors[node.status?.toLowerCase() || ''] || 'secondary';
      
      const $statusBadge = $('<span>')
        .addClass(`badge rounded-circle bg-${badgeColor} me-2`)
        .css({
          'width': '10px',
          'height': '10px',
          'padding': '0'
        })
        .attr('title', node.status);
      $node.append($statusBadge);

      // Icon
      const icons: Record<string, string> = {
        'epic': '📘',
        'story': '📄',
        'task': '✅',
        'bug': '🐞'
      };
      const $icon = $('<span>')
        .addClass('me-2')
        .text(icons[node.type] || '📄');
      $node.append($icon);

      // Node content
      const $content = $('<div>')
        .addClass('flex-grow-1')
        .html(`<strong>${node.id}:</strong> ${node.title}`);
      $node.append($content);

      // Priority badge
      if (node.priority) {
        const priorityColors: Record<string, string> = {
          'high': 'danger',
          'medium': 'warning',
          'low': 'success'
        };
        const $priorityBadge = $('<span>')
          .addClass(`badge bg-${priorityColors[node.priority.toLowerCase()] || 'secondary'} ms-2`)
          .text(node.priority);
        $node.append($priorityBadge);
      }

      // Event handlers
      $node.on('click', () => onNodeClick(node));
      $node.on('contextmenu', (e) => {
        e.preventDefault();
        onNodeContextMenu(node, e as any);
      });

      // Hover effects using jQuery
      $node.on('mouseenter', function() {
        if (!isSelected) {
          $(this).removeClass('bg-light').addClass('bg-secondary bg-opacity-10');
        }
      });
      $node.on('mouseleave', function() {
        if (!isSelected) {
          $(this).removeClass('bg-secondary bg-opacity-10').addClass('bg-light');
        }
      });

      $nodeContainer.append($node);

      // Render children
      if (hasChildren && isExpanded) {
        const $childrenContainer = $('<div>')
          .addClass('tree-children');
        
        node.children!.forEach(child => {
          $childrenContainer.append(renderNode(child, level + 1));
        });
        
        $nodeContainer.append($childrenContainer);
      }

      return $nodeContainer;
    };

    // Render all root nodes
    tree.forEach(node => {
      $tree.append(renderNode(node));
    });

    // Cleanup
    return () => {
      $tree.find('.tree-node').off();
    };
  }, [tree, expandedNodes, selectedNode, onNodeToggle, onNodeClick, onNodeContextMenu]);

  return (
    <div 
      ref={treeRef} 
      className="jquery-tree card border-0"
      style={{ 
        maxHeight: '100%', 
        overflowY: 'auto',
        backgroundColor: 'var(--vscode-editor-background)'
      }}
    />
  );
};
