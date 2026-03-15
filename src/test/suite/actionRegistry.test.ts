/**
 * Unit Tests — ActionRegistry
 * AICC-0253: Core service tests
 */

import * as assert from 'assert';
import { ActionRegistry } from '../../actions/actionRegistry';
import { ActionHandler } from '../../actions/types';

suite('ActionRegistry', () => {
  let registry: ActionRegistry;

  setup(() => {
    registry = ActionRegistry.getInstance();
  });

  test('getInstance returns singleton', () => {
    assert.strictEqual(ActionRegistry.getInstance(), registry);
  });

  test('register and execute action', async () => {
    const mockAction: ActionHandler = {
      id: 'test.action',
      description: 'Test action',
      async execute() { return { success: true, data: 'ok' }; },
      describe() { return []; }
    };

    registry.register(mockAction);
    registry.setContext({ workspaceRoot: '/tmp', extensionPath: '/tmp', planPath: '/tmp/PLAN.json' });
    const result = await registry.execute('test.action');
    assert.strictEqual(result.success, true);

    // Cleanup
    registry.unregister('test.action');
  });

  test('execute unknown action returns error', async () => {
    const result = await registry.execute('nonexistent.action');
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('Unknown action'));
  });

  test('listActions returns registered actions', () => {
    const actions = registry.listActions();
    assert.ok(Array.isArray(actions));
  });
});
