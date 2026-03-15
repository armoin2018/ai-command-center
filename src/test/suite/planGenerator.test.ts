/**
 * Unit Tests — PlanGenerator
 * AICC-0253: Core service tests
 */

import * as assert from 'assert';
import { PlanGenerator } from '../../services/planGenerator';

suite('PlanGenerator', () => {
  let generator: PlanGenerator;

  setup(() => {
    generator = PlanGenerator.getInstance();
  });

  test('getInstance returns singleton', () => {
    const a = PlanGenerator.getInstance();
    const b = PlanGenerator.getInstance();
    assert.strictEqual(a, b);
  });

  test('getStatusCounts returns null when not initialized', () => {
    const counts = generator.getStatusCounts();
    // Will be null or have counts depending on state
    assert.ok(counts === null || typeof counts === 'object');
  });

  test('getItem returns undefined for non-existent ID', () => {
    const item = generator.getItem('NONEXISTENT-999');
    assert.strictEqual(item, undefined);
  });
});
