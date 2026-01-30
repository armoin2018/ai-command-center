/**
 * Sprint Planning System
 * 
 * Manages sprints, capacity planning, and velocity tracking
 */

import { TreeNodeData } from '../types/tree';

export interface Sprint {
    id: string;
    title: string;
    goal: string;
    startDate: Date;
    endDate: Date;
    status: 'planning' | 'active' | 'done' | 'cancelled';
    capacity: number; // Story points capacity
    committed: number; // Story points committed
    completed: number; // Story points completed
    items: string[]; // IDs of items in sprint
    teamVelocity?: number;
    notes?: string;
}

export interface VelocityData {
    sprintId: string;
    sprintName: string;
    planned: number;
    completed: number;
    date: Date;
}

export interface BurndownData {
    date: Date;
    remainingPoints: number;
    idealRemaining: number;
}

class SprintManagerClass {
    private sprints: Map<string, Sprint> = new Map();
    private velocityHistory: VelocityData[] = [];

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Create new sprint
     */
    createSprint(sprint: Omit<Sprint, 'id' | 'committed' | 'done' | 'items'>): Sprint {
        const newSprint: Sprint = {
            ...sprint,
            id: `sprint-${Date.now()}`,
            committed: 0,
            completed: 0,
            items: []
        };

        this.sprints.set(newSprint.id, newSprint);
        this.saveToStorage();
        
        return newSprint;
    }

    /**
     * Update sprint
     */
    updateSprint(id: string, updates: Partial<Sprint>): Sprint | null {
        const sprint = this.sprints.get(id);
        if (!sprint) return null;

        const updated = { ...sprint, ...updates };
        this.sprints.set(id, updated);
        this.saveToStorage();
        
        return updated;
    }

    /**
     * Get sprint by ID
     */
    getSprint(id: string): Sprint | null {
        return this.sprints.get(id) || null;
    }

    /**
     * Get all sprints
     */
    getAllSprints(): Sprint[] {
        return Array.from(this.sprints.values()).sort((a, b) => 
            b.startDate.getTime() - a.startDate.getTime()
        );
    }

    /**
     * Get sprints by status
     */
    getSprintsByStatus(status: Sprint['status']): Sprint[] {
        return this.getAllSprints().filter(s => s.status === status);
    }

    /**
     * Get active sprint
     */
    getActiveSprint(): Sprint | null {
        const active = this.getSprintsByStatus('active');
        return active.length > 0 ? active[0] : null;
    }

    /**
     * Delete sprint
     */
    deleteSprint(id: string): boolean {
        const deleted = this.sprints.delete(id);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }

    /**
     * Add item to sprint
     */
    addItemToSprint(sprintId: string, itemId: string, estimatedHours: number = 0): boolean {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) return false;

        if (!sprint.items.includes(itemId)) {
            sprint.items.push(itemId);
            sprint.committed += estimatedHours;
            this.saveToStorage();
        }
        
        return true;
    }

    /**
     * Remove item from sprint
     */
    removeItemFromSprint(sprintId: string, itemId: string, estimatedHours: number = 0): boolean {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) return false;

        const index = sprint.items.indexOf(itemId);
        if (index > -1) {
            sprint.items.splice(index, 1);
            sprint.committed -= estimatedHours;
            this.saveToStorage();
            return true;
        }
        
        return false;
    }

    /**
     * Complete sprint
     */
    completeSprint(sprintId: string, completedPoints: number): void {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) return;

        sprint.status = 'done';
        sprint.completed = completedPoints;

        // Add to velocity history
        this.velocityHistory.push({
            sprintId: sprint.id,
            sprintName: sprint.title,
            planned: sprint.committed,
            completed: completedPoints,
            date: sprint.endDate
        });

        this.saveToStorage();
    }

    /**
     * Calculate team velocity (average completed points from last N sprints)
     */
    calculateVelocity(lastNSprints: number = 3): number {
        const completedSprints = this.getSprintsByStatus('done');
        const recent = completedSprints.slice(0, lastNSprints);
        
        if (recent.length === 0) return 0;

        const total = recent.reduce((sum, sprint) => sum + sprint.completed, 0);
        return Math.round(total / recent.length);
    }

    /**
     * Get velocity history
     */
    getVelocityHistory(): VelocityData[] {
        return [...this.velocityHistory].sort((a, b) => 
            a.date.getTime() - b.date.getTime()
        );
    }

    /**
     * Generate burndown data for a sprint
     */
    generateBurndownData(sprintId: string, tree: TreeNodeData[]): BurndownData[] {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) return [];

        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        const burndown: BurndownData[] = [];
        const pointsPerDay = sprint.committed / totalDays;

        // Calculate actual progress by day
        for (let day = 0; day <= totalDays; day++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + day);

            // Ideal remaining points
            const idealRemaining = Math.max(0, sprint.committed - (pointsPerDay * day));

            // For actual, we'd need item completion dates - simplified for now
            // In real implementation, track daily completion
            const remainingPoints = sprint.committed - (sprint.completed * (day / totalDays));

            burndown.push({
                date: currentDate,
                remainingPoints: Math.max(0, Math.round(remainingPoints)),
                idealRemaining: Math.round(idealRemaining)
            });
        }

        return burndown;
    }

    /**
     * Get sprint statistics
     */
    getSprintStats(sprintId: string): {
        capacity: number;
        committed: number;
        completed: number;
        remaining: number;
        completionRate: number;
        daysRemaining: number;
        velocity: number;
    } | null {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) return null;

        const now = new Date();
        const end = new Date(sprint.endDate);
        const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return {
            capacity: sprint.capacity,
            committed: sprint.committed,
            completed: sprint.completed,
            remaining: sprint.committed - sprint.completed,
            completionRate: sprint.committed > 0 ? (sprint.completed / sprint.committed) * 100 : 0,
            daysRemaining,
            velocity: this.calculateVelocity()
        };
    }

    /**
     * Get sprint health status
     */
    getSprintHealth(sprintId: string): 'on-track' | 'at-risk' | 'behind' | 'unknown' {
        const stats = this.getSprintStats(sprintId);
        if (!stats) return 'unknown';

        const sprint = this.sprints.get(sprintId);
        if (!sprint) return 'unknown';

        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        const now = new Date();
        
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const percentElapsed = (elapsed / totalDuration) * 100;

        // Expected completion should match time elapsed
        const expectedCompletion = (percentElapsed / 100) * sprint.committed;
        const actualCompletion = sprint.completed;

        if (actualCompletion >= expectedCompletion * 0.9) {
            return 'on-track';
        } else if (actualCompletion >= expectedCompletion * 0.7) {
            return 'at-risk';
        } else {
            return 'behind';
        }
    }

    /**
     * Save to localStorage
     */
    private saveToStorage(): void {
        try {
            const sprintsData = Array.from(this.sprints.entries()).map(([id, sprint]) => [
                id,
                {
                    ...sprint,
                    startDate: sprint.startDate.toISOString(),
                    endDate: sprint.endDate.toISOString()
                }
            ]);
            localStorage.setItem('sprints', JSON.stringify(sprintsData));
            localStorage.setItem('velocityHistory', JSON.stringify(this.velocityHistory));
        } catch (error) {
            console.error('Failed to save sprints:', error);
        }
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const sprintsData = localStorage.getItem('sprints');
            if (sprintsData) {
                const entries = JSON.parse(sprintsData);
                this.sprints = new Map(entries.map(([id, sprint]: [string, any]) => [
                    id,
                    {
                        ...sprint,
                        startDate: new Date(sprint.startDate),
                        endDate: new Date(sprint.endDate)
                    }
                ]));
            }

            const velocityData = localStorage.getItem('velocityHistory');
            if (velocityData) {
                this.velocityHistory = JSON.parse(velocityData).map((v: any) => ({
                    ...v,
                    date: new Date(v.date)
                }));
            }
        } catch (error) {
            console.error('Failed to load sprints:', error);
        }
    }

    /**
     * Export sprints
     */
    export(): string {
        return JSON.stringify({
            sprints: this.getAllSprints(),
            velocityHistory: this.velocityHistory
        }, null, 2);
    }

    /**
     * Import sprints
     */
    import(json: string): { success: boolean; error?: string } {
        try {
            const data = JSON.parse(json);
            
            if (data.sprints) {
                data.sprints.forEach((sprint: any) => {
                    this.sprints.set(sprint.id, {
                        ...sprint,
                        startDate: new Date(sprint.startDate),
                        endDate: new Date(sprint.endDate)
                    });
                });
            }

            if (data.velocityHistory) {
                this.velocityHistory = data.velocityHistory.map((v: any) => ({
                    ...v,
                    date: new Date(v.date)
                }));
            }

            this.saveToStorage();
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}

export const SprintManager = new SprintManagerClass();
