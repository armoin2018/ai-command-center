import { IBug, TaskStatus, Priority, IComment, ItemType, IItemLink } from '../types';
import { getIdPattern, getIdFormatDescription } from '../../utils/idPrefix';

/**
 * Bug entity class with methods for creation, validation, and persistence.
 */
export class Bug implements IBug {
    public id: string;
    public type: ItemType;
    public title: string;
    public status: TaskStatus;
    public description: string;
    public assignee?: string;
    public order: number;
    public epicId?: string | null;
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
    public estimatedHours?: number;
    public actualHours?: number;
    public createdOn: string;
    public lastUpdatedOn: string;
    public deliverByDate?: string | null;
    public deliveredOn?: string | null;
    public dependencies?: string[];

    constructor(data: Partial<IBug>) {
        this.id = data.id || '';
        this.type = ItemType.Bug;
        this.title = data.title || '';
        this.description = data.description || '';
        this.status = data.status || TaskStatus.Todo;
        this.assignee = data.assignee;
        this.order = data.order || 0;
        this.epicId = data.epicId;
        this.gitRepoUrl = data.gitRepoUrl;
        this.gitRepoBranch = data.gitRepoBranch;
        this.assignedAgent = data.assignedAgent;
        this.instructions = data.instructions || [];
        this.personas = data.personas || [];
        this.acceptanceCriteria = data.acceptanceCriteria || [];
        this.comments = data.comments || [];
        this.tags = data.tags || [];
        this.links = data.links || [];
        this.priority = data.priority || Priority.High; // Bugs default to high priority
        this.estimatedHours = data.estimatedHours;
        this.actualHours = data.actualHours;
        this.createdOn = data.createdOn || new Date().toISOString();
        this.lastUpdatedOn = data.lastUpdatedOn || new Date().toISOString();
        this.deliverByDate = data.deliverByDate || null;
        this.deliveredOn = data.deliveredOn || null;
        this.dependencies = data.dependencies || [];
    }

    public static generateSlug(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    public getFileName(): string {
        const slug = Bug.generateSlug(this.title);
        return `${this.id}-${slug}.md`;
    }

    public getFilePath(basePath: string): string {
        return `${basePath}/bugs/${this.getFileName()}`;
    }

    public validate(): string[] {
        const errors: string[] = [];

        if (!this.title || this.title.trim().length === 0) {
            errors.push('Bug title is required');
        }

        if (this.title && this.title.length > 100) {
            errors.push('Bug title must be ≤100 characters');
        }

        if (!this.id || !getIdPattern().test(this.id)) {
            errors.push(`Bug ID must match pattern ${getIdFormatDescription()}`);
        }

        if (!this.description || this.description.trim().length === 0) {
            errors.push('Bug description (repro steps) is required');
        }

        return errors;
    }

    public toJSON(): IBug {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            status: this.status,
            description: this.description,
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
            estimatedHours: this.estimatedHours,
            actualHours: this.actualHours,
            createdOn: this.createdOn,
            lastUpdatedOn: this.lastUpdatedOn,
            deliverByDate: this.deliverByDate,
            deliveredOn: this.deliveredOn,
            dependencies: this.dependencies
        };
    }

    public static fromJSON(json: any): Bug {
        return new Bug({
            ...json,
            status: json.status as TaskStatus,
            priority: json.priority as Priority
        });
    }

    public update(updates: Partial<IBug>): void {
        Object.assign(this, updates);
        this.lastUpdatedOn = new Date().toISOString();
    }
}
