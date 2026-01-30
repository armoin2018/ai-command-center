import { TreeNodeData } from '../types/tree';
import { FilterCondition } from '../components/AdvancedFilter';

/**
 * Filter Engine
 * 
 * Applies advanced filter conditions to tree nodes
 */

export class FilterEngine {
    /**
     * Filter tree based on conditions
     */
    static filterTree(nodes: TreeNodeData[], conditions: FilterCondition[]): TreeNodeData[] {
        if (conditions.length === 0) {
            return nodes;
        }

        return nodes.reduce((filtered: TreeNodeData[], node) => {
            const matchesFilter = this.evaluateNode(node, conditions);
            const filteredChildren = node.children ? this.filterTree(node.children, conditions) : [];

            // Include node if it matches OR has matching children
            if (matchesFilter || filteredChildren.length > 0) {
                filtered.push({
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children
                });
            }

            return filtered;
        }, []);
    }

    /**
     * Evaluate if a node matches all conditions
     */
    private static evaluateNode(node: TreeNodeData, conditions: FilterCondition[]): boolean {
        if (conditions.length === 0) {
            return true;
        }

        // Build expression based on logic operators
        let result = this.evaluateCondition(node, conditions[0]);

        for (let i = 1; i < conditions.length; i++) {
            const condition = conditions[i];
            const conditionResult = this.evaluateCondition(node, condition);

            if (condition.logic === 'OR') {
                result = result || conditionResult;
            } else {
                result = result && conditionResult;
            }
        }

        return result;
    }

    /**
     * Evaluate single condition against node
     */
    private static evaluateCondition(node: TreeNodeData, condition: FilterCondition): boolean {
        const { field, operator, value } = condition;
        const nodeValue = this.getNodeValue(node, field);

        switch (operator) {
            case 'equals':
                return nodeValue === value;

            case 'notEquals':
                return nodeValue !== value;

            case 'contains':
                if (typeof nodeValue === 'string' && typeof value === 'string') {
                    return nodeValue.toLowerCase().includes(value.toLowerCase());
                }
                if (Array.isArray(nodeValue) && typeof value === 'string') {
                    return nodeValue.some(v => 
                        v.toLowerCase().includes(value.toLowerCase())
                    );
                }
                return false;

            case 'greaterThan':
                if (typeof nodeValue === 'number' && typeof value === 'number') {
                    return nodeValue > value;
                }
                return false;

            case 'lessThan':
                if (typeof nodeValue === 'number' && typeof value === 'number') {
                    return nodeValue < value;
                }
                return false;

            case 'in':
                if (Array.isArray(value)) {
                    return value.includes(nodeValue as string);
                }
                return false;

            case 'before':
                if (typeof nodeValue === 'string' && typeof value === 'string') {
                    return new Date(nodeValue) < new Date(value);
                }
                return false;

            case 'after':
                if (typeof nodeValue === 'string' && typeof value === 'string') {
                    return new Date(nodeValue) > new Date(value);
                }
                return false;

            default:
                return false;
        }
    }

    /**
     * Get node value for specific field
     */
    private static getNodeValue(node: TreeNodeData, field: string): any {
        switch (field) {
            case 'type':
                return node.type;
            case 'status':
                return node.status;
            case 'priority':
                return node.priority;
            case 'tags':
                return node.tags || [];
            case 'estimatedHours':
                return node.estimatedHours;
            case 'name':
                return node.title;
            case 'dueDate':
                return node.deliverByDate;
            default:
                return undefined;
        }
    }

    /**
     * Count nodes matching filters
     */
    static countMatches(nodes: TreeNodeData[], conditions: FilterCondition[]): number {
        let count = 0;

        const countInTree = (items: TreeNodeData[]) => {
            items.forEach(node => {
                if (this.evaluateNode(node, conditions)) {
                    count++;
                }
                if (node.children) {
                    countInTree(node.children);
                }
            });
        };

        countInTree(nodes);
        return count;
    }

    /**
     * Get statistics about filtered results
     */
    static getFilterStats(
        nodes: TreeNodeData[],
        conditions: FilterCondition[]
    ): {
        total: number;
        filtered: number;
        byType: Record<string, number>;
        byStatus: Record<string, number>;
    } {
        const filtered = this.filterTree(nodes, conditions);
        
        const stats = {
            total: this.countAll(nodes),
            filtered: this.countAll(filtered),
            byType: {} as Record<string, number>,
            byStatus: {} as Record<string, number>
        };

        const collectStats = (items: TreeNodeData[]) => {
            items.forEach(node => {
                stats.byType[node.type] = (stats.byType[node.type] || 0) + 1;
                stats.byStatus[node.status] = (stats.byStatus[node.status] || 0) + 1;
                if (node.children) {
                    collectStats(node.children);
                }
            });
        };

        collectStats(filtered);
        return stats;
    }

    /**
     * Count all nodes in tree
     */
    private static countAll(nodes: TreeNodeData[]): number {
        let count = 0;
        const countInTree = (items: TreeNodeData[]) => {
            items.forEach(node => {
                count++;
                if (node.children) {
                    countInTree(node.children);
                }
            });
        };
        countInTree(nodes);
        return count;
    }
}
