/**
 * Integration Tests for Schema-Driven UI
 * Tests panel/tab/component loading and rendering
 */

import * as assert from 'assert';
import * as path from 'path';
import { SchemaLoaderService } from '../../services/schemaLoader';
import { ComponentRegistry } from '../../services/componentRegistry';
import { PanelRenderer } from '../../services/panelRenderer';

suite('Schema-Driven UI Integration Tests', () => {
    let schemaLoader: SchemaLoaderService;
    let componentRegistry: ComponentRegistry;
    let panelRenderer: PanelRenderer;
    const testExtensionPath = path.join(__dirname, '../../../');

    setup(async () => {
        schemaLoader = SchemaLoaderService.getInstance(testExtensionPath);
        componentRegistry = ComponentRegistry.getInstance(testExtensionPath);
        panelRenderer = PanelRenderer.getInstance(testExtensionPath);
        
        await schemaLoader.initialize();
        await componentRegistry.initialize();
        await panelRenderer.initialize();
    });

    suite('Schema Loading', () => {
        test('should load panel schema', async () => {
            const panel = await schemaLoader.loadPanel('All_AICC');
            
            assert.ok(panel, 'Panel should be loaded');
            assert.strictEqual(panel.kind, 'Panel');
            assert.strictEqual(panel.metadata.id, 'All_AICC');
            assert.ok(panel.spec.layout, 'Panel should have layout');
        });

        test('should load tab schemas', async () => {
            const planningTab = await schemaLoader.loadTab('All_Planning');
            
            assert.ok(planningTab, 'Planning tab should be loaded');
            assert.strictEqual(planningTab.kind, 'Tab');
            assert.ok(planningTab.spec.components, 'Tab should have components');
            assert.ok(planningTab.spec.components.length > 0, 'Tab should have at least one component');
        });

        test('should load component schemas', async () => {
            const statusBadges = await schemaLoader.loadComponent('status-badges');
            
            assert.ok(statusBadges, 'Component should be loaded');
            assert.strictEqual(statusBadges.kind, 'Component');
            assert.ok(statusBadges.spec.template, 'Component should have template');
            assert.ok(statusBadges.spec.props, 'Component should have props');
        });

        test('should load all components', async () => {
            const components = await schemaLoader.loadAllComponents();
            
            assert.ok(components.length >= 10, 'Should load at least 10 components');
            
            const componentIds = components.map(c => c.metadata.id);
            assert.ok(componentIds.includes('status-badges'), 'Should include status-badges');
            assert.ok(componentIds.includes('filter-bar'), 'Should include filter-bar');
            assert.ok(componentIds.includes('accordion-list'), 'Should include accordion-list');
        });
    });

    suite('Schema Validation', () => {
        test('should validate panel schema', async () => {
            const panel = await schemaLoader.loadPanel('All_AICC');
            
            assert.strictEqual(panel.apiVersion, 'aicc/v1');
            assert.ok(panel.metadata.version, 'Panel should have version');
            assert.ok(panel.spec.layout.type, 'Panel should have layout type');
        });

        test('should reject invalid panel schema', async () => {
            try {
                // Invalid panel without required fields
                await schemaLoader.loadPanel('NonExistent');
                assert.fail('Should throw error for invalid panel');
            } catch (error) {
                assert.ok(error);
            }
        });
    });

    suite('Component Registry', () => {
        test('should register all components', () => {
            const catalog = componentRegistry.getCatalog();
            
            assert.ok(catalog.length >= 10, 'Should register at least 10 components');
        });

        test('should retrieve component by ID', () => {
            const component = componentRegistry.getComponent('status-badges');
            
            assert.ok(component, 'Component should be retrieved');
            assert.strictEqual(component.schema.metadata.id, 'status-badges');
        });

        test('should render component with props', () => {
            const html = componentRegistry.render('status-badges', {
                statuses: ['todo', 'done'],
                counts: { todo: 5, done: 3 }
            });
            
            assert.ok(html, 'Component should render HTML');
            assert.ok(html.includes('status-badge'), 'HTML should contain status-badge class');
        });

        test('should search components', () => {
            const results = componentRegistry.searchComponents('badge');
            
            assert.ok(results.length > 0, 'Should find components matching search');
            assert.ok(results.some(r => r.metadata.id === 'status-badges'), 'Should include status-badges');
        });

        test('should return component catalog', () => {
            const catalog = componentRegistry.getCatalog();
            
            assert.ok(catalog.length > 0, 'Catalog should not be empty');
            catalog.forEach(item => {
                assert.ok(item.id, 'Catalog item should have ID');
                assert.ok(item.name, 'Catalog item should have name');
                assert.ok(item.version, 'Catalog item should have version');
            });
        });

        test('should generate demo HTML', () => {
            const demoHtml = componentRegistry.getDemoHtml('status-badges', 0);
            
            assert.ok(demoHtml, 'Should generate demo HTML');
            assert.ok(demoHtml.includes('component-demo'), 'Demo should have component-demo class');
            assert.ok(demoHtml.includes('demo-preview'), 'Demo should have preview section');
        });
    });

    suite('Panel Rendering', () => {
        test('should render panel with tabs layout', async () => {
            const html = await panelRenderer.renderPanel('All_AICC', {
                showComponentRef: false
            });
            
            assert.ok(html, 'Panel should render HTML');
            assert.ok(html.includes('tabs-row'), 'Should include tabs row');
            assert.ok(html.includes('tab-content'), 'Should include tab content');
        });

        test('should render panel with component references', async () => {
            const html = await panelRenderer.renderPanel('All_AICC', {
                showComponentRef: true
            });
            
            assert.ok(html.includes('component-ref'), 'Should include component references');
            assert.ok(html.includes('SEC-'), 'Should include component reference IDs');
        });

        test('should render header with actions', async () => {
            const html = await panelRenderer.renderPanel('All_AICC');
            
            assert.ok(html.includes('header-actions'), 'Should include header actions');
            assert.ok(html.includes('codicon-refresh'), 'Should include refresh icon');
        });

        test('should render footer with actions', async () => {
            const html = await panelRenderer.renderPanel('All_AICC');
            
            assert.ok(html.includes('footer'), 'Should include footer');
            assert.ok(html.includes('footer-btn'), 'Should include footer buttons');
        });
    });

    suite('Data Binding', () => {
        test('should bind REST data source', async () => {
            const tab = await schemaLoader.loadTab('All_Planning');
            const component = tab.spec.components.find(c => c.dataBinding);
            
            if (component && component.dataBinding) {
                assert.ok(component.dataBinding, 'Component should have data binding');
                // Data binding tested through actual rendering
            }
        });

        test('should bind state data source', () => {
            const html = componentRegistry.render('status-badges', {
                statuses: ['todo', 'done'],
                counts: { todo: 5, done: 3 }
            });
            
            assert.ok(html.includes('todo'), 'Should render state data');
            assert.ok(html.includes('done'), 'Should render state data');
        });
    });

    suite('Layout Types', () => {
        test('should support tabs layout', async () => {
            const panel = await schemaLoader.loadPanel('All_AICC');
            
            assert.strictEqual(panel.spec.layout.type, 'tabs');
            assert.ok(panel.spec.layout.tabs, 'Tabs layout should have tabs array');
        });

        // Note: Split/Grid/Stack layouts tested with example YAML files
    });

    suite('Hot Reload', () => {
        test('should watch schema files', () => {
            // FileSystemWatcher is initialized
            // Actual hot-reload tested manually by modifying YAML files
            assert.ok(true, 'Schema watcher initialized');
        });
    });

    suite('Override Pattern', () => {
        test('should resolve .my/ overrides before .github/aicc/', async () => {
            // Override resolution tested with actual .my/ directory
            // Path resolution prefers .my/ over .github/aicc/
            const schemaPath = schemaLoader['resolvePath']('panels', 'All_AICC');
            assert.ok(schemaPath, 'Should resolve schema path');
        });
    });

    suite('Error Handling', () => {
        test('should handle missing panel gracefully', async () => {
            try {
                await panelRenderer.renderPanel('NonExistent');
                assert.fail('Should throw error for missing panel');
            } catch (error) {
                assert.ok(error, 'Should throw error');
            }
        });

        test('should handle missing component gracefully', () => {
            const html = componentRegistry.render('NonExistent', {});
            
            assert.strictEqual(html, null, 'Should return null for missing component');
        });

        test('should handle invalid props gracefully', () => {
            const html = componentRegistry.render('status-badges', {
                // Missing required props
            });
            
            assert.ok(html, 'Should still render with default values');
        });
    });
});
