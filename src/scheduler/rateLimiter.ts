/**
 * Token Bucket Rate Limiter
 * AICC-0226: Token bucket rate limiter for action execution
 */

import { Logger } from '../logger';

const logger = Logger.getInstance();

// ── Config ─────────────────────────────────────────────────────────────

export interface RateLimiterConfig {
  /** Bucket capacity (max burst size) */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
  /** Milliseconds between refills (default 1000) */
  refillInterval?: number;
}

// ── Implementation ─────────────────────────────────────────────────────

export class TokenBucketRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private refillTimer: NodeJS.Timeout | null = null;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.tokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.lastRefill = Date.now();

    // Start refill timer
    this.refillTimer = setInterval(
      () => this.refill(),
      config.refillInterval ?? 1000
    );
  }

  /** Try to consume a token. Returns `true` if the request is allowed. */
  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    logger.warn('Rate limiter: request throttled (no tokens available)');
    return false;
  }

  /** Get time in ms until the next token becomes available */
  getWaitTime(): number {
    if (this.tokens >= 1) { return 0; }
    return Math.ceil((1 / this.refillRate) * 1000);
  }

  /** Get current token count (triggers a refill first) */
  getTokenCount(): number {
    this.refill();
    return this.tokens;
  }

  /** Reset the bucket to full capacity */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  // ── Internals ──────────────────────────────────────────────────────

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /** Clean up the refill interval */
  dispose(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
  }
}
