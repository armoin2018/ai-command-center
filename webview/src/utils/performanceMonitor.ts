/**
 * Performance Monitoring Utility
 * 
 * Tracks render performance, bundle metrics, and optimization opportunities
 */

export interface PerformanceMetric {
    title: string;
    duration: number;
    timestamp: number;
    type: 'render' | 'api' | 'computation' | 'interaction';
    metadata?: any;
}

export interface PerformanceReport {
    metrics: PerformanceMetric[];
    averages: Record<string, number>;
    warnings: string[];
    recommendations: string[];
}

class PerformanceMonitorClass {
    private metrics: PerformanceMetric[] = [];
    private maxMetrics = 200;
    private renderTimes: Map<string, number> = new Map();

    /**
     * Start measuring performance for a named operation
     */
    startMeasure(title: string, type: PerformanceMetric['type'] = 'computation'): void {
        if (typeof performance !== 'undefined') {
            performance.mark(`${title}-start`);
        }
        this.renderTimes.set(title, Date.now());
    }

    /**
     * End measuring and record the metric
     */
    endMeasure(title: string, type: PerformanceMetric['type'] = 'computation', metadata?: any): number {
        const startTime = this.renderTimes.get(title);
        if (!startTime) {
            console.warn(`No start time found for measure: ${title}`);
            return 0;
        }

        const duration = Date.now() - startTime;
        this.renderTimes.delete(title);

        // Try using Performance API if available
        if (typeof performance !== 'undefined' && performance.mark) {
            try {
                performance.mark(`${title}-end`);
                performance.measure(title, `${title}-start`, `${title}-end`);
            } catch (e) {
                // Marks might not exist, ignore
            }
        }

        this.addMetric({
            title,
            duration,
            timestamp: Date.now(),
            type,
            metadata
        });

        return duration;
    }

    /**
     * Add a metric directly
     */
    addMetric(metric: PerformanceMetric): void {
        this.metrics.push(metric);

        // Trim old metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }

        // Log slow operations
        if (metric.duration > 1000) {
            console.warn(`Slow operation detected: ${metric.title} took ${metric.duration}ms`);
        }
    }

    /**
     * Measure a function execution
     */
    async measureAsync<T>(
        title: string,
        fn: () => Promise<T>,
        type: PerformanceMetric['type'] = 'computation'
    ): Promise<T> {
        this.startMeasure(title, type);
        try {
            const result = await fn();
            this.endMeasure(title, type);
            return result;
        } catch (error) {
            this.endMeasure(title, type, { error: true });
            throw error;
        }
    }

    /**
     * Measure a synchronous function
     */
    measure<T>(
        title: string,
        fn: () => T,
        type: PerformanceMetric['type'] = 'computation'
    ): T {
        this.startMeasure(title, type);
        try {
            const result = fn();
            this.endMeasure(title, type);
            return result;
        } catch (error) {
            this.endMeasure(title, type, { error: true });
            throw error;
        }
    }

    /**
     * Get all metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    /**
     * Get metrics by type
     */
    getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
        return this.metrics.filter(m => m.type === type);
    }

    /**
     * Get metrics by name
     */
    getMetricsByName(title: string): PerformanceMetric[] {
        return this.metrics.filter(m => m.title === title);
    }

    /**
     * Calculate average duration for a metric name
     */
    getAverageDuration(title: string): number {
        const filtered = this.getMetricsByName(title);
        if (filtered.length === 0) return 0;

        const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
        return sum / filtered.length;
    }

    /**
     * Generate performance report
     */
    generateReport(): PerformanceReport {
        const warnings: string[] = [];
        const recommendations: string[] = [];
        const averages: Record<string, number> = {};

        // Calculate averages by name
        const uniqueNames = [...new Set(this.metrics.map(m => m.title))];
        uniqueNames.forEach(name => {
            averages[name] = this.getAverageDuration(name);

            // Check for slow operations
            if (averages[name] > 500) {
                warnings.push(`${name} is taking ${Math.round(averages[name])}ms on average (>500ms threshold)`);
                recommendations.push(`Consider optimizing ${name} - use React.memo, useMemo, or code splitting`);
            }
        });

        // Check render frequency
        const renderMetrics = this.getMetricsByType('render');
        if (renderMetrics.length > 100) {
            warnings.push(`High render frequency detected: ${renderMetrics.length} renders tracked`);
            recommendations.push('Consider using React.memo for pure components to reduce re-renders');
        }

        // Check API performance
        const apiMetrics = this.getMetricsByType('api');
        const slowApis = apiMetrics.filter(m => m.duration > 3000);
        if (slowApis.length > 0) {
            warnings.push(`${slowApis.length} slow API calls detected (>3s)`);
            recommendations.push('Implement caching and optimistic UI updates for API calls');
        }

        return {
            metrics: this.metrics,
            averages,
            warnings,
            recommendations
        };
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
        this.renderTimes.clear();
    }

    /**
     * Export metrics to JSON
     */
    export(): string {
        return JSON.stringify(this.generateReport(), null, 2);
    }

    /**
     * Log performance summary to console (debug mode only)
     * Use logger.debug() in production or enable explicitly for performance analysis
     */
    logSummary(): void {
        // Only log in development/debug mode
        if (process.env.NODE_ENV !== 'production') {
            const report = this.generateReport();
            
            console.group('📊 Performance Summary');
            console.log(`Total metrics: ${this.metrics.length}`);
            
            console.group('Averages by operation:');
            Object.entries(report.averages).forEach(([name, avg]) => {
                const color = avg > 500 ? 'color: red' : avg > 200 ? 'color: orange' : 'color: green';
                console.log(`%c${name}: ${Math.round(avg)}ms`, color);
            });
            console.groupEnd();

            if (report.warnings.length > 0) {
                console.group('⚠️ Warnings:');
                report.warnings.forEach(w => console.warn(w));
                console.groupEnd();
            }

            if (report.recommendations.length > 0) {
                console.group('💡 Recommendations:');
                report.recommendations.forEach(r => console.log(r));
                console.groupEnd();
            }

            console.groupEnd();
        }
    }

    /**
     * Get bundle size information (requires build metadata)
     */
    getBundleInfo(): { size: number; gzipSize?: number } | null {
        // This would need to be populated during build
        // For now, return null
        return null;
    }
}

export const PerformanceMonitor = new PerformanceMonitorClass();

// React hook for measuring component render performance
export function usePerformanceMonitor(componentName: string) {
    React.useEffect(() => {
        PerformanceMonitor.startMeasure(`${componentName}-render`, 'render');
        return () => {
            PerformanceMonitor.endMeasure(`${componentName}-render`, 'render');
        };
    });
}

// HOC for measuring component performance
export function withPerformanceMonitoring<P extends object>(
    Component: React.ComponentType<P>,
    componentName?: string
): React.ComponentType<P> {
    const name = componentName || Component.displayName || 'Component';
    
    return function PerformanceMonitoredComponent(props: P) {
        React.useEffect(() => {
            PerformanceMonitor.startMeasure(`${name}-render`, 'render');
            return () => {
                PerformanceMonitor.endMeasure(`${name}-render`, 'render');
            };
        });

        return React.createElement(Component, props);
    };
}

// Import React for hooks
import * as React from 'react';
