/**
 * Toolbar Component Script
 * jQuery-style implementation with Bootstrap
 */

(function() {
    'use strict';

    class ToolbarComponent {
        constructor(container) {
            this.$container = $(container);
            this.currentView = 'tree';
            this.init();
        }

        init() {
            // Wait for libraries to be loaded
            if (typeof $ === 'undefined') {
                console.error('jQuery not loaded! Waiting for libraries...');
                window.AICC.onLibrariesLoaded(() => {
                    this.$container = $(this.$container[0] || container);
                    this.bindEvents();
                });
            } else {
                this.bindEvents();
            }
        }

        bindEvents() {
            // View switchers using jQuery event delegation
            this.$container.on('click', '.view-tree', (e) => {
                e.preventDefault();
                this.switchView('tree');
                this.setActiveView($(e.currentTarget));
            });

            this.$container.on('click', '.view-kanban', (e) => {
                e.preventDefault();
                this.switchView('kanban');
                this.setActiveView($(e.currentTarget));
            });

            this.$container.on('click', '.view-timeline', (e) => {
                e.preventDefault();
                this.switchView('timeline');
                this.setActiveView($(e.currentTarget));
            });

            this.$container.on('click', '.view-table', (e) => {
                e.preventDefault();
                this.switchView('table');
                this.setActiveView($(e.currentTarget));
            });

            // Action buttons
            this.$container.on('click', '.toolbar-create', (e) => {
                e.preventDefault();
                $(e.currentTarget).addClass('pulse-once');
                setTimeout(() => $(e.currentTarget).removeClass('pulse-once'), 300);
                this.emit('create', {});
            });

            this.$container.on('click', '.toolbar-search', (e) => {
                e.preventDefault();
                this.emit('search', {});
            });

            this.$container.on('click', '.toolbar-settings', (e) => {
                e.preventDefault();
                this.emit('settings', {});
            });
        }

        switchView(viewName) {
            this.currentView = viewName;
            
            // Update active state with jQuery
            this.$container.find('.dropdown-item').removeClass('active');
            this.$container.find(`.view-${viewName}`).addClass('active');
            
            this.emit('viewChanged', { view: viewName });
        }

        setActiveView($element) {
            // Remove active from all dropdown items
            this.$container.find('.dropdown-item').removeClass('active');
            // Add active to clicked item
            $element.addClass('active');
        }

        emit(eventName, data) {
            const event = new CustomEvent(`toolbar:${eventName}`, {
                detail: data,
                bubbles: true
            });
            this.$container[0].dispatchEvent(event);
        }

        on(eventName, handler) {
            this.$container.on(`toolbar:${eventName}`, (e) => {
                handler(e.originalEvent.detail);
            });
        }

        // jQuery-style helper methods
        show() {
            this.$container.fadeIn(300);
            return this;
        }

        hide() {
            this.$container.fadeOut(300);
            return this;
        }

        disable() {
            this.$container.find('button, a').addClass('disabled').prop('disabled', true);
            return this;
        }

        enable() {
            this.$container.find('button, a').removeClass('disabled').prop('disabled', false);
            return this;
        }
    }

    window.ToolbarComponent = ToolbarComponent;
})();
