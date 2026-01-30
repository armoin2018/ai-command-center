/**
 * Planning Tree Component Script
 * jQuery-style with Bootstrap styling
 */

(function() {
    'use strict';

    class PlanningTreeComponent {
        constructor(container, apiClient) {
            this.$container = $(container);
            this.apiClient = apiClient;
            this.treeData = null;
            this.selectedNode = null;
            this.expandedNodes = new Set();
            
            // Wait for libraries
            if (typeof $ === 'undefined') {
                window.AICC.onLibrariesLoaded(() => this.init());
            } else {
                this.init();
            }
        }

        init() {
            this.bindEvents();
            this.loadTree();
        }

        bindEvents() {
            // Refresh button
            this.$container.on('click', '.tree-refresh', () => {
                this.loadTree(true);
            });

            // Expand all
            this.$container.on('click', '.tree-expand-all', () => {
                this.expandAll();
            });

            // Collapse all
            this.$container.on('click', '.tree-collapse-all', () => {
                this.collapseAll();
            });

            // Create first epic
            this.$container.on('click', '.tree-create-epic', () => {
                this.createEpic();
            });

            // Tree node clicks (event delegation)
            this.$container.on('click', '.tree-content', (e) => {
                const $target = $(e.target);
                const $toggle = $target.closest('.tree-toggle');
                const $nodeContent = $target.closest('.tree-node-content');
                const $editBtn = $target.closest('.node-action-edit');
                const $deleteBtn = $target.closest('.node-action-delete');
                const $addBtn = $target.closest('.node-action-add');

                if ($toggle.length) {
                    e.stopPropagation();
                    this.toggleNode($toggle.closest('.tree-node'));
                } else if ($editBtn.length) {
                    e.stopPropagation();
                    this.editNode($editBtn.closest('.tree-node'));
                } else if ($deleteBtn.length) {
                    e.stopPropagation();
                    this.deleteNode($deleteBtn.closest('.tree-node'));
                } else if ($addBtn.length) {
                    e.stopPropagation();
                    this.addChild($addBtn.closest('.tree-node'));
                } else if ($nodeContent.length) {
                    this.selectNode($nodeContent.closest('.tree-node'));
                }
            });
        }

        async loadTree(force = false) {
            this.showLoading(true);
            this.hideError();

            try {
                this.treeData = await this.apiClient.getPlanningTree();
                this.updateStats(this.treeData.stats);
                this.renderTree(this.treeData);
                this.showLoading(false);
                
                if (!this.treeData.epics || this.treeData.epics.length === 0) {
                    this.showEmpty(true);
                } else {
                    this.showEmpty(false);
                }
            } catch (error) {
                console.error('Failed to load planning tree:', error);
                this.showError(error.message || 'Failed to load planning tree');
                this.showLoading(false);
            }
        }

        renderTree(treeData) {
            const $root = this.$container.find('.tree-root');
            $root.empty();

            if (!treeData.epics || treeData.epics.length === 0) {
                return;
            }

            treeData.epics.forEach(epic => {
                const $epicNode = this.createTreeNode(epic);
                $root.append($epicNode);
            });
        }

        createTreeNode(nodeData) {
            const template = document.getElementById('tree-node-template');
            const clone = template.content.cloneNode(true);
            const $node = $(clone).find('.tree-node');

            $node.attr('data-node-id', nodeData.id);
            $node.attr('data-node-type', nodeData.type);
            
            if (!nodeData.children || nodeData.children.length === 0) {
                $node.addClass('leaf');
            }

            if (this.expandedNodes.has(nodeData.id)) {
                $node.addClass('expanded');
            }

            const $label = $node.find('.tree-label');
            $label.text(`${nodeData.id}: ${nodeData.title}`);

            const $status = $node.find('.tree-status');
            $status.text(nodeData.status).addClass(`badge bg-${this.getStatusBadgeColor(nodeData.status)}`);

            // Render children
            if (nodeData.children && nodeData.children.length > 0) {
                const $childrenContainer = $node.find('.tree-children');
                nodeData.children.forEach(child => {
                    const $childNode = this.createTreeNode(child);
                    $childrenContainer.append($childNode);
                });
            }

            return $node;
        }

        getStatusBadgeColor(status) {
            const colors = {
                'todo': 'secondary',
                'ready': 'info',
                'in-progress': 'primary',
                'review': 'warning',
                'done': 'success',
                'blocked': 'danger'
            };
            return colors[status] || 'secondary';
        }

        toggleNode($node) {
            if (!($node instanceof $)) $node = $($node);
            const nodeId = $node.data('node-id');
            
            if ($node.hasClass('expanded')) {
                $node.removeClass('expanded');
                $node.find('.tree-children').first().slideUp(200);
                this.expandedNodes.delete(nodeId);
            } else {
                $node.addClass('expanded');
                $node.find('.tree-children').first().slideDown(200);
                this.expandedNodes.add(nodeId);
            }
        }

        selectNode($node) {
            if (!($node instanceof $)) $node = $($node);
            
            // Remove previous selection
            this.$container.find('.tree-node.selected').removeClass('selected');

            $node.addClass('selected');
            this.selectedNode = $node.data('node-id');

            // Emit selection event
            this.emit('nodeSelected', {
                id: $node.data('node-id'),
                type: $node.data('node-type')
            });
        }

        async editNode($node) {
            if (!($node instanceof $)) $node = $($node);
            const nodeId = $node.data('node-id');
            const nodeType = $node.data('node-type');

            this.emit('nodeEdit', {
                id: nodeId,
                type: nodeType
            });
        }

        async deleteNode($node) {
            if (!($node instanceof $)) $node = $($node);
            const nodeId = $node.data('node-id');
            const nodeType = $node.data('node-type');

            if (!confirm(`Are you sure you want to delete this ${nodeType}?`)) {
                return;
            }

            try {
                if (nodeType === 'epic') {
                    await this.apiClient.deleteEpic(nodeId);
                } else if (nodeType === 'story') {
                    const epicId = this.getParentEpicId($node);
                    await this.apiClient.deleteStory(epicId, nodeId);
                } else if (nodeType === 'task') {
                    const { epicId, storyId } = this.getParentIds($node);
                    await this.apiClient.deleteTask(epicId, storyId, nodeId);
                }

                this.loadTree(true);
                this.emit('nodeDeleted', { id: nodeId, type: nodeType });
            } catch (error) {
                console.error('Failed to delete node:', error);
                this.showError(error.message || 'Failed to delete item');
            }
        }

        async addChild($node) {
            if (!($node instanceof $)) $node = $($node);
            const nodeId = $node.data('node-id');
            const nodeType = $node.data('node-type');

            this.emit('addChild', {
                parentId: nodeId,
                parentType: nodeType
            });
        }

        async createEpic() {
            this.emit('createEpic', {});
        }

        expandAll() {
            this.$container.find('.tree-node').not('.leaf').each((_, node) => {
                const $node = $(node);
                $node.addClass('expanded');
                $node.find('.tree-children').first().slideDown(200);
                this.expandedNodes.add($node.data('node-id'));
            });
        }

        collapseAll() {
            this.$container.find('.tree-node').each((_, node) => {
                const $node = $(node);
                $node.removeClass('expanded');
                $node.find('.tree-children').first().slideUp(200);
            });
            this.expandedNodes.clear();
        }

        updateStats(stats) {
            if (!stats) return;

            this.$container.find('.stats-epics').text(stats.totalEpics || 0);
            this.$container.find('.stats-stories').text(stats.totalStories || 0);
            this.$container.find('.stats-tasks').text(stats.totalTasks || 0);
            this.$container.find('.stats-completed').text(stats.completedItems || 0);
        }

        showLoading(show) {
            this.$container.find('.tree-loading').toggle(show);
        }

        showError(message) {
            const $error = this.$container.find('.tree-error');
            $error.find('.error-message').text(message);
            $error.fadeIn(200);
        }

        hideError() {
            this.$container.find('.tree-error').fadeOut(200);
        }

        showEmpty(show) {
            this.$container.find('.tree-empty').toggle(show);
        }

        getParentEpicId($node) {
            if (!($node instanceof $)) $node = $($node);
            const $epicNode = $node.closest('[data-node-type="epic"]');
            return $epicNode.length ? $epicNode.data('node-id') : null;
        }

        getParentIds($node) {
            if (!($node instanceof $)) $node = $($node);
            const $storyNode = $node.closest('[data-node-type="story"]');
            const $epicNode = $node.closest('[data-node-type="epic"]');
            
            return {
                storyId: $storyNode.length ? $storyNode.data('node-id') : null,
                epicId: $epicNode.length ? $epicNode.data('node-id') : null
            };
        }

        emit(eventName, data) {
            const event = new CustomEvent(`tree:${eventName}`, {
                detail: data,
                bubbles: true
            });
            this.$container[0].dispatchEvent(event);
        }

        on(eventName, handler) {
            this.$container.on(`tree:${eventName}`, (e) => {
                handler(e.originalEvent.detail);
            });
        }

        // jQuery-style helper methods
        show() { this.$container.fadeIn(300); return this; }
        hide() { this.$container.fadeOut(300); return this; }
        toggle() { this.$container.fadeToggle(300); return this; }
    }

    window.PlanningTreeComponent = PlanningTreeComponent;
})();
