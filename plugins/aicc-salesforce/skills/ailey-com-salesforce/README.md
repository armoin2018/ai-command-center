# AI-ley Salesforce Integration

Comprehensive Salesforce CRM integration with automatic edition detection and OAuth 2.0 authentication.

## Features

- **Edition Detection**: Auto-detect Developer, Professional, Enterprise, Unlimited, or Performance edition
- **OAuth 2.0**: Secure authentication with Connected App
- **SOQL Queries**: Full query support with pagination
- **Bulk API**: High-volume operations with Bulk API 2.0
- **Object Management**: CRUD operations on all standard and custom objects
- **API Limit Tracking**: Real-time monitoring and alerts
- **CSV Import/Export**: Bulk data operations with CSV support

## Quick Start

### Installation

```bash
cd .github/skills/ailey-com-salesforce
npm install
node install.cjs
```

### Setup

1. **Create Connected App** in Salesforce Setup:
   - Go to **Setup** → **Apps** → **App Manager**
   - Click **New Connected App**
   - Enable OAuth Settings
   - Callback URL: `http://localhost:3000/oauth/callback`
   - OAuth Scopes: `full`, `refresh_token`, `api`

2. **Run Setup Wizard**:
   ```bash
   npm run setup
   ```

3. **Verify Connection**:
   ```bash
   npm run diagnose
   ```

### Basic Usage

```bash
# Query records
npm run query -- "SELECT Id, Name FROM Account LIMIT 10"

# Create record
npm run create -- Account '{"Name":"New Account","Industry":"Technology"}'

# Export data
npm run export -- Account --output accounts.csv

# Detect edition
npm run detect
```

## CLI Commands

### setup
Interactive OAuth authentication wizard.

### detect
Display Salesforce edition and features.

### query
Execute SOQL queries with CSV export option.

### create
Create new records from JSON or CSV.

### update
Update existing records.

### delete
Delete records by ID.

### bulk
Bulk operations with Bulk API 2.0.

### export
Export Salesforce data to CSV.

### diagnose
System diagnostics and connection test.

## TypeScript API

```typescript
import { SalesforceClient } from './src/index';

const client = new SalesforceClient({
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!
});

await client.authenticate();

// Query
const accounts = await client.query('SELECT Id, Name FROM Account');

// Create
const result = await client.create('Account', {
  Name: 'Acme Corp',
  Industry: 'Technology'
});

// Bulk operations
await client.bulk.insert('Contact', contacts);
```

## Salesforce Editions

### Developer (Free)
- 15,000 API calls/24h
- Full API access
- Best for development and testing

### Professional
- 5,000 API calls per license/24h
- Limited customization
- Best for small businesses

### Enterprise
- 100,000 API calls/24h
- Advanced customization
- Best for large enterprises

### Unlimited
- Unlimited API calls
- Premier support
- Best for mission-critical deployments

### Performance
- Unlimited API calls
- Highest performance tier

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
```

## Resources

- [Full Documentation](./SKILL.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Salesforce Developer Docs](https://developer.salesforce.com/)

## License

Part of the AI-ley toolkit. See main repository for license.
