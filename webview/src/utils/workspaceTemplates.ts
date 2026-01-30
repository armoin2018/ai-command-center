/**
 * Workspace Templates
 * 
 * Pre-configured templates with sample data for different project types
 */

import { TreeNodeData } from '../types/tree';

export interface WorkspaceTemplate {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'agile' | 'product' | 'support' | 'general';
    tree: TreeNodeData[];
    settings?: any;
}

export class WorkspaceTemplates {
    /**
     * Get all available templates
     */
    static getTemplates(): WorkspaceTemplate[] {
        return [
            this.getAgileSprint(),
            this.getProductRoadmap(),
            this.getBugTracking(),
            this.getKanbanWorkflow(),
            this.getFeatureDevelopment(),
            this.getBlankTemplate()
        ];
    }

    /**
     * Agile Sprint template
     */
    private static getAgileSprint(): WorkspaceTemplate {
        return {
            id: 'agile-sprint',
            title: 'Agile Sprint Planning',
            description: 'Two-week sprint with epics, stories, and tasks',
            icon: '🏃',
            category: 'agile',
            tree: [
                {
                    id: 'sprint-1',
                    title: 'Sprint 1 - Authentication & Core Features',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'in-progress',
                    priority: 'high',
                    estimatedHours: 34,
                    tags: ['sprint-1', 'foundation'],
                    children: [
                        {
                            id: 'story-1',
                            title: 'User Authentication',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'in-progress',
                            priority: 'high',
                            estimatedHours: 13,
                            tags: ['auth', 'security'],
                            children: [
                                {
                                    id: 'task-1',
                                    title: 'Design login page UI',
                                    type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                                    status: 'done',
                                    priority: 'high',
                                    estimatedHours: 3,
                                    tags: ['ui', 'design']
                                },
                                {
                                    id: 'task-2',
                                    title: 'Implement JWT authentication',
                                    type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                                    status: 'in-progress',
                                    priority: 'high',
                                    estimatedHours: 5,
                                    tags: ['backend', 'security']
                                },
                                {
                                    id: 'task-3',
                                    title: 'Add password reset flow',
                                    type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                                    status: 'todo',
                                    priority: 'medium',
                                    estimatedHours: 5,
                                    tags: ['auth']
                                }
                            ]
                        },
                        {
                            id: 'story-2',
                            title: 'Dashboard Implementation',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            estimatedHours: 8,
                            tags: ['ui', 'dashboard'],
                            children: [
                                {
                                    id: 'task-4',
                                    title: 'Create dashboard layout',
                                    type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                                    status: 'todo',
                                    priority: 'high',
                                    estimatedHours: 3,
                                    tags: ['ui']
                                },
                                {
                                    id: 'task-5',
                                    title: 'Add analytics widgets',
                                    type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                                    status: 'todo',
                                    priority: 'medium',
                                    estimatedHours: 5,
                                    tags: ['ui', 'analytics']
                                }
                            ]
                        },
                        {
                            id: 'story-3',
                            title: 'API Integration',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            estimatedHours: 13,
                            tags: ['backend', 'api']
                        }
                    ]
                },
                {
                    id: 'sprint-2',
                    title: 'Sprint 2 - Advanced Features',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'todo',
                    priority: 'medium',
                    estimatedHours: 21,
                    tags: ['sprint-2', 'features']
                }
            ]
        };
    }

    /**
     * Product Roadmap template
     */
    private static getProductRoadmap(): WorkspaceTemplate {
        return {
            id: 'product-roadmap',
            title: 'Product Roadmap',
            description: 'Quarterly product planning with strategic initiatives',
            icon: '🗺️',
            category: 'product',
            tree: [
                {
                    id: 'q1-2026',
                    title: 'Q1 2026 - Foundation',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'in-progress',
                    priority: 'critical',
                    tags: ['q1', 'foundation'],
                    children: [
                        {
                            id: 'mobile-launch',
                            title: 'Mobile App Launch',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'in-progress',
                            priority: 'critical',
                            estimatedHours: 21,
                            tags: ['mobile', 'ios', 'android']
                        },
                        {
                            id: 'api-v2',
                            title: 'API v2 Release',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            estimatedHours: 13,
                            tags: ['api', 'backend']
                        }
                    ]
                },
                {
                    id: 'q2-2026',
                    title: 'Q2 2026 - Growth',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'todo',
                    priority: 'high',
                    tags: ['q2', 'growth'],
                    children: [
                        {
                            id: 'analytics-platform',
                            title: 'Analytics Platform',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            estimatedHours: 21,
                            tags: ['analytics']
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Bug Tracking template
     */
    private static getBugTracking(): WorkspaceTemplate {
        return {
            id: 'bug-tracking',
            title: 'Bug Tracking',
            description: 'Issue tracking and bug management system',
            icon: '🐛',
            category: 'support',
            tree: [
                {
                    id: 'critical-bugs',
                    title: 'Critical Bugs',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'in-progress',
                    priority: 'critical',
                    tags: ['bugs', 'critical'],
                    children: [
                        {
                            id: 'bug-1',
                            title: 'Login fails on Safari 16+',
                            type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'in-progress',
                            priority: 'critical',
                            tags: ['bug', 'safari', 'auth', 'p0']
                        },
                        {
                            id: 'bug-2',
                            title: 'Data loss on network timeout',
                            type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'pending',
                            priority: 'critical',
                            tags: ['bug', 'data', 'network', 'p0']
                        }
                    ]
                },
                {
                    id: 'high-priority',
                    title: 'High Priority Issues',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'todo',
                    priority: 'high',
                    tags: ['bugs', 'high-priority'],
                    children: [
                        {
                            id: 'bug-3',
                            title: 'Mobile layout broken on tablets',
                            type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            tags: ['bug', 'ui', 'mobile', 'p1']
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Kanban Workflow template
     */
    private static getKanbanWorkflow(): WorkspaceTemplate {
        return {
            id: 'kanban-workflow',
            title: 'Kanban Board',
            description: 'Continuous flow kanban board',
            icon: '📊',
            category: 'agile',
            tree: [
                {
                    id: 'backlog',
                    title: 'Backlog',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'todo',
                    priority: 'medium',
                    tags: ['backlog'],
                    children: [
                        {
                            id: 'backlog-1',
                            title: 'Implement dark mode',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'medium',
                            estimatedHours: 5,
                            tags: ['ui', 'theme']
                        },
                        {
                            id: 'backlog-2',
                            title: 'Add export to PDF',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'low',
                            estimatedHours: 3,
                            tags: ['export', 'feature']
                        }
                    ]
                },
                {
                    id: 'in-progress',
                    title: 'In Progress',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'in-progress',
                    priority: 'high',
                    tags: ['active'],
                    children: [
                        {
                            id: 'wip-1',
                            title: 'Fix mobile responsiveness',
                            type: 'task',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'in-progress',
                            priority: 'high',
                            estimatedHours: 3,
                            tags: ['bug', 'mobile']
                        }
                    ]
                },
                {
                    id: 'done',
                    title: 'Done',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'done',
                    priority: 'medium',
                    tags: ['done']
                }
            ]
        };
    }

    /**
     * Feature Development template
     */
    private static getFeatureDevelopment(): WorkspaceTemplate {
        return {
            id: 'feature-development',
            title: 'Feature Development',
            description: 'Full-stack feature development workflow',
            icon: '⚡',
            category: 'general',
            tree: [
                {
                    id: 'feature-1',
                    title: 'New Feature: Real-time Collaboration',
                    type: 'epic',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                    status: 'todo',
                    priority: 'high',
                    estimatedHours: 34,
                    tags: ['feature', 'collaboration'],
                    children: [
                        {
                            id: 'design',
                            title: 'Design & Architecture',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            estimatedHours: 8,
                            tags: ['design', 'planning']
                        },
                        {
                            id: 'backend',
                            title: 'Backend Implementation',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            estimatedHours: 13,
                            tags: ['backend', 'websocket']
                        },
                        {
                            id: 'frontend',
                            title: 'Frontend Implementation',
                            type: 'story',
                    order: 0,
                    createdOn: new Date().toISOString(),
                    lastUpdatedOn: new Date().toISOString(),
                            status: 'todo',
                            priority: 'high',
                            estimatedHours: 13,
                            tags: ['frontend', 'ui']
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Blank template
     */
    private static getBlankTemplate(): WorkspaceTemplate {
        return {
            id: 'blank',
            title: 'Blank Workspace',
            description: 'Start from scratch with an empty workspace',
            icon: '📄',
            category: 'general',
            tree: []
        };
    }

    /**
     * Get template by ID
     */
    static getTemplateById(id: string): WorkspaceTemplate | null {
        return this.getTemplates().find(t => t.id === id) || null;
    }
}
