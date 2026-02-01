# ailey-jira

Comprehensive Jira integration for CRUD operations, bulk import/export, and bidirectional plan synchronization.

## Features

- ✅ **CRUD Operations**: Create, read, update, delete, and search Jira issues
- ✅ **Bulk Import**: Import issues from CSV files with validation
- ✅ **Bulk Export**: Export issues to CSV or JSON using JQL queries
- ✅ **Plan Sync**: Bidirectional sync with `.project/PLAN.json`
- ✅ **JQL Support**: Full Jira Query Language support
- ✅ **Secure Auth**: Environment-based credentials (API token recommended)

## Quick Start

See [SETUP.md](SETUP.md) for detailed setup instructions.

```bash
# Install
npm install

# Configure (create .env with credentials)
ATLASSIAN_URL=https://your-domain.atlassian.net
ATLASSIAN_USER=your-email@example.com
ATLASSIAN_APIKEY=your-api-token

# Test
npm run jira test

# Create issue
tsx scripts/crud-operations.ts create \
  --project PROJ \
  --summary "New task" \
  --type Task

# Export to CSV
npm run export -- -j "project = PROJ" -o issues.csv

# Sync with plan
npm run sync pull -- -j "project = PROJ"
```

## Documentation

- [SKILL.md](SKILL.md) - Complete skill documentation with workflows
- [SETUP.md](SETUP.md) - Quick setup guide
- [references/jql-guide.md](references/jql-guide.md) - JQL query reference
- [references/sync-strategies.md](references/sync-strategies.md) - Plan sync guide

## Scripts

- `jira-client.ts` - Jira API client with auth
- `crud-operations.ts` - CRUD and search operations
- `bulk-import.ts` - CSV import with error handling
- `bulk-export.ts` - CSV/JSON export with JQL
- `sync-plan.ts` - Bidirectional plan synchronization
- `index.ts` - Main CLI entry point

## Integration

Works with:
- **ailey-tools-data-converter**: Advanced filtering and transformations
- **ailey-manage-plan**: Comprehensive project management
- **.project/PLAN.json**: Local project planning

## Requirements

- Node.js 18+
- Jira Cloud or Server with API access
- API token (recommended) or password

---

Part of the ai-ley kit.
