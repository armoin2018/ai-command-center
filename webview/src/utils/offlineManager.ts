/**
 * Offline Manager
 * 
 * Handles offline data caching, sync queue, and reconnection logic
 */

import { TreeNodeData } from '../types/tree';
import { RemoteLogger } from './remoteLogger';

export interface SyncQueueItem {
    id: string;
    timestamp: number;
    action: 'create' | 'update' | 'delete';
    itemType: 'epic' | 'story' | 'task';
    itemId: string;
    data?: any;
    retries: number;
}

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    expiresAt?: number;
}

class OfflineManagerClass {
    private syncQueue: SyncQueueItem[] = [];
    private cache: Map<string, CacheEntry> = new Map();
    private isOnline: boolean = true;
    private listeners: Set<(online: boolean) => void> = new Set();
    private syncInProgress = false;
    private logger: RemoteLogger;

    constructor() {
        this.logger = new RemoteLogger();
        this.loadFromStorage();
        this.setupOnlineListener();
    }

    /**
     * Setup online/offline event listeners
     */
    private setupOnlineListener(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            this.logger.info('Connection restored');
            this.setOnlineStatus(true);
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            this.logger.warn('Connection lost');
            this.setOnlineStatus(false);
        });

        // Initialize online status
        this.isOnline = navigator.onLine;
    }

    /**
     * Set online status and notify listeners
     */
    private setOnlineStatus(online: boolean): void {
        if (this.isOnline === online) return;
        
        this.isOnline = online;
        this.listeners.forEach(listener => listener(online));
    }

    /**
     * Subscribe to online status changes
     */
    onStatusChange(callback: (online: boolean) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Get current online status
     */
    getOnlineStatus(): boolean {
        return this.isOnline;
    }

    /**
     * Add item to sync queue
     */
    addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): void {
        const queueItem: SyncQueueItem = {
            ...item,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            retries: 0
        };

        this.syncQueue.push(queueItem);
        this.saveToStorage();

        this.logger.debug(`Queued ${item.action} for ${item.itemType} ${item.itemId}`);

        // Try to process if online
        if (this.isOnline) {
            this.processQueue();
        }
    }

    /**
     * Process sync queue
     */
    async processQueue(): Promise<void> {
        if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
            return;
        }

        this.syncInProgress = true;
        this.logger.debug(`Processing sync queue (${this.syncQueue.length} items)`);

        const itemsToProcess = [...this.syncQueue];
        const failedItems: SyncQueueItem[] = [];

        for (const item of itemsToProcess) {
            try {
                await this.processSyncItem(item);
                this.logger.debug(`Synced ${item.action} for ${item.itemId}`);
                
                // Remove from queue
                this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
            } catch (error) {
                console.error(`❌ Failed to sync ${item.itemId}:`, error);
                
                item.retries++;
                if (item.retries < 3) {
                    failedItems.push(item);
                } else {
                    this.logger.warn(`Giving up on ${item.itemId} after 3 retries`);
                }
            }
        }

        // Update queue with failed items
        this.syncQueue = failedItems;
        this.saveToStorage();
        this.syncInProgress = false;

        if (this.syncQueue.length > 0) {
            this.logger.debug(`${this.syncQueue.length} items still in queue`);
        } else {
            this.logger.debug('Sync queue empty');
        }
    }

    /**
     * Process individual sync item
     */
    private async processSyncItem(item: SyncQueueItem): Promise<void> {
        // Simulate API call - in real implementation, this would call extension API
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random failures for testing
                if (Math.random() > 0.9) {
                    reject(new Error('Simulated network error'));
                } else {
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Get sync queue length
     */
    getQueueLength(): number {
        return this.syncQueue.length;
    }

    /**
     * Clear sync queue
     */
    clearQueue(): void {
        this.syncQueue = [];
        this.saveToStorage();
    }

    /**
     * Cache data with optional expiration
     */
    setCache<T>(key: string, data: T, ttlMs?: number): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: ttlMs ? Date.now() + ttlMs : undefined
        };

        this.cache.set(key, entry);
        this.saveCacheToStorage();
    }

    /**
     * Get cached data
     */
    getCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check expiration
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Check if cache has key
     */
    hasCache(key: string): boolean {
        return this.getCache(key) !== null;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        this.saveCacheToStorage();
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        this.cache.forEach((entry, key) => {
            if (entry.expiresAt && now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (keysToDelete.length > 0) {
            this.saveCacheToStorage();
            this.logger.debug(`Cleared ${keysToDelete.length} expired cache entries`);
        }
    }

    /**
     * Save sync queue to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem('offlineQueue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('Failed to save sync queue:', error);
        }
    }

    /**
     * Save cache to localStorage
     */
    private saveCacheToStorage(): void {
        try {
            const cacheObject = Object.fromEntries(this.cache);
            localStorage.setItem('offlineCache', JSON.stringify(cacheObject));
        } catch (error) {
            console.error('Failed to save cache:', error);
        }
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const queueData = localStorage.getItem('offlineQueue');
            if (queueData) {
                this.syncQueue = JSON.parse(queueData);
                this.logger.debug(`Loaded ${this.syncQueue.length} items from queue`);
            }

            const cacheData = localStorage.getItem('offlineCache');
            if (cacheData) {
                const cacheObject = JSON.parse(cacheData);
                this.cache = new Map(Object.entries(cacheObject));
                this.logger.debug(`Loaded ${this.cache.size} cache entries`);
                
                // Clear expired entries
                this.clearExpiredCache();
            }
        } catch (error) {
            console.error('Failed to load from storage:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { entries: number; size: number; oldest: number | null } {
        let oldest: number | null = null;
        let size = 0;

        this.cache.forEach(entry => {
            if (!oldest || entry.timestamp < oldest) {
                oldest = entry.timestamp;
            }
            size += JSON.stringify(entry.data).length;
        });

        return {
            entries: this.cache.size,
            size,
            oldest
        };
    }
}

export const OfflineManager = new OfflineManagerClass();

// Auto-cleanup expired cache every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        OfflineManager.clearExpiredCache();
    }, 5 * 60 * 1000);
}
