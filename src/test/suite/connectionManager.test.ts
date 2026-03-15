/**
 * Unit Tests — ConnectionManager
 * AICC-0253: Core service tests
 */

import * as assert from 'assert';
import { ConnectionManager } from '../../mcp/connectionManager';
import { Logger } from '../../logger';

suite('ConnectionManager', () => {
  let manager: ConnectionManager;

  setup(() => {
    const logger = Logger.getInstance();
    manager = new ConnectionManager(logger);
  });

  teardown(() => {
    manager.dispose();
  });

  test('initial state is disconnected', () => {
    assert.strictEqual(manager.getState(), 'disconnected');
  });

  test('markConnected transitions to connected', () => {
    manager.markConnected();
    assert.strictEqual(manager.getState(), 'connected');
  });

  test('startReconnecting transitions to reconnecting', async () => {
    // Set a dummy connect function so startReconnecting works
    manager.setConnectFunction(async () => false);
    await manager.startReconnecting();
    assert.strictEqual(manager.getState(), 'reconnecting');
  });

  test('markDisconnected transitions to disconnected', () => {
    manager.markConnected();
    manager.markDisconnected();
    assert.strictEqual(manager.getState(), 'disconnected');
  });

  test('getStateInfo returns expected shape', () => {
    const info = manager.getStateInfo();
    assert.ok('state' in info);
    assert.ok('attempts' in info);
    assert.ok('lastTransition' in info);
    assert.ok('uptime' in info);
    assert.strictEqual(info.state, 'disconnected');
    assert.strictEqual(info.attempts, 0);
  });

  test('markConnected resets attempts', async () => {
    manager.setConnectFunction(async () => false);
    await manager.startReconnecting();
    manager.markConnected();
    assert.strictEqual(manager.getAttempts(), 0);
  });
});
