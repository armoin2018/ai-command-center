/**
 * Connection Manager with Exponential Backoff
 *
 * Manages connection state for MCP follower→leader communication.
 * Provides automatic reconnection with configurable exponential backoff
 * and a full state machine (connected / reconnecting / disconnected).
 *
 * @module AICC-0198 / AICC-0200
 */

import { EventEmitter } from 'events';
import { Logger } from '../logger';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export interface ReconnectionConfig {
  /** Delay before the first reconnection attempt (ms). */
  initialDelayMs: number;
  /** Maximum delay between attempts (ms). */
  maxDelayMs: number;
  /** Multiplier applied to the delay after each failed attempt. */
  backoffMultiplier: number;
  /** Maximum reconnection attempts. 0 = unlimited. */
  maxAttempts: number;
}

export interface StateChangeEvent {
  previousState: ConnectionState;
  newState: ConnectionState;
  attempts: number;
}

export interface ConnectionStateInfo {
  state: ConnectionState;
  attempts: number;
  lastTransition: Date;
  /** Milliseconds since the last state transition. */
  uptime: number;
}

// ────────────────────────────────────────────────────────────────────
// Connection Manager
// ────────────────────────────────────────────────────────────────────

export class ConnectionManager extends EventEmitter {
  private state: ConnectionState = 'disconnected';
  private config: ReconnectionConfig;
  private logger: Logger;
  private currentDelay: number;
  private attempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectFn: (() => Promise<boolean>) | null = null;
  private lastTransition: Date = new Date();
  private disposed: boolean = false;

  constructor(logger: Logger, config?: Partial<ReconnectionConfig>) {
    super();
    this.logger = logger;
    this.config = {
      initialDelayMs: config?.initialDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 30000,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      maxAttempts: config?.maxAttempts ?? 0,
    };
    this.currentDelay = this.config.initialDelayMs;

    // Log every state transition (AICC-0200)
    this.on('stateChanged', (event: StateChangeEvent) => {
      this.logger.info('Connection state changed', {
        component: 'ConnectionManager',
        previousState: event.previousState,
        newState: event.newState,
        attempts: event.attempts,
      });
    });
  }

  // ──────────── Public API ────────────

  /**
   * Set the function that will be called to attempt a connection.
   * Should return `true` on success, `false` on failure.
   */
  setConnectFunction(fn: () => Promise<boolean>): void {
    this.connectFn = fn;
  }

  /**
   * Transition to the **connected** state.
   * Resets the attempt counter and backoff delay.
   */
  markConnected(): void {
    if (this.state === 'connected') {
      return;
    }

    this.clearReconnectTimer();
    const previous = this.state;
    this.state = 'connected';
    this.attempts = 0;
    this.currentDelay = this.config.initialDelayMs;
    this.lastTransition = new Date();

    this.emit('stateChanged', {
      previousState: previous,
      newState: 'connected',
      attempts: this.attempts,
    } satisfies StateChangeEvent);
  }

  /**
   * Begin the exponential-backoff reconnection cycle.
   *
   * Delay pattern: 1 s → 2 s → 4 s → 8 s → 16 s → 30 s (capped)
   *
   * Each attempt calls the registered `connectFn`.
   * - On success → `markConnected()`.
   * - On failure → schedule next attempt with increased delay.
   * - If `maxAttempts > 0` and limit reached → `markDisconnected()`.
   */
  async startReconnecting(): Promise<void> {
    if (this.disposed) {
      return;
    }

    if (this.state !== 'reconnecting') {
      const previous = this.state;
      this.state = 'reconnecting';
      this.currentDelay = this.config.initialDelayMs;
      this.attempts = 0;
      this.lastTransition = new Date();

      this.emit('stateChanged', {
        previousState: previous,
        newState: 'reconnecting',
        attempts: this.attempts,
      } satisfies StateChangeEvent);
    }

    this.scheduleReconnect();
  }

  /**
   * Stop any reconnection in progress and transition to **disconnected**.
   */
  markDisconnected(): void {
    if (this.state === 'disconnected') {
      return;
    }

    this.clearReconnectTimer();
    const previous = this.state;
    this.state = 'disconnected';
    this.lastTransition = new Date();

    this.emit('stateChanged', {
      previousState: previous,
      newState: 'disconnected',
      attempts: this.attempts,
    } satisfies StateChangeEvent);
  }

  /** Current connection state. */
  getState(): ConnectionState {
    return this.state;
  }

  /** Number of reconnection attempts in the current cycle. */
  getAttempts(): number {
    return this.attempts;
  }

  /**
   * Extended state information (AICC-0200).
   */
  getStateInfo(): ConnectionStateInfo {
    return {
      state: this.state,
      attempts: this.attempts,
      lastTransition: this.lastTransition,
      uptime: Date.now() - this.lastTransition.getTime(),
    };
  }

  /** Clean up timers and listeners. */
  dispose(): void {
    this.disposed = true;
    this.clearReconnectTimer();
    this.removeAllListeners();
    this.connectFn = null;
  }

  // ──────────── Private helpers ────────────

  /**
   * Schedule a single reconnection attempt after `currentDelay` ms.
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    if (this.disposed || this.state !== 'reconnecting') {
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      await this.attemptReconnect();
    }, this.currentDelay);
  }

  /**
   * Execute one reconnection attempt.
   */
  private async attemptReconnect(): Promise<void> {
    if (this.disposed || this.state !== 'reconnecting') {
      return;
    }

    this.attempts++;

    this.logger.info('Attempting reconnection', {
      component: 'ConnectionManager',
      attempt: this.attempts,
      delayMs: this.currentDelay,
    });

    try {
      const success = this.connectFn ? await this.connectFn() : false;

      if (success) {
        this.logger.info('Reconnection succeeded', {
          component: 'ConnectionManager',
          attempt: this.attempts,
        });
        this.markConnected();
        return;
      }
    } catch (err: any) {
      this.logger.warn('Reconnection attempt threw', {
        component: 'ConnectionManager',
        attempt: this.attempts,
        error: err.message,
      });
    }

    // Check if we've exhausted the maximum number of attempts
    if (this.config.maxAttempts > 0 && this.attempts >= this.config.maxAttempts) {
      this.logger.error('Max reconnection attempts reached – giving up', {
        component: 'ConnectionManager',
        maxAttempts: this.config.maxAttempts,
      });
      this.markDisconnected();
      return;
    }

    // Increase delay with exponential backoff, capped at maxDelayMs
    this.currentDelay = Math.min(
      this.currentDelay * this.config.backoffMultiplier,
      this.config.maxDelayMs,
    );

    // Schedule the next attempt
    this.scheduleReconnect();
  }

  /**
   * Cancel a pending reconnection timer.
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
