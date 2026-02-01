# Salesforce Quick Reference

## CLI Commands

### setup
```bash
npm run setup
```
Interactive OAuth authentication wizard with edition detection.

### detect
```bash
npm run detect
```
Display Salesforce edition, API limits, and available features.

### query
```bash
npm run query -- <soql> [options]

Options:
  -o, --output <file>    Export to CSV
  -l, --limit <number>   Limit results
  --all                  Query all with pagination
  --format <format>      Output format (table, json, csv)
```

**Examples:**
```bash
npm run query -- "SELECT Id, Name FROM Account"
npm run query -- "SELECT * FROM Contact" --output contacts.csv
npm run query -- "SELECT Name FROM Opportunity WHERE Amount > 10000" --all
```

### create
```bash
npm run create -- <object> <json-data>
```

**Examples:**
```bash
npm run create -- Account '{"Name":"Acme","Industry":"Tech"}'
npm run create -- Contact '{"FirstName":"John","LastName":"Doe","Email":"john@example.com"}'
```

### update
```bash
npm run update -- <object> <id> <json-data>
```

**Example:**
```bash
npm run update -- Account 001XXXXXX '{"Phone":"555-1234"}'
```

### delete
```bash
npm run delete -- <object> <id>
```

**Example:**
```bash
npm run delete -- Lead 00QXXXXXX
```

### bulk
```bash
npm run bulk -- <operation> <object> <csv-file> [options]

Operations: insert, update, upsert, delete

Options:
  --batch-size <size>    Records per batch
  --external-id <field>  External ID for upsert
  --wait                 Wait for completion
```

**Examples:**
```bash
npm run bulk -- insert Account accounts.csv
npm run bulk -- upsert Contact contacts.csv --external-id Email
npm run bulk -- delete Lead leads.csv --wait
```

### export
```bash
npm run export -- <object> [options]

Options:
  -o, --output <file>   Output file
  -q, --query <soql>    WHERE clause
  -f, --fields <list>   Field list
  --all                 All fields
```

**Examples:**
```bash
npm run export -- Account --output accounts.csv
npm run export -- Opportunity --query "StageName = 'Closed Won'"
npm run export -- Contact --fields "FirstName,LastName,Email"
```

### diagnose
```bash
npm run diagnose
```
System diagnostics, authentication check, and API limit verification.

## SOQL Examples

### Basic Query
```sql
SELECT Id, Name FROM Account
```

### WHERE Clause
```sql
SELECT Name, Email FROM Contact WHERE Account.Name = 'Acme Corp'
```

### ORDER BY
```sql
SELECT Name, Amount FROM Opportunity ORDER BY Amount DESC
```

### LIMIT
```sql
SELECT Id, Name FROM Lead LIMIT 100
```

### Aggregate Functions
```sql
SELECT COUNT(), SUM(Amount) FROM Opportunity WHERE StageName = 'Closed Won'
```

### Relationship Queries
```sql
SELECT Name, Account.Name, Account.Industry FROM Contact
```

### Date Literals
```sql
SELECT Id, CreatedDate FROM Case WHERE CreatedDate = THIS_YEAR
```

## TypeScript API

### Authentication
```typescript
import { SalesforceClient } from './src/index';

const client = new SalesforceClient({
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!
});

await client.authenticate();
```

### Query
```typescript
const result = await client.query('SELECT Id, Name FROM Account');
console.log(result.records);

// With pagination
const allRecords = await client.queryAll('SELECT Id FROM Contact');
```

### Create
```typescript
const result = await client.create('Account', {
  Name: 'Acme Corp',
  Industry: 'Technology'
});
console.log(result.id);
```

### Update
```typescript
await client.update('Account', accountId, {
  Phone: '555-1234',
  Website: 'https://acme.com'
});
```

### Delete
```typescript
await client.delete('Account', accountId);
```

### Bulk Operations
```typescript
// Insert
await client.bulk.insert('Account', accounts, { wait: true });

// Upsert
await client.bulk.upsert('Contact', contacts, {
  externalIdField: 'Email__c',
  wait: true
});

// Delete
await client.bulk.delete('Lead', leadIds);
```

### Edition Detection
```typescript
const edition = await client.detectEdition();
console.log(edition.edition); // 'Enterprise'
console.log(edition.apiCallsPerDay); // 100000
```

### API Limits
```typescript
const limits = await client.getApiLimits();
console.log(`Used: ${limits.DailyApiRequests.Used}`);
console.log(`Max: ${limits.DailyApiRequests.Max}`);
```

### Export to CSV
```typescript
const accounts = await client.queryAll('SELECT * FROM Account');
await client.exportToCsv(accounts.records, 'accounts.csv');
```

## Salesforce Editions

| Edition | API Calls/Day | Bulk API | Streaming | Custom Objects |
|---------|---------------|----------|-----------|----------------|
| Developer | 15,000 | ✓ | ✓ | 200 |
| Professional | 5,000/license | Add-on | ✗ | 10 |
| Enterprise | 100,000 | ✓ | ✓ | 2,000 |
| Unlimited | Unlimited | ✓ | ✓ | 2,000 |
| Performance | Unlimited | ✓ | ✓ | 2,000 |

## Common Objects

### Standard Objects
- Account
- Contact
- Lead
- Opportunity
- Case
- Task
- Event
- Campaign
- User

### Query Templates

**Accounts:**
```sql
SELECT Id, Name, Industry, AnnualRevenue, Phone, Website FROM Account
```

**Contacts:**
```sql
SELECT Id, FirstName, LastName, Email, Phone, Account.Name FROM Contact
```

**Opportunities:**
```sql
SELECT Id, Name, Amount, StageName, CloseDate, Account.Name FROM Opportunity
```

**Leads:**
```sql
SELECT Id, Name, Company, Email, Status, LeadSource FROM Lead
```

**Cases:**
```sql
SELECT Id, CaseNumber, Subject, Status, Priority, Account.Name FROM Case
```

## Environment Variables

```bash
# OAuth
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_CALLBACK_URL=http://localhost:3000/oauth/callback

# Instance
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_API_VERSION=59.0

# Auth Method
AUTH_METHOD=oauth

# API Limits
MAX_API_CALLS_PER_DAY=15000

# Bulk API
BULK_BATCH_SIZE=10000
ENABLE_BULK_API=true
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invalid OAuth credentials | Verify Connected App credentials in .env |
| Session expired | Re-run `npm run setup` |
| API limit exceeded | Wait 24 hours or use Bulk API |
| INVALID_FIELD | Check object metadata |
| REQUIRED_FIELD_MISSING | Add required fields |

## Resources

- [Full Documentation](./SKILL.md)
- [Salesforce Developer](https://developer.salesforce.com/)
- [REST API Guide](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)
- [SOQL Reference](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/)
