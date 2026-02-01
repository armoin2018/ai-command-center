---
name: ailey-com-salesforce
description: Comprehensive Salesforce CRM integration with automatic edition detection, OAuth authentication, SOQL queries, Bulk API, and complete object management. Supports Developer, Professional, Enterprise, Unlimited, and Performance editions with adaptive feature sets.
keywords: [salesforce, crm, oauth, rest-api, soql, bulk-api, enterprise, sales-cloud, service-cloud]
tools: [execute, read, write]
---

# AI-ley Salesforce Integration

Comprehensive Salesforce CRM integration with automatic edition detection, OAuth 2.0 authentication, and full API access.

## Overview

The Salesforce skill provides production-grade integration with Salesforce CRM, including automatic edition detection, OAuth authentication, SOQL queries, Bulk API operations, and comprehensive object management across all Salesforce editions.

### Key Features

1. **Edition Detection**: Automatic detection of Salesforce edition (Developer, Professional, Enterprise, Unlimited, Performance)
2. **OAuth 2.0 Authentication**: Secure OAuth flow with Connected App integration
3. **SOQL Queries**: Full SOQL query support with pagination
4. **Bulk API**: High-volume data operations with Bulk API 2.0
5. **Object Management**: CRUD operations on standard and custom objects
6. **Metadata API**: Schema introspection and metadata management
7. **Streaming API**: Real-time event monitoring
8. **REST API**: Complete REST API coverage
9. **CSV Import/Export**: Bulk data import and export with CSV support
10. **API Limit Tracking**: Real-time API usage monitoring and alerts

## When to Use

- **CRM Integration**: Connect applications with Salesforce CRM data
- **Data Migration**: Import/export large volumes of Salesforce data
- **Automation**: Automate Salesforce workflows and processes
- **Reporting**: Extract data for custom reporting and analytics
- **Synchronization**: Sync Salesforce data with external systems
- **Batch Processing**: Process large datasets with Bulk API
- **Real-time Updates**: Monitor Salesforce changes with Streaming API

## Salesforce Edition Support

### Developer Edition (Free)
- **API Calls**: 15,000 per 24 hours
- **Users**: 2
- **Storage**: 20 MB data + 20 MB files
- **Features**: Full API access, sandboxes, custom objects
- **Best For**: Development, testing, learning

### Professional Edition
- **API Calls**: 5,000 per license per 24 hours
- **Users**: Unlimited (paid per user)
- **Storage**: 10 GB minimum
- **Features**: Sales Cloud, Service Cloud, limited customization
- **Best For**: Small to medium businesses

### Enterprise Edition
- **API Calls**: 100,000 per license per 24 hours
- **Users**: Unlimited (paid per user)
- **Storage**: 20 GB minimum
- **Features**: Advanced customization, workflow automation, API access
- **Best For**: Large enterprises with complex requirements

### Unlimited Edition
- **API Calls**: Unlimited
- **Users**: Unlimited (paid per user)
- **Storage**: Unlimited
- **Features**: All Enterprise features + premier support
- **Best For**: Mission-critical enterprise deployments

### Performance Edition
- **API Calls**: Unlimited
- **Users**: Unlimited (paid per user)
- **Storage**: Unlimited
- **Features**: Highest performance, advanced features
- **Best For**: High-transaction environments

## Installation

```bash
cd .github/skills/ailey-com-salesforce
npm install
./install.sh
```

## Setup Instructions

### Step 1: Create Salesforce Connected App

1. **Log in to Salesforce**
   - Navigate to **Setup** (gear icon)

2. **Create Connected App**
   - Go to **Apps** → **App Manager**
   - Click **New Connected App**

3. **Basic Information**
   - **Connected App Name**: AI-ley Integration
   - **API Name**: ailey_integration
   - **Contact Email**: your-email@example.com

4. **API (Enable OAuth Settings)**
   - Check **Enable OAuth Settings**
   - **Callback URL**: `http://localhost:3000/oauth/callback`
   - **Selected OAuth Scopes**:
     - Full access (full)
     - Perform requests at any time (refresh_token, offline_access)
     - Access and manage your data (api)
     - Provide access to custom permissions (custom_permissions)

5. **Save and Get Credentials**
   - Click **Save**
   - Click **Continue**
   - Copy **Consumer Key** (Client ID)
   - Click **Click to reveal** for **Consumer Secret** (Client Secret)

### Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# OAuth Credentials from Connected App
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
SALESFORCE_CALLBACK_URL=http://localhost:3000/oauth/callback

# Salesforce Instance
SALESFORCE_LOGIN_URL=https://login.salesforce.com  # or https://test.salesforce.com for sandbox

# Auth Method
AUTH_METHOD=oauth
```

### Step 3: Authenticate

Run the setup wizard:

```bash
npm run setup
```

This will:
1. Detect your Salesforce edition
2. Open OAuth flow in browser
3. Authenticate and store credentials
4. Display API limits and features

### Step 4: Verify Connection

```bash
npm run diagnose
```

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
    bulkBatchSize: ${BULK_BATCH_SIZE}
  objects:
    standard: [Account, Contact, Lead, Opportunity, Case]
    custom: ${CUSTOM_OBJECTS}
```

## Quick Start

### 1. Query Records

```bash
# Query accounts
npm run query -- "SELECT Id, Name, Industry FROM Account LIMIT 10"

# Query with WHERE clause
npm run query -- "SELECT Name, Email FROM Contact WHERE Account.Name = 'Acme Corp'"

# Export to CSV
npm run query -- "SELECT * FROM Opportunity" --output opportunities.csv
```

### 2. Create Records

```bash
# Create account
npm run create -- Account '{"Name":"New Account","Industry":"Technology"}'

# Create contact
npm run create -- Contact '{"FirstName":"John","LastName":"Doe","Email":"john@example.com"}'
```

### 3. Update Records

```bash
# Update single record
npm run update -- Account 001XXXXXXXXXXXXXXX '{"Phone":"555-1234"}'

# Bulk update from CSV
npm run bulk -- update Account accounts.csv
```

### 4. Delete Records

```bash
# Delete single record
npm run delete -- Account 001XXXXXXXXXXXXXXX

# Bulk delete
npm run bulk -- delete Lead leads-to-delete.csv
```

### 5. Export Data

```bash
# Export all accounts
npm run export -- Account --output accounts.csv

# Export with custom query
npm run export -- Account --query "Industry = 'Technology'" --output tech-accounts.csv
```

## CLI Commands

### setup

Interactive OAuth setup wizard.

```bash
npm run setup
```

Guides through:
- Edition detection
- OAuth authentication
- Credential storage
- Feature verification

### detect

Detect Salesforce edition and features.

```bash
npm run detect

# Output
Edition: Enterprise
API Calls/Day: 100,000
Bulk API: Enabled
Streaming API: Enabled
Custom Objects: 200 limit
```

### query

Execute SOQL queries.

```bash
npm run query -- <soql-query> [options]

Options:
  -o, --output <file>    Export to CSV file
  -l, --limit <number>   Limit results (default: 2000)
  --all                  Query all records (including deleted)
  --format <format>      Output format (table, json, csv)
```

**Examples:**

```bash
# Simple query
npm run query -- "SELECT Id, Name FROM Account"

# With WHERE clause
npm run query -- "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'"

# Export to CSV
npm run query -- "SELECT * FROM Contact" --output contacts.csv

# Include deleted records
npm run query -- "SELECT Id, Name, IsDeleted FROM Account" --all
```

### create

Create new records.

```bash
npm run create -- <object> <json-data>

# Single record
npm run create -- Account '{"Name":"Acme Corp","Industry":"Technology"}'

# From file
npm run create -- Contact --file contacts.json
```

### update

Update existing records.

```bash
npm run update -- <object> <record-id> <json-data>

# Single update
npm run update -- Account 001XXXXXX '{"Phone":"555-1234","Website":"example.com"}'

# Bulk update
npm run update -- Contact --file contacts-updates.csv
```

### delete

Delete records.

```bash
npm run delete -- <object> <record-id>

# Single delete
npm run delete -- Lead 00QXXXXXX

# Bulk delete
npm run delete -- Opportunity --file opp-ids.txt
```

### bulk

Bulk operations with Bulk API 2.0.

```bash
npm run bulk -- <operation> <object> <csv-file> [options]

Operations: insert, update, upsert, delete

Options:
  --batch-size <size>    Records per batch (default: 10000)
  --external-id <field>  External ID field for upsert
  --wait                 Wait for completion
```

**Examples:**

```bash
# Bulk insert
npm run bulk -- insert Account accounts.csv

# Bulk upsert with external ID
npm run bulk -- upsert Contact contacts.csv --external-id Email__c

# Bulk delete
npm run bulk -- delete Lead leads.csv --wait
```

### export

Export Salesforce data to CSV.

```bash
npm run export -- <object> [options]

Options:
  -o, --output <file>     Output file (default: <object>.csv)
  -q, --query <soql>      Custom SOQL WHERE clause
  -f, --fields <fields>   Comma-separated field list
  --all                   Include all fields
```

**Examples:**

```bash
# Export all accounts
npm run export -- Account --output accounts.csv

# Export with filter
npm run export -- Opportunity --query "StageName = 'Prospecting'" --output prospects.csv

# Export specific fields
npm run export -- Contact --fields "FirstName,LastName,Email,Phone"
```

### diagnose

System diagnostics and connection test.

```bash
npm run diagnose

# Test specific features
npm run diagnose -- --check-auth
npm run diagnose -- --check-limits
npm run diagnose -- --check-features
```

## TypeScript API

### Basic Usage

```typescript
import { SalesforceClient } from './src/index';

const client = new SalesforceClient({
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
  loginUrl: 'https://login.salesforce.com',
  apiVersion: '59.0'
});

// Authenticate
await client.authenticate();

// Query
const accounts = await client.query('SELECT Id, Name FROM Account LIMIT 10');
console.log(accounts.records);
```

### CRUD Operations

```typescript
// Create
const newAccount = await client.create('Account', {
  Name: 'Acme Corp',
  Industry: 'Technology',
  Phone: '555-1234'
});

// Read
const account = await client.retrieve('Account', newAccount.id);

// Update
await client.update('Account', newAccount.id, {
  Phone: '555-5678',
  Website: 'https://acme.com'
});

// Delete
await client.delete('Account', newAccount.id);
```

### SOQL Queries

```typescript
// Simple query
const result = await client.query(
  'SELECT Id, Name, Email FROM Contact WHERE Account.Name = \'Acme Corp\''
);

// Query with pagination
const allRecords = await client.queryAll(
  'SELECT Id, Name FROM Opportunity WHERE Amount > 10000'
);

// Count query
const count = await client.query('SELECT COUNT() FROM Lead');
console.log(`Total leads: ${count.totalSize}`);

// Aggregate query
const summary = await client.query(
  'SELECT SUM(Amount), AVG(Amount) FROM Opportunity WHERE StageName = \'Closed Won\''
);
```

### Bulk API Operations

```typescript
// Bulk insert
const insertJob = await client.bulk.insert('Account', accounts, {
  batchSize: 10000,
  wait: true
});

// Bulk upsert
const upsertJob = await client.bulk.upsert('Contact', contacts, {
  externalIdField: 'Email__c',
  wait: true
});

// Bulk delete
const deleteJob = await client.bulk.delete('Lead', leadIds);

// Monitor job
const jobInfo = await client.bulk.getJobInfo(insertJob.id);
console.log(`Status: ${jobInfo.state}, Processed: ${jobInfo.numberRecordsProcessed}`);
```

### Edition Detection

```typescript
// Detect edition
const edition = await client.detectEdition();
console.log(`Edition: ${edition.edition}`);
console.log(`API Calls/Day: ${edition.apiCallsPerDay}`);
console.log(`Bulk API: ${edition.features.bulkApi ? 'Enabled' : 'Disabled'}`);

// Get API limits
const limits = await client.getApiLimits();
console.log(`Daily API Calls Used: ${limits.DailyApiRequests.Used}/${limits.DailyApiRequests.Max}`);
```

### Streaming API

```typescript
// Subscribe to object changes
const stream = await client.streaming.subscribe('/data/ChangeEvents', (event) => {
  console.log('Change detected:', event);
});

// Subscribe to platform events
await client.streaming.subscribe('/event/CustomEvent__e', (event) => {
  console.log('Custom event received:', event);
});

// Unsubscribe
await stream.unsubscribe();
```

### Metadata API

```typescript
// Describe object
const metadata = await client.metadata.describe('Account');
console.log(`Fields: ${metadata.fields.length}`);

// List all objects
const objects = await client.metadata.listObjects();

// Get picklist values
const picklistValues = await client.metadata.getPicklistValues('Account', 'Industry');
```

## Workflows

### Workflow 1: Data Migration

Migrate data from external system to Salesforce:

```typescript
import { SalesforceClient } from './src/index';
import * as fs from 'fs';
import * as csv from 'fast-csv';

const client = new SalesforceClient(config);
await client.authenticate();

// Read CSV data
const records: any[] = [];
fs.createReadStream('accounts.csv')
  .pipe(csv.parse({ headers: true }))
  .on('data', (row) => records.push(row))
  .on('end', async () => {
    // Bulk insert
    const job = await client.bulk.insert('Account', records, {
      batchSize: 10000,
      wait: true
    });
    
    console.log(`Inserted ${job.numberRecordsProcessed} accounts`);
    console.log(`Failed: ${job.numberRecordsFailed}`);
  });
```

### Workflow 2: Custom Reporting

Extract data for custom reports:

```typescript
const client = new SalesforceClient(config);
await client.authenticate();

// Query opportunities with related accounts
const opps = await client.queryAll(`
  SELECT 
    Id, Name, Amount, StageName, CloseDate,
    Account.Name, Account.Industry, Account.AnnualRevenue
  FROM Opportunity
  WHERE CloseDate = THIS_YEAR
  AND StageName IN ('Prospecting', 'Qualification', 'Proposal')
`);

// Export to CSV
await client.exportToCsv(opps.records, 'opportunities-report.csv');
```

### Workflow 3: Real-time Synchronization

Sync Salesforce changes to external system:

```typescript
const client = new SalesforceClient(config);
await client.authenticate();

// Subscribe to account changes
await client.streaming.subscribe('/data/AccountChangeEvent', async (event) => {
  if (event.payload.ChangeEventHeader.changeType === 'CREATE') {
    // New account created
    await externalSystem.createAccount(event.payload);
  } else if (event.payload.ChangeEventHeader.changeType === 'UPDATE') {
    // Account updated
    await externalSystem.updateAccount(event.payload);
  }
});
```

### Workflow 4: Batch Processing

Process records in batches:

```typescript
const client = new SalesforceClient(config);
await client.authenticate();

// Query records in batches
const batchSize = 2000;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const result = await client.query(
    `SELECT Id, Name, Status FROM Lead LIMIT ${batchSize} OFFSET ${offset}`
  );
  
  // Process batch
  for (const lead of result.records) {
    await processLead(lead);
  }
  
  offset += batchSize;
  hasMore = result.records.length === batchSize;
}
```

### Workflow 5: Data Validation

Validate and clean data:

```typescript
const client = new SalesforceClient(config);
await client.authenticate();

// Query contacts with missing emails
const contacts = await client.queryAll(
  'SELECT Id, Name, Email FROM Contact WHERE Email = null'
);

// Validate and update
const updates = [];
for (const contact of contacts.records) {
  const validEmail = await validateEmail(contact.Name);
  if (validEmail) {
    updates.push({ Id: contact.Id, Email: validEmail });
  }
}

// Bulk update
if (updates.length > 0) {
  await client.bulk.update('Contact', updates);
}
```

## Authentication Methods

### OAuth 2.0 (Recommended)

Most secure for user-facing applications:

```typescript
const client = new SalesforceClient({
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
  callbackUrl: 'http://localhost:3000/oauth/callback',
  authMethod: 'oauth'
});

// Start OAuth flow
await client.authenticate();
```

### Username-Password (Legacy)

For backward compatibility:

```typescript
const client = new SalesforceClient({
  username: process.env.SALESFORCE_USERNAME!,
  password: process.env.SALESFORCE_PASSWORD! + process.env.SALESFORCE_SECURITY_TOKEN!,
  authMethod: 'username-password'
});

await client.authenticate();
```

### JWT Bearer Flow (Server-to-Server)

For automation and CI/CD:

```typescript
const client = new SalesforceClient({
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  username: process.env.SALESFORCE_USERNAME_JWT!,
  privateKeyPath: './certs/server.key',
  authMethod: 'jwt'
});

await client.authenticate();
```

## Edition-Specific Features

### Developer Edition

```typescript
const features = {
  apiCalls: 15000,
  bulkApi: true,
  streamingApi: true,
  customObjects: 200,
  customFields: 500,
  sandboxes: false
};
```

### Professional Edition

```typescript
const features = {
  apiCalls: '5000 per license',
  bulkApi: false, // Add-on required
  streamingApi: false,
  customObjects: 10,
  customFields: 100,
  sandboxes: false
};
```

### Enterprise Edition

```typescript
const features = {
  apiCalls: 100000,
  bulkApi: true,
  streamingApi: true,
  customObjects: 2000,
  customFields: 500,
  sandboxes: true
};
```

## API Limit Management

### Monitor Usage

```typescript
// Get current limits
const limits = await client.getApiLimits();

console.log(`Daily API Calls: ${limits.DailyApiRequests.Used}/${limits.DailyApiRequests.Max}`);
console.log(`Bulk API Jobs: ${limits.DailyBulkApiRequests.Used}/${limits.DailyBulkApiRequests.Max}`);

// Check if approaching limit
if (limits.DailyApiRequests.Used > limits.DailyApiRequests.Max * 0.8) {
  console.warn('Warning: Approaching API limit!');
}
```

### Automatic Throttling

```typescript
const client = new SalesforceClient({
  ...config,
  autoThrottle: true,
  maxApiCallsPerSecond: 10
});

// Client automatically throttles requests
```

## Error Handling

### Common Errors

```typescript
try {
  await client.create('Account', invalidData);
} catch (error) {
  if (error.errorCode === 'REQUIRED_FIELD_MISSING') {
    console.error('Required field missing:', error.fields);
  } else if (error.errorCode === 'DUPLICATE_VALUE') {
    console.error('Duplicate record found');
  } else if (error.errorCode === 'INVALID_SESSION_ID') {
    // Re-authenticate
    await client.authenticate();
  }
}
```

### Bulk API Errors

```typescript
const job = await client.bulk.insert('Account', records);

// Get failed records
const failures = await client.bulk.getFailedResults(job.id);
for (const failure of failures) {
  console.error(`Record failed: ${failure.sf__Id}, Error: ${failure.sf__Error}`);
}
```

## Performance Tips

### 1. Use Bulk API for Large Operations

```typescript
// Instead of
for (const record of records) {
  await client.create('Account', record);
}

// Use bulk API
await client.bulk.insert('Account', records);
```

### 2. Query Only Needed Fields

```typescript
// Instead of
await client.query('SELECT * FROM Account');

// Specify fields
await client.query('SELECT Id, Name, Industry FROM Account');
```

### 3. Use Query Locator for Large Results

```typescript
// Automatically handles pagination
const allRecords = await client.queryAll('SELECT Id FROM Account');
```

### 4. Batch Operations

```typescript
// Batch creates
const batch = [];
for (const record of records) {
  batch.push(record);
  if (batch.length === 200) {
    await client.createBatch('Account', batch);
    batch.length = 0;
  }
}
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Invalid OAuth credentials | Wrong Client ID/Secret | Verify Connected App credentials |
| Session expired | Token timeout | Re-authenticate with `client.authenticate()` |
| API limit exceeded | Too many calls | Wait 24 hours or use Bulk API |
| INVALID_FIELD error | Field doesn't exist | Check object metadata |
| REQUIRED_FIELD_MISSING | Missing required field | Add required fields to data |
| UNABLE_TO_LOCK_ROW | Record locked | Retry after delay |
| REQUEST_LIMIT_EXCEEDED | Governor limits | Optimize queries, use Bulk API |

## Resources

- **Salesforce Developer Docs**: [developer.salesforce.com](https://developer.salesforce.com/)
- **REST API Guide**: [REST API Documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)
- **Bulk API Guide**: [Bulk API 2.0](https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/)
- **SOQL Reference**: [SOQL Guide](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/)
- **JSforce Library**: [jsforce.github.io](https://jsforce.github.io/)

---
version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.8
---
