import { IStory, StoryStatus, Priority, IComment, ItemType, IItemLink } from '../types';

/**
 * Story entity class with methods for creation, validation, and persistence.
 */
export class Story implements IStory {
    public id: string;
    public type: ItemType;
    public title: string;
    public status: StoryStatus;
    public description: string;
    public estimatedHours?: number;
    public actualHours?: number;
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
    public createdOn: string;
    public lastUpdatedOn: string;
    public deliverByDate?: string | null;
    public deliveredOn?: string | null;
    public dependencies?: string[];

    constructor(data: Partial<IStory>) {
        this.id = data.id || '';
        this.type = ItemType.Story;
        this.epicId = data.epicId;
        this.title = data.title || '';
        this.description = data.description || '';
        this.status = data.status || StoryStatus.Todo;
        this.estimatedHours = data.estimatedHours;
        this.actualHours = data.actualHours;
        this.assignee = data.assignee;
        this.order = data.order || 0;
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

    public static generateSlug(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    public getDirectoryName(): string {
        const slug = Story.generateSlug(this.title);
        return `${this.id}-${slug}`;
    }

    public getFilePath(epicPath: string): string {
        return `${epicPath}/${this.getDirectoryName()}/README.md`;
    }

    public validate(): string[] {
        const errors: string[] = [];

        if (!this.title || this.title.trim().length === 0) {
            errors.push('Story title is required');
        }

        if (this.title && this.title.length > 100) {
            errors.push('Story title must be ≤100 characters');
        }

        if (!this.id || !/^ARMOIN-\d{3}$/.test(this.id)) {
            errors.push('Story ID must match pattern ARMOIN-XXX');
        }

        return errors;
    }

    public toJSON(): IStory {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            status: this.status,
            description: this.description,
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

    public static fromJSON(json: any): Story {
        return new Story({
            ...json,
            status: json.status as StoryStatus,
            priority: json.priority as Priority
        });
    }

    public update(updates: Partial<IStory>): void {
        Object.assign(this, updates);
        this.lastUpdatedOn = new Date().toISOString();
    }
}
