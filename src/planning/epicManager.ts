import * as path from 'path';
import * as fs from 'fs/promises';
import { Epic } from './entities/epic';
import { EpicStatus, Priority } from './types';
import { IdGenerator } from './utils/idGenerator';
import { Logger } from '../logger';
import { ConfigManager } from '../configManager';
import { ErrorHandler } from '../errorHandler';
import { UserError } from '../errors/customErrors';

/**
 * Epic Manager - Handles CRUD operations for Epic entities.
 */
export class EpicManager {
    private planPath: string;
    private logger: Logger;

    constructor(workspaceRoot: string, logger: Logger) {
        this.logger = logger;
        const config = ConfigManager.getInstance().getConfig();
        this.planPath = path.join(workspaceRoot, config.planning.planPath);
    }

    /**
     * Create new Epic with file system persistence.
     */
    public async createEpic(data: {
        title: string;
        description: string;
        priority?: Priority;
        assignee?: string;
        estimatedHours?: number;
        gitRepoUrl?: string;
        gitRepoBranch?: string;
        assignedAgent?: string;
    }): Promise<Epic> {
        const startTime = performance.now();

        try {
            // Get existing Epic IDs
            const existingIds = await this.getExistingEpicIds();
            
            // Generate new ID
            const id = IdGenerator.generateEpicId(existingIds);

            // Create Epic entity
            const epic = new Epic({
                id,
                title: data.title,
                description: data.description,
                status: EpicStatus.Todo,
                assignee: data.assignee,
                estimatedHours: data.estimatedHours,
                gitRepoUrl: data.gitRepoUrl,
                gitRepoBranch: data.gitRepoBranch,
                assignedAgent: data.assignedAgent,
                priority: data.priority || Priority.Medium,
                order: existingIds.length + 1,
                createdOn: new Date().toISOString(),
                lastUpdatedOn: new Date().toISOString()
            });

            // Validate
            const errors = epic.validate();
            if (errors.length > 0) {
                throw new UserError(`Epic validation failed: ${errors.join(', ')}`);
            }

            // Create directory
            const epicDir = path.join(this.planPath, 'epics', epic.getDirectoryName());
            await fs.mkdir(epicDir, { recursive: true });

            // Write README.md
            const readmePath = path.join(epicDir, 'README.md');
            const readmeContent = this.generateEpicReadme(epic);
            await fs.writeFile(readmePath, readmeContent, 'utf8');

            const duration = performance.now() - startTime;
            this.logger.info('Epic created', {
                component: 'EpicManager',
                epicId: epic.id,
                epicTitle: epic.title,
                duration
            });

            return epic;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'EpicManager.createEpic'
            );
            throw error;
        }
    }

    /**
     * Read Epic from file system.
     */
    public async readEpic(epicId: string): Promise<Epic | null> {
        try {
            const epicDirs = await this.getEpicDirectories();
            const epicDir = epicDirs.find(dir => dir.startsWith(epicId));

            if (!epicDir) {
                this.logger.warn('Epic not found', { component: 'EpicManager', epicId });
                return null;
            }

            const readmePath = path.join(this.planPath, 'epics', epicDir, 'README.md');
            const content = await fs.readFile(readmePath, 'utf8');

            const epic = this.parseEpicReadme(content, epicId);
            
            this.logger.debug('Epic read', { component: 'EpicManager', epicId });
            
            return epic;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'EpicManager.readEpic'
            );
            return null;
        }
    }

    /**
     * Update existing Epic.
     */
    public async updateEpic(epicId: string, updates: Partial<Epic>): Promise<Epic | null> {
        try {
            const existingEpic = await this.readEpic(epicId);
            if (!existingEpic) {
                throw new UserError(`Epic ${epicId} not found`);
            }

            // Merge updates
            const updatedEpic = new Epic({
                ...existingEpic.toJSON(),
                ...updates,
                id: epicId, // Prevent ID change
                lastUpdatedOn: new Date().toISOString()
            });

            // Validate
            const errors = updatedEpic.validate();
            if (errors.length > 0) {
                throw new UserError(`Epic validation failed: ${errors.join(', ')}`);
            }

            // Handle directory rename if title changed
            if (updates.title && updates.title !== existingEpic.title) {
                await this.renameEpicDirectory(existingEpic, updatedEpic);
            }

            // Write README.md
            const epicDir = path.join(this.planPath, 'epics', updatedEpic.getDirectoryName());
            const readmePath = path.join(epicDir, 'README.md');
            const readmeContent = this.generateEpicReadme(updatedEpic);
            await fs.writeFile(readmePath, readmeContent, 'utf8');

            this.logger.info('Epic updated', {
                component: 'EpicManager',
                epicId,
                changes: Object.keys(updates)
            });

            return updatedEpic;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'EpicManager.updateEpic'
            );
            throw error;
        }
    }

    /**
     * Delete Epic and all children recursively.
     */
    public async deleteEpic(epicId: string): Promise<boolean> {
        try {
            const epicDirs = await this.getEpicDirectories();
            const epicDir = epicDirs.find(dir => dir.startsWith(epicId));

            if (!epicDir) {
                this.logger.warn('Epic not found for deletion', { component: 'EpicManager', epicId });
                return false;
            }

            const epicPath = path.join(this.planPath, 'epics', epicDir);
            await fs.rm(epicPath, { recursive: true, force: true });

            this.logger.info('Epic deleted', { component: 'EpicManager', epicId });
            
            return true;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'EpicManager.deleteEpic'
            );
            throw error;
        }
    }

    /**
     * List all Epics.
     */
    public async listEpics(): Promise<Epic[]> {
        try {
            const epicDirs = await this.getEpicDirectories();
            const epics: Epic[] = [];

            for (const dir of epicDirs) {
                const epicId = dir.split('-').slice(0, 2).join('-'); // epic-001
                const epic = await this.readEpic(epicId);
                if (epic) {
                    epics.push(epic);
                }
            }

            this.logger.debug('Epics listed', { component: 'EpicManager', count: epics.length });
            return epics;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'EpicManager.listEpics'
            );
            return [];
        }
    }

    // ========== PRIVATE HELPER METHODS ==========

    private async getExistingEpicIds(): Promise<string[]> {
        try {
            const epicDirs = await this.getEpicDirectories();
            return epicDirs.map(dir => dir.split('-').slice(0, 2).join('-')); // epic-001
        } catch {
            return [];
        }
    }

    private async getEpicDirectories(): Promise<string[]> {
        try {
            const epicsPath = path.join(this.planPath, 'epics');
            await fs.mkdir(epicsPath, { recursive: true });
            const entries = await fs.readdir(epicsPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        } catch {
            return [];
        }
    }

    private async renameEpicDirectory(oldEpic: Epic, newEpic: Epic): Promise<void> {
        const oldPath = path.join(this.planPath, 'epics', oldEpic.getDirectoryName());
        const newPath = path.join(this.planPath, 'epics', newEpic.getDirectoryName());
        await fs.rename(oldPath, newPath);
    }

    private generateEpicReadme(epic: Epic): string {
        return `# ${epic.title}

**Epic ID**: ${epic.id}  
**Type**: ${epic.type}  
**Status**: ${epic.status}  
**Priority**: ${epic.priority}  
**Assignee**: ${epic.assignee || 'Unassigned'}

---

## Description

${epic.description}

---

## Tags

${epic.tags && epic.tags.length > 0 ? epic.tags.map(t => `- ${t}`).join('\n') : '- No tags'}

---

## Links

${epic.links && epic.links.length > 0 ? epic.links.map(l => `- **${l.type}** → ${l.targetId}${l.description ? `: ${l.description}` : ''}`).join('\n') : '- No links'}

---

## Metadata

**Created**: ${epic.createdOn}  
**Updated**: ${epic.lastUpdatedOn}  
**Deliver By**: ${epic.deliverByDate || 'Not set'}  
**Delivered**: ${epic.deliveredOn || 'Not delivered'}
`;
    }

    private parseEpicReadme(content: string, epicId: string): Epic {
        // Simple parser - extract metadata from README
        const titleMatch = content.match(/^# (.+)$/m);
        const statusMatch = content.match(/\*\*Status\*\*: (.+)$/m);
        const priorityMatch = content.match(/\*\*Priority\*\*: (.+)$/m);
        const assigneeMatch = content.match(/\*\*Assignee\*\*: (.+)$/m);
        
        // Extract description (between ## Description and next ##)
        const descMatch = content.match(/## Description\s+(.+?)(?=\n##|\n\*\*|$)/s);

        return new Epic({
            id: epicId,
            title: titleMatch ? titleMatch[1] : 'Unknown',
            description: descMatch ? descMatch[1].trim() : '',
            status: (statusMatch ? statusMatch[1] : 'todo') as EpicStatus,
            priority: (priorityMatch ? priorityMatch[1] : 'medium') as Priority,
            assignee: assigneeMatch && assigneeMatch[1] !== 'Unassigned' ? assigneeMatch[1] : undefined,
            order: 0,
            createdOn: new Date().toISOString(),
            lastUpdatedOn: new Date().toISOString()
        });
    }
}
