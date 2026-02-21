/**
 * Story List Component Script
 * jQuery-style with Tabulator for interactive table
 */

(function() {
    'use strict';

    class StoryListComponent {
        constructor(container, apiClient, epicId) {
            this.$container = $(container);
            this.apiClient = apiClient;
            this.epicId = epicId;
            this.stories = [];
            this.tabulator = null;
            
            // Wait for libraries
            if (typeof Tabulator === 'undefined') {
                window.AICC.onLibrariesLoaded(() => this.init());
            } else {
                this.init();
            }
        }

        init() {
            this.initializeTabulator();
            this.bindEvents();
            if (this.epicId) {
                this.loadStories();
            }
        }

        initializeTabulator() {
            const tableElement = this.$container.find('.story-table')[0];
            if (!tableElement) return;

            this.tabulator = new Tabulator(tableElement, {
                layout: 'fitColumns',
                responsiveLayout: 'collapse',
                placeholder: 'No stories found',
                pagination: true,
                paginationSize: 10,
                columns: [
                    { 
                        title: 'ID', 
                        field: 'id', 
                        width: 100,
                        formatter: (cell) => {
                            return `<span class="badge bg-secondary">${cell.getValue()}</span>`;
                        }
                    },
                    { 
                        title: 'Title', 
                        field: 'title', 
                        widthGrow: 2,
                        formatter: 'textarea'
                    },
                    { 
                        title: 'Status', 
                        field: 'status', 
                        width: 120,
                        formatter: (cell) => {
                            const status = cell.getValue();
                            const badgeClass = this.getStatusBadgeClass(status);
                            return `<span class="badge ${badgeClass}">${status}</span>`;
                        }
                    },
                    { 
                        title: 'Priority', 
                        field: 'priority', 
                        width: 100,
                        formatter: (cell) => {
                            const priority = cell.getValue();
                            const badgeClass = this.getPriorityBadgeClass(priority);
                            return `<span class="badge ${badgeClass}">${priority || 'medium'}</span>`;
                        }
                    },
                    { 
                        title: 'Tasks', 
                        field: 'taskCount', 
                        width: 80,
                        hozAlign: 'center',
                        formatter: (cell) => {
                            const count = cell.getValue() || 0;
                            return `<span class="badge bg-info">${count}</span>`;
                        }
                    },
                    { 
                        title: 'Updated', 
                        field: 'updatedAt', 
                        width: 120,
                        formatter: (cell) => {
                            const date = cell.getValue();
                            return date ? moment(date).fromNow() : '-';
                        }
                    },
                    {
                        title: 'Actions',
                        field: 'actions',
                        width: 120,
                        hozAlign: 'center',
                        formatter: () => {
                            return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary story-action-edit" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-success story-action-run" title="Run">
                                        <i class="bi bi-play-fill"></i>
                                    </button>
                                    <button class="btn btn-outline-danger story-action-delete" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                        },
                        cellClick: (e, cell) => {
                            const $target = $(e.target);
                            const story = cell.getRow().getData();
                            
                            if ($target.closest('.story-action-edit').length) {
                                this.emit('edit', story);
                            } else if ($target.closest('.story-action-run').length) {
                                this.emit('run', story);
                            } else if ($target.closest('.story-action-delete').length) {
                                this.deleteStory(story);
                            }
                        }
                    }
                ],
                rowClick: (e, row) => {
                    const $target = $(e.target);
                    // Don't trigger row click if clicking action buttons
                    if (!$target.closest('.story-action-edit, .story-action-run, .story-action-delete').length) {
                        this.emit('select', row.getData());
                    }
                }
            });
        }

        getStatusBadgeClass(status) {
            return window.AICC?.utils?.getStatusBadgeClass(status) || 'bg-secondary';
        }

        getPriorityBadgeClass(priority) {
            return window.AICC?.utils?.getPriorityBadgeClass(priority) || 'bg-info';
        }

        bindEvents() {
            // Add story button
            this.$container.on('click', '.story-add', () => {
                this.emit('add', { epicId: this.epicId });
            });

            // Search input with debounce
            this.$container.on('input', '.story-search', _.debounce((e) => {
                const searchTerm = $(e.target).val().toLowerCase();
                if (this.tabulator) {
                    this.tabulator.setFilter([
                        { field: 'title', type: 'like', value: searchTerm },
                        { field: 'id', type: 'like', value: searchTerm }
                    ]);
                }
            }, 300));

            // Status filter
            this.$container.on('change', '.story-filter-status', (e) => {
                const status = $(e.target).val();
                if (this.tabulator) {
                    if (status) {
                        this.tabulator.setFilter('status', '=', status);
                    } else {
                        this.tabulator.clearFilter();
                    }
                }
            });

            // Refresh button
            this.$container.on('click', '.story-refresh', () => {
                this.loadStories(true);
            });
        }

        async loadStories(force = false) {
            if (!this.epicId) return;

            this.showLoading(true);
            this.hideError();

            try {
                this.stories = await this.apiClient.listStories(this.epicId);
                
                // Load task counts for each story
                await Promise.all(this.stories.map(async (story) => {
                    try {
                        const tasks = await this.apiClient.listTasks(this.epicId, story.id);
                        story.taskCount = tasks.length;
                    } catch (e) {
                        story.taskCount = 0;
                    }
                }));

                if (this.tabulator) {
                    this.tabulator.setData(this.stories);
                }
                
                this.showLoading(false);
                this.showEmpty(this.stories.length === 0);
            } catch (error) {
                console.error('Failed to load stories:', error);
                this.showError(error.message || 'Failed to load stories');
                this.showLoading(false);
            }
        }

        async deleteStory(story) {
            if (!confirm(`Are you sure you want to delete story "${story.title}"?`)) {
                return;
            }

            try {
                await this.apiClient.deleteStory(this.epicId, story.id);
                this.stories = this.stories.filter(s => s.id !== story.id);
                if (this.tabulator) {
                    this.tabulator.setData(this.stories);
                }
                this.emit('deleted', story);
            } catch (error) {
                console.error('Failed to delete story:', error);
                this.showError(error.message || 'Failed to delete story');
            }
        }

        setEpicId(epicId) {
            this.epicId = epicId;
            this.loadStories();
        }

        refresh() {
            this.loadStories(true);
        }

        showLoading(show) {
            this.$container.find('.story-list-loading').toggle(show);
        }

        showError(message) {
            this.$container.find('.story-list-error').text(message).fadeIn(200);
        }

        hideError() {
            this.$container.find('.story-list-error').fadeOut(200);
        }

        showEmpty(show) {
            this.$container.find('.story-list-empty').toggle(show);
        }

        emit(eventName, data) {
            const event = new CustomEvent(`story:${eventName}`, {
                detail: data,
                bubbles: true
            });
            this.$container[0].dispatchEvent(event);
        }

        on(eventName, handler) {
            this.$container.on(`story:${eventName}`, (e) => {
                handler(e.originalEvent.detail);
            });
        }

        // jQuery-style helper methods
        show() { this.$container.fadeIn(300); return this; }
        hide() { this.$container.fadeOut(300); return this; }
        toggle() { this.$container.fadeToggle(300); return this; }
    }

    window.StoryListComponent = StoryListComponent;
})();
