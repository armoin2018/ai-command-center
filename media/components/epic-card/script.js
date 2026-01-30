/**
 * Epic Card Component Script
 * jQuery-style with Bootstrap cards and Chart.js for progress
 */

(function() {
    'use strict';

    class EpicCardComponent {
        constructor(container, apiClient, epicData) {
            this.$container = $(container);
            this.apiClient = apiClient;
            this.epicData = epicData;
            this.progressChart = null;
            
            // Wait for libraries
            if (typeof $ === 'undefined' || typeof Chart === 'undefined') {
                window.AICC.onLibrariesLoaded(() => this.init());
            } else {
                this.init();
            }
        }

        init() {
            if (this.epicData) {
                this.render(this.epicData);
            }
            this.bindEvents();
        }

        bindEvents() {
            // Edit button
            this.$container.on('click', '.epic-edit', (e) => {
                e.preventDefault();
                this.emit('edit', this.epicData);
            });

            // Delete button
            this.$container.on('click', '.epic-delete', async (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to delete this epic?')) {
                    await this.deleteEpic();
                }
            });

            // Run button
            this.$container.on('click', '.epic-run', (e) => {
                e.preventDefault();
                this.emit('run', this.epicData);
            });

            // Add story button
            this.$container.on('click', '.epic-add-story', (e) => {
                e.preventDefault();
                this.emit('addStory', this.epicData);
            });

            // View details button
            this.$container.on('click', '.epic-view-details', (e) => {
                e.preventDefault();
                this.emit('viewDetails', this.epicData);
            });
        }

        render(epic) {
            this.epicData = epic;

            // Title and ID with Bootstrap card styling
            this.$container.find('.epic-title').text(`${epic.id}: ${epic.title}`);
            this.$container.find('.epic-id').text(epic.id);

            // Status badge with Bootstrap classes
            const $statusBadge = this.$container.find('.epic-status');
            $statusBadge.text(epic.status)
                .removeClass()
                .addClass(`epic-status badge ${this.getStatusBadgeClass(epic.status)}`);

            // Description
            this.$container.find('.epic-description').text(epic.description || 'No description');

            // Metadata with moment.js formatting
            if (epic.assignee) {
                this.$container.find('.epic-assignee').text(epic.assignee);
            }

            if (epic.createdOn) {
                this.$container.find('.epic-created').text(moment(epic.createdOn).format('MMM D, YYYY'));
            }

            if (epic.lastUpdatedOn) {
                this.$container.find('.epic-updated').text(moment(epic.lastUpdatedOn).fromNow());
            }

            // Stats and progress
            this.updateStats(epic);
        }

        getStatusBadgeClass(status) {
            const classes = {
                'todo': 'bg-secondary',
                'ready': 'bg-info',
                'in-progress': 'bg-primary',
                'review': 'bg-warning text-dark',
                'done': 'bg-success',
                'blocked': 'bg-danger'
            };
            return classes[status] || 'bg-secondary';
        }

        async updateStats(epic) {
            try {
                // Get stories for this epic
                const stories = await this.apiClient.listStories(epic.id);
                const storyCount = stories.length;
                
                // Count tasks across all stories
                let taskCount = 0;
                let completedTasks = 0;
                let inProgressTasks = 0;
                let todoTasks = 0;

                for (const story of stories) {
                    const tasks = await this.apiClient.listTasks(epic.id, story.id);
                    taskCount += tasks.length;
                    completedTasks += tasks.filter(t => t.status === 'done').length;
                    inProgressTasks += tasks.filter(t => t.status === 'in-progress').length;
                    todoTasks += tasks.filter(t => t.status === 'todo' || t.status === 'ready').length;
                }

                // Update counts
                this.$container.find('.epic-stories-count').text(storyCount);
                this.$container.find('.epic-tasks-count').text(taskCount);

                // Calculate and update progress
                const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;
                this.$container.find('.epic-progress-text').text(`${progress}%`);
                this.$container.find('.epic-progress-bar')
                    .css('width', `${progress}%`)
                    .addClass('progress-bar')
                    .addClass(progress >= 100 ? 'bg-success' : progress >= 50 ? 'bg-primary' : 'bg-warning');

                // Create Chart.js doughnut chart for progress visualization
                this.createProgressChart({
                    completed: completedTasks,
                    inProgress: inProgressTasks,
                    todo: todoTasks
                });

            } catch (error) {
                console.error('Failed to update epic stats:', error);
            }
        }

        createProgressChart(data) {
            const $canvas = this.$container.find('.epic-progress-chart');
            if (!$canvas.length || typeof Chart === 'undefined') return;

            // Destroy existing chart if any
            if (this.progressChart) {
                this.progressChart.destroy();
            }

            const ctx = $canvas[0].getContext('2d');
            this.progressChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'In Progress', 'Todo'],
                    datasets: [{
                        data: [data.completed, data.inProgress, data.todo],
                        backgroundColor: [
                            '#198754', // success green
                            '#0d6efd', // primary blue
                            '#6c757d'  // secondary gray
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        async deleteEpic() {
            try {
                await this.apiClient.deleteEpic(this.epicData.id);
                this.emit('deleted', this.epicData);
                this.$container.fadeOut(300, () => this.$container.remove());
            } catch (error) {
                console.error('Failed to delete epic:', error);
                alert('Failed to delete epic: ' + error.message);
            }
        }

        async refresh() {
            try {
                const epic = await this.apiClient.getEpic(this.epicData.id);
                this.render(epic);
            } catch (error) {
                console.error('Failed to refresh epic:', error);
            }
        }

        emit(eventName, data) {
            const event = new CustomEvent(`epic:${eventName}`, {
                detail: data,
                bubbles: true
            });
            this.$container[0].dispatchEvent(event);
        }

        on(eventName, handler) {
            this.$container.on(`epic:${eventName}`, (e) => {
                handler(e.originalEvent.detail);
            });
        }

        // jQuery-style helper methods
        show() { this.$container.fadeIn(300); return this; }
        hide() { this.$container.fadeOut(300); return this; }
        toggle() { this.$container.fadeToggle(300); return this; }
    }

    window.EpicCardComponent = EpicCardComponent;
})();
