(function() {
    'use strict';

    // VSCode API (if running in webview)
    const vscode = (typeof acquireVsCodeApi !== 'undefined') ? acquireVsCodeApi() : null;

    // Initialize MCP API Client
    const apiClient = new MCPApiClient('/api', vscode);
    window.apiClient = apiClient;

    // Application State
    const appState = {
        currentView: 'tree',
        selectedItem: null,
        filters: {}
    };

    async function initializeApp() {
        try {
            console.log('Initializing AI Command Center...');

            // Load components
            await loadComponents();

            // Initialize components
            await initializeComponents();

            // Hide loading screen
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('app').style.display = 'flex';

            console.log('AI Command Center initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            showError('Failed to load application. Please refresh.');
        }
    }

    async function loadComponents() {
        const loader = window.componentLoader;

        // Load toolbar
        await loader.load('toolbar', document.getElementById('toolbar'));

        // Load planning tree
        await loader.load('planning-tree', document.getElementById('sidebar'));

        console.log('Components loaded');
    }

    async function initializeComponents() {
        // Initialize Planning Tree
        const treeContainer = document.getElementById('sidebar');
        if (treeContainer && window.PlanningTreeComponent) {
            window.planningTree = new PlanningTreeComponent(treeContainer, apiClient);

            // Listen to tree events
            window.planningTree.on('nodeSelected', (data) => {
                console.log('Node selected:', data);
                appState.selectedItem = data;
                loadDetailsPanel(data);
            });

            window.planningTree.on('nodeEdit', (data) => {
                console.log('Edit node:', data);
                showEditDialog(data);
            });

            window.planningTree.on('createEpic', () => {
                showCreateEpicDialog();
            });

            window.planningTree.on('addChild', (data) => {
                showAddChildDialog(data);
            });
        }
    }

    async function loadDetailsPanel(item) {
        const detailsPanel = document.getElementById('details-panel');
        if (!detailsPanel) return;

        try {
            let data;
            if (item.type === 'epic') {
                data = await apiClient.getEpic(item.id);
            } else if (item.type === 'story') {
                // Would need parent epic ID
                console.log('Load story details for:', item.id);
            } else if (item.type === 'task') {
                // Would need parent story and epic IDs
                console.log('Load task details for:', item.id);
            }

            // Render details
            detailsPanel.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h5>${item.type.toUpperCase()}: ${data?.title || item.id}</h5>
                    </div>
                    <div class="card-body">
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to load details:', error);
        }
    }

    function showEditDialog(item) {
        // Placeholder - would show a modal dialog
        console.log('Show edit dialog for:', item);
    }

    function showCreateEpicDialog() {
        // Placeholder - would show a modal dialog
        console.log('Show create epic dialog');
    }

    function showAddChildDialog(parent) {
        // Placeholder - would show a modal dialog
        console.log('Show add child dialog for:', parent);
    }

    function showError(message) {
        const loading = document.getElementById('loading');
        loading.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                ${message}
            </div>
        `;
    }

    // Start the application
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

})();
