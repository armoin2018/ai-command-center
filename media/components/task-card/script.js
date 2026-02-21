/**
 * Task Card Component Script
 * jQuery-style with Bootstrap form controls
 */

(function() {
    'use strict';

    class TaskCardComponent {
        constructor(container, apiClient, taskData) {
            this.$container = $(container);
            this.apiClient = apiClient;
            this.taskData = taskData;
            
            // Wait for libraries
            if (typeof $ === 'undefined') {
                window.AICC.onLibrariesLoaded(() => this.init());
            } else {
                this.init();
            }
        }

        init() {
            if (this.taskData) {
                this.render(this.taskData);
            }
            this.bindEvents();
        }

        bindEvents() {
            // Complete toggle with Bootstrap form-check
            this.$container.on('change', '.task-complete-toggle', (e) => {
                this.toggleComplete($(e.target).is(':checked'));
            });

            // Edit button
            this.$container.on('click', '.task-edit', (e) => {
                e.preventDefault();
                this.emit('edit', this.taskData);
            });

            // Run button
            this.$container.on('click', '.task-run', (e) => {
                e.preventDefault();
                this.emit('run', this.taskData);
            });

            // Delete button
            this.$container.on('click', '.task-delete', async (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to delete this task?')) {
                    await this.deleteTask();
                }
            });

            // Assign button
            this.$container.on('click', '.task-assign', (e) => {
                e.preventDefault();
                this.emit('assign', this.taskData);
            });
        }

        render(task) {
            this.taskData = task;
            const $card = this.$container.find('.task-card').length ? 
                         this.$container.find('.task-card') : this.$container;

            // Title and ID with ID:Title format
            $card.find('.task-title').text(`${task.id}: ${task.title}`);
            $card.find('.task-id').text(task.id);

            // Status badge with Bootstrap classes
            const $statusBadge = $card.find('.task-status');
            $statusBadge.text(task.status)
                .removeClass()
                .addClass(`task-status badge ${this.getStatusBadgeClass(task.status)}`);

            // Description
            $card.find('.task-description').text(task.description || '');

            // Bootstrap form-check checkbox state
            const $checkbox = $card.find('.task-complete-toggle');
            $checkbox.prop('checked', task.status === 'done');
            
            // Completed state styling
            if (task.status === 'done') {
                $card.addClass('task-completed border-success');
            } else {
                $card.removeClass('task-completed border-success');
            }

            // Priority with Bootstrap badge
            if (task.priority) {
                $card.addClass(`priority-${task.priority}`);
                $card.find('.task-priority')
                    .text(_.capitalize(task.priority))
                    .removeClass()
                    .addClass(`task-priority badge ${this.getPriorityBadgeClass(task.priority)}`);
                $card.find('[data-meta="priority"]').show();
            } else {
                $card.find('[data-meta="priority"]').hide();
            }

            // Assignee
            if (task.assignee) {
                $card.find('.task-assignee').text(task.assignee);
                $card.find('[data-meta="assignee"]').show();
            } else {
                $card.find('[data-meta="assignee"]').hide();
            }

            // Estimated hours
            if (task.estimatedHours) {
                $card.find('.task-estimated').text(`${task.estimatedHours}h`);
                $card.find('[data-meta="estimated"]').show();
            } else {
                $card.find('[data-meta="estimated"]').hide();
            }

            // Updated time with moment.js
            if (task.lastUpdatedOn) {
                $card.find('.task-updated').text(moment(task.lastUpdatedOn).fromNow());
            }
        }

        getStatusBadgeClass(status) {
            return window.AICC?.utils?.getStatusBadgeClass(status) || 'bg-secondary';
        }

        getPriorityBadgeClass(priority) {
            return window.AICC?.utils?.getPriorityBadgeClass(priority) || 'bg-info';
        }

        async toggleComplete(isComplete) {
            const newStatus = isComplete ? 'done' : 'todo';
            
            try {
                const epicId = this.taskData.epicId || this.getParentEpicId();
                const storyId = this.getParentStoryId();

                const updated = await this.apiClient.updateTask(
                    epicId,
                    storyId,
                    this.taskData.id,
                    { status: newStatus }
                );

                this.render(updated);
                this.emit('statusChanged', { task: updated, oldStatus: this.taskData.status, newStatus });
                
            } catch (error) {
                console.error('Failed to toggle task completion:', error);
                // Revert checkbox
                this.$container.find('.task-complete-toggle').prop('checked', !isComplete);
                alert('Failed to update task: ' + error.message);
            }
        }

        async deleteTask() {
            try {
                const epicId = this.taskData.epicId || this.getParentEpicId();
                const storyId = this.getParentStoryId();

                await this.apiClient.deleteTask(epicId, storyId, this.taskData.id);
                this.emit('deleted', this.taskData);
                this.$container.fadeOut(300, () => this.$container.remove());
                
            } catch (error) {
                console.error('Failed to delete task:', error);
                alert('Failed to delete task: ' + error.message);
            }
        }

        async refresh() {
            try {
                this.emit('refresh', this.taskData);
            } catch (error) {
                console.error('Failed to refresh task:', error);
            }
        }

        getParentEpicId() {
            const parentLink = this.taskData.links?.find(l => l.type === 'parent');
            return parentLink?.targetId;
        }

        getParentStoryId() {
            if (this.taskData.storyId) {
                return this.taskData.storyId;
            }
            const parentLink = this.taskData.links?.find(l => l.type === 'parent');
            return parentLink?.targetId;
        }

        emit(eventName, data) {
            const event = new CustomEvent(`task:${eventName}`, {
                detail: data,
                bubbles: true
            });
            this.$container[0].dispatchEvent(event);
        }

        on(eventName, handler) {
            this.$container.on(`task:${eventName}`, (e) => {
                handler(e.originalEvent.detail);
            });
        }

        // jQuery-style helper methods
        show() { this.$container.fadeIn(300); return this; }
        hide() { this.$container.fadeOut(300); return this; }
        toggle() { this.$container.fadeToggle(300); return this; }
    }

    window.TaskCardComponent = TaskCardComponent;
})();
