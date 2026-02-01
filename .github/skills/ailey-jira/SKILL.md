---
name: ailey-jira
description: Jira integration with CRUD operations, bulk CSV import/export, bidirectional plan synchronization, and JQL query support. Use when managing Jira issues, syncing with project plans, or performing bulk operations on Jira data.
keywords: [jira, atlassian, crud, import, export, sync, plan, csv, jql, issue-tracking]
tools: [jira-client, csv-parse, csv-stringify, commander]
---

# AI-ley Jira Integration

Comprehensive Jira integration providing CRUD operations, bulk import/export, and bidirectional synchronization with `.project/PLAN.json`.

## Overview

The ailey-jira skill enables seamless interaction with Jira for:

- **CRUD Operations**: Create, read, update, delete, and search Jira issues
- **Bulk Import**: Import issues from CSV files with error handling
- **Bulk Export**: Export issues to CSV or JSON using JQL queries
- **Plan Synchronization**: Bidirectional sync between Jira and `.project/PLAN.json`
- **Secure Authentication**: Environment-based credentials from `.env` files
- **JQL Support**: Full Jira Query Language support for advanced filtering

## When to Use

- Managing Jira issues programmatically
- Bulk importing issues from spreadsheets or external systems
- Exporting Jira data for reporting or analysis
- Synchronizing Jira with local project planning
- Automating Jira workflows and integrations
- Migrating issues between projects or instances

## Installation

```bash
cd .github/skills/ailey-jira
npm install
```

## Quick Start

### 1. Configure Credentials

Create `.env` file in one of these locations:
- `~/.vscode/.env` (global)
- `.env` (project root)
- `.env.local` (project root, gitignored)

```bash
ATLASSIAN_URL=https://your-domain.atlassian.net
ATLASSIAN_USER=your-email@example.com
ATLASSIAN_APIKEY=your-api-token
```

**Get API Token**: [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

### 2. Test Connection

```bash
npm run jira test
```

### 3. Create an Issue

```bash
tsx scripts/crud-operations.ts create \
  --project PROJ \
  --summary "Implement new feature" \
  --type Story \
  --description "Detailed description"
```

## Workflows

### Workflow 1: CRUD Operations

**Create Issue:**
```bash
tsx scripts/crud-operations.ts create \
  --project PROJ \
  --summary "Fix bug in authentication" \
  --type Bug \
  --priority High \
  --assignee john.doe \
  --labels "backend,security"
```

**Get Issue:**
```bash
tsx scripts/crud-operations.ts get PROJ-123
```

**Update Issue:**
```bash
tsx scripts/crud-operations.ts update PROJ-123 \
  --summary "Updated summary" \
  --status "In Progress" \
  --assignee jane.doe
```

**Delete Issue:**
```bash
tsx scripts/crud-operations.ts delete PROJ-123 --force
```

**Search Issues:**
```bash
tsx scripts/crud-operations.ts search \
  "project = PROJ AND status = 'In Progress'" \
  --limit 100
```

### Workflow 2: Bulk Import from CSV

**Prepare CSV file (`issues.csv`):**
```csv
project,summary,type,description,priority,assignee,labels,components
PROJ,Implement login,Story,User authentication,High,john.doe,backend;auth,Auth
PROJ,Fix UI bug,Bug,Button alignment,Medium,jane.doe,frontend,UI
PROJ,Update docs,Task,API documentation,Low,,docs,Documentation
```

**Import:**
```bash
npm run import issues.csv -- --project PROJ
```

**With Options:**
```bash
npm run import issues.csv -- \
  --project PROJ \
  --dry-run \         # Preview without creating
  --skip-errors       # Continue on errors
```

**CSV Format:**
- **Required**: `summary`
- **Optional**: `project`, `type`, `description`, `priority`, `assignee`, `labels`, `components`
- **Defaults**: Project from `--project` flag, Type = `Task`
- **Multi-value**: Use semicolons (`;`) for labels and components

### Workflow 3: Bulk Export to CSV/JSON

**Export to CSV:**
```bash
npm run export -- \
  -j "project = PROJ AND status != Done" \
  -o export.csv \
  -f csv
```

**Export to JSON:**
```bash
npm run export -- \
  -j "project = PROJ AND created >= -30d" \
  -o recent-issues.json \
  -f json
```

**Custom Fields:**
```bash
npm run export -- \
  -j "assignee = currentUser()" \
  -o my-issues.csv \
  --fields "key,summary,status,priority,created"
```

**Export Options:**
- `-j, --jql <query>`: JQL query (required)
- `-o, --output <file>`: Output file path (required)
- `-f, --format <format>`: `csv` or `json` (default: csv)
- `-l, --limit <number>`: Max results (default: 1000)
- `--fields <fields>`: Comma-separated fields

### Workflow 4: Sync with PLAN.json

**Pull from Jira to PLAN.json:**
```bash
npm run sync pull -- \
  -j "project = PROJ AND type in (Epic, Story, Task)" \
  --plan .project/PLAN.json \
  --merge  # Merge with existing plan
```

**Push from PLAN.json to Jira:**
```bash
npm run sync push -- \
  --project PROJ \
  --plan .project/PLAN.json \
  --create-missing \  # Create Jira issues for items without jiraKey
  --dry-run          # Preview changes
```

**Sync Workflow:**
1. **Pull**: Retrieve Jira issues and convert to PLAN.json format
2. **Edit**: Make changes to `.project/PLAN.json`
3. **Push**: Update Jira with changes
4. **Repeat**: Keep Jira and plan in sync

**Mapping:**
- Jira `Epic` ↔ Plan `epic`
- Jira `Story` ↔ Plan `story`
- Jira `Task`/`Bug` ↔ Plan `task`
- Jira `key` ↔ Plan `jiraKey`
- Status mapping: `Done`/`Closed` → `done`, `In Progress` → `in-progress`, others → `not-started`

## Configuration

### Environment Variables

```bash
# Required
ATLASSIAN_URL=https://your-domain.atlassian.net
ATLASSIAN_USER=your-email@example.com

# Authentication (choose one)
ATLASSIAN_APIKEY=your-api-token    # Recommended
ATLASSIAN_PASSWORD=your-password   # Legacy
```

### Plan Schema Integration

The skill automatically works with plan schemas in `.github/aicc/schemas/plan.v*.schema.json`.

**Plan Item Structure:**
```json
{
  "id": "feature_auth",
  "name": "Implement authentication",
  "type": "story",
  "status": "in-progress",
  "jiraKey": "PROJ-123",
  "priority": "high",
  "assignee": "john.doe",
  "description": "User login and registration",
  "labels": ["backend", "security"],
  "acceptanceCriteria": ["Users can log in", "Sessions persist"],
  "dependencies": ["setup_database"]
}
```

## Scripts

### jira-client.ts
- Jira API client factory
- Environment variable loading
- Connection testing
- Shared authentication logic

### crud-operations.ts
- Create, read, update, delete operations
- JQL search with filtering
- Field-level updates
- Status transitions

### bulk-import.ts
- CSV parsing and validation
- Batch issue creation
- Error handling and recovery
- Dry-run mode

### bulk-export.ts
- JQL-based export
- CSV and JSON formats
- Custom field selection
- Large result handling

### sync-plan.ts
- Bidirectional synchronization
- Plan schema compliance
- Merge strategies
- Conflict resolution

### index.ts
- Main CLI orchestration
- Command routing
- Help and documentation

## Examples

### Example 1: Sprint Planning

```bash
# Export current sprint issues
npm run export -- \
  -j "sprint in openSprints() AND project = PROJ" \
  -o sprint-issues.csv

# Import refined backlog
npm run import refined-backlog.csv -- --project PROJ

# Sync with local plan
npm run sync pull -- \
  -j "sprint in openSprints() AND project = PROJ" \
  --plan .project/PLAN.json
```

### Example 2: Bug Triage

```bash
# Search unassigned bugs
tsx scripts/crud-operations.ts search \
  "project = PROJ AND type = Bug AND assignee is EMPTY" \
  --limit 50

# Bulk assign from CSV
cat bugs-assigned.csv
project,key,assignee
PROJ,PROJ-101,john.doe
PROJ,PROJ-102,jane.doe

# Update via sync (add jiraKey to PLAN.json, then push)
npm run sync push -- --project PROJ
```

### Example 3: Reporting

```bash
# Export completed work for reporting
npm run export -- \
  -j "project = PROJ AND status = Done AND updated >= -7d" \
  -o weekly-completed.json \
  -f json

# Export by assignee
npm run export -- \
  -j "assignee = currentUser() AND status != Done" \
  -o my-open-tasks.csv \
  --fields "key,summary,priority,status,updated"
```

## Integration

### With ailey-data-converter

Use ailey-data-converter for advanced filtering and transformations:

```bash
# Export to JSON
npm run export -- -j "project = PROJ" -o issues.json -f json

# Use ailey-data-converter for advanced queries
cd .github/skills/ailey-data-converter
npm run query ../ailey-jira/.rag/issues.json \
  --filter '.[] | select(.priority == "High")' \
  --output high-priority.json
```

### With ailey-manage-plan

Combine with ailey-manage-plan for comprehensive project management:

```bash
# Pull from Jira
npm run sync pull -- -j "project = PROJ"

# Query plan with ailey-manage-plan
cd .github/skills/ailey-manage-plan
npm run query -- --filter "status=in-progress"

# Push updates back to Jira
cd ../ailey-jira
npm run sync push -- --project PROJ
```

## JQL Reference

Common JQL queries:

```jql
# All open issues in project
project = PROJ AND status != Done

# High priority bugs
type = Bug AND priority = High

# Assigned to me
assignee = currentUser()

# Updated recently
updated >= -7d

# Current sprint
sprint in openSprints()

# Specific labels
labels in (backend, security)

# Multiple conditions
project = PROJ AND type = Story AND status = "In Progress" AND assignee != EMPTY
```

See [references/jql-guide.md](references/jql-guide.md) for comprehensive JQL documentation.

## Troubleshooting

### Authentication Failed

**Problem**: "Login failed" or "Unauthorized"

**Solution**:
1. Verify ATLASSIAN_URL is correct (include `https://`)
2. Check ATLASSIAN_USER matches your Atlassian account email
3. Generate new API token: https://id.atlassian.com/manage-profile/security/api-tokens
4. Ensure `.env` file is in correct location

### CSV Import Errors

**Problem**: Import fails with parsing errors

**Solution**:
1. Ensure CSV has header row
2. Use semicolons (`;`) for multi-value fields (labels, components)
3. Quote fields with commas
4. Use `--skip-errors` to continue on failures
5. Use `--dry-run` to preview

### Sync Conflicts

**Problem**: Push fails with "Issue already updated"

**Solution**:
1. Pull latest changes from Jira first
2. Resolve conflicts in PLAN.json
3. Push updates
4. Use merge mode for incremental updates

## Notes

- API tokens are more secure than passwords (recommended)
- CSV format supports all standard Jira fields
- JQL queries are powerful - see Atlassian documentation
- Plan sync preserves local changes not in Jira
- All operations support dry-run for safety
- Scripts can be run independently via `tsx`
- Use `--help` on any command for detailed usage

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.5
---
