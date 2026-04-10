# AI-ley Salesforce Integration Summary

## Overview

Comprehensive Salesforce CRM integration providing OAuth 2.0 authentication, automatic edition detection, SOQL queries, Bulk API operations, and complete object management across all Salesforce editions (Developer, Professional, Enterprise, Unlimited, Performance).

## Core Features

### 1. Edition Detection
- Automatic detection of Salesforce edition on first connection
- API limit identification and tracking
- Feature availability mapping per edition
- Real-time usage monitoring and alerts

### 2. OAuth 2.0 Authentication
- Secure OAuth flow with Connected App integration
- Token storage and automatic refresh
- Multi-environment support (production, sandbox)
- Alternative auth methods: username-password, JWT bearer

### 3. SOQL Queries
- Full SOQL query support with proper syntax
- Automatic pagination for large result sets
- Query result export to CSV, JSON
- Count and aggregate query support

### 4. Bulk API 2.0
- High-volume insert, update, upsert, delete operations
- Batch processing with configurable batch sizes
- Job monitoring and error tracking
- Failed record retrieval and retry

### 5. Object Management
- CRUD operations on all standard objects (Account, Contact, Lead, etc.)
- Custom object support
- Batch operations for efficiency
- Field-level validation and error handling

### 6. Metadata API
- Object schema introspection
- Field metadata and picklist value retrieval
- Custom object discovery
- Relationship mapping

### 7. Streaming API
- Real-time change event monitoring
- Platform event subscriptions
- Custom event handling
- Push topic support

### 8. CSV Import/Export
- Bulk data import from CSV files
- Export query results to CSV
- Configurable field mapping
- Large file handling

### 9. API Limit Tracking
- Real-time API call counting
- Daily limit monitoring
- Usage alerts at 80% threshold
- Per-edition limit awareness

### 10. AI-ley Integration
- YAML configuration support
- Environment variable management
- Skill-based architecture
- Event-driven notifications

## Technology Stack

### Core Dependencies
- **jsforce 2.0.0-beta.29**: Salesforce API client library
- **axios 1.6.0**: HTTP client for REST API calls
- **commander 11.0.0**: CLI framework
- **express 4.18.0**: OAuth callback server
- **papaparse 5.4.0**: CSV parsing and generation

### TypeScript
- TypeScript 5.3.3 for type safety
- Comprehensive type definitions
- ES2020 target

## Salesforce Edition Support

### Developer Edition (Free)
- **API Calls**: 15,000 per 24 hours
- **Features**: Full API access, all features enabled
- **Storage**: 20 MB data + 20 MB files
- **Best For**: Development, testing, learning Salesforce

### Professional Edition
- **API Calls**: 5,000 per license per 24 hours
- **Features**: Limited API, basic customization
- **Storage**: 10 GB minimum
- **Best For**: Small to medium businesses

### Enterprise Edition
- **API Calls**: 100,000 per 24 hours
- **Features**: Advanced customization, full API access
- **Storage**: 20 GB minimum
- **Best For**: Large enterprises

### Unlimited Edition
- **API Calls**: Unlimited
- **Features**: All Enterprise features + premier support
- **Storage**: Unlimited
- **Best For**: Mission-critical deployments

### Performance Edition
- **API Calls**: Unlimited
- **Features**: Highest performance tier
- **Storage**: Unlimited
- **Best For**: High-transaction environments

## Architecture

### SalesforceClient Class
Main class providing all Salesforce integration capabilities:

```typescript
class SalesforceClient extends EventEmitter {
  // Authentication
  authenticate(): Promise<void>
  
  // Edition detection
  detectEdition(): Promise<SalesforceEdition>
  
  // CRUD operations
  create(object, data): Promise<Result>
  retrieve(object, id): Promise<Record>
  update(object, id, data): Promise<Result>
  delete(object, id): Promise<Result>
  
  // Queries
  query(soql): Promise<QueryResult>
  queryAll(soql): Promise<QueryResult>
  
  // Bulk API
  bulk.insert(object, records): Promise<JobInfo>
  bulk.update(object, records): Promise<JobInfo>
  bulk.upsert(object, records, externalId): Promise<JobInfo>
  bulk.delete(object, ids): Promise<JobInfo>
  
  // Metadata
  metadata.describe(object): Promise<Metadata>
  metadata.listObjects(): Promise<ObjectList>
  metadata.getPicklistValues(object, field): Promise<Values>
  
  // Streaming
  streaming.subscribe(channel, callback): Promise<Subscription>
  
  // Utilities
  exportToCsv(records, path): Promise<void>
  importFromCsv(object, path): Promise<JobInfo>
  getApiLimits(): Promise<Limits>
}
```

### Event System
Real-time notifications for integration events:

- `authenticated` - Authentication successful
- `edition-detected` - Edition identified
- `api-call` - API call made
- `api-limit-warning` - Approaching API limit (80%)
- `export-complete` - CSV export finished

## File Structure

```
ailey-com-salesforce/
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .env.example              # Environment template
├── .gitignore                # Git exclusions
├── SKILL.md                  # Comprehensive documentation
├── README.md                 # Quick start guide
├── QUICK_REFERENCE.md        # Command reference
├── SUMMARY.md                # Project overview (this file)
├── install.cjs                # Installation script
└── src/
    ├── index.ts              # SalesforceClient class
    └── cli.ts                # CLI commands
```

## CLI Commands

### setup
Interactive OAuth setup wizard with Connected App credential collection and authentication flow.

### detect
Display detected Salesforce edition, API limits, and feature availability.

### query
Execute SOQL queries with optional CSV export and pagination support.

### create
Create new records from JSON data or CSV files.

### update
Update existing records by ID with JSON data.

### delete
Delete records by ID with confirmation.

### bulk
Bulk operations (insert, update, upsert, delete) using Bulk API 2.0.

### export
Export Salesforce data to CSV with custom queries and field selection.

### diagnose
System diagnostics including authentication check and API limit verification.

## Setup Instructions

### Step 1: Create Connected App

1. Log in to Salesforce
2. Go to **Setup** → **Apps** → **App Manager**
3. Click **New Connected App**
4. Fill in:
   - Connected App Name: `AI-ley Integration`
   - API Name: `ailey_integration`
   - Contact Email: your email
5. Enable OAuth Settings:
   - Callback URL: `http://localhost:3000/oauth/callback`
   - OAuth Scopes: `full`, `refresh_token`, `api`, `custom_permissions`
6. Save and copy Consumer Key and Consumer Secret

### Step 2: Configure Environment

Create `.env` file:

```bash
SALESFORCE_CLIENT_ID=your_consumer_key_from_step_1
SALESFORCE_CLIENT_SECRET=your_consumer_secret_from_step_1
SALESFORCE_CALLBACK_URL=http://localhost:3000/oauth/callback
SALESFORCE_LOGIN_URL=https://login.salesforce.com
AUTH_METHOD=oauth
```

### Step 3: Authenticate

Run setup wizard:

```bash
npm run setup
```

This opens browser for OAuth authentication, detects edition, and saves credentials.

### Step 4: Verify

```bash
npm run diagnose
```

## Authentication Methods

### OAuth 2.0 (Recommended)
Most secure for user-facing applications. Requires Connected App setup.

### Username-Password (Legacy)
For backward compatibility. Requires username + password + security token.

### JWT Bearer Flow
For server-to-server automation and CI/CD environments. Requires private key.

## Use Cases

### 1. Data Migration
Import/export large volumes of data between systems using Bulk API.

### 2. CRM Integration
Connect external applications with Salesforce CRM for unified data access.

### 3. Automation
Automate Salesforce workflows, data updates, and batch processing.

### 4. Reporting
Extract data for custom reports and analytics dashboards.

### 5. Real-time Synchronization
Monitor Salesforce changes with Streaming API and sync to external systems.

### 6. Data Quality
Validate and clean Salesforce data with automated batch processing.

## Performance Guidelines

### Query Optimization
- Select only needed fields: `SELECT Id, Name` vs `SELECT *`
- Use LIMIT clause for large datasets
- Leverage query locators for pagination

### Bulk API Best Practices
- Use for operations > 200 records
- Batch size: 10,000 records (default)
- Monitor job status with `getJobInfo()`

### API Limit Management
- Track daily usage with `getApiLimits()`
- Use Bulk API to reduce API call consumption
- Enable auto-throttling for rate limiting

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| INVALID_SESSION_ID | Session expired | Re-authenticate |
| REQUIRED_FIELD_MISSING | Missing required field | Add field to data |
| DUPLICATE_VALUE | Unique constraint | Check for duplicates |
| UNABLE_TO_LOCK_ROW | Record locked | Retry after delay |
| REQUEST_LIMIT_EXCEEDED | API limit reached | Wait or use Bulk API |

### Bulk API Errors
- Retrieve failed records with `getFailedResults(jobId)`
- Retry failed records in new batch
- Monitor job state: Queued, InProgress, Completed, Failed

## AI-ley Configuration

Add to `.ai-ley/config/integrations.yaml`:

```yaml
salesforce:
  type: crm
  skill: ailey-com-salesforce
  auth:
    method: oauth
    clientId: ${SALESFORCE_CLIENT_ID}
    clientSecret: ${SALESFORCE_CLIENT_SECRET}
    callbackUrl: ${SALESFORCE_CALLBACK_URL}
  instance:
    loginUrl: ${SALESFORCE_LOGIN_URL}
    apiVersion: "59.0"
  features:
    bulkApi: true
    streamingApi: true
    metadataApi: true
  limits:
    maxApiCallsPerDay: ${MAX_API_CALLS_PER_DAY}
  objects:
    standard: [Account, Contact, Lead, Opportunity, Case]
    custom: ${CUSTOM_OBJECTS}
```

## Future Enhancements

1. **Apex REST API**: Support for custom Apex REST endpoints
2. **Lightning Components**: Integration with Lightning Web Components
3. **Einstein Analytics**: Data integration with Einstein Analytics
4. **Pardot Integration**: Marketing automation connectivity
5. **Change Data Capture**: Advanced change tracking
6. **Platform Events**: Custom platform event publishing

## Resources

- **Documentation**: [SKILL.md](./SKILL.md)
- **Quick Start**: [README.md](./README.md)
- **Command Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Salesforce Developer**: [developer.salesforce.com](https://developer.salesforce.com/)
- **REST API**: [REST API Guide](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)
- **Bulk API**: [Bulk API 2.0](https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/)
- **JSforce**: [jsforce.github.io](https://jsforce.github.io/)

---

**Version**: 1.0.0  
**Updated**: 2026-02-01  
**Maintained by**: AI-ley Toolkit  
**License**: See main repository
