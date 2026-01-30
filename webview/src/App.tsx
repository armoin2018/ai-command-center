/**
 * AI Command Center WebView App
 * 
 * Main React component for the planning tree visualization
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useVSCode } from './hooks/useVSCode';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useContextMenu } from './hooks/useContextMenu';
import { useStatePersistence } from './hooks/useStatePersistence';
import { useDragDrop } from './hooks/useDragDrop';
import { useTheme } from './hooks/useTheme';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useDebounce } from './hooks/useDebounce';
import { useTreeFiltering } from './hooks/useTreeFiltering';
import { TreeView } from './components/TreeView';
import { Toolbar } from './components/Toolbar';
import { DetailsPanel } from './components/DetailsPanel';
import { FilterBar, FilterState } from './components/FilterBar';
import { ContextMenu } from './components/ContextMenu';
import { StatsPanel } from './components/StatsPanel';
import { ShortcutsPanel } from './components/ShortcutsPanel';
import { ThemeSelector } from './components/ThemeSelector';
import { TimelineView } from './components/TimelineView';
import { KanbanBoard } from './components/KanbanBoard';
import { CalendarView } from './components/CalendarView';
import { AdvancedFilter, FilterCondition } from './components/AdvancedFilter';
import { BulkOperations } from './components/BulkOperations';
import { SelectableTree } from './components/SelectableTree';
import { Charts } from './components/Charts';
import { OnboardingWizard } from './components/OnboardingWizard';
import { HelpPanel } from './components/HelpPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CustomFieldsPanel } from './components/CustomFieldsPanel';
import { SprintPanel } from './components/SprintPanel';
import { ComponentRef, useComponentReference } from './components/ComponentReference';
import { FilterEngine } from './utils/filterEngine';
import type { TreeNodeData } from './types/tree';
import { ExportService, ExportFormat } from './utils/exportService';
import { PrintService } from './utils/printService';
import './App.css';
import './components/DragDrop.css';
import './components/ComponentReference.css';
import './print.css';
import './responsive.css';

export const App: React.FC = () => {
    const { postMessage, onMessage } = useVSCode();
    const [tree, setTree] = useState<TreeNodeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showComponentRefs, setShowComponentRefs] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
    const [viewMode, setViewMode] = useState<'tree' | 'timeline' | 'kanban' | 'calendar' | 'charts' | 'sprint'>('tree');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
    const [showHelp, setShowHelp] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(() => {
        const completed = localStorage.getItem('onboarding-completed');
        return !completed;
    });
    const [showCustomFields, setShowCustomFields] = useState(false);
    const [theme, setTheme] = useTheme();
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        status: [],
        type: [],
        priority: []
    });

    // Debounce search input for better performance
    const debouncedFilters = useDebounce(filters, 300);

    // Setup undo/redo system
    const { trackOperation, clearHistory } = useUndoRedo({
        onUndo: (message) => postMessage(message),
        onRedo: (message) => postMessage(message),
        onHistoryChange: (canUndo, canRedo) => {
            // Could update UI to show undo/redo button states
            postMessage({
                type: 'log',
                payload: {
                    level: 'info',
                    message: `History state: canUndo=${canUndo}, canRedo=${canRedo}`
                }
            });
        }
    });

    useEffect(() => {
        postMessage({ type: 'log', payload: { level: 'info', message: 'WebView initialized' } });

        const cleanup = onMessage((message) => {
            switch (message.type) {
                case 'treeData':
                    setTree(message.payload.tree);
                    setLoading(false);
                    // Clear history on tree reload to avoid stale references
                    clearHistory();
                    break;
                case 'error':
                    setError(message.payload.message);
                    setLoading(false);
                    break;
                case 'settingsUpdate':
                    if (message.payload?.showComponentReferences !== undefined) {
                        setShowComponentRefs(message.payload.showComponentReferences);
                    }
                    break;
                case 'init':
                    if (message.payload?.settings?.showComponentReferences !== undefined) {
                        setShowComponentRefs(message.payload.settings.showComponentReferences);
                    }
                    break;
            }
        });

        return cleanup;
    }, [postMessage, onMessage, clearHistory]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyboard = (e: KeyboardEvent) => {
            // F1 or ? to toggle help panel
            if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
                e.preventDefault();
                setShowHelp(prev => !prev);
            }
            // Ctrl/Cmd + / to toggle shortcuts panel
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            }
            // Ctrl/Cmd + P to print
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                handlePrint();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyboard);
        return () => window.removeEventListener('keydown', handleGlobalKeyboard);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNodeToggle = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const handleRefresh = () => {
        setLoading(true);
        postMessage({ type: 'log', payload: { level: 'info', message: 'Refresh requested' } });
    };

    const handleCreateStory = (epicId: string) => {
        const name = prompt('Enter story name:');
        if (name) {
            const payload = { epicId, title: name, description: 'Created from WebView', estimatedHours: 0 };
            postMessage({
                type: 'createStory',
                payload
            });
            // Track operation for undo
            trackOperation({
                type: 'create',
                itemType: 'story',
                timestamp: Date.now(),
                data: {
                    parentId: epicId,
                    afterState: payload
                }
            });
        }
    };

    const handleCreateTask = (storyId: string) => {
        const name = prompt('Enter task name:');
        if (name) {
            // Find epic ID from story
            const findEpicId = (nodes: TreeNodeData[]): string | null => {
                for (const node of nodes) {
                    if (node.type === 'epic' && node.children) {
                        if (node.children.some((s: TreeNodeData) => s.id === storyId)) {
                            return node.id;
                        }
                    }
                    if (node.children) {
                        const found = findEpicId(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            const epicId = findEpicId(tree);
            if (epicId) {
                const payload = { epicId, storyId, title: name, description: 'Created from WebView' };
                postMessage({
                    type: 'createTask',
                    payload
                });
                // Track operation for undo
                trackOperation({
                    type: 'create',
                    itemType: 'task',
                    timestamp: Date.now(),
                    data: {
                        parentId: storyId,
                        afterState: payload
                    }
                });
            }
        }
    };

    const handleCreateEpic = () => {
        const name = prompt('Enter epic name:');
        if (name) {
            const payload = { title: name, description: 'Created from WebView', priority: 'medium' };
            postMessage({
                type: 'createEpic',
                payload
            });
            // Track operation for undo
            trackOperation({
                type: 'create',
                itemType: 'epic',
                timestamp: Date.now(),
                data: {
                    afterState: payload
                }
            });
        }
    };

    const handleNodeClick = (node: TreeNodeData) => {
        setSelectedNode(node);
        postMessage({
            type: 'log',
            payload: { level: 'info', message: `Node selected: ${node.title}` }
        });
    };

    const handleUpdateNode = (updates: any) => {
        if (!selectedNode) return;
        postMessage({
            type: 'updateItem',
            payload: { itemType: selectedNode.type, id: selectedNode.id, updates }
        });
    };

    const handleDeleteNode = () => {
        if (!selectedNode) return;
        postMessage({
            type: 'deleteItem',
            payload: { itemType: selectedNode.type, id: selectedNode.id }
        });
        setSelectedNode(null);
    };

    const handleChangeStatus = (node: TreeNodeData, status: string) => {
        postMessage({
            type: 'updateItem',
            payload: { itemType: node.type, id: node.id, updates: { status } }
        });
    };

    const handleDuplicate = (node: TreeNodeData) => {
        const name = prompt(`Duplicate ${node.type}:`, `${node.title} (Copy)`);
        if (name) {
            if (node.type === 'epic') {
                postMessage({
                    type: 'createEpic',
                    payload: { title: name, description: node.description || '', priority: 'medium' }
                });
            }
        }
    };

    // Helper to find node by ID
    const findNodeById = (nodes: TreeNodeData[], id: string): TreeNodeData | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNodeById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const handleClearFilters = () => {
        setFilters({ 
            search: '', 
            status: [], 
            type: [], 
            priority: [],
            estimatedHoursMin: undefined,
            estimatedHoursMax: undefined,
            dateFrom: undefined,
            dateTo: undefined
        });
    };

    const handleExport = (format: ExportFormat) => {
        ExportService.export(tree, format);
        postMessage({
            type: 'log',
            payload: { level: 'info', message: `Exported tree as ${format}` }
        });
    };

    const handlePrint = () => {
        PrintService.print(tree);
        postMessage({
            type: 'log',
            payload: { level: 'info', message: 'Print dialog opened' }
        });
    };

    const handleExportPDF = () => {
        PrintService.exportPDF(tree);
        postMessage({
            type: 'log',
            payload: { level: 'info', message: 'PDF export initiated' }
        });
    };

    const handleReorder = (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
        postMessage({
            type: 'reorder',
            payload: { draggedId, targetId, position }
        });
        postMessage({
            type: 'log',
            payload: { level: 'info', message: `Reordered ${draggedId} ${position} ${targetId}` }
        });
    };

    // Use optimized tree filtering hook with debounced filters
    const filteredTree = useTreeFiltering(tree, debouncedFilters);

    // Setup keyboard navigation
    useKeyboardNavigation({
        nodes: filteredTree,
        selectedNode,
        expandedNodes,
        onNodeSelect: handleNodeClick,
        onNodeToggle: handleNodeToggle,
        onExpandAll: () => {
            const allIds = new Set<string>();
            const collectIds = (nodes: TreeNodeData[]) => {
                nodes.forEach(n => {
                    allIds.add(n.id);
                    if (n.children) collectIds(n.children);
                });
            };
            collectIds(filteredTree);
            setExpandedNodes(allIds);
        },
        onCollapseAll: () => setExpandedNodes(new Set()),
        onRefresh: handleRefresh
    });

    // Setup context menu
    const { menuPosition, menuActions, handleContextMenu, closeMenu } = useContextMenu({
        onCreateStory: handleCreateStory,
        onCreateTask: handleCreateTask,
        onEdit: (node) => setSelectedNode(node),
        onDelete: (node) => {
            if (confirm(`Delete ${node.type}: ${node.title}?`)) {
                postMessage({
                    type: 'deleteItem',
                    payload: { itemType: node.type, id: node.id }
                });
            }
        },
        onDuplicate: handleDuplicate,
        onChangeStatus: handleChangeStatus,
        onRun: (node) => {
            // Run command for the item
            postMessage({
                type: 'log',
                payload: { 
                    level: 'info', 
                    message: `Run command requested for ${node.type}: ${node.title} (${node.id})`,
                    data: { action: 'run', itemType: node.type, id: node.id }
                }
            });
        }
    });

    // Persist state
    useStatePersistence(expandedNodes, selectedNode, filters, setExpandedNodes, setFilters);

    // Setup drag-and-drop
    const {
        dragState,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
        getDropIndicatorClass
    } = useDragDrop(handleReorder);

    if (loading) {
        return (
            <div className="container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="error">
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* Component Reference Label for Main Panel */}
            {showComponentRefs && (
                <div className="component-ref-label ref-position-top-right" style={{ position: 'fixed', top: 4, right: 4, zIndex: 10000 }} title="Main Planning Panel&#10;📁 src/panels/mainPanel.ts&#10;📁 webview/src/App.tsx">
                    <span className="ref-badge">REF</span>
                    <span className="ref-id">MAIN-PANEL</span>
                </div>
            )}
            
            {showComponentRefs && (
                <div className="component-ref-label" style={{ position: 'relative', display: 'inline-block', marginBottom: 4 }} title="Toolbar&#10;📁 webview/src/components/Toolbar.tsx">
                    <span className="ref-badge">REF</span>
                    <span className="ref-id">TOOLBAR</span>
                </div>
            )}
            <Toolbar
                onRefresh={handleRefresh}
                onCreateEpic={handleCreateEpic}
                onExpandAll={() => setExpandedNodes(new Set(tree.map(n => n.id)))}
                onCollapseAll={() => setExpandedNodes(new Set())}
            />
            
            <div className="settings-bar">
                <ThemeSelector currentTheme={theme} onChange={setTheme} />
                
                <button
                    onClick={() => setShowAdvancedFilter(true)}
                    className="filter-button"
                    title="Advanced Filters"
                >
                    🔍 Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
                </button>

                <div className="view-mode-toggle">
                    <button 
                        className={viewMode === 'tree' ? 'active' : ''}
                        onClick={() => setViewMode('tree')}
                        title="Tree View"
                    >
                        📋 Tree
                    </button>
                    <button 
                        className={viewMode === 'timeline' ? 'active' : ''}
                        onClick={() => setViewMode('timeline')}
                        title="Timeline View"
                    >
                        📅 Timeline
                    </button>
                    <button 
                        className={viewMode === 'kanban' ? 'active' : ''}
                        onClick={() => setViewMode('kanban')}
                        title="Kanban Board"
                    >
                        📊 Kanban
                    </button>                    <button
                        className={`view-button ${viewMode === 'calendar' ? 'active' : ''}`}
                        onClick={() => setViewMode('calendar')}
                        title="Calendar View"
                    >
                        📅 Calendar
                    </button>
                    <button
                        className={`view-button ${viewMode === 'charts' ? 'active' : ''}`}
                        onClick={() => setViewMode('charts')}
                        title="Charts & Analytics"
                    >
                        📊 Charts
                    </button>
                    <button
                        className={`view-button ${viewMode === 'sprint' ? 'active' : ''}`}
                        onClick={() => setViewMode('sprint')}
                        title="Sprint Planning"
                    >
                        🏃 Sprint
                    </button>
                </div>

                <button
                    onClick={() => setShowCustomFields(prev => !prev)}
                    className="settings-button"
                    title="Manage Custom Fields"
                >
                    ⚙️ Fields
                </button>

                <button
                    onClick={() => setShowHelp(prev => !prev)}
                    className="help-button"
                    title="Help (F1)"
                >
                    ❓ Help
                </button>

                <button
                    className={`selection-mode-button ${selectionMode ? 'active' : ''}`}
                    onClick={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) {
                            setSelectedNodes(new Set());
                        }
                    }}
                    title="Toggle Selection Mode"
                >
                    {selectionMode ? '✓ Selection Mode' : '☐ Select'}
                </button>
            </div>

            <main className="main">
                {viewMode === 'tree' ? (
                    <>
                        <div className="tree-container">
                            {showComponentRefs && (
                                <div className="component-ref-label" style={{ position: 'relative', display: 'inline-block', marginBottom: 4 }} title="Filter Bar&#10;📁 webview/src/components/FilterBar.tsx">
                                    <span className="ref-badge">REF</span>
                                    <span className="ref-id">FILTER-BAR</span>
                                </div>
                            )}
                            <FilterBar
                                filters={filters}
                                onFilterChange={setFilters}
                                onClear={handleClearFilters}
                            />
                            
                            {showComponentRefs && (
                                <div className="component-ref-label" style={{ position: 'relative', display: 'inline-block', marginBottom: 4, marginTop: 8 }} title="Tree View&#10;📁 webview/src/components/TreeView.tsx">
                                    <span className="ref-badge">REF</span>
                                    <span className="ref-id">TREE-VIEW</span>
                                </div>
                            )}
                            {selectionMode ? (
                                <SelectableTree
                                    tree={FilterEngine.filterTree(filteredTree, activeFilters)}
                                    expandedNodes={expandedNodes}
                                    selectedNodes={selectedNodes}
                                    onToggleExpand={handleNodeToggle}
                                    onToggleSelect={(id) => {
                                        const newSelection = new Set(selectedNodes);
                                        if (newSelection.has(id)) {
                                            newSelection.delete(id);
                                        } else {
                                            newSelection.add(id);
                                        }
                                        setSelectedNodes(newSelection);
                                    }}
                                    onSelectAll={() => {
                                        const allIds = new Set<string>();
                                        const traverse = (nodes: TreeNodeData[]) => {
                                            nodes.forEach(node => {
                                                allIds.add(node.id);
                                                if (node.children) traverse(node.children);
                                            });
                                        };
                                        traverse(FilterEngine.filterTree(filteredTree, activeFilters));
                                        setSelectedNodes(allIds);
                                    }}
                                    onSelectNone={() => setSelectedNodes(new Set())}
                                />
                            ) : (
                                <TreeView
                                    tree={FilterEngine.filterTree(filteredTree, activeFilters)}
                                    expandedNodes={expandedNodes}
                                    selectedNodeId={selectedNode?.id || null}
                                    onToggleExpand={handleNodeToggle}
                                    onSelectNode={handleNodeClick}
                                    onContextMenu={handleContextMenu}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onDragEnd={handleDragEnd}
                                    getDropIndicatorClass={getDropIndicatorClass}
                                />
                            )}
                        </div>

                        <StatsPanel tree={tree} />
                    </>
                ) : viewMode === 'charts' ? (
                    <Charts tree={tree} />
                ) : viewMode === 'timeline' ? (
                    <div className="timeline-container">
                        <TimelineView 
                            tree={tree}
                            onSelectNode={(node) => setSelectedNode(node)}
                        />
                    </div>
                ) : viewMode === 'kanban' ? (
                    <div className="kanban-container">
                        <KanbanBoard
                            tree={tree}
                            onSelectNode={handleNodeClick}
                            onUpdateStatus={(nodeId, status) => {
                                const node = findNodeById(tree, nodeId);
                                if (node) {
                                    handleChangeStatus(node, status);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="calendar-container">
                        <CalendarView
                            tree={tree}
                            onSelectNode={(node) => setSelectedNode(node)}
                            onUpdateDate={(nodeId, date) => {
                                const node = findNodeById(tree, nodeId);
                                if (node) {
                                    const updatedNode = { ...node, deliverByDate: date.toISOString() };
                                    handleUpdateNode(updatedNode);
                                }
                            }}
                        />
                    </div>
                )}
            </main>

            {selectionMode && selectedNodes.size > 0 && (
                <BulkOperations
                    selectedNodes={selectedNodes}
                    allNodes={tree}
                    onBulkEdit={(ids, updates) => {
                        // Apply updates to selected nodes
                        const updateTree = (nodes: TreeNodeData[]): TreeNodeData[] => {
                            return nodes.map(node => {
                                if (ids.includes(node.id)) {
                                    return { ...node, ...updates };
                                }
                                if (node.children) {
                                    return { ...node, children: updateTree(node.children) };
                                }
                                return node;
                            });
                        };
                        setTree(updateTree(tree));
                        // Notify extension of changes
                        const updated = updateTree(tree);
                        updated.forEach(node => {
                            if (ids.includes(node.id)) {
                                postMessage({ 
                                    type: 'updateItem', 
                                    payload: {
                                        itemType: node.type as 'epic' | 'story' | 'task',
                                        id: node.id,
                                        updates
                                    }
                                });
                            }
                        });
                    }}
                    onBulkDelete={(ids) => {
                        // Delete selected nodes
                        const deleteFromTree = (nodes: TreeNodeData[]): TreeNodeData[] => {
                            return nodes.filter(node => !ids.includes(node.id)).map(node => {
                                if (node.children) {
                                    return { ...node, children: deleteFromTree(node.children) };
                                }
                                return node;
                            });
                        };
                        const updated = deleteFromTree(tree);
                        setTree(updated);
                        // Notify extension of deletions
                        ids.forEach(id => {
                            const node = findNodeById(tree, id);
                            if (node) {
                                postMessage({ 
                                    type: 'deleteItem',
                                    payload: {
                                        itemType: node.type as 'epic' | 'story' | 'task',
                                        id: node.id
                                    }
                                });
                            }
                        });
                        setSelectedNodes(new Set());
                    }}
                    onClearSelection={() => setSelectedNodes(new Set())}
                />
            )}

            <ShortcutsPanel
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />

            {showAdvancedFilter && (
                <AdvancedFilter
                    onFilterChange={(filters) => {
                        setActiveFilters(filters);
                        setShowAdvancedFilter(false);
                    }}
                    onClose={() => setShowAdvancedFilter(false)}
                />
            )}

            {selectedNode && (
                <DetailsPanel
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onUpdate={handleUpdateNode}
                    onDelete={handleDeleteNode}
                />
            )}

            {menuPosition && (
                <ContextMenu
                    position={menuPosition}
                    actions={menuActions}
                    onClose={closeMenu}
                />
            )}

            {/* Session 15-17 Components */}
            {showOnboarding && (
                <OnboardingWizard
                    onComplete={() => {
                        setShowOnboarding(false);
                        localStorage.setItem('onboarding-completed', 'true');
                    }}
                    onSkip={() => {
                        setShowOnboarding(false);
                        localStorage.setItem('onboarding-completed', 'true');
                    }}
                />
            )}

            {showHelp && (
                <HelpPanel
                    onClose={() => setShowHelp(false)}
                />
            )}

            {showCustomFields && (
                <CustomFieldsPanel />
            )}

            {/* Always visible offline indicator */}
            <OfflineIndicator />
        </div>
    );
};

export default App;
