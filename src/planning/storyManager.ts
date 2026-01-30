import * as path from 'path';
import * as fs from 'fs/promises';
import { Story } from './entities/story';
import { StoryStatus, Priority } from './types';
import { IdGenerator } from './utils/idGenerator';
import { Logger } from '../logger';
import { ConfigManager } from '../configManager';
import { ErrorHandler } from '../errorHandler';
import { UserError } from '../errors/customErrors';

/**
 * Story Manager - Handles CRUD operations for Story entities.
 */
export class StoryManager {
    private planPath: string;
    private logger: Logger;

    constructor(workspaceRoot: string, logger: Logger) {
        this.logger = logger;
        const config = ConfigManager.getInstance().getConfig();
        this.planPath = path.join(workspaceRoot, config.planning.planPath);
    }

    /**
     * Create new Story with file system persistence.
     */
    public async createStory(epicId: string, data: {
        title: string;
        description: string;
        storyPoints?: number;
        sprint?: string;
        priority?: Priority;
    }): Promise<Story> {
        const startTime = performance.now();

        try {
            // Get existing Story IDs
            const existingIds = await this.getExistingStoryIds(epicId);
            
            // Generate new ID
            const id = IdGenerator.generateStoryId(existingIds);

            // Create Story entity
            const story = new Story({
                id,
                epicId,
                title: data.title,
                description: data.description,
                status: StoryStatus.Todo,
                priority: data.priority || Priority.Medium
            });

            // Validate
            const errors = story.validate();
            if (errors.length > 0) {
                throw new UserError(`Story validation failed: ${errors.join(', ')}`);
            }

            // Get epic directory
            const epicDir = await this.findEpicDirectory(epicId);
            if (!epicDir) {
                throw new UserError(`Epic ${epicId} not found`);
            }

            // Create story directory
            const storyDir = path.join(this.planPath, 'epics', epicDir, story.getDirectoryName());
            await fs.mkdir(storyDir, { recursive: true });

            // Write README.md
            const readmePath = path.join(storyDir, 'README.md');
            const readmeContent = this.generateStoryReadme(story);
            await fs.writeFile(readmePath, readmeContent, 'utf8');

            const duration = performance.now() - startTime;
            this.logger.info('Story created', {
                component: 'StoryManager',
                storyId: story.id,
                storyName: story.title,
                epicId,
                duration
            });

            return story;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'StoryManager.createStory'
            );
            throw error;
        }
    }

    /**
     * Read Story from file system.
     */
    public async readStory(epicId: string, storyId: string): Promise<Story | null> {
        try {
            const epicDir = await this.findEpicDirectory(epicId);
            if (!epicDir) {
                return null;
            }

            const storyDirs = await this.getStoryDirectories(epicId);
            const storyDir = storyDirs.find(dir => dir.startsWith(storyId));

            if (!storyDir) {
                this.logger.warn('Story not found', { component: 'StoryManager', storyId });
                return null;
            }

            const readmePath = path.join(this.planPath, 'epics', epicDir, storyDir, 'README.md');
            const content = await fs.readFile(readmePath, 'utf8');

            const story = this.parseStoryReadme(content, storyId, epicId);
            
            this.logger.debug('Story read', { component: 'StoryManager', storyId });
            
            return story;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'StoryManager.readStory'
            );
            return null;
        }
    }

    /**
     * Update existing Story.
     */
    public async updateStory(epicId: string, storyId: string, updates: Partial<Story>): Promise<Story | null> {
        try {
            const existingStory = await this.readStory(epicId, storyId);
            if (!existingStory) {
                throw new UserError(`Story ${storyId} not found`);
            }

            const updatedStory = new Story({
                ...existingStory.toJSON(),
                ...updates,
                id: storyId,
                epicId
            });

            const errors = updatedStory.validate();
            if (errors.length > 0) {
                throw new UserError(`Story validation failed: ${errors.join(', ')}`);
            }

            const epicDir = await this.findEpicDirectory(epicId);
            if (!epicDir) {
                throw new UserError(`Epic ${epicId} not found`);
            }

            if (updates.title && updates.title !== existingStory.title) {
                await this.renameStoryDirectory(epicDir, existingStory, updatedStory);
            }

            const storyDir = path.join(this.planPath, 'epics', epicDir, updatedStory.getDirectoryName());
            const readmePath = path.join(storyDir, 'README.md');
            const readmeContent = this.generateStoryReadme(updatedStory);
            await fs.writeFile(readmePath, readmeContent, 'utf8');

            this.logger.info('Story updated', {
                component: 'StoryManager',
                storyId,
                changes: Object.keys(updates)
            });

            return updatedStory;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'StoryManager.updateStory'
            );
            throw error;
        }
    }

    /**
     * Delete Story and all children recursively.
     */
    public async deleteStory(epicId: string, storyId: string): Promise<boolean> {
        try {
            const epicDir = await this.findEpicDirectory(epicId);
            if (!epicDir) {
                return false;
            }

            const storyDirs = await this.getStoryDirectories(epicId);
            const storyDir = storyDirs.find(dir => dir.startsWith(storyId));

            if (!storyDir) {
                this.logger.warn('Story not found for deletion', { component: 'StoryManager', storyId });
                return false;
            }

            const storyPath = path.join(this.planPath, 'epics', epicDir, storyDir);
            await fs.rm(storyPath, { recursive: true, force: true });

            this.logger.info('Story deleted', { component: 'StoryManager', storyId });
            
            return true;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'StoryManager.deleteStory'
            );
            throw error;
        }
    }

    /**
     * List all Stories in an Epic.
     */
    public async listStories(epicId: string): Promise<Story[]> {
        try {
            const storyDirs = await this.getStoryDirectories(epicId);
            const stories: Story[] = [];

            for (const dir of storyDirs) {
                const storyId = dir.split('-').slice(0, 2).join('-');
                const story = await this.readStory(epicId, storyId);
                if (story) {
                    stories.push(story);
                }
            }

            this.logger.debug('Stories listed', { component: 'StoryManager', epicId, count: stories.length });
            return stories;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'StoryManager.listStories'
            );
            return [];
        }
    }

    // ========== PRIVATE HELPER METHODS ==========

    private async findEpicDirectory(epicId: string): Promise<string | null> {
        try {
            const epicsPath = path.join(this.planPath, 'epics');
            const entries = await fs.readdir(epicsPath, { withFileTypes: true });
            const epicDir = entries
                .filter(entry => entry.isDirectory())
                .find(entry => entry.name.startsWith(epicId));
            return epicDir ? epicDir.name : null;
        } catch {
            return null;
        }
    }

    private async getExistingStoryIds(epicId: string): Promise<string[]> {
        try {
            const storyDirs = await this.getStoryDirectories(epicId);
            return storyDirs.map(dir => dir.split('-').slice(0, 2).join('-'));
        } catch {
            return [];
        }
    }

    private async getStoryDirectories(epicId: string): Promise<string[]> {
        try {
            const epicDir = await this.findEpicDirectory(epicId);
            if (!epicDir) {
                return [];
            }

            const epicPath = path.join(this.planPath, 'epics', epicDir);
            const entries = await fs.readdir(epicPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory() && entry.name.startsWith('story-'))
                .map(entry => entry.name);
        } catch {
            return [];
        }
    }

    private async renameStoryDirectory(epicDir: string, oldStory: Story, newStory: Story): Promise<void> {
        const oldPath = path.join(this.planPath, 'epics', epicDir, oldStory.getDirectoryName());
        const newPath = path.join(this.planPath, 'epics', epicDir, newStory.getDirectoryName());
        await fs.rename(oldPath, newPath);
    }

    private generateStoryReadme(story: Story): string {
        return `# ${story.title}

**Story ID**: ${story.id}  
**Epic ID**: ${story.epicId}  
**Status**: ${story.status}  
**Priority**: ${story.priority}

---

## Description

${story.description}

---

## Tags

${story.tags && story.tags.length > 0 ? story.tags.map(t => `- ${t}`).join('\n') : '- No tags'}

---

## Dependencies

${story.dependencies && story.dependencies.length > 0 ? story.dependencies.map(d => `- ${d}`).join('\n') : '- No dependencies'}
`;
    }

    private parseStoryReadme(content: string, storyId: string, epicId: string): Story {
        const nameMatch = content.match(/^# (.+)$/m);
        const statusMatch = content.match(/\*\*Status\*\*: (.+)$/m);
        const priorityMatch = content.match(/\*\*Priority\*\*: (.+)$/m);
        const descMatch = content.match(/## Description\s+(.+?)(?=\n##|\n-|$)/s);

        return new Story({
            id: storyId,
            epicId,
            title: nameMatch ? nameMatch[1] : 'Unknown',
            description: descMatch ? descMatch[1].trim() : '',
            status: (statusMatch ? statusMatch[1] : 'todo') as StoryStatus,
            priority: (priorityMatch ? priorityMatch[1] : 'medium') as Priority
        });
    }
}
