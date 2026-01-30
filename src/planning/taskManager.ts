import * as path from 'path';
import * as fs from 'fs/promises';
import { Task } from './entities/task';
import { TaskStatus, Priority } from './types';
import { IdGenerator } from './utils/idGenerator';
import { Logger } from '../logger';
import { ConfigManager } from '../configManager';
import { ErrorHandler } from '../errorHandler';
import { UserError } from '../errors/customErrors';

/**
 * Task Manager - Handles CRUD operations for Task entities.
 */
export class TaskManager {
    private planPath: string;
    private logger: Logger;

    constructor(workspaceRoot: string, logger: Logger) {
        this.logger = logger;
        const config = ConfigManager.getInstance().getConfig();
        this.planPath = path.join(workspaceRoot, config.planning.planPath);
    }

    /**
     * Create new Task with file system persistence.
     */
    public async createTask(epicId: string, storyId: string, data: {
        title: string;
        description: string;
        storyPoints?: number;
        assignee?: string;
        priority?: Priority;
    }): Promise<Task> {
        const startTime = performance.now();

        try {
            const existingIds = await this.getExistingTaskIds(epicId, storyId);
            const id = IdGenerator.generateTaskId(existingIds);

            const task = new Task({
                id,
                title: data.title,
                description: data.description,
                status: TaskStatus.Todo,
                assignee: data.assignee,
                priority: data.priority || Priority.Medium
            });

            const errors = task.validate();
            if (errors.length > 0) {
                throw new UserError(`Task validation failed: ${errors.join(', ')}`);
            }

            const storyDir = await this.findStoryDirectory(epicId, storyId);
            if (!storyDir) {
                throw new UserError(`Story ${storyId} not found in epic ${epicId}`);
            }

            const taskPath = path.join(storyDir, task.getFileName());
            const taskContent = this.generateTaskMarkdown(task);
            await fs.writeFile(taskPath, taskContent, 'utf8');

            const duration = performance.now() - startTime;
            this.logger.info('Task created', {
                component: 'TaskManager',
                taskId: task.id,
                taskName: task.title,
                storyId,
                duration
            });

            return task;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'TaskManager.createTask'
            );
            throw error;
        }
    }

    /**
     * Read Task from file system.
     */
    public async readTask(epicId: string, storyId: string, taskId: string): Promise<Task | null> {
        try {
            const storyDir = await this.findStoryDirectory(epicId, storyId);
            if (!storyDir) {
                return null;
            }

            const taskFiles = await this.getTaskFiles(storyDir);
            const taskFile = taskFiles.find(file => file.startsWith(taskId));

            if (!taskFile) {
                this.logger.warn('Task not found', { component: 'TaskManager', taskId });
                return null;
            }

            const taskPath = path.join(storyDir, taskFile);
            const content = await fs.readFile(taskPath, 'utf8');

            const task = this.parseTaskMarkdown(content, taskId, storyId);
            
            this.logger.debug('Task read', { component: 'TaskManager', taskId });
            
            return task;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'TaskManager.readTask'
            );
            return null;
        }
    }

    /**
     * Update existing Task.
     */
    public async updateTask(epicId: string, storyId: string, taskId: string, updates: Partial<Task>): Promise<Task | null> {
        try {
            const existingTask = await this.readTask(epicId, storyId, taskId);
            if (!existingTask) {
                throw new UserError(`Task ${taskId} not found`);
            }

            const updatedTask = new Task({
                ...existingTask.toJSON(),
                ...updates,
                id: taskId
            });

            const errors = updatedTask.validate();
            if (errors.length > 0) {
                throw new UserError(`Task validation failed: ${errors.join(', ')}`);
            }

            const storyDir = await this.findStoryDirectory(epicId, storyId);
            if (!storyDir) {
                throw new UserError(`Story ${storyId} not found`);
            }

            if (updates.title && updates.title !== existingTask.title) {
                await this.renameTaskFile(storyDir, existingTask, updatedTask);
            }

            const taskPath = path.join(storyDir, updatedTask.getFileName());
            const taskContent = this.generateTaskMarkdown(updatedTask);
            await fs.writeFile(taskPath, taskContent, 'utf8');

            this.logger.info('Task updated', {
                component: 'TaskManager',
                taskId,
                changes: Object.keys(updates)
            });

            return updatedTask;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'TaskManager.updateTask'
            );
            throw error;
        }
    }

    /**
     * Delete Task.
     */
    public async deleteTask(epicId: string, storyId: string, taskId: string): Promise<boolean> {
        try {
            const storyDir = await this.findStoryDirectory(epicId, storyId);
            if (!storyDir) {
                return false;
            }

            const taskFiles = await this.getTaskFiles(storyDir);
            const taskFile = taskFiles.find(file => file.startsWith(taskId));

            if (!taskFile) {
                this.logger.warn('Task not found for deletion', { component: 'TaskManager', taskId });
                return false;
            }

            const taskPath = path.join(storyDir, taskFile);
            await fs.unlink(taskPath);

            this.logger.info('Task deleted', { component: 'TaskManager', taskId });
            
            return true;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'TaskManager.deleteTask'
            );
            throw error;
        }
    }

    /**
     * List all Tasks in a Story.
     */
    public async listTasks(epicId: string, storyId: string): Promise<Task[]> {
        try {
            const storyDir = await this.findStoryDirectory(epicId, storyId);
            if (!storyDir) {
                return [];
            }

            const taskFiles = await this.getTaskFiles(storyDir);
            const tasks: Task[] = [];

            for (const file of taskFiles) {
                const taskId = file.split('-').slice(0, 2).join('-');
                const task = await this.readTask(epicId, storyId, taskId);
                if (task) {
                    tasks.push(task);
                }
            }

            this.logger.debug('Tasks listed', { component: 'TaskManager', storyId, count: tasks.length });
            return tasks;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'TaskManager.listTasks'
            );
            return [];
        }
    }

    // ========== PRIVATE HELPER METHODS ==========

    private async findStoryDirectory(epicId: string, storyId: string): Promise<string | null> {
        try {
            const epicsPath = path.join(this.planPath, 'epics');
            const epicEntries = await fs.readdir(epicsPath, { withFileTypes: true });
            const epicDir = epicEntries
                .filter(entry => entry.isDirectory())
                .find(entry => entry.name.startsWith(epicId));

            if (!epicDir) {
                return null;
            }

            const epicPath = path.join(epicsPath, epicDir.name);
            const storyEntries = await fs.readdir(epicPath, { withFileTypes: true });
            const storyDir = storyEntries
                .filter(entry => entry.isDirectory())
                .find(entry => entry.name.startsWith(storyId));

            return storyDir ? path.join(epicPath, storyDir.name) : null;
        } catch {
            return null;
        }
    }

    private async getExistingTaskIds(epicId: string, storyId: string): Promise<string[]> {
        try {
            const storyDir = await this.findStoryDirectory(epicId, storyId);
            if (!storyDir) {
                return [];
            }
            const taskFiles = await this.getTaskFiles(storyDir);
            return taskFiles.map(file => file.split('-').slice(0, 2).join('-'));
        } catch {
            return [];
        }
    }

    private async getTaskFiles(storyDir: string): Promise<string[]> {
        try {
            const entries = await fs.readdir(storyDir, { withFileTypes: true });
            return entries
                .filter(entry => entry.isFile() && entry.name.startsWith('task-') && entry.name.endsWith('.md'))
                .map(entry => entry.name);
        } catch {
            return [];
        }
    }

    private async renameTaskFile(storyDir: string, oldTask: Task, newTask: Task): Promise<void> {
        const oldPath = path.join(storyDir, oldTask.getFileName());
        const newPath = path.join(storyDir, newTask.getFileName());
        await fs.rename(oldPath, newPath);
    }

    private generateTaskMarkdown(task: Task): string {
        return `# ${task.title}

**Task ID**: ${task.id}  
**Status**: ${task.status}  
**Assignee**: ${task.assignee || 'Unassigned'}  
**Priority**: ${task.priority}

---

## Description

${task.description}

---

## Tags

${task.tags && task.tags.length > 0 ? task.tags.map(t => `- ${t}`).join('\n') : '- No tags'}

---

## Dependencies

${task.dependencies && task.dependencies.length > 0 ? task.dependencies.map(d => `- ${d}`).join('\n') : '- No dependencies'}
`;
    }

    private parseTaskMarkdown(content: string, taskId: string, _storyId: string): Task {
        const nameMatch = content.match(/^# (.+)$/m);
        const statusMatch = content.match(/\*\*Status\*\*: (.+)$/m);
        const priorityMatch = content.match(/\*\*Priority\*\*: (.+)$/m);
        const assigneeMatch = content.match(/\*\*Assignee\*\*: (.+)$/m);
        const descMatch = content.match(/## Description\s+(.+?)\s+---/s);

        return new Task({
            id: taskId,
            title: nameMatch ? nameMatch[1] : 'Unknown',
            description: descMatch ? descMatch[1].trim() : '',
            status: (statusMatch ? statusMatch[1] : 'todo') as TaskStatus,
            priority: (priorityMatch ? priorityMatch[1] : 'medium') as Priority,
            assignee: assigneeMatch && assigneeMatch[1] !== 'Unassigned' ? assigneeMatch[1] : undefined
        });
    }
}
