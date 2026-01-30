import React from 'react';
import { TreeNodeData } from '../types/tree';
import './Charts.css';

interface ChartsProps {
    tree: TreeNodeData[];
}

interface ChartData {
    statusCounts: { [key: string]: number };
    typeCounts: { [key: string]: number };
    priorityCounts: { [key: string]: number };
    totalStoryPoints: number;
    completedStoryPoints: number;
    itemsByStatus: { [key: string]: TreeNodeData[] };
}

export const Charts: React.FC<ChartsProps> = ({ tree }) => {
    const [chartData, setChartData] = React.useState<ChartData>({
        statusCounts: {},
        typeCounts: {},
        priorityCounts: {},
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        itemsByStatus: {}
    });

    React.useEffect(() => {
        const data = analyzeTree(tree);
        setChartData(data);
    }, [tree]);

    const analyzeTree = (nodes: TreeNodeData[]): ChartData => {
        const result: ChartData = {
            statusCounts: {},
            typeCounts: {},
            priorityCounts: {},
            totalStoryPoints: 0,
            completedStoryPoints: 0,
            itemsByStatus: {}
        };

        const traverse = (node: TreeNodeData) => {
            // Count status
            result.statusCounts[node.status] = (result.statusCounts[node.status] || 0) + 1;

            // Count type
            result.typeCounts[node.type] = (result.typeCounts[node.type] || 0) + 1;

            // Count priority
            if (node.priority) {
                result.priorityCounts[node.priority] = (result.priorityCounts[node.priority] || 0) + 1;
            }

            // Story points
            if (node.estimatedHours) {
                result.totalStoryPoints += node.estimatedHours;
                if (node.status === 'done') {
                    result.completedStoryPoints += node.estimatedHours;
                }
            }

            // Items by status
            if (!result.itemsByStatus[node.status]) {
                result.itemsByStatus[node.status] = [];
            }
            result.itemsByStatus[node.status].push(node);

            // Recurse children
            if (node.children) {
                node.children.forEach(traverse);
            }
        };

        nodes.forEach(traverse);
        return result;
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'done': return '#22c55e';
            case 'in-progress': return '#3b82f6';
            case 'pending': return '#ef4444';
            case 'todo': return '#94a3b8';
            default: return '#94a3b8';
        }
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'epic': return '#8b5cf6';
            case 'story': return '#3b82f6';
            case 'task': return '#22c55e';
            default: return '#94a3b8';
        }
    };

    const getPriorityColor = (priority: string): string => {
        switch (priority) {
            case 'critical': return '#dc2626';
            case 'high': return '#f97316';
            case 'medium': return '#3b82f6';
            case 'low': return '#22c55e';
            default: return '#94a3b8';
        }
    };

    const renderPieChart = (data: { [key: string]: number }, getColor: (key: string) => string, title: string) => {
        const total = Object.values(data).reduce((sum, val) => sum + val, 0);
        if (total === 0) return null;

        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
        let currentAngle = 0;

        return (
            <div className="chart-container">
                <h3 className="chart-title">{title}</h3>
                <div className="pie-chart-wrapper">
                    <svg viewBox="0 0 200 200" className="pie-chart">
                        {entries.map(([key, value]) => {
                            const percentage = value / total;
                            const angle = percentage * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;

                            // Convert to radians
                            const startRad = (startAngle - 90) * (Math.PI / 180);
                            const endRad = (endAngle - 90) * (Math.PI / 180);

                            // Calculate coordinates
                            const x1 = 100 + 90 * Math.cos(startRad);
                            const y1 = 100 + 90 * Math.sin(startRad);
                            const x2 = 100 + 90 * Math.cos(endRad);
                            const y2 = 100 + 90 * Math.sin(endRad);

                            const largeArc = angle > 180 ? 1 : 0;
                            const path = `M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`;

                            currentAngle = endAngle;

                            return (
                                <g key={key}>
                                    <path
                                        d={path}
                                        fill={getColor(key)}
                                        stroke="var(--vscode-panel-background)"
                                        strokeWidth="2"
                                    >
                                        <title>{`${key}: ${value} (${(percentage * 100).toFixed(1)}%)`}</title>
                                    </path>
                                </g>
                            );
                        })}
                    </svg>
                    <div className="chart-legend">
                        {entries.map(([key, value]) => (
                            <div key={key} className="legend-item">
                                <div
                                    className="legend-color"
                                    style={{ backgroundColor: getColor(key) }}
                                />
                                <span className="legend-label">{key}</span>
                                <span className="legend-value">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderBarChart = (data: { [key: string]: number }, getColor: (key: string) => string, title: string) => {
        const maxValue = Math.max(...Object.values(data));
        if (maxValue === 0) return null;

        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

        return (
            <div className="chart-container">
                <h3 className="chart-title">{title}</h3>
                <div className="bar-chart">
                    {entries.map(([key, value]) => {
                        const percentage = (value / maxValue) * 100;
                        return (
                            <div key={key} className="bar-row">
                                <span className="bar-label">{key}</span>
                                <div className="bar-container">
                                    <div
                                        className="bar"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: getColor(key)
                                        }}
                                    >
                                        <span className="bar-value">{value}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderProgressChart = () => {
        const { totalStoryPoints, completedStoryPoints } = chartData;
        if (totalStoryPoints === 0) return null;

        const percentage = (completedStoryPoints / totalStoryPoints) * 100;

        return (
            <div className="chart-container">
                <h3 className="chart-title">Story Points Progress</h3>
                <div className="progress-chart">
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="progress-stats">
                        <div className="stat">
                            <span className="stat-label">Completed</span>
                            <span className="stat-value">{completedStoryPoints}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total</span>
                            <span className="stat-value">{totalStoryPoints}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Progress</span>
                            <span className="stat-value">{percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="charts-container">
            <div className="charts-grid">
                {renderPieChart(chartData.statusCounts, getStatusColor, 'Status Distribution')}
                {renderPieChart(chartData.typeCounts, getTypeColor, 'Type Distribution')}
                {renderBarChart(chartData.priorityCounts, getPriorityColor, 'Priority Distribution')}
                {renderProgressChart()}
            </div>
        </div>
    );
};
