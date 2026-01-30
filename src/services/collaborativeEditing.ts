/**
 * Collaborative Editing Service
 * 
 * Manages concurrent editing indicators, locks, and conflict detection
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';

export interface EditSession {
    userId: string;
    itemId: string;
    itemType: 'epic' | 'story' | 'task';
    startTime: Date;
    lastActivity: Date;
    userName?: string;
}

export interface EditConflict {
    itemId: string;
    itemType: string;
    currentUser: string;
    otherUsers: string[];
    timestamp: Date;
}

export class CollaborativeEditingService {
    private activeSessions: Map<string, EditSession> = new Map();
    private locks: Map<string, string> = new Map(); // itemId -> userId
    private logger: Logger;
    private sessionTimeout: number = 5 * 60 * 1000; // 5 minutes
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(logger: Logger) {
        this.logger = logger;
        this.startCleanup();
    }

    /**
     * Start an edit session for an item
     */
    startEditSession(itemId: string, itemType: 'epic' | 'story' | 'task', userId: string, userName?: string): EditSession {
        const sessionKey = `${itemId}-${userId}`;
        const now = new Date();

        const session: EditSession = {
            userId,
            itemId,
            itemType,
            startTime: now,
            lastActivity: now,
            userName
        };

        this.activeSessions.set(sessionKey, session);
        this.logger.info('Edit session started', {
            component: 'CollaborativeEditing',
            itemId,
            userId,
            userName
        });

        return session;
    }

    /**
     * End an edit session
     */
    endEditSession(itemId: string, userId: string): void {
        const sessionKey = `${itemId}-${userId}`;
        this.activeSessions.delete(sessionKey);
        this.releaseLock(itemId, userId);

        this.logger.info('Edit session ended', {
            component: 'CollaborativeEditing',
            itemId,
            userId
        });
    }

    /**
     * Update activity timestamp for an edit session
     */
    updateActivity(itemId: string, userId: string): void {
        const sessionKey = `${itemId}-${userId}`;
        const session = this.activeSessions.get(sessionKey);

        if (session) {
            session.lastActivity = new Date();
        }
    }

    /**
     * Get all active sessions for an item
     */
    getActiveSessions(itemId: string): EditSession[] {
        const sessions: EditSession[] = [];

        for (const session of this.activeSessions.values()) {
            if (session.itemId === itemId) {
                sessions.push(session);
            }
        }

        return sessions;
    }

    /**
     * Check if an item has concurrent editors
     */
    hasMultipleEditors(itemId: string): boolean {
        return this.getActiveSessions(itemId).length > 1;
    }

    /**
     * Acquire a lock for an item
     */
    async acquireLock(itemId: string, userId: string): Promise<boolean> {
        const currentLock = this.locks.get(itemId);

        if (currentLock && currentLock !== userId) {
            this.logger.warn('Lock acquisition failed - already locked', {
                component: 'CollaborativeEditing',
                itemId,
                requestedBy: userId,
                lockedBy: currentLock
            });
            return false;
        }

        this.locks.set(itemId, userId);
        this.logger.info('Lock acquired', {
            component: 'CollaborativeEditing',
            itemId,
            userId
        });

        return true;
    }

    /**
     * Release a lock
     */
    releaseLock(itemId: string, userId: string): boolean {
        const currentLock = this.locks.get(itemId);

        if (currentLock !== userId) {
            this.logger.warn('Lock release failed - not owner', {
                component: 'CollaborativeEditing',
                itemId,
                userId,
                lockedBy: currentLock
            });
            return false;
        }

        this.locks.delete(itemId);
        this.logger.info('Lock released', {
            component: 'CollaborativeEditing',
            itemId,
            userId
        });

        return true;
    }

    /**
     * Check if an item is locked
     */
    isLocked(itemId: string): boolean {
        return this.locks.has(itemId);
    }

    /**
     * Get lock owner
     */
    getLockOwner(itemId: string): string | undefined {
        return this.locks.get(itemId);
    }

    /**
     * Detect editing conflicts
     */
    detectConflict(itemId: string, currentUserId: string): EditConflict | null {
        const sessions = this.getActiveSessions(itemId);
        const otherSessions = sessions.filter(s => s.userId !== currentUserId);

        if (otherSessions.length === 0) {
            return null;
        }

        return {
            itemId,
            itemType: sessions[0].itemType,
            currentUser: currentUserId,
            otherUsers: otherSessions.map(s => s.userName || s.userId),
            timestamp: new Date()
        };
    }

    /**
     * Show conflict warning to user
     */
    async showConflictWarning(conflict: EditConflict): Promise<'continue' | 'cancel' | 'view'> {
        const otherUsers = conflict.otherUsers.join(', ');
        const message = `${conflict.itemType} is being edited by ${otherUsers}. Concurrent edits may cause conflicts.`;

        const action = await vscode.window.showWarningMessage(
            message,
            'Continue Editing',
            'View Changes',
            'Cancel'
        );

        if (action === 'Continue Editing') {
            return 'continue';
        } else if (action === 'View Changes') {
            return 'view';
        } else {
            return 'cancel';
        }
    }

    /**
     * Get editing indicator for UI
     */
    getEditingIndicator(itemId: string): string | null {
        const sessions = this.getActiveSessions(itemId);

        if (sessions.length === 0) {
            return null;
        }

        if (sessions.length === 1) {
            return `✏️ ${sessions[0].userName || sessions[0].userId}`;
        }

        return `✏️ ${sessions.length} editors`;
    }

    /**
     * Cleanup stale sessions
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const staleKeys: string[] = [];

            for (const [key, session] of this.activeSessions) {
                const lastActivityTime = session.lastActivity.getTime();
                if (now - lastActivityTime > this.sessionTimeout) {
                    staleKeys.push(key);
                }
            }

            for (const key of staleKeys) {
                const session = this.activeSessions.get(key);
                if (session) {
                    this.logger.info('Cleaning up stale session', {
                        component: 'CollaborativeEditing',
                        itemId: session.itemId,
                        userId: session.userId
                    });
                    this.activeSessions.delete(key);
                    this.releaseLock(session.itemId, session.userId);
                }
            }
        }, 60 * 1000); // Run every minute
    }

    /**
     * Stop the service
     */
    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.activeSessions.clear();
        this.locks.clear();
    }

    /**
     * Get statistics
     */
    getStats(): {
        activeSessions: number;
        activeLocks: number;
        activeItems: number;
    } {
        const uniqueItems = new Set<string>();
        for (const session of this.activeSessions.values()) {
            uniqueItems.add(session.itemId);
        }

        return {
            activeSessions: this.activeSessions.size,
            activeLocks: this.locks.size,
            activeItems: uniqueItems.size
        };
    }
}
