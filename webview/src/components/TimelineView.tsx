/**
 * Timeline/Gantt View Component
 * Visualizes epics and stories in a timeline format
 */

import React, { useState, useMemo } from 'react';
import { TreeNodeData } from '../types/tree';
import './TimelineView.css';

interface TimelineViewProps {
    tree: TreeNodeData[];
    onSelectNode?: (node: TreeNodeData) => void;
}

interface TimelineItem {
    id: string;
    title: string;
    type: 'epic' | 'story' | 'task';
    startDate: Date;
    endDate: Date;
    progress: number;
    status: string;
    parent?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tree, onSelectNode }) => {
    const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>('month');
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    // Convert tree to timeline items with mock dates for visualization
    const timelineItems = useMemo(() => {
        const items: TimelineItem[] = [];
        const now = new Date();
        let itemIndex = 0;
        
        const processNode = (node: TreeNodeData, parentId?: string) => {
            // Generate dates based on node type and position (mock data for visualization)
            const startDate = new Date(now.getTime() - (30 - itemIndex * 2) * 24 * 60 * 60 * 1000);
            const duration = node.type === 'epic' ? 60 : node.type === 'story' ? 21 : 7; // days
            const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
            
            const progress = calculateProgress(node);
            
            items.push({
                id: node.id,
                title: node.title,
                type: node.type as 'epic' | 'story' | 'task',
                startDate,
                endDate,
                progress,
                status: node.status,
                parent: parentId
            });
            
            itemIndex++;

            // Process children
            if (node.children) {
                node.children.forEach(child => processNode(child, node.id));
            }
        };

        tree.forEach(node => processNode(node));
        return items;
    }, [tree]);

    // Calculate date range for timeline
    const dateRange = useMemo(() => {
        if (timelineItems.length === 0) {
            return {
                start: new Date(),
                end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            };
        }

        const allDates = timelineItems.flatMap(item => [item.startDate, item.endDate]);
        return {
            start: new Date(Math.min(...allDates.map(d => d.getTime()))),
            end: new Date(Math.max(...allDates.map(d => d.getTime())))
        };
    }, [timelineItems]);

    // Generate timeline grid based on view mode
    const timelineGrid = useMemo(() => {
        const grid: Date[] = [];
        const current = new Date(dateRange.start);
        const end = dateRange.end;

        while (current <= end) {
            grid.push(new Date(current));
            
            if (viewMode === 'month') {
                current.setDate(current.getDate() + 7); // Weekly intervals
            } else if (viewMode === 'quarter') {
                current.setMonth(current.getMonth() + 1); // Monthly intervals
            } else {
                current.setMonth(current.getMonth() + 3); // Quarterly intervals
            }
        }

        return grid;
    }, [dateRange, viewMode]);

    const calculateProgress = (node: TreeNodeData): number => {
        if (node.status === 'done') return 100;
        if (node.status === 'in-progress') return 50;
        if (node.status === 'pending') return 25;
        return 0;
    };

    const getItemPosition = (item: TimelineItem) => {
        const totalDuration = dateRange.end.getTime() - dateRange.start.getTime();
        const itemStart = item.startDate.getTime() - dateRange.start.getTime();
        const itemDuration = item.endDate.getTime() - item.startDate.getTime();

        return {
            left: `${(itemStart / totalDuration) * 100}%`,
            width: `${(itemDuration / totalDuration) * 100}%`
        };
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'done': return '#4caf50';
            case 'in-progress': return '#2196f3';
            case 'todo': return '#9e9e9e';
            default: return '#9e9e9e';
        }
    };

    const handleItemClick = (item: TimelineItem) => {
        setSelectedItem(item.id);
        if (onSelectNode) {
            const findNode = (nodes: TreeNodeData[]): TreeNodeData | null => {
                for (const node of nodes) {
                    if (node.id === item.id) return node;
                    if (node.children) {
                        const found = findNode(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            const node = findNode(tree);
            if (node) onSelectNode(node);
        }
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: viewMode === 'year' ? 'numeric' : undefined
        });
    };

    // Group items by type
    const epics = timelineItems.filter(item => item.type === 'epic');
    const stories = timelineItems.filter(item => item.type === 'story');
    const tasks = timelineItems.filter(item => item.type === 'task');

    return (
        <div className="timeline-view">
            <div className="timeline-header">
                <h2>Timeline View</h2>
                <div className="timeline-controls">
                    <button 
                        className={viewMode === 'month' ? 'active' : ''}
                        onClick={() => setViewMode('month')}
                    >
                        Month
                    </button>
                    <button 
                        className={viewMode === 'quarter' ? 'active' : ''}
                        onClick={() => setViewMode('quarter')}
                    >
                        Quarter
                    </button>
                    <button 
                        className={viewMode === 'year' ? 'active' : ''}
                        onClick={() => setViewMode('year')}
                    >
                        Year
                    </button>
                </div>
            </div>

            <div className="timeline-container">
                {/* Timeline grid */}
                <div className="timeline-grid">
                    <div className="timeline-grid-header">
                        {timelineGrid.map((date, index) => (
                            <div key={index} className="timeline-grid-cell">
                                {formatDate(date)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Epics */}
                {epics.length > 0 && (
                    <div className="timeline-section">
                        <div className="timeline-section-label">Epics</div>
                        <div className="timeline-items">
                            {epics.map(item => {
                                const position = getItemPosition(item);
                                return (
                                    <div
                                        key={item.id}
                                        className={`timeline-item timeline-item-epic ${selectedItem === item.id ? 'selected' : ''}`}
                                        style={{
                                            left: position.left,
                                            width: position.width,
                                            backgroundColor: getStatusColor(item.status)
                                        }}
                                        onClick={() => handleItemClick(item)}
                                        title={`${item.title} (${item.progress}%)`}
                                    >
                                        <div className="timeline-item-content">
                                            <span className="timeline-item-name">{item.title}</span>
                                            <div 
                                                className="timeline-item-progress"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Stories */}
                {stories.length > 0 && (
                    <div className="timeline-section">
                        <div className="timeline-section-label">Stories</div>
                        <div className="timeline-items">
                            {stories.map(item => {
                                const position = getItemPosition(item);
                                return (
                                    <div
                                        key={item.id}
                                        className={`timeline-item timeline-item-story ${selectedItem === item.id ? 'selected' : ''}`}
                                        style={{
                                            left: position.left,
                                            width: position.width,
                                            backgroundColor: getStatusColor(item.status)
                                        }}
                                        onClick={() => handleItemClick(item)}
                                        title={`${item.title} (${item.progress}%)`}
                                    >
                                        <div className="timeline-item-content">
                                            <span className="timeline-item-name">{item.title}</span>
                                            <div 
                                                className="timeline-item-progress"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Today marker */}
                {(() => {
                    const today = new Date();
                    if (today >= dateRange.start && today <= dateRange.end) {
                        const totalDuration = dateRange.end.getTime() - dateRange.start.getTime();
                        const todayPosition = (today.getTime() - dateRange.start.getTime()) / totalDuration;
                        return (
                            <div 
                                className="timeline-today-marker"
                                style={{ left: `${todayPosition * 100}%` }}
                                title="Today"
                            />
                        );
                    }
                    return null;
                })()}
            </div>

            {timelineItems.length === 0 && (
                <div className="timeline-empty">
                    <p>No items with dates to display in timeline view.</p>
                </div>
            )}
        </div>
    );
};
