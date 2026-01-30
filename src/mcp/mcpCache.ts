/**
 * MCP Server Cache Utility
 * Implements response caching for frequently accessed resources
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

export class MCPCache {
    private cache: Map<string, CacheEntry<any>>;
    private defaultTTL: number;
    private maxSize: number;

    constructor(defaultTTL: number = 5000, maxSize: number = 100) {
        this.cache = new Map();
        this.defaultTTL = defaultTTL; // 5 seconds default
        this.maxSize = maxSize;
    }

    /**
     * Get cached value if valid
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cache value with optional TTL
     */
    set<T>(key: string, data: T, ttl?: number): void {
        // Enforce max size by removing oldest entries
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        });
    }

    /**
     * Invalidate specific cache key
     */
    invalidate(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalidate cache keys matching pattern
     */
    invalidatePattern(pattern: RegExp): void {
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Remove expired entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache key for resource
     */
    static resourceKey(uri: string): string {
        return `resource:${uri}`;
    }

    /**
     * Get cache key for tool call
     */
    static toolKey(name: string, args: any): string {
        return `tool:${name}:${JSON.stringify(args)}`;
    }

    /**
     * Get cache key for search query
     */
    static searchKey(query: string, filters?: any): string {
        return `search:${query}:${JSON.stringify(filters || {})}`;
    }
}

/**
 * Request batching utility
 * Combines multiple requests into a single operation
 */
export class RequestBatcher {
    private pending: Map<string, Array<{
        resolve: (value: any) => void;
        reject: (error: Error) => void;
    }>>;
    private timers: Map<string, NodeJS.Timeout>;
    private batchDelay: number;

    constructor(batchDelay: number = 50) {
        this.pending = new Map();
        this.timers = new Map();
        this.batchDelay = batchDelay; // 50ms delay to collect requests
    }

    /**
     * Add request to batch
     */
    batch<T>(key: string, executor: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            // Add to pending requests
            if (!this.pending.has(key)) {
                this.pending.set(key, []);
            }
            
            this.pending.get(key)!.push({ resolve, reject });

            // Cancel existing timer
            const existingTimer = this.timers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            // Set new timer to execute batch
            const timer = setTimeout(async () => {
                const callbacks = this.pending.get(key);
                this.pending.delete(key);
                this.timers.delete(key);

                if (!callbacks || callbacks.length === 0) {
                    return;
                }

                try {
                    // Execute the operation once for all pending requests
                    const result = await executor();
                    
                    // Resolve all pending promises
                    callbacks.forEach(cb => cb.resolve(result));
                } catch (error) {
                    // Reject all pending promises
                    callbacks.forEach(cb => cb.reject(error as Error));
                }
            }, this.batchDelay);

            this.timers.set(key, timer);
        });
    }

    /**
     * Clear all pending batches
     */
    clear(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.pending.clear();
    }
}
