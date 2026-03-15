/**
 * Integration Tests — Extension Activation & Commands
 * AICC-0254: End-to-end workflow tests
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration', () => {
  test('extension should be present', () => {
    const extension = vscode.extensions.getExtension('ai-command-center.ai-command-center');
    assert.ok(extension, 'Extension not found');
  });

  test('extension should activate', async () => {
    const extension = vscode.extensions.getExtension('ai-command-center.ai-command-center');
    if (extension && !extension.isActive) {
      await extension.activate();
    }
    assert.ok(extension?.isActive, 'Extension did not activate');
  });

  test('registered commands should exist', async () => {
    const commands = await vscode.commands.getCommands(true);
    const aiccCommands = commands.filter(c => c.startsWith('aicc.'));
    assert.ok(aiccCommands.length > 0, 'No AICC commands found');
  });

  test('core commands are registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    const expected = [
      'aicc.createEpic',
      'aicc.createStory',
      'aicc.createTask'
    ];
    for (const cmd of expected) {
      assert.ok(commands.includes(cmd), `Command ${cmd} not registered`);
    }
  });
});
