/**
 * Utility for tracking performance metrics during extension activation and operations.
 * Measures phase-level timing and provides detailed performance breakdown.
 * 
 * Note: console.log is used intentionally here for development performance tracking.
 * These logs help measure activation time and identify bottlenecks during development.
 */
/* eslint-disable no-console */
export class PerformanceTracker {
    private startTime: number;
    private phases: Map<string, number> = new Map();
    private phaseStartTime: number;
    private debugMode: boolean;

    constructor(private name: string, debugMode: boolean = false) {
        this.startTime = performance.now();
        this.phaseStartTime = this.startTime;
        this.debugMode = debugMode;
        
        if (this.debugMode) {
            console.log(`${this.name}: Started`);
        }
    }

    /**
     * Mark the end of a phase and log its duration.
     * Measures time since last markPhase() call.
     * 
     * @param phaseName - Name of the phase that just completed
     */
    markPhase(phaseName: string): void {
        const now = performance.now();
        const phaseDuration = now - this.phaseStartTime;
        const totalDuration = now - this.startTime;
        
        this.phases.set(phaseName, phaseDuration);
        
        if (this.debugMode) {
            console.log(`  - ${phaseName}: ${phaseDuration.toFixed(2)}ms (total: ${totalDuration.toFixed(2)}ms)`);
        }
        
        this.phaseStartTime = now;
    }

    /**
     * Complete tracking and log total duration with phase breakdown.
     * 
     * @param threshold - Optional performance threshold in ms (default: 500ms)
     * @returns Total duration in milliseconds
     */
    complete(threshold: number = 500): number {
        const totalDuration = performance.now() - this.startTime;
        
        if (this.debugMode) {
            console.log(`${this.name}: Completed in ${totalDuration.toFixed(2)}ms`);

            // Log phase breakdown
            if (this.phases.size > 0) {
                console.log(`${this.name}: Phase breakdown:`);
                this.phases.forEach((duration, phase) => {
                    const percentage = ((duration / totalDuration) * 100).toFixed(1);
                    console.log(`  - ${phase}: ${duration.toFixed(2)}ms (${percentage}%)`);
                });
            }

            // Warn if exceeds threshold
            if (totalDuration > threshold) {
                console.warn(
                    `⚠️ ${this.name} time (${totalDuration.toFixed(2)}ms) exceeds threshold (${threshold}ms)`
                );
            }
        }

        return totalDuration;
    }

    /**
     * Get all phase timings.
     * @returns Map of phase names to durations in milliseconds
     */
    getPhases(): Map<string, number> {
        return new Map(this.phases);
    }

    /**
     * Get total elapsed time so far without completing.
     * @returns Current elapsed time in milliseconds
     */
    getElapsedTime(): number {
        return performance.now() - this.startTime;
    }
}
