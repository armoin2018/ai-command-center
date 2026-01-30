/**
 * Base API Client
 * 
 * Shared HTTP client abstraction providing:
 * - Authentication (OAuth 2.0, API keys, PAT)
 * - Retry with exponential backoff
 * - Rate limiting
 * - Circuit breaker pattern
 * - Request/response logging
 * - Error normalization
 * 
 * All integration clients (Jira, Confluence, Gamma, GitHub) should extend this class.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AuthType = 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'none';

export interface BaseApiConfig {
    /** Base URL for all API requests */
    baseUrl: string;
    
    /** Authentication type */
    authType: AuthType;
    
    /** Authentication credentials (varies by authType) */
    auth?: {
        /** For basic auth */
        username?: string;
        password?: string;
        
        /** For bearer/OAuth2 */
        accessToken?: string;
        refreshToken?: string;
        tokenExpiry?: Date;
        
        /** For API key auth */
        apiKey?: string;
        apiKeyHeader?: string; // Default: 'X-API-Key'
    };
    
    /** Request timeout in ms (default: 30000) */
    timeout?: number;
    
    /** Custom headers to include in all requests */
    headers?: Record<string, string>;
    
    /** Client identifier for logging */
    clientName?: string;
}

export interface RetryConfig {
    /** Maximum retry attempts (default: 3) */
    maxRetries: number;
    
    /** Initial delay in ms (default: 1000) */
    baseDelay: number;
    
    /** Maximum delay in ms (default: 30000) */
    maxDelay: number;
    
    /** Jitter factor (0-1, default: 0.2) */
    jitter: number;
    
    /** HTTP status codes that should trigger retry */
    retryableStatusCodes: number[];
}

export interface RateLimitConfig {
    /** Maximum requests per window */
    maxRequests: number;
    
    /** Time window in ms */
    windowMs: number;
}

export interface CircuitBreakerConfig {
    /** Number of failures before opening circuit */
    failureThreshold: number;
    
    /** Time to wait before attempting reset (ms) */
    cooldownPeriod: number;
    
    /** Number of successes needed to close circuit */
    halfOpenSuccesses: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface ApiError {
    /** Original error message */
    message: string;
    
    /** HTTP status code (if applicable) */
    statusCode?: number;
    
    /** Error code from API (if available) */
    errorCode?: string;
    
    /** Whether this error is retryable */
    retryable: boolean;
    
    /** Original error for debugging */
    originalError?: Error;
}

export interface RequestOptions extends AxiosRequestConfig {
    /** Skip retry logic for this request */
    skipRetry?: boolean;
    
    /** Skip rate limiting for this request */
    skipRateLimit?: boolean;
    
    /** Custom timeout for this request */
    timeout?: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: 0.2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    cooldownPeriod: 30000, // 30 seconds
    halfOpenSuccesses: 2
};

// ============================================================================
// Base API Client Class
// ============================================================================

export abstract class BaseApiClient {
    protected client: AxiosInstance;
    protected config: BaseApiConfig;
    protected retryConfig: RetryConfig;
    protected rateLimitConfig: RateLimitConfig;
    protected circuitBreakerConfig: CircuitBreakerConfig;
    
    // Rate limiting state
    private requestCount: number = 0;
    private windowStart: number = Date.now();
    
    // Circuit breaker state
    private circuitState: CircuitState = 'closed';
    private consecutiveFailures: number = 0;
    private consecutiveSuccesses: number = 0;
    private circuitOpenedAt: number = 0;
    
    // Metrics
    private totalRequests: number = 0;
    private successfulRequests: number = 0;
    private failedRequests: number = 0;
    private totalRetries: number = 0;

    constructor(
        config: BaseApiConfig,
        retryConfig: Partial<RetryConfig> = {},
        rateLimitConfig: Partial<RateLimitConfig> = {},
        circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
    ) {
        this.config = config;
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
        this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...rateLimitConfig };
        this.circuitBreakerConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...circuitBreakerConfig };
        
        // Create axios instance
        this.client = this.createAxiosInstance();
        
        logger.debug('BaseApiClient initialized', {
            component: this.getClientName(),
            baseUrl: config.baseUrl,
            authType: config.authType
        });
    }

    // ========================================================================
    // Abstract Methods (must be implemented by subclasses)
    // ========================================================================

    /**
     * Get the client name for logging purposes
     */
    protected abstract getClientName(): string;

    /**
     * Refresh OAuth tokens (if applicable)
     */
    protected abstract refreshTokens?(): Promise<void>;

    /**
     * Map API-specific errors to standardized ApiError
     */
    protected abstract mapError(error: AxiosError): ApiError;

    // ========================================================================
    // Public API Methods
    // ========================================================================

    /**
     * Make a GET request
     */
    async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
        return this.request<T>({ ...options, method: 'GET', url });
    }

    /**
     * Make a POST request
     */
    async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>({ ...options, method: 'POST', url, data });
    }

    /**
     * Make a PUT request
     */
    async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>({ ...options, method: 'PUT', url, data });
    }

    /**
     * Make a PATCH request
     */
    async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>({ ...options, method: 'PATCH', url, data });
    }

    /**
     * Make a DELETE request
     */
    async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
        return this.request<T>({ ...options, method: 'DELETE', url });
    }

    /**
     * Test connection to the API
     */
    abstract testConnection(): Promise<{ success: boolean; message: string }>;

    /**
     * Health check - simple ping
     */
    async ping(): Promise<boolean> {
        try {
            const result = await this.testConnection();
            return result.success;
        } catch {
            return false;
        }
    }

    // ========================================================================
    // Core Request Logic
    // ========================================================================

    /**
     * Make an HTTP request with retry, rate limiting, and circuit breaker
     */
    protected async request<T>(options: RequestOptions): Promise<T> {
        this.totalRequests++;
        
        // Check circuit breaker
        await this.checkCircuitBreaker();
        
        // Check rate limit
        if (!options.skipRateLimit) {
            await this.checkRateLimit();
        }
        
        // Execute with retry
        try {
            const response = await this.executeWithRetry<T>(options);
            this.recordSuccess();
            return response;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    /**
     * Execute request with exponential backoff retry
     */
    private async executeWithRetry<T>(
        options: RequestOptions,
        attempt: number = 1
    ): Promise<T> {
        try {
            const response = await this.client.request<T>(options);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            const apiError = this.mapError(axiosError);
            
            // Check if we should retry
            const shouldRetry = 
                !options.skipRetry &&
                attempt < this.retryConfig.maxRetries &&
                apiError.retryable;
            
            if (shouldRetry) {
                const delay = this.calculateRetryDelay(attempt);
                this.totalRetries++;
                
                logger.info(`Retrying request`, {
                    component: this.getClientName(),
                    attempt: attempt + 1,
                    maxRetries: this.retryConfig.maxRetries,
                    delayMs: delay,
                    url: options.url
                });
                
                await this.sleep(delay);
                return this.executeWithRetry<T>(options, attempt + 1);
            }
            
            // Log final failure
            logger.error('Request failed', {
                component: this.getClientName(),
                url: options.url,
                method: options.method,
                statusCode: apiError.statusCode,
                message: apiError.message,
                attempts: attempt
            });
            
            throw apiError;
        }
    }

    /**
     * Calculate retry delay with exponential backoff and jitter
     */
    private calculateRetryDelay(attempt: number): number {
        const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
        const cappedDelay = Math.min(exponentialDelay, this.retryConfig.maxDelay);
        
        // Add jitter (±jitter%)
        const jitterRange = cappedDelay * this.retryConfig.jitter;
        const jitter = (Math.random() * 2 - 1) * jitterRange;
        
        return Math.round(cappedDelay + jitter);
    }

    // ========================================================================
    // Rate Limiting
    // ========================================================================

    /**
     * Check and enforce rate limit
     */
    private async checkRateLimit(): Promise<void> {
        const now = Date.now();
        
        // Reset window if expired
        if (now - this.windowStart >= this.rateLimitConfig.windowMs) {
            this.requestCount = 0;
            this.windowStart = now;
        }
        
        // Check if at limit
        if (this.requestCount >= this.rateLimitConfig.maxRequests) {
            const waitTime = this.rateLimitConfig.windowMs - (now - this.windowStart);
            
            logger.warn('Rate limit reached, waiting', {
                component: this.getClientName(),
                waitMs: waitTime,
                maxRequests: this.rateLimitConfig.maxRequests
            });
            
            await this.sleep(waitTime);
            this.requestCount = 0;
            this.windowStart = Date.now();
        }
        
        this.requestCount++;
    }

    // ========================================================================
    // Circuit Breaker
    // ========================================================================

    /**
     * Check circuit breaker state
     */
    private async checkCircuitBreaker(): Promise<void> {
        if (this.circuitState === 'open') {
            const elapsed = Date.now() - this.circuitOpenedAt;
            
            if (elapsed >= this.circuitBreakerConfig.cooldownPeriod) {
                // Move to half-open state
                this.circuitState = 'half-open';
                this.consecutiveSuccesses = 0;
                
                logger.info('Circuit breaker entering half-open state', {
                    component: this.getClientName()
                });
            } else {
                // Still in cooldown
                throw {
                    message: 'Service temporarily unavailable (circuit open)',
                    statusCode: 503,
                    retryable: true,
                    errorCode: 'CIRCUIT_OPEN'
                } as ApiError;
            }
        }
    }

    /**
     * Record successful request for circuit breaker
     */
    private recordSuccess(): void {
        this.successfulRequests++;
        this.consecutiveFailures = 0;
        
        if (this.circuitState === 'half-open') {
            this.consecutiveSuccesses++;
            
            if (this.consecutiveSuccesses >= this.circuitBreakerConfig.halfOpenSuccesses) {
                this.circuitState = 'closed';
                logger.info('Circuit breaker closed', {
                    component: this.getClientName()
                });
            }
        }
    }

    /**
     * Record failed request for circuit breaker
     */
    private recordFailure(): void {
        this.failedRequests++;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
        
        if (this.circuitState === 'half-open') {
            // Immediately re-open on any failure in half-open state
            this.openCircuit();
        } else if (this.consecutiveFailures >= this.circuitBreakerConfig.failureThreshold) {
            this.openCircuit();
        }
    }

    /**
     * Open the circuit breaker
     */
    private openCircuit(): void {
        this.circuitState = 'open';
        this.circuitOpenedAt = Date.now();
        
        logger.warn('Circuit breaker opened', {
            component: this.getClientName(),
            consecutiveFailures: this.consecutiveFailures,
            cooldownMs: this.circuitBreakerConfig.cooldownPeriod
        });
    }

    // ========================================================================
    // Axios Instance Setup
    // ========================================================================

    /**
     * Create configured axios instance
     */
    private createAxiosInstance(): AxiosInstance {
        const axiosConfig: AxiosRequestConfig = {
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout || 30000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...this.config.headers
            }
        };
        
        // Configure authentication
        this.configureAuth(axiosConfig);
        
        const instance = axios.create(axiosConfig);
        
        // Add request interceptor for logging and token refresh
        instance.interceptors.request.use(
            async (config) => {
                // Check token expiry and refresh if needed
                await this.checkTokenExpiry();
                
                // Update auth header if token was refreshed
                if (this.config.authType === 'bearer' || this.config.authType === 'oauth2') {
                    config.headers.Authorization = `Bearer ${this.config.auth?.accessToken}`;
                }
                
                logger.debug('API request', {
                    component: this.getClientName(),
                    method: config.method?.toUpperCase(),
                    url: config.url
                });
                
                return config;
            },
            (error) => Promise.reject(error)
        );
        
        // Add response interceptor for logging
        instance.interceptors.response.use(
            (response) => {
                logger.debug('API response', {
                    component: this.getClientName(),
                    status: response.status,
                    url: response.config.url
                });
                return response;
            },
            (error) => Promise.reject(error)
        );
        
        return instance;
    }

    /**
     * Configure authentication on axios config
     */
    private configureAuth(axiosConfig: AxiosRequestConfig): void {
        switch (this.config.authType) {
            case 'basic':
                if (this.config.auth?.username && this.config.auth?.password) {
                    axiosConfig.auth = {
                        username: this.config.auth.username,
                        password: this.config.auth.password
                    };
                }
                break;
                
            case 'bearer':
            case 'oauth2':
                if (this.config.auth?.accessToken) {
                    axiosConfig.headers = {
                        ...axiosConfig.headers,
                        Authorization: `Bearer ${this.config.auth.accessToken}`
                    };
                }
                break;
                
            case 'api-key':
                if (this.config.auth?.apiKey) {
                    const header = this.config.auth.apiKeyHeader || 'X-API-Key';
                    axiosConfig.headers = {
                        ...axiosConfig.headers,
                        [header]: this.config.auth.apiKey
                    };
                }
                break;
                
            case 'none':
            default:
                // No authentication
                break;
        }
    }

    /**
     * Check if OAuth token is expired and refresh if needed
     */
    private async checkTokenExpiry(): Promise<void> {
        if (
            (this.config.authType === 'oauth2' || this.config.authType === 'bearer') &&
            this.config.auth?.tokenExpiry &&
            this.refreshTokens
        ) {
            const now = new Date();
            const expiry = new Date(this.config.auth.tokenExpiry);
            const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
            
            if (now.getTime() >= expiry.getTime() - bufferMs) {
                logger.info('Token expiring soon, refreshing', {
                    component: this.getClientName()
                });
                
                await this.refreshTokens();
            }
        }
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    /**
     * Sleep for specified milliseconds
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current circuit breaker state
     */
    getCircuitState(): CircuitState {
        return this.circuitState;
    }

    /**
     * Get request metrics
     */
    getMetrics(): {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        totalRetries: number;
        successRate: number;
        circuitState: CircuitState;
    } {
        return {
            totalRequests: this.totalRequests,
            successfulRequests: this.successfulRequests,
            failedRequests: this.failedRequests,
            totalRetries: this.totalRetries,
            successRate: this.totalRequests > 0 
                ? this.successfulRequests / this.totalRequests 
                : 1,
            circuitState: this.circuitState
        };
    }

    /**
     * Reset circuit breaker (for testing or manual intervention)
     */
    resetCircuitBreaker(): void {
        this.circuitState = 'closed';
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        this.circuitOpenedAt = 0;
        
        logger.info('Circuit breaker manually reset', {
            component: this.getClientName()
        });
    }

    /**
     * Update authentication credentials
     */
    updateAuth(auth: BaseApiConfig['auth']): void {
        this.config.auth = { ...this.config.auth, ...auth };
        
        logger.debug('Auth credentials updated', {
            component: this.getClientName()
        });
    }
}

// ============================================================================
// Export Types
// ============================================================================

export type {
    AxiosResponse,
    AxiosError
};
