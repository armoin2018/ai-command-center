# Jira Query Language (JQL) Reference

## Overview

JQL (Jira Query Language) is a powerful query language for searching and filtering Jira issues. It's similar to SQL but optimized for Jira's data model.

## Basic Syntax

```jql
field operator value
```

Multiple conditions combined with `AND`, `OR`, `NOT`:

```jql
project = PROJ AND status = "In Progress" AND assignee = currentUser()
```

## Common Fields

### Project and Issue
- `project`: Project key or name
- `key`: Issue key (e.g., PROJ-123)
- `issuekey`: Alias for `key`
- `type` / `issuetype`: Issue type (Epic, Story, Task, Bug, etc.)
- `status`: Current status
- `resolution`: Resolution (Done, Won't Do, Duplicate, etc.)

### People
- `assignee`: Person assigned to issue
- `reporter`: Person who created issue
- `creator`: Alias for `reporter`
- `watcher`: People watching issue

### Dates
- `created`: When issue was created
- `updated`: Last update time
- `resolved`: When issue was resolved
- `due`: Due date

### Content
- `summary`: Issue title/summary
- `description`: Issue description
- `comment`: Issue comments
- `labels`: Issue labels
- `component`: Issue components

### Hierarchy
- `parent`: Parent issue (for subtasks)
- `epic`: Epic link
- `sprint`: Sprint assignment

### Custom Fields
- `priority`: Issue priority
- `fixVersion`: Target version
- `affectsVersion`: Affected version

## Operators

### Equality
- `=`: Equals
- `!=`: Not equals
- `IN`: Matches any value in list
- `NOT IN`: Doesn't match any value

### Comparison
- `>`: Greater than
- `>=`: Greater than or equal
- `<`: Less than
- `<=`: Less than or equal

### Text Matching
- `~`: Contains (text search)
- `!~`: Doesn't contain
- `IS`: Is (for EMPTY and NULL)
- `IS NOT`: Is not

### Logic
- `AND`: Both conditions must be true
- `OR`: Either condition must be true
- `NOT`: Negates condition

## Functions

### Time-Based
```jql
# Issues created in last 7 days
created >= -7d

# Issues updated yesterday
updated >= startOfDay(-1d) AND updated <= endOfDay(-1d)

# Issues due this week
due >= startOfWeek() AND due <= endOfWeek()
```

### User Functions
```jql
# Assigned to current user
assignee = currentUser()

# Unassigned
assignee IS EMPTY

# Assigned to members of group
assignee IN membersOf("developers")
```

### Sprint Functions
```jql
# Current sprint
sprint in openSprints()

# Specific sprint
sprint = "Sprint 23"

# Future sprints
sprint IN futureSprints()
```

### Version Functions
```jql
# Released versions
fixVersion IN releasedVersions()

# Unreleased versions
fixVersion IN unreleasedVersions()

# Latest release
fixVersion = latestReleasedVersion()
```

## Common Queries

### Project Management
```jql
# All open issues in project
project = PROJ AND status != Done

# Current sprint backlog
project = PROJ AND sprint in openSprints()

# Overdue tasks
due < now() AND status != Done

# High priority open issues
priority IN (Highest, High) AND status NOT IN (Done, Closed)
```

### Team Queries
```jql
# My open tasks
assignee = currentUser() AND status != Done

# Unassigned bugs
type = Bug AND assignee IS EMPTY

# Team's work in progress
assignee IN membersOf("engineering") AND status = "In Progress"

# Issues I'm watching
watcher = currentUser()
```

### Release Planning
```jql
# Issues for next release
fixVersion = "2.0.0" AND status != Done

# Completed in last sprint
sprint = "Sprint 23" AND status = Done

# Bugs found in current version
affectsVersion = "1.9.0" AND type = Bug
```

### Search and Discovery
```jql
# Text search in summary
summary ~ "authentication"

# Contains specific label
labels = "technical-debt"

# Recently updated
updated >= -24h

# Created by specific user
reporter = "john.doe"
```

## Advanced Queries

### Complex Conditions
```jql
# High priority bugs OR critical issues
(priority = High AND type = Bug) OR priority = Highest

# Open issues except documentation
project = PROJ AND status != Done AND labels != documentation

# Assigned but not in progress
assignee IS NOT EMPTY AND status NOT IN ("In Progress", Done)
```

### Date Ranges
```jql
# Issues created this month
created >= startOfMonth() AND created <= endOfMonth()

# Updated in last week
updated >= -1w

# Due in next 30 days
due >= now() AND due <= 30d
```

### Field Presence
```jql
# Has description
description IS NOT EMPTY

# Missing components
component IS EMPTY

# No due date set
due IS EMPTY
```

## Ordering Results

```jql
ORDER BY field [ASC|DESC]
```

Examples:
```jql
# By priority, then created date
project = PROJ ORDER BY priority DESC, created ASC

# By most recently updated
project = PROJ ORDER BY updated DESC

# By assignee name
project = PROJ ORDER BY assignee ASC
```

## Best Practices

### Performance
1. **Always specify project** when possible
2. **Use indexed fields** (project, status, type, assignee)
3. **Limit results** for large datasets
4. **Avoid NOT and !=** when possible (slower)

### Readability
1. **Use parentheses** for complex logic
2. **Format multi-line** for long queries
3. **Comment intent** in documentation
4. **Test incrementally** when building complex queries

### Security
1. **Respect permissions** - queries honor Jira permissions
2. **Use functions** like `currentUser()` instead of hardcoding names
3. **Validate input** when building queries programmatically

## Examples by Use Case

### Sprint Planning
```jql
# Backlog ready for next sprint
project = PROJ 
  AND status = "Ready for Development" 
  AND sprint IS EMPTY 
  ORDER BY priority DESC, rank ASC

# Sprint scope
project = PROJ 
  AND sprint in openSprints() 
  ORDER BY rank ASC
```

### Bug Triage
```jql
# Unassigned bugs by priority
project = PROJ 
  AND type = Bug 
  AND assignee IS EMPTY 
  ORDER BY priority DESC, created ASC

# Critical bugs in production
project = PROJ 
  AND type = Bug 
  AND priority IN (Highest, High) 
  AND affectsVersion IN releasedVersions() 
  AND status NOT IN (Done, Closed)
```

### Reporting
```jql
# Velocity - completed this sprint
project = PROJ 
  AND sprint = "Sprint 23" 
  AND status = Done 
  AND type IN (Story, Task)

# Completion rate - due vs done
project = PROJ 
  AND due >= startOfMonth() 
  AND due <= endOfMonth() 
  AND status = Done
```

## JQL in ailey-jira

### CLI Usage
```bash
# Search command
tsx scripts/crud-operations.ts search "project = PROJ AND status = Open"

# Export with JQL
npm run export -- -j "assignee = currentUser()" -o my-issues.csv

# Sync pull
npm run sync pull -- -j "project = PROJ AND sprint in openSprints()"
```

### Programmatic Usage
```typescript
import { getJiraClient } from './jira-client';

const jira = await getJiraClient();
const results = await jira.searchJira(
  'project = PROJ AND status != Done',
  { maxResults: 100, fields: ['summary', 'status'] }
);
```

## References

- [Atlassian JQL Documentation](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/)
- [JQL Functions Reference](https://support.atlassian.com/jira-software-cloud/docs/jql-functions/)
- [JQL Keywords](https://support.atlassian.com/jira-software-cloud/docs/jql-keywords/)
