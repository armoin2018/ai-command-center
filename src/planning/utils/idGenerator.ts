/**
 * ID generator for planning entities (Epic, Story, Task).
 */

export class IdGenerator {
    /**
     * Generate next Epic ID from existing IDs.
     * epic-001, epic-002, etc.
     */
    public static generateEpicId(existingIds: string[]): string {
        const numbers = existingIds
            .filter(id => /^epic-\d{3}$/.test(id))
            .map(id => parseInt(id.split('-')[1], 10))
            .filter(n => !isNaN(n));

        const nextNumber = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
        return `epic-${String(nextNumber).padStart(3, '0')}`;
    }

    /**
     * Generate next Story ID from existing IDs.
     * story-001, story-002, etc.
     */
    public static generateStoryId(existingIds: string[]): string {
        const numbers = existingIds
            .filter(id => /^story-\d{3}$/.test(id))
            .map(id => parseInt(id.split('-')[1], 10))
            .filter(n => !isNaN(n));

        const nextNumber = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
        return `story-${String(nextNumber).padStart(3, '0')}`;
    }

    /**
     * Generate next Task ID from existing IDs.
     * task-001, task-002, etc.
     */
    public static generateTaskId(existingIds: string[]): string {
        const numbers = existingIds
            .filter(id => /^task-\d{3}$/.test(id))
            .map(id => parseInt(id.split('-')[1], 10))
            .filter(n => !isNaN(n));

        const nextNumber = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
        return `task-${String(nextNumber).padStart(3, '0')}`;
    }
}
