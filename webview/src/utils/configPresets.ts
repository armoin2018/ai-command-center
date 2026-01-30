/**
 * Configuration Presets
 * 
 * Built-in templates and custom preset management
 */

export interface ConfigPreset {
    id: string;
    title: string;
    description: string;
    category: 'agile' | 'product' | 'support' | 'custom';
    icon: string;
    config: any;
    createdOn: string;
}

export class ConfigPresets {
    private static readonly STORAGE_KEY = 'configPresets';

    /**
     * Get all built-in presets
     */
    static getBuiltInPresets(): ConfigPreset[] {
        return [
            {
                id: 'agile-sprint',
                title: 'Agile Sprint Planning',
                description: 'Sprint-based agile development with epics, stories, and tasks',
                category: 'agile',
                icon: '🏃',
                config: {
                    tree: [
                        {
                            id: 'epic-1',
                            title: 'Sprint 1',
                            type: 'epic',
                            status: 'in-progress',
                            priority: 'high',
                            children: [
                                {
                                    id: 'story-1',
                                    title: 'User authentication',
                                    type: 'story',
                                    status: 'in-progress',
                                    priority: 'high',
                                    estimatedHours: 8,
                                    children: [
                                        {
                                            id: 'task-1',
                                            title: 'Implement login page',
                                            type: 'task',
                                            status: 'done',
                                            priority: 'high',
                                            estimatedHours: 3
                                        },
                                        {
                                            id: 'task-2',
                                            title: 'Add JWT authentication',
                                            type: 'task',
                                            status: 'in-progress',
                                            priority: 'high',
                                            estimatedHours: 5
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                createdOn: new Date().toISOString()
            },
            {
                id: 'product-roadmap',
                title: 'Product Roadmap',
                description: 'High-level product planning with quarterly goals',
                category: 'product',
                icon: '🗺️',
                config: {
                    tree: [
                        {
                            id: 'q1-2026',
                            title: 'Q1 2026 Goals',
                            type: 'epic',
                            status: 'todo',
                            priority: 'critical',
                            children: [
                                {
                                    id: 'feature-1',
                                    title: 'Mobile app launch',
                                    type: 'story',
                                    status: 'todo',
                                    priority: 'critical',
                                    estimatedHours: 21
                                },
                                {
                                    id: 'feature-2',
                                    title: 'API v2 release',
                                    type: 'story',
                                    status: 'todo',
                                    priority: 'high',
                                    estimatedHours: 13
                                }
                            ]
                        }
                    ]
                },
                createdOn: new Date().toISOString()
            },
            {
                id: 'bug-tracking',
                title: 'Bug Tracking',
                description: 'Issue tracking and bug management workflow',
                category: 'support',
                icon: '🐛',
                config: {
                    tree: [
                        {
                            id: 'critical-bugs',
                            title: 'Critical Bugs',
                            type: 'epic',
                            status: 'in-progress',
                            priority: 'critical',
                            children: [
                                {
                                    id: 'bug-1',
                                    title: 'Login fails on Safari',
                                    type: 'task',
                                    status: 'in-progress',
                                    priority: 'critical',
                                    tags: ['bug', 'safari', 'auth']
                                },
                                {
                                    id: 'bug-2',
                                    title: 'Data loss on network error',
                                    type: 'task',
                                    status: 'pending',
                                    priority: 'critical',
                                    tags: ['bug', 'data', 'network']
                                }
                            ]
                        }
                    ]
                },
                createdOn: new Date().toISOString()
            },
            {
                id: 'kanban-workflow',
                title: 'Kanban Workflow',
                description: 'Continuous flow kanban board setup',
                category: 'agile',
                icon: '📊',
                config: {
                    tree: [
                        {
                            id: 'backlog',
                            title: 'Backlog',
                            type: 'epic',
                            status: 'todo',
                            priority: 'medium',
                            children: [
                                {
                                    id: 'item-1',
                                    title: 'Implement dark mode',
                                    type: 'story',
                                    status: 'todo',
                                    priority: 'medium',
                                    estimatedHours: 5
                                }
                            ]
                        },
                        {
                            id: 'in-progress',
                            title: 'In Progress',
                            type: 'epic',
                            status: 'in-progress',
                            priority: 'high',
                            children: [
                                {
                                    id: 'item-2',
                                    title: 'Fix mobile responsiveness',
                                    type: 'task',
                                    status: 'in-progress',
                                    priority: 'high',
                                    estimatedHours: 3
                                }
                            ]
                        }
                    ]
                },
                createdOn: new Date().toISOString()
            }
        ];
    }

    /**
     * Get custom presets from localStorage
     */
    static getCustomPresets(): ConfigPreset[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Get all presets (built-in + custom)
     */
    static getAllPresets(): ConfigPreset[] {
        return [...this.getBuiltInPresets(), ...this.getCustomPresets()];
    }

    /**
     * Save custom preset
     */
    static savePreset(preset: Omit<ConfigPreset, 'id' | 'createdAt' | 'category'>): ConfigPreset {
        const newPreset: ConfigPreset = {
            ...preset,
            id: `custom-${Date.now()}`,
            category: 'custom',
            createdOn: new Date().toISOString()
        };

        const custom = this.getCustomPresets();
        custom.push(newPreset);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(custom));

        return newPreset;
    }

    /**
     * Delete custom preset
     */
    static deletePreset(id: string): boolean {
        const custom = this.getCustomPresets();
        const filtered = custom.filter(p => p.id !== id);
        
        if (filtered.length === custom.length) {
            return false; // Not found or built-in
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    /**
     * Export preset to JSON
     */
    static exportPreset(preset: ConfigPreset): string {
        return JSON.stringify(preset, null, 2);
    }

    /**
     * Import preset from JSON
     */
    static importPreset(json: string): ConfigPreset | null {
        try {
            const preset = JSON.parse(json);
            
            // Validate
            if (!preset.title || !preset.config) {
                throw new Error('Invalid preset format');
            }

            return this.savePreset({
                title: preset.title,
                description: preset.description || '',
                icon: preset.icon || '📋',
                config: preset.config,
                createdOn: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to import preset:', error);
            return null;
        }
    }

    /**
     * Apply preset to current config
     */
    static applyPreset(preset: ConfigPreset): any {
        return { ...preset.config };
    }

    /**
     * Create preset from current config
     */
    static createFromConfig(title: string, description: string, icon: string, config: any): ConfigPreset {
        return this.savePreset({
            title,
            description,
            icon,
            config: { ...config },
            createdOn: new Date().toISOString()
        });
    }

    /**
     * Download preset as JSON file
     */
    static downloadPreset(preset: ConfigPreset): void {
        const json = this.exportPreset(preset);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${preset.title.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
