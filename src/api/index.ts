/**
 * API Module Exports
 * 
 * Provides shared HTTP client infrastructure for all external integrations.
 */

// Base API Client
export {
    BaseApiClient,
    type AuthType,
    type BaseApiConfig,
    type RetryConfig,
    type RateLimitConfig,
    type CircuitBreakerConfig,
    type CircuitState,
    type ApiError,
    type RequestOptions,
    type AxiosResponse,
    type AxiosError
} from './baseApiClient';

// Jira Client
export {
    JiraClient,
    type JiraConfig,
    type JiraIssue,
    type CreateIssueRequest
} from './jiraClient';
