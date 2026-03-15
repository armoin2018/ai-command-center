/**
 * Unit Tests — TokenBucketRateLimiter
 * AICC-0253: Core service tests
 */

import * as assert from 'assert';
import { TokenBucketRateLimiter } from '../../scheduler/rateLimiter';

suite('TokenBucketRateLimiter', () => {
  test('allows requests within limit', () => {
    const limiter = new TokenBucketRateLimiter({ maxTokens: 5, refillRate: 1, refillInterval: 1000 });
    assert.strictEqual(limiter.tryConsume(), true);
    assert.strictEqual(limiter.tryConsume(), true);
    limiter.dispose();
  });

  test('blocks requests when empty', () => {
    const limiter = new TokenBucketRateLimiter({ maxTokens: 1, refillRate: 0.001, refillInterval: 60000 });
    assert.strictEqual(limiter.tryConsume(), true);
    assert.strictEqual(limiter.tryConsume(), false);
    limiter.dispose();
  });

  test('getTokenCount returns current count', () => {
    const limiter = new TokenBucketRateLimiter({ maxTokens: 10, refillRate: 1, refillInterval: 1000 });
    const count = limiter.getTokenCount();
    assert.ok(count > 0);
    limiter.dispose();
  });

  test('getWaitTime returns 0 when tokens available', () => {
    const limiter = new TokenBucketRateLimiter({ maxTokens: 5, refillRate: 1, refillInterval: 1000 });
    assert.strictEqual(limiter.getWaitTime(), 0);
    limiter.dispose();
  });

  test('getWaitTime returns positive value when empty', () => {
    const limiter = new TokenBucketRateLimiter({ maxTokens: 1, refillRate: 1, refillInterval: 60000 });
    limiter.tryConsume(); // drain bucket
    const wait = limiter.getWaitTime();
    assert.ok(wait > 0, `Expected positive wait time, got ${wait}`);
    limiter.dispose();
  });

  test('reset restores full capacity', () => {
    const limiter = new TokenBucketRateLimiter({ maxTokens: 3, refillRate: 0.001, refillInterval: 60000 });
    limiter.tryConsume();
    limiter.tryConsume();
    limiter.tryConsume();
    limiter.reset();
    assert.strictEqual(limiter.tryConsume(), true);
    limiter.dispose();
  });
});
