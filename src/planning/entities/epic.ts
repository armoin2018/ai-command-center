import { IEpic, EpicStatus, Priority, IComment, ItemType, IItemLink } from '../types';

/**
 * Epic entity class with methods for creation, validation, and persistence.
 */
export class Epic implements IEpic {
    public id: string;
    public type: ItemType;
    public title: string;
    public status: EpicStatus;
    public description: string;
    public workingDetails?: string;
    public estimatedHours?: number;
    public actualHours?: number;
    public assignee?: string;
    public order: number;
    public epicId: null;
    public gitRepoUrl?: string | null;
    public gitRepoBranch?: string | null;
    public assignedAgent?: string | null;
    public instructions?: string[];
    public personas?: string[];
    public acceptanceCriteria?: string[];
    public comments?: IComment[];
    public tags?: string[];
    public links?: IItemLink[];
    public priority?: Priority;
    public createdOn: string;
    public lastUpdatedOn: string;
    public deliverByDate?: string | null;
    public deliveredOn?: string | null;
    public dependencies?: string[];

    constructor(data: Partial<IEpic>) {
        this.id = data.id || '';
        this.type = ItemType.Epic;
        this.title = data.title || '';
        this.description = data.description || '';
        this.status = data.status || EpicStatus.Todo;
        this.workingDetails = data.workingDetails;
        this.estimatedHours = data.estimatedHours;
        this.actualHours = data.actualHours;
        this.assignee = data.assignee;
        this.order = data.order || 0;
        this.epicId = null;
        this.gitRepoUrl = data.gitRepoUrl;
        this.gitRepoBranch = data.gitRepoBranch;
        this.assignedAgent = data.assignedAgent;
        this.instructions = data.instructions || [];
        this.personas = data.personas || [];
        this.acceptanceCriteria = data.acceptanceCriteria || [];
        this.comments = data.comments || [];
        this.tags = data.tags || [];
        this.links = data.links || [];
        this.priority = data.priority || Priority.Medium;
        this.createdOn = data.createdOn || new Date().toISOString();
        this.lastUpdatedOn = data.lastUpdatedOn || new Date().toISOString();
        this.deliverByDate = data.deliverByDate || null;
        this.deliveredOn = data.deliveredOn || null;
        this.dependencies = data.dependencies || [];
    }

    /**
     * Generate slug from epic title.
     * "User Authentication" → "user-authentication"
     */
    public static generateSlug(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-')          // Spaces to hyphens
            .replace(/-+/g, '-');          // Collapse hyphens
    }

    /**
     * Generate directory path for epic.
     * ARMOIN-001, "User Auth" → "ARMOIN-001-user-auth"
     */
    public getDirectoryName(): string {
        const slug = Epic.generateSlug(this.title);
        return `${this.id}-${slug}`;
    }

    /**
     * Get file path for epic README.
     */
    public getFilePath(basePath: string): string {
        return `${basePath}/${this.getDirectoryName()}/README.md`;
    }

    /**
     * Validate epic data.
     * @returns Array of validation error messages (empty if valid)
     */
    public validate(): string[] {
        const errors: string[] = [];

        if (!this.title || this.title.trim().length === 0) {
            errors.push('Epic title is required');
        }

        if (this.title && this.title.length > 100) {
            errors.push('Epic title must be ≤100 characters');
        }

        if (!Object.values(EpicStatus).includes(this.status)) {
            errors.push(`Invalid status: ${this.status}`);
        }

        if (this.priority && !Object.values(Priority).includes(this.priority)) {
            errors.push(`Invalid priority: ${this.priority}`);
        }

        if (!this.id || !/^ARMOIN-\d{3}$/.test(this.id)) {
            errors.push('Epic ID must match pattern ARMOIN-XXX');
        }

        return errors;
    }

    /**
     * Convert to JSON-serializable object.
     */
    public toJSON(): IEpic {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            status: this.status,
            description: this.description,
            workingDetails: this.workingDetails,
            estimatedHours: this.estimatedHours,
            actualHours: this.actualHours,
            assignee: this.assignee,
            order: this.order,
            epicId: this.epicId,
            gitRepoUrl: this.gitRepoUrl,
            gitRepoBranch: this.gitRepoBranch,
            assignedAgent: this.assignedAgent,
            instructions: this.instructions,
            personas: this.personas,
            acceptanceCriteria: this.acceptanceCriteria,
            comments: this.comments,
            tags: this.tags,
            links: this.links,
            priority: this.priority,
            createdOn: this.createdOn,
            lastUpdatedOn: this.lastUpdatedOn,
            deliverByDate: this.deliverByDate,
            deliveredOn: this.deliveredOn,
            dependencies: this.dependencies
        };
    }

    /**
     * Create Epic from JSON object.
     */
    public static fromJSON(json: any): Epic {
        return new Epic({
            ...json,
            status: json.status as EpicStatus,
            priority: json.priority as Priority
        });
    }

    /**
     * Update epic properties and timestamp.
     */
    public update(updates: Partial<IEpic>): void {
        Object.assign(this, updates);
        this.lastUpdatedOn = new Date().toISOString();
    }
}
