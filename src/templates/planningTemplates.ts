/**
 * Planning Templates
 * 
 * Provides pre-defined templates for common planning scenarios
 */

import { Logger } from '../logger';
import { PlanningManager } from '../planning/planningManager';
import { Epic } from '../planning/entities/epic';
import { Priority } from '../planning/types';

export interface TemplateStory {
    title: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'todo' | 'in-progress' | 'done' | 'pending';
    tasks?: TemplateTask[];
}

export interface TemplateTask {
    title: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'todo' | 'in-progress' | 'done' | 'pending';
}

export interface PlanningTemplate {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly category: 'feature' | 'bug' | 'sprint' | 'research' | 'documentation' | 'custom';
    readonly epicTitle: string;
    readonly epicDescription: string;
    readonly stories: TemplateStory[];
}

export class PlanningTemplates {
    private static readonly logger = Logger.getInstance();
    
    /**
     * Convert string priority to Priority enum
     */
    private static convertPriority(priority?: 'low' | 'medium' | 'high' | 'critical'): Priority {
        switch (priority) {
            case 'high':
            case 'critical':
                return Priority.High;
            case 'low':
                return Priority.Low;
            case 'medium':
            default:
                return Priority.Medium;
        }
    }
    
    /**
     * Get all available templates
     */
    static getTemplates(): PlanningTemplate[] {
        return [
            this.getFeatureDevelopmentTemplate(),
            this.getBugFixTemplate(),
            this.getSprintPlanningTemplate(),
            this.getResearchSpikeTemplate(),
            this.getDocumentationTemplate(),
            this.getRefactoringTemplate(),
            this.getAPIIntegrationTemplate(),
            this.getUIComponentTemplate(),
        ];
    }

    /**
     * Get template by ID
     */
    static getTemplateById(id: string): PlanningTemplate | undefined {
        return this.getTemplates().find(t => t.id === id);
    }

    /**
     * Apply template to planning manager
     */
    static async applyTemplate(
        templateId: string,
        planningManager: PlanningManager,
        customizations?: {
            epicTitle?: string;
            epicDescription?: string;
        }
    ): Promise<Epic | undefined> {
        const template = this.getTemplateById(templateId);
        if (!template) {
            this.logger.error('Template not found', { templateId });
            return undefined;
        }

        try {
            // Create epic using PlanningManager API
            const epic = await planningManager.createEpic({
                title: customizations?.epicTitle || template.epicTitle,
                description: customizations?.epicDescription || template.epicDescription,
                priority: Priority.Medium
            });

            this.logger.info('Created epic from template', { 
                epicId: epic.id, 
                templateId: template.id 
            });

            // Create stories
            for (const storyTemplate of template.stories) {
                const priority = this.convertPriority(storyTemplate.priority);
                const story = await planningManager.createStory(epic.id, {
                    title: storyTemplate.title,
                    description: storyTemplate.description,
                    priority
                });

                this.logger.info('Created story from template', { 
                    storyId: story.id, 
                    epicId: epic.id 
                });

                // Create tasks if any
                if (storyTemplate.tasks && storyTemplate.tasks.length > 0) {
                    for (const taskTemplate of storyTemplate.tasks) {
                        const taskPriority = this.convertPriority(taskTemplate.priority);
                        const task = await planningManager.createTask(epic.id, story.id, {
                            title: taskTemplate.title,
                            description: taskTemplate.description,
                            priority: taskPriority
                        });

                        this.logger.info('Created task from template', { 
                            taskId: task.id, 
                            storyId: story.id 
                        });
                    }
                }
            }

            this.logger.info('Template applied successfully', { 
                templateId: template.id,
                epicId: epic.id,
                storiesCount: template.stories.length
            });

            return epic;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to apply template', { error: message, templateId });
            return undefined;
        }
    }

    /**
     * Feature Development Template
     */
    private static getFeatureDevelopmentTemplate(): PlanningTemplate {
        return {
            id: 'feature-development',
            name: 'Feature Development',
            description: 'Standard feature development workflow with design, implementation, and testing phases',
            category: 'feature',
            epicTitle: 'New Feature: [Feature Name]',
            epicDescription: 'This epic tracks the development of a new feature from design through implementation and testing.',
            stories: [
                {
                    title: 'Design & Planning',
                    description: 'Create technical design document and plan implementation approach',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Create technical design document', description: 'Document architecture, data models, and APIs' },
                        { title: 'Review design with team', description: 'Get feedback and approval on design' },
                        { title: 'Create implementation plan', description: 'Break down work into tasks and estimate' }
                    ]
                },
                {
                    title: 'Core Implementation',
                    description: 'Implement core functionality and business logic',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Implement data layer', description: 'Create models, schemas, and database migrations' },
                        { title: 'Implement business logic', description: 'Core feature functionality' },
                        { title: 'Add error handling', description: 'Comprehensive error handling and validation' }
                    ]
                },
                {
                    title: 'UI Implementation',
                    description: 'Create user interface and integrate with backend',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Create UI components', description: 'Build reusable UI components' },
                        { title: 'Implement user flows', description: 'Wire up components and navigation' },
                        { title: 'Add responsive design', description: 'Ensure mobile and desktop compatibility' }
                    ]
                },
                {
                    title: 'Testing & QA',
                    description: 'Write tests and perform quality assurance',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Write unit tests', description: 'Test individual components and functions' },
                        { title: 'Write integration tests', description: 'Test feature end-to-end' },
                        { title: 'Manual QA testing', description: 'Test all user scenarios and edge cases' }
                    ]
                },
                {
                    title: 'Documentation & Deployment',
                    description: 'Document feature and prepare for deployment',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Write user documentation', description: 'Create user guide and help docs' },
                        { title: 'Update API documentation', description: 'Document new APIs and endpoints' },
                        { title: 'Deploy to production', description: 'Release feature to users' }
                    ]
                }
            ]
        };
    }

    /**
     * Bug Fix Template
     */
    private static getBugFixTemplate(): PlanningTemplate {
        return {
            id: 'bug-fix',
            name: 'Bug Fix',
            description: 'Quick workflow for investigating and fixing a bug',
            category: 'bug',
            epicTitle: 'Bug Fix: [Bug Description]',
            epicDescription: 'This epic tracks the investigation and resolution of a bug.',
            stories: [
                {
                    title: 'Investigate and Fix Bug',
                    description: 'Reproduce, diagnose, and fix the reported bug',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Reproduce bug', description: 'Create steps to reproduce the issue', priority: 'critical' },
                        { title: 'Identify root cause', description: 'Debug and find the source of the bug' },
                        { title: 'Implement fix', description: 'Code the solution' },
                        { title: 'Write regression test', description: 'Ensure bug stays fixed' },
                        { title: 'Test fix', description: 'Verify bug is resolved' },
                        { title: 'Deploy fix', description: 'Release to production' }
                    ]
                }
            ]
        };
    }

    /**
     * Sprint Planning Template
     */
    private static getSprintPlanningTemplate(): PlanningTemplate {
        return {
            id: 'sprint-planning',
            name: 'Sprint Planning',
            description: 'Template for organizing a 2-week sprint',
            category: 'sprint',
            epicTitle: 'Sprint [Number]: [Sprint Goal]',
            epicDescription: 'Sprint planning and execution for a 2-week development cycle.',
            stories: [
                {
                    title: 'Sprint Planning & Setup',
                    description: 'Plan sprint goals and prepare environment',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Review backlog', description: 'Prioritize and groom backlog items' },
                        { title: 'Define sprint goal', description: 'Set clear objective for sprint' },
                        { title: 'Estimate stories', description: 'Story point estimation' },
                        { title: 'Assign stories to team', description: 'Distribute work among team members' }
                    ]
                },
                {
                    title: 'Development Work - Week 1',
                    description: 'First week of sprint development',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Feature 1 development', description: 'Implement first priority feature' },
                        { title: 'Feature 2 development', description: 'Implement second priority feature' },
                        { title: 'Mid-sprint check-in', description: 'Review progress and adjust plan' }
                    ]
                },
                {
                    title: 'Development Work - Week 2',
                    description: 'Second week of sprint development',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Complete remaining features', description: 'Finish all sprint commitments' },
                        { title: 'Code review and testing', description: 'Ensure quality standards' },
                        { title: 'Bug fixes and polish', description: 'Address any issues found' }
                    ]
                },
                {
                    title: 'Sprint Review & Retrospective',
                    description: 'Review sprint results and identify improvements',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Demo completed work', description: 'Show features to stakeholders' },
                        { title: 'Sprint retrospective', description: 'Discuss what went well and what to improve' },
                        { title: 'Update metrics', description: 'Track velocity and burndown' }
                    ]
                }
            ]
        };
    }

    /**
     * Research Spike Template
     */
    private static getResearchSpikeTemplate(): PlanningTemplate {
        return {
            id: 'research-spike',
            name: 'Research Spike',
            description: 'Time-boxed research and prototyping',
            category: 'research',
            epicTitle: 'Research: [Topic]',
            epicDescription: 'Time-boxed research spike to explore technical approaches and feasibility.',
            stories: [
                {
                    title: 'Research & Investigation',
                    description: 'Investigate approaches and gather information',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Define research questions', description: 'What do we need to learn?' },
                        { title: 'Review existing solutions', description: 'Survey available libraries/tools' },
                        { title: 'Document findings', description: 'Summarize research results' }
                    ]
                },
                {
                    title: 'Proof of Concept',
                    description: 'Build minimal prototype to validate approach',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Create prototype', description: 'Build minimal working example' },
                        { title: 'Test feasibility', description: 'Verify approach works' },
                        { title: 'Measure performance', description: 'Benchmark if applicable' }
                    ]
                },
                {
                    title: 'Recommendation',
                    description: 'Document findings and make recommendation',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Write recommendation doc', description: 'Proposed approach and rationale' },
                        { title: 'Estimate implementation', description: 'Rough time and complexity estimate' },
                        { title: 'Present to team', description: 'Share findings and get buy-in' }
                    ]
                }
            ]
        };
    }

    /**
     * Documentation Template
     */
    private static getDocumentationTemplate(): PlanningTemplate {
        return {
            id: 'documentation',
            name: 'Documentation',
            description: 'Comprehensive documentation project',
            category: 'documentation',
            epicTitle: 'Documentation: [Topic]',
            epicDescription: 'Create and maintain documentation for users and developers.',
            stories: [
                {
                    title: 'User Documentation',
                    description: 'Documentation for end users',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Write getting started guide', description: 'Quick start for new users' },
                        { title: 'Create user guides', description: 'Step-by-step feature guides' },
                        { title: 'Document common workflows', description: 'How to accomplish tasks' },
                        { title: 'Create FAQ', description: 'Answer common questions' }
                    ]
                },
                {
                    title: 'Developer Documentation',
                    description: 'Technical documentation for developers',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Document architecture', description: 'System design and components' },
                        { title: 'API documentation', description: 'Document all public APIs' },
                        { title: 'Code examples', description: 'Working code samples' },
                        { title: 'Contributing guide', description: 'How to contribute to project' }
                    ]
                },
                {
                    title: 'Documentation Review',
                    description: 'Review and publish documentation',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Technical review', description: 'Verify accuracy' },
                        { title: 'Editorial review', description: 'Check clarity and grammar' },
                        { title: 'Publish documentation', description: 'Deploy to docs site' }
                    ]
                }
            ]
        };
    }

    /**
     * Refactoring Template
     */
    private static getRefactoringTemplate(): PlanningTemplate {
        return {
            id: 'refactoring',
            name: 'Code Refactoring',
            description: 'Improve code quality without changing functionality',
            category: 'custom',
            epicTitle: 'Refactor: [Component/Module]',
            epicDescription: 'Improve code structure, maintainability, and performance without changing behavior.',
            stories: [
                {
                    title: 'Planning & Analysis',
                    description: 'Analyze current code and plan refactoring',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Identify problem areas', description: 'Code smells and technical debt' },
                        { title: 'Define success criteria', description: 'What does "better" look like?' },
                        { title: 'Create refactoring plan', description: 'Step-by-step approach' }
                    ]
                },
                {
                    title: 'Refactoring Implementation',
                    description: 'Execute refactoring with tests',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Write characterization tests', description: 'Capture existing behavior' },
                        { title: 'Refactor code incrementally', description: 'Small, safe changes' },
                        { title: 'Verify tests still pass', description: 'Ensure no behavior changed' },
                        { title: 'Code review', description: 'Get team feedback' }
                    ]
                },
                {
                    title: 'Validation & Deployment',
                    description: 'Validate improvements and deploy',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Performance testing', description: 'Verify performance improvements' },
                        { title: 'Integration testing', description: 'Test with other components' },
                        { title: 'Deploy refactored code', description: 'Release to production' }
                    ]
                }
            ]
        };
    }

    /**
     * API Integration Template
     */
    private static getAPIIntegrationTemplate(): PlanningTemplate {
        return {
            id: 'api-integration',
            name: 'API Integration',
            description: 'Integrate with external API or service',
            category: 'feature',
            epicTitle: 'Integration: [API/Service Name]',
            epicDescription: 'Integrate with external API to enable new functionality.',
            stories: [
                {
                    title: 'API Research & Planning',
                    description: 'Understand API and plan integration',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Review API documentation', description: 'Understand endpoints and data models' },
                        { title: 'Test API manually', description: 'Validate API behavior' },
                        { title: 'Design integration approach', description: 'Plan client architecture' },
                        { title: 'Handle authentication', description: 'API keys, OAuth, etc.' }
                    ]
                },
                {
                    title: 'Client Implementation',
                    description: 'Build API client and data models',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Create API client class', description: 'HTTP client with error handling' },
                        { title: 'Implement data models', description: 'TypeScript interfaces for API data' },
                        { title: 'Add rate limiting', description: 'Respect API rate limits' },
                        { title: 'Add retry logic', description: 'Handle transient failures' }
                    ]
                },
                {
                    title: 'Testing & Documentation',
                    description: 'Test integration and document usage',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Write integration tests', description: 'Test against real API' },
                        { title: 'Add mock responses', description: 'Enable testing without API' },
                        { title: 'Document configuration', description: 'How to configure API credentials' },
                        { title: 'Create usage examples', description: 'Show how to use integration' }
                    ]
                }
            ]
        };
    }

    /**
     * UI Component Template
     */
    private static getUIComponentTemplate(): PlanningTemplate {
        return {
            id: 'ui-component',
            name: 'UI Component Development',
            description: 'Build reusable UI component',
            category: 'feature',
            epicTitle: 'UI Component: [Component Name]',
            epicDescription: 'Design and implement a reusable UI component.',
            stories: [
                {
                    title: 'Design & Specification',
                    description: 'Define component requirements and design',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Define component API', description: 'Props, events, slots' },
                        { title: 'Create visual design', description: 'Mockups or wireframes' },
                        { title: 'List component states', description: 'Default, hover, disabled, error, etc.' },
                        { title: 'Define accessibility requirements', description: 'ARIA, keyboard navigation' }
                    ]
                },
                {
                    title: 'Implementation',
                    description: 'Build component with all states',
                    priority: 'high',
                    status: 'todo',
                    tasks: [
                        { title: 'Implement base component', description: 'Core structure and logic' },
                        { title: 'Add styling', description: 'CSS with all states' },
                        { title: 'Implement accessibility', description: 'ARIA labels, keyboard support' },
                        { title: 'Add TypeScript types', description: 'Type-safe props and events' }
                    ]
                },
                {
                    title: 'Testing & Documentation',
                    description: 'Test component and create examples',
                    priority: 'medium',
                    status: 'todo',
                    tasks: [
                        { title: 'Write unit tests', description: 'Test component behavior' },
                        { title: 'Visual regression tests', description: 'Catch UI changes' },
                        { title: 'Create Storybook stories', description: 'Interactive examples' },
                        { title: 'Write component docs', description: 'Usage guide and API reference' }
                    ]
                }
            ]
        };
    }
}
