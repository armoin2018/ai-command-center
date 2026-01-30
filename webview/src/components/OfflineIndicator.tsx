import React from 'react';
import { OfflineManager } from '../utils/offlineManager';
import './OfflineIndicator.css';

export const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = React.useState(OfflineManager.getOnlineStatus());
    const [queueLength, setQueueLength] = React.useState(OfflineManager.getQueueLength());
    const [showDetails, setShowDetails] = React.useState(false);

    React.useEffect(() => {
        const unsubscribe = OfflineManager.onStatusChange(setIsOnline);

        // Update queue length periodically
        const interval = setInterval(() => {
            setQueueLength(OfflineManager.getQueueLength());
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    if (isOnline && queueLength === 0) {
        return null; // Don't show anything when online and no pending changes
    }

    return (
        <div className={`offline-indicator ${isOnline ? 'syncing' : 'offline'}`}>
            <div className="indicator-content" onClick={() => setShowDetails(!showDetails)}>
                <span className="status-icon">
                    {isOnline ? '🔄' : '📡'}
                </span>
                <span className="status-text">
                    {isOnline 
                        ? queueLength > 0 
                            ? `Syncing ${queueLength} item${queueLength > 1 ? 's' : ''}...`
                            : 'Online'
                        : 'Offline Mode'
                    }
                </span>
                {queueLength > 0 && (
                    <span className="queue-badge">{queueLength}</span>
                )}
            </div>

            {showDetails && (
                <div className="indicator-details">
                    <div className="details-header">
                        <h4>Sync Status</h4>
                        <button onClick={() => setShowDetails(false)}>✕</button>
                    </div>
                    <div className="details-content">
                        <div className="detail-row">
                            <span>Connection:</span>
                            <span className={isOnline ? 'status-online' : 'status-offline'}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span>Pending Changes:</span>
                            <span>{queueLength}</span>
                        </div>
                        {!isOnline && (
                            <p className="offline-message">
                                Your changes are saved locally and will sync when you're back online.
                            </p>
                        )}
                        {isOnline && queueLength > 0 && (
                            <p className="syncing-message">
                                Syncing your changes now...
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
