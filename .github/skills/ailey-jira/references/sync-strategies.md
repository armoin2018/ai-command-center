# Plan Synchronization Strategies

## Overview

The ailey-jira skill provides bidirectional synchronization between Jira and `.project/PLAN.json`. This guide covers sync strategies, conflict resolution, and best practices.

## Sync Modes

### Pull Mode (Jira → PLAN.json)

Retrieves issues from Jira and updates or creates items in PLAN.json.

**Use Cases:**
- Initial plan creation from existing Jira project
- Regular updates to keep plan current with Jira
- Importing specific sprints or epics

**Command:**
```bash
npm run sync pull -- -j "JQL_QUERY" [--merge]
```

**Behavior:**
- **Without --merge**: Replaces entire plan with Jira data
- **With --merge**: Updates existing items, adds new ones

### Push Mode (PLAN.json → Jira)

Updates Jira issues from PLAN.json changes.

**Use Cases:**
- Updating Jira after local planning sessions
- Creating new issues from plan items
- Syncing status and assignment changes

**Command:**
```bash
npm run sync push -- --project PROJ [--create-missing]
```

**Behavior:**
- Updates issues with existing `jiraKey`
- **With --create-missing**: Creates new Jira issues for items without `jiraKey`
- Updates `jiraKey` in PLAN.json for newly created issues

## Field Mapping

### Jira to Plan

| Jira Field | Plan Field | Transformation |
|------------|------------|----------------|
| `key` | `jiraKey` | Direct |
| `summary` | `name` | Direct |
| `issuetype.name` | `type` | Epic→epic, Story→story, Task/Bug→task |
| `status.name` | `status` | Done/Closed→done, In Progress→in-progress, else→not-started |
| `priority.name` | `priority` | Lowercase |
| `assignee.name` | `assignee` | Direct |
| `description` | `description` | Direct |
| `labels` | `labels` | Array |

### Plan to Jira

| Plan Field | Jira Field | Transformation |
|------------|------------|----------------|
| `name` | `summary` | Direct |
| `type` | `issuetype` | epic→Epic, story→Story, task→Task |
| `description` | `description` | Direct |
| `priority` | `priority` | Capitalized |
| `assignee` | `assignee` | Direct |
| `labels` | `labels` | Array |
| `jiraKey` | `key` | Identifies existing issue |

### Plan-Only Fields

These fields exist only in PLAN.json and are not synced to Jira:

- `id`: Internal plan identifier
- `acceptanceCriteria`: Acceptance criteria list
- `dependencies`: Plan item dependencies
- `estimatedHours`: Time estimates

**Strategy**: Use Jira custom fields or Description to store these values if needed in Jira.

## Sync Workflows

### Workflow 1: Initial Setup

Create plan from existing Jira project:

```bash
# Pull all epics, stories, and tasks
npm run sync pull -- \
  -j "project = PROJ AND type IN (Epic, Story, Task)" \
  --plan .project/PLAN.json

# Result: New PLAN.json with all Jira issues
```

### Workflow 2: Regular Sync

Keep plan updated with Jira changes:

```bash
# Pull updates (merge mode)
npm run sync pull -- \
  -j "project = PROJ AND updated >= -7d" \
  --plan .project/PLAN.json \
  --merge

# Result: Existing plan updated with recent Jira changes
```

### Workflow 3: Local Planning → Jira

Plan locally, then create Jira issues:

```bash
# 1. Edit .project/PLAN.json locally
# 2. Push to Jira
npm run sync push -- \
  --project PROJ \
  --plan .project/PLAN.json \
  --create-missing \
  --dry-run  # Preview first

# 3. Actually push
npm run sync push -- \
  --project PROJ \
  --plan .project/PLAN.json \
  --create-missing

# Result: New Jira issues created, jiraKey added to plan
```

### Workflow 4: Sprint Planning

Sync specific sprint:

```bash
# Pull current sprint
npm run sync pull -- \
  -j "project = PROJ AND sprint in openSprints()" \
  --plan .project/PLAN.json \
  --merge

# Plan sprint locally in PLAN.json

# Push updates back
npm run sync push -- \
  --project PROJ \
  --plan .project/PLAN.json
```

## Conflict Resolution

### Scenario 1: Same Issue Updated in Both Places

**Situation**: Issue PROJ-123 updated in both Jira and PLAN.json

**Resolution**:
1. Pull first (gets latest Jira state)
2. Manually merge local changes
3. Push updates back

```bash
# Get latest from Jira
npm run sync pull -- -j "key = PROJ-123" --merge

# Review changes in PLAN.json
# Manually adjust if needed

# Push your changes
npm run sync push -- --project PROJ
```

### Scenario 2: Issue Deleted in Jira

**Situation**: Item in PLAN.json references deleted Jira issue

**Resolution**:
- Pull with merge keeps plan item (Jira issue not found, skipped)
- Manually remove item or update `jiraKey`

### Scenario 3: Issue Moved to Different Project

**Situation**: Jira issue key changed (moved to different project)

**Resolution**:
1. Update `jiraKey` in PLAN.json manually
2. Push to update Jira
3. Or remove old item and pull as new

## Merge Strategies

### Replace Strategy (Default Pull)

**Command:**
```bash
npm run sync pull -- -j "JQL"
```

**Behavior:**
- Deletes existing epics, stories, tasks arrays
- Replaces with data from Jira
- Preserves plan version and structure

**Use When:**
- Creating fresh plan from Jira
- Resetting plan to match Jira exactly

### Merge Strategy (--merge Flag)

**Command:**
```bash
npm run sync pull -- -j "JQL" --merge
```

**Behavior:**
- Finds existing items by `jiraKey`
- Updates found items with Jira data
- Adds new items from Jira
- Preserves items not in Jira query

**Use When:**
- Regular sync to keep plan current
- Partial updates (sprint, specific issues)
- Preserving local planning data

### Incremental Push

**Command:**
```bash
npm run sync push -- --project PROJ
```

**Behavior:**
- Only updates issues with `jiraKey`
- Skips items without `jiraKey` (unless --create-missing)
- Updates Jira with current plan state

**Use When:**
- Pushing local changes to Jira
- Updating assignments, status, priorities
- Batch updates from planning session

## Best Practices

### 1. Establish Sync Cadence

**Recommended**:
- Pull from Jira: Daily (automated)
- Push to Jira: After planning sessions
- Use `--merge` for regular pulls

### 2. Use Version Control

**Track PLAN.json in Git:**
```bash
git add .project/PLAN.json
git commit -m "Synced with Jira PROJ sprint 23"
```

Benefits:
- History of plan changes
- Rollback capability
- Collaboration via branches

### 3. Dry Run First

**Always preview push operations:**
```bash
npm run sync push -- --project PROJ --dry-run
```

### 4. Scope JQL Queries

**Use specific queries to avoid data overload:**
```jql
# Good - specific scope
project = PROJ AND sprint in openSprints()

# Good - recent changes
project = PROJ AND updated >= -7d

# Bad - too broad
project = PROJ
```

### 5. Handle Custom Fields

**For plan-only fields (acceptance criteria, dependencies):**

Option A: Store in Jira description
```json
{
  "description": "Feature description\n\n## Acceptance Criteria\n- Users can login\n\n## Dependencies\n- setup_database"
}
```

Option B: Use Jira custom fields
```typescript
// Extend sync-plan.ts to map custom fields
issue.fields.customfield_10001 = item.acceptanceCriteria;
```

Option C: Keep plan-only
- Don't sync to Jira
- Use PLAN.json as source of truth for planning data

### 6. Monitor Sync Errors

**Check sync output for errors:**
- Authentication failures
- Permission issues
- Field validation errors
- Missing required fields

**Log to file:**
```bash
npm run sync pull -- -j "JQL" 2>&1 | tee sync.log
```

## Schema Compliance

The sync operations respect `.github/aicc/schemas/plan.v*.schema.json`:

### Required Fields (Per Schema)
```json
{
  "id": "string (unique)",
  "name": "string",
  "type": "epic | story | task",
  "status": "not-started | in-progress | done"
}
```

### Optional Fields
```json
{
  "jiraKey": "string",
  "priority": "low | medium | high | highest",
  "assignee": "string",
  "description": "string",
  "labels": ["string"],
  "acceptanceCriteria": ["string"],
  "dependencies": ["string"]
}
```

### Validation

Sync operations validate against schema:
- Type checking (epic/story/task)
- Required field presence
- ID uniqueness
- Valid status values

## Troubleshooting

### Sync Creates Duplicates

**Cause**: Items missing `jiraKey`, created on each pull

**Solution**:
1. Manually add `jiraKey` to existing items
2. Use `--merge` to update instead of replace

### Permission Errors

**Cause**: Jira user lacks permissions

**Solution**:
- Verify user has create/edit permissions in project
- Check project configuration
- Use admin account for sync operations

### Field Validation Errors

**Cause**: Invalid field values (e.g., unknown priority)

**Solution**:
- Use valid Jira field values
- Check Jira field configuration
- Normalize data before push

## Example: Complete Sync Workflow

```bash
# 1. Initial setup - create plan from Jira
npm run sync pull -- \
  -j "project = PROJ" \
  --plan .project/PLAN.json

# 2. Track in version control
git add .project/PLAN.json
git commit -m "Initial plan from Jira"

# 3. Regular sync (daily automated)
npm run sync pull -- \
  -j "project = PROJ AND updated >= -1d" \
  --plan .project/PLAN.json \
  --merge

git add .project/PLAN.json
git commit -m "Daily sync from Jira"

# 4. Planning session - edit PLAN.json locally
# Add new stories, update priorities, etc.

# 5. Preview push
npm run sync push -- \
  --project PROJ \
  --plan .project/PLAN.json \
  --create-missing \
  --dry-run

# 6. Push changes to Jira
npm run sync push -- \
  --project PROJ \
  --plan .project/PLAN.json \
  --create-missing

git add .project/PLAN.json
git commit -m "Pushed sprint 24 plan to Jira"
```

## References

- [PLAN.json Schema](../../aicc/schemas/plan.v1.schema.json)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v2/)
- [JQL Guide](jql-guide.md)
