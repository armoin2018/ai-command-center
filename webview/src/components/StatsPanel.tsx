/**
 * Statistics Panel Component
 * 
 * Displays aggregate statistics for the planning tree
 */

import React, { useMemo } from 'react';
import { TreeNodeData } from '../types/tree';
import './StatsPanel.css';

interface StatsPanelProps {
    tree: TreeNodeData[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ tree }) => {
    const stats = useMemo(() => {
        let totalEpics = 0;
        let totalStories = 0;
        let totalTasks = 0;
        let totalStoryPoints = 0;
        let completedStoryPoints = 0;
        
        const statusCounts = {
            'todo': 0,
            'in-progress': 0,
            'done': 0,
            'pending': 0
        };

        const priorityCounts = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        };

        const traverse = (nodes: TreeNodeData[]) => {
            nodes.forEach(node => {
                // Count by type
                if (node.type === 'epic') totalEpics++;
                else if (node.type === 'story') {
                    totalStories++;
                    if (node.estimatedHours) {
                        totalStoryPoints += node.estimatedHours;
                        if (node.status === 'done') {
                            completedStoryPoints += node.estimatedHours;
                        }
                    }
                } else if (node.type === 'task') totalTasks++;

                // Count by status
                if (statusCounts[node.status as keyof typeof statusCounts] !== undefined) {
                    statusCounts[node.status as keyof typeof statusCounts]++;
                }

                // Count by priority
                if (priorityCounts[node.priority as keyof typeof priorityCounts] !== undefined) {
                    priorityCounts[node.priority as keyof typeof priorityCounts]++;
                }

                // Recurse
                if (node.children) traverse(node.children);
            });
        };

        traverse(tree);

        const completionRate = totalStoryPoints > 0 
            ? ((completedStoryPoints / totalStoryPoints) * 100).toFixed(1) 
            : '0.0';

        const itemCompletionRate = (totalEpics + totalStories + totalTasks) > 0
            ? ((statusCounts.done / (totalEpics + totalStories + totalTasks)) * 100).toFixed(1)
            : '0.0';

        return {
            totalEpics,
            totalStories,
            totalTasks,
            totalStoryPoints,
            completedStoryPoints,
            completionRate,
            itemCompletionRate,
            statusCounts,
            priorityCounts
        };
    }, [tree]);

    return (
        <div className="stats-panel">
            <div className="stats-section">
                <h3 className="stats-title">Overview</h3>
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-icon">📋</span>
                        <span className="stat-value">{stats.totalEpics}</span>
                        <span className="stat-label">Epics</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">📖</span>
                        <span className="stat-value">{stats.totalStories}</span>
                        <span className="stat-label">Stories</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">✓</span>
                        <span className="stat-value">{stats.totalTasks}</span>
                        <span className="stat-label">Tasks</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">🎯</span>
                        <span className="stat-value">{stats.totalStoryPoints}</span>
                        <span className="stat-label">Story Points</span>
                    </div>
                </div>
            </div>

            <div className="stats-section">
                <h3 className="stats-title">Progress</h3>
                <div className="progress-item">
                    <div className="progress-header">
                        <span>Story Points</span>
                        <span className="progress-percent">{stats.completionRate}%</span>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${stats.completionRate}%` }}
                        />
                    </div>
                    <div className="progress-details">
                        {stats.completedStoryPoints} / {stats.totalStoryPoints} completed
                    </div>
                </div>
                <div className="progress-item">
                    <div className="progress-header">
                        <span>Items</span>
                        <span className="progress-percent">{stats.itemCompletionRate}%</span>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${stats.itemCompletionRate}%` }}
                        />
                    </div>
                    <div className="progress-details">
                        {stats.statusCounts.done} / {stats.totalEpics + stats.totalStories + stats.totalTasks} completed
                    </div>
                </div>
            </div>

            <div className="stats-section">
                <h3 className="stats-title">Status Distribution</h3>
                <div className="distribution-list">
                    <div className="distribution-item">
                        <span className="distribution-label">
                            <span className="status-indicator status-not-started"></span>
                            Not Started
                        </span>
                        <span className="distribution-value">{stats.statusCounts['todo']}</span>
                    </div>
                    <div className="distribution-item">
                        <span className="distribution-label">
                            <span className="status-indicator status-in-progress"></span>
                            In Progress
                        </span>
                        <span className="distribution-value">{stats.statusCounts['in-progress']}</span>
                    </div>
                    <div className="distribution-item">
                        <span className="distribution-label">
                            <span className="status-indicator status-completed"></span>
                            Completed
                        </span>
                        <span className="distribution-value">{stats.statusCounts.done}</span>
                    </div>
                    <div className="distribution-item">
                        <span className="distribution-label">
                            <span className="status-indicator status-blocked"></span>
                            Blocked
                        </span>
                        <span className="distribution-value">{stats.statusCounts.pending}</span>
                    </div>
                </div>
            </div>

            <div className="stats-section">
                <h3 className="stats-title">Priority Distribution</h3>
                <div className="distribution-list">
                    <div className="distribution-item">
                        <span className="distribution-label">🔴 Critical</span>
                        <span className="distribution-value">{stats.priorityCounts.critical}</span>
                    </div>
                    <div className="distribution-item">
                        <span className="distribution-label">🟠 High</span>
                        <span className="distribution-value">{stats.priorityCounts.high}</span>
                    </div>
                    <div className="distribution-item">
                        <span className="distribution-label">🟡 Medium</span>
                        <span className="distribution-value">{stats.priorityCounts.medium}</span>
                    </div>
                    <div className="distribution-item">
                        <span className="distribution-label">🟢 Low</span>
                        <span className="distribution-value">{stats.priorityCounts.low}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
