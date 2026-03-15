/**
 * Integrations Module Exports
 * 
 * Provides unified access to all external service integrations.
 */

// Integration Manager (generic coordinator)
export {
    IntegrationManager,
    type IntegrationType,
    type IntegrationStatus,
    type IntegrationConfig,
    type IntegrationState,
    type IntegrationInfo,
    type SyncOptions,
    type SyncResult,
    type WorkflowStep,
    type WorkflowResult,
    type IIntegration
} from './integrationManager';

// Jira Integration
export * from './jira';

// Microsoft Teams Integration
export * from './teams';

// SharePoint Online Integration
export * from './sharepoint';

// Slack Integration
export * from './slack';
