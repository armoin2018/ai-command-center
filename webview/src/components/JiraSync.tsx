import React from 'react';
import { JiraSyncService, SyncConfig, SyncResult, SyncConflict } from '../services/jiraSyncService';
import { JiraClient } from '../api/jiraClient';
import { TreeNodeData } from '../types/tree';
import './JiraSync.css';

interface JiraSyncProps {
    tree: TreeNodeData[];
    onSyncComplete: (updatedTree: TreeNodeData[]) => void;
}

export const JiraSync: React.FC<JiraSyncProps> = ({ tree, onSyncComplete }) => {
    const [connected, setConnected] = React.useState(false);
    const [syncing, setSyncing] = React.useState(false);
    const [lastResult, setLastResult] = React.useState<SyncResult | null>(null);
    const [conflicts, setConflicts] = React.useState<SyncConflict[]>([]);
    const [config, setConfig] = React.useState({
        baseUrl: '',
        email: '',
        apiToken: '',
        projectKey: '',
        syncDirection: 'bidirectional' as 'push' | 'pull' | 'bidirectional',
        autoSync: false,
        syncInterval: 15
    });

    const [syncService, setSyncService] = React.useState<JiraSyncService | null>(null);

    const handleConnect = async () => {
        try {
            const jiraClient = new JiraClient({
                baseUrl: config.baseUrl,
                email: config.email,
                apiToken: config.apiToken,
                projectKey: config.projectKey
            });

            // Test connection
            await jiraClient.testConnection();

            const service = new JiraSyncService({
                jiraClient,
                projectKey: config.projectKey,
                syncDirection: config.syncDirection,
                autoSync: config.autoSync,
                syncInterval: config.syncInterval
            });

            setSyncService(service);
            setConnected(true);
        } catch (error) {
            alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleSync = async () => {
        if (!syncService) return;

        setSyncing(true);
        try {
            const result = await syncService.sync(tree);
            setLastResult(result);
            setConflicts(result.conflicts);

            if (result.success) {
                // Trigger callback to refresh tree if needed
                onSyncComplete(tree);
            }
        } catch (error) {
            alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleResolveConflict = async (conflict: SyncConflict, resolution: 'local' | 'remote') => {
        if (!syncService) return;

        const success = await syncService.resolveConflict(conflict, resolution);
        if (success) {
            setConflicts(conflicts.filter(c => c.itemId !== conflict.itemId));
        }
    };

    return (
        <div className="jira-sync">
            <div className="sync-header">
                <h3>JIRA Sync</h3>
                <div className="sync-status">
                    {connected ? (
                        <span className="status-connected">● Connected</span>
                    ) : (
                        <span className="status-disconnected">● Disconnected</span>
                    )}
                </div>
            </div>

            {!connected ? (
                <div className="sync-config">
                    <div className="form-group">
                        <label>JIRA URL</label>
                        <input
                            type="url"
                            placeholder="https://your-domain.atlassian.net"
                            value={config.baseUrl}
                            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="your-email@example.com"
                            value={config.email}
                            onChange={(e) => setConfig({ ...config, email: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>API Token</label>
                        <input
                            type="password"
                            placeholder="Your JIRA API token"
                            value={config.apiToken}
                            onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Project Key</label>
                        <input
                            type="text"
                            placeholder="PROJ"
                            value={config.projectKey}
                            onChange={(e) => setConfig({ ...config, projectKey: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Sync Direction</label>
                        <select
                            value={config.syncDirection}
                            onChange={(e) => setConfig({ ...config, syncDirection: e.target.value as any })}
                        >
                            <option value="bidirectional">Bidirectional</option>
                            <option value="push">Push to JIRA only</option>
                            <option value="pull">Pull from JIRA only</option>
                        </select>
                    </div>

                    <div className="form-group checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.autoSync}
                                onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                            />
                            Enable auto-sync
                        </label>
                    </div>

                    {config.autoSync && (
                        <div className="form-group">
                            <label>Sync Interval (minutes)</label>
                            <input
                                type="number"
                                min="5"
                                max="60"
                                value={config.syncInterval}
                                onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) })}
                            />
                        </div>
                    )}

                    <button className="btn-connect" onClick={handleConnect}>
                        Connect to JIRA
                    </button>
                </div>
            ) : (
                <div className="sync-controls">
                    <button
                        className="btn-sync"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>

                    <button
                        className="btn-disconnect"
                        onClick={() => {
                            setConnected(false);
                            setSyncService(null);
                        }}
                    >
                        Disconnect
                    </button>

                    {lastResult && (
                        <div className="sync-result">
                            <h4>Last Sync Result</h4>
                            <div className="result-stats">
                                <div className="stat">
                                    <span className="stat-label">Pushed</span>
                                    <span className="stat-value">{lastResult.pushed}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Pulled</span>
                                    <span className="stat-value">{lastResult.pulled}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Conflicts</span>
                                    <span className="stat-value">{lastResult.conflicts.length}</span>
                                </div>
                            </div>

                            {lastResult.errors.length > 0 && (
                                <div className="sync-errors">
                                    <h5>Errors</h5>
                                    {lastResult.errors.map((error, i) => (
                                        <div key={i} className="error-item">{error}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {conflicts.length > 0 && (
                        <div className="sync-conflicts">
                            <h4>Conflicts</h4>
                            {conflicts.map((conflict) => (
                                <div key={conflict.itemId} className="conflict-item">
                                    <div className="conflict-header">
                                        <strong>{conflict.itemName}</strong>
                                        <span className="conflict-type">{conflict.type}</span>
                                    </div>
                                    <div className="conflict-actions">
                                        <button
                                            className="btn-resolve"
                                            onClick={() => handleResolveConflict(conflict, 'local')}
                                        >
                                            Keep Local
                                        </button>
                                        <button
                                            className="btn-resolve"
                                            onClick={() => handleResolveConflict(conflict, 'remote')}
                                        >
                                            Keep Remote
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
