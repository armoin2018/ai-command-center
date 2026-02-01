# Quick Setup Guide

## Prerequisites

1. **Jira Account** with API access
2. **Node.js** 18+ installed
3. **Project** with `.project/PLAN.json` (for sync features)

## Installation

```bash
cd .github/skills/ailey-jira
npm install
```

## Configuration

### Step 1: Get API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Name it (e.g., "ailey-jira")
4. Copy the token (you won't see it again!)

### Step 2: Create .env File

Create `.env` in one of these locations:
- `~/.vscode/.env` (global, recommended)
- `.env` (project root)
- `.env.local` (project root, git-ignored)

```bash
ATLASSIAN_URL=https://your-domain.atlassian.net
ATLASSIAN_USER=your-email@example.com
ATLASSIAN_APIKEY=your-api-token-here
```

**Important**:
- Replace `your-domain` with your actual Atlassian domain
- Use your account email for `ATLASSIAN_USER`
- Paste the API token from Step 1

### Step 3: Test Connection

```bash
npm run jira test
```

Expected output:
```
✅ Connected to Jira: Your Company Jira
   Version: 9.4.0
```

## Quick Start Examples

### Create an Issue

```bash
tsx scripts/crud-operations.ts create \
  --project MYPROJ \
  --summary "Setup development environment" \
  --type Task \
  --description "Install dependencies and configure tools" \
  --priority High
```

### Search Issues

```bash
tsx scripts/crud-operations.ts search \
  "project = MYPROJ AND status = 'To Do'" \
  --limit 10
```

### Export to CSV

```bash
npm run export -- \
  -j "project = MYPROJ" \
  -o my-project-issues.csv
```

### Import from CSV

Create `issues.csv`:
```csv
project,summary,type,description,priority
MYPROJ,Fix login bug,Bug,Users can't log in,High
MYPROJ,Add dark mode,Story,Support dark theme,Medium
```

Import:
```bash
npm run import issues.csv -- --project MYPROJ
```

### Sync with PLAN.json

Pull from Jira:
```bash
npm run sync pull -- \
  -j "project = MYPROJ" \
  --plan .project/PLAN.json
```

Push to Jira:
```bash
npm run sync push -- \
  --project MYPROJ \
  --plan .project/PLAN.json \
  --create-missing
```

## Troubleshooting

### "Cannot find module"

```bash
cd .github/skills/ailey-jira
npm install
```

### "Login failed"

- Verify `ATLASSIAN_URL` includes `https://`
- Check API token is valid (regenerate if needed)
- Ensure email matches Atlassian account

### "Project not found"

- Verify project key is correct (all caps, e.g., PROJ not proj)
- Check you have access to the project

### Permission Errors

- Verify your account has necessary permissions:
  - Browse Projects
  - Create Issues
  - Edit Issues
  - Delete Issues (for delete operations)

## Common Commands

```bash
# Test connection
npm run jira test

# Create issue
tsx scripts/crud-operations.ts create --project PROJ --summary "Title" --type Task

# Get issue
tsx scripts/crud-operations.ts get PROJ-123

# Update issue
tsx scripts/crud-operations.ts update PROJ-123 --status "In Progress"

# Search
tsx scripts/crud-operations.ts search "assignee = currentUser()"

# Import CSV
npm run import file.csv -- --project PROJ

# Export CSV
npm run export -- -j "project = PROJ" -o output.csv

# Export JSON
npm run export -- -j "project = PROJ" -o output.json -f json

# Pull from Jira
npm run sync pull -- -j "project = PROJ" --merge

# Push to Jira
npm run sync push -- --project PROJ --dry-run
```

## Next Steps

1. Review [SKILL.md](SKILL.md) for comprehensive documentation
2. See [jql-guide.md](references/jql-guide.md) for advanced queries
3. Read [sync-strategies.md](references/sync-strategies.md) for sync workflows
4. Explore integration with `ailey-tools-data-converter` and `ailey-manage-plan`

## Environment File Locations

The skill checks these locations in order:

1. `~/.vscode/.env` (global, recommended for credentials)
2. `.env` (project root)
3. `.env.local` (project root, git-ignored)

**Recommendation**: Use `~/.vscode/.env` for credentials, `.env.local` for project-specific overrides.

## Security Notes

- **Never commit API tokens** to version control
- Add `.env` and `.env.local` to `.gitignore`
- Use API tokens (not passwords)
- Rotate tokens periodically
- Use separate tokens for different purposes
