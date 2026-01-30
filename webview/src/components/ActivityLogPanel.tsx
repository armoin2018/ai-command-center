import React from 'react';
import { ActivityLog, ActivityLogEntry, ActionType } from '../utils/activityLog';
import './ActivityLogPanel.css';

interface ActivityLogPanelProps {
    onUndo?: (entry: ActivityLogEntry) => void;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ onUndo }) => {
    const [entries, setEntries] = React.useState<ActivityLogEntry[]>([]);
    const [filter, setFilter] = React.useState<ActionType | 'all'>('all');

    React.useEffect(() => {
        loadEntries();
    }, [filter]);

    const loadEntries = () => {
        const log = filter === 'all' 
            ? ActivityLog.getLog() 
            : ActivityLog.getByAction(filter);
        setEntries(log);
    };

    const handleExport = () => {
        const json = ActivityLog.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-log-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        if (confirm('Clear all activity history?')) {
            ActivityLog.clear();
            setEntries([]);
        }
    };

    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <div className="activity-log-panel">
            <div className="activity-log-header">
                <h3>Activity Log</h3>
                <div className="activity-log-actions">
                    <button onClick={handleExport} className="btn-export">
                        📤 Export
                    </button>
                    <button onClick={handleClear} className="btn-clear">
                        🗑️ Clear
                    </button>
                </div>
            </div>

            <div className="activity-log-filter">
                <select 
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="filter-select"
                >
                    <option value="all">All Actions</option>
                    <option value="create">Create</option>
                    <option value="edit">Edit</option>
                    <option value="delete">Delete</option>
                    <option value="bulk-edit">Bulk Edit</option>
                    <option value="bulk-delete">Bulk Delete</option>
                    <option value="sync">Sync</option>
                    <option value="import">Import</option>
                    <option value="export">Export</option>
                </select>
            </div>

            <div className="activity-log-entries">
                {entries.length === 0 ? (
                    <div className="no-entries">No activity yet</div>
                ) : (
                    entries.map((entry) => (
                        <div key={entry.id} className="activity-entry">
                            <div className="entry-icon">
                                {ActivityLog.getActionIcon(entry.action)}
                            </div>
                            <div className="entry-content">
                                <div className="entry-action">
                                    <strong>{ActivityLog.getActionLabel(entry.action)}</strong>
                                    <span className="entry-target">{entry.target}</span>
                                </div>
                                <div className="entry-details">{entry.details}</div>
                                <div className="entry-time">{formatTime(entry.timestamp)}</div>
                            </div>
                            {entry.canUndo && onUndo && (
                                <button
                                    className="btn-undo"
                                    onClick={() => onUndo(entry)}
                                    title="Undo this action"
                                >
                                    ↶ Undo
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
