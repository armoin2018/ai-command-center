/**
 * Export Utilities
 * 
 * Export planning tree to various formats
 */

import { TreeNodeData } from '../types/tree';

export type ExportFormat = 'json' | 'yaml' | 'markdown';

export class ExportService {
    /**
     * Export tree to JSON format
     */
    static toJSON(tree: TreeNodeData[]): string {
        return JSON.stringify(tree, null, 2);
    }

    /**
     * Export tree to YAML format
     */
    static toYAML(tree: TreeNodeData[]): string {
        const indent = (level: number) => '  '.repeat(level);
        
        const nodeToYAML = (node: TreeNodeData, level: number = 0): string => {
            const lines: string[] = [];
            
            lines.push(`${indent(level)}- id: ${node.id}`);
            lines.push(`${indent(level)}  title: "${node.title}"`);
            lines.push(`${indent(level)}  type: ${node.type}`);
            lines.push(`${indent(level)}  status: ${node.status}`);
            
            if (node.description) {
                lines.push(`${indent(level)}  description: "${node.description}"`);
            }
            
            if (node.priority) {
                lines.push(`${indent(level)}  priority: ${node.priority}`);
            }
            
            if (node.estimatedHours !== undefined && node.estimatedHours > 0) {
                lines.push(`${indent(level)}  estimatedHours: ${node.estimatedHours}`);
            }
            
            if (node.children && node.children.length > 0) {
                lines.push(`${indent(level)}  children:`);
                node.children.forEach(child => {
                    lines.push(nodeToYAML(child, level + 2));
                });
            }
            
            return lines.join('\n');
        };
        
        const header = 'tree:\n';
        const content = tree.map(node => nodeToYAML(node, 1)).join('\n');
        return header + content;
    }

    /**
     * Export tree to Markdown format
     */
    static toMarkdown(tree: TreeNodeData[]): string {
        const lines: string[] = [];
        
        lines.push('# Planning Tree');
        lines.push('');
        lines.push(`Generated: ${new Date().toISOString()}`);
        lines.push('');
        
        const nodeToMarkdown = (node: TreeNodeData, level: number = 0): void => {
            const indent = '  '.repeat(level);
            const icon = node.type === 'epic' ? '📋' : node.type === 'story' ? '📖' : '✓';
            const statusBadge = `\`${node.status}\``;
            const points = node.estimatedHours ? ` (${node.estimatedHours} SP)` : '';
            
            lines.push(`${indent}- ${icon} **${node.title}**${points} ${statusBadge}`);
            
            if (node.description) {
                lines.push(`${indent}  _${node.description}_`);
            }
            
            if (node.priority) {
                lines.push(`${indent}  Priority: ${node.priority}`);
            }
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => nodeToMarkdown(child, level + 1));
            }
            
            lines.push('');
        };
        
        tree.forEach(node => nodeToMarkdown(node));
        
        return lines.join('\n');
    }

    /**
     * Trigger download of exported content
     */
    static download(content: string, format: ExportFormat): void {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `planning-tree-${timestamp}.${format === 'markdown' ? 'md' : format}`;
        const mimeType = format === 'json' 
            ? 'application/json' 
            : format === 'yaml' 
            ? 'text/yaml' 
            : 'text/markdown';
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Export tree in specified format and trigger download
     */
    static export(tree: TreeNodeData[], format: ExportFormat): void {
        let content: string;
        
        switch (format) {
            case 'json':
                content = this.toJSON(tree);
                break;
            case 'yaml':
                content = this.toYAML(tree);
                break;
            case 'markdown':
                content = this.toMarkdown(tree);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        
        this.download(content, format);
    }
}
