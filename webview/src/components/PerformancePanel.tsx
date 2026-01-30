import React from 'react';
import { PerformanceMonitor, PerformanceReport } from '../utils/performanceMonitor';
import './PerformancePanel.css';

export const PerformancePanel: React.FC = () => {
    const [report, setReport] = React.useState<PerformanceReport | null>(null);
    const [autoRefresh, setAutoRefresh] = React.useState(false);

    React.useEffect(() => {
        updateReport();

        if (autoRefresh) {
            const interval = setInterval(updateReport, 2000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const updateReport = () => {
        setReport(PerformanceMonitor.generateReport());
    };

    const handleClear = () => {
        PerformanceMonitor.clear();
        updateReport();
    };

    const handleExport = () => {
        const data = PerformanceMonitor.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLogToConsole = () => {
        PerformanceMonitor.logSummary();
    };

    if (!report) {
        return <div className="performance-panel">Loading...</div>;
    }

    const metricsByType = {
        render: report.metrics.filter(m => m.type === 'render'),
        api: report.metrics.filter(m => m.type === 'api'),
        computation: report.metrics.filter(m => m.type === 'computation'),
        interaction: report.metrics.filter(m => m.type === 'interaction')
    };

    return (
        <div className="performance-panel">
            <div className="performance-header">
                <h2>📊 Performance Monitor</h2>
                <div className="header-actions">
                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh
                    </label>
                    <button onClick={updateReport}>Refresh</button>
                    <button onClick={handleLogToConsole}>Log to Console</button>
                    <button onClick={handleExport}>Export JSON</button>
                    <button onClick={handleClear} className="btn-danger">Clear</button>
                </div>
            </div>

            <div className="performance-stats">
                <div className="stat-card">
                    <div className="stat-value">{report.metrics.length}</div>
                    <div className="stat-label">Total Metrics</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{Object.keys(report.averages).length}</div>
                    <div className="stat-label">Tracked Operations</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{report.warnings.length}</div>
                    <div className="stat-label">Warnings</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{metricsByType.render.length}</div>
                    <div className="stat-label">Renders</div>
                </div>
            </div>

            {report.warnings.length > 0 && (
                <div className="performance-section warnings">
                    <h3>⚠️ Performance Warnings</h3>
                    <ul>
                        {report.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}

            {report.recommendations.length > 0 && (
                <div className="performance-section recommendations">
                    <h3>💡 Recommendations</h3>
                    <ul>
                        {report.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="performance-section">
                <h3>Average Durations</h3>
                <div className="averages-list">
                    {Object.entries(report.averages)
                        .sort(([, a], [, b]) => b - a)
                        .map(([name, avg]) => (
                            <div
                                key={name}
                                className={`average-item ${
                                    avg > 500 ? 'slow' : avg > 200 ? 'medium' : 'fast'
                                }`}
                            >
                                <span className="operation-name">{name}</span>
                                <span className="operation-duration">{Math.round(avg)}ms</span>
                            </div>
                        ))}
                </div>
            </div>

            <div className="performance-section">
                <h3>Metrics by Type</h3>
                <div className="metrics-by-type">
                    {Object.entries(metricsByType).map(([type, metrics]) => (
                        <div key={type} className="type-section">
                            <h4>
                                {type.charAt(0).toUpperCase() + type.slice(1)} ({metrics.length})
                            </h4>
                            {metrics.length > 0 && (
                                <div className="metrics-list">
                                    {metrics.slice(-10).reverse().map((metric, i) => (
                                        <div key={i} className="metric-item">
                                            <span className="metric-name">{metric.title}</span>
                                            <span className="metric-duration">
                                                {Math.round(metric.duration)}ms
                                            </span>
                                            <span className="metric-time">
                                                {new Date(metric.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
