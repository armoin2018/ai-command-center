# Confluence Query Language (CQL) Guide

Complete reference for querying Confluence using CQL.

## Overview

CQL (Confluence Query Language) is a structured query language for searching Confluence content. It's similar to JQL (Jira Query Language) and SQL, using fields, operators, keywords, and functions.

## Basic Syntax

```cql
field operator value
```

**Example:**
```cql
space = "DEV"
```

## Combining Conditions

Use `AND`, `OR`, and `NOT` to combine conditions:

```cql
space = "DEV" AND type = page
space = "DEV" OR space = "QA"
type = page AND NOT label = "draft"
```

**Operator Precedence:**
1. `NOT`
2. `AND`
3. `OR`

Use parentheses to control evaluation order:

```cql
(space = "DEV" OR space = "QA") AND type = page
```

---

## Fields

### Content Fields

| Field | Description | Example |
|-------|-------------|---------|
| `title` | Page/blog title | `title = "API Documentation"` |
| `text` | Full text search | `text ~ "authentication"` |
| `type` | Content type | `type = page` |
| `id` | Content ID | `id = "123456"` |
| `space` | Space key | `space = "DEV"` |
| `parent` | Parent page ID | `parent = "789012"` |

### Date/Time Fields

| Field | Description | Example |
|-------|-------------|---------|
| `created` | Creation date | `created >= "2024-01-01"` |
| `lastModified` | Last modification date | `lastModified >= now("-7d")` |

### User Fields

| Field | Description | Example |
|-------|-------------|---------|
| `creator` | Content creator | `creator = "john.doe"` |
| `contributor` | Anyone who edited | `contributor = currentUser()` |
| `mention` | User mentioned (@username) | `mention = "jane.smith"` |

### Metadata Fields

| Field | Description | Example |
|-------|-------------|---------|
| `label` | Content label/tag | `label = "api"` |
| `ancestor` | Ancestor page ID | `ancestor = "123456"` |

---

## Operators

### Equality Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `space = "DEV"` |
| `!=` | Not equals | `type != "blogpost"` |

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `>` | Greater than | `created > "2024-01-01"` |
| `>=` | Greater than or equal | `created >= "2024-01-01"` |
| `<` | Less than | `created < "2024-12-31"` |
| `<=` | Less than or equal | `created <= "2024-12-31"` |

### Text Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `~` | Contains | `title ~ "documentation"` |
| `!~` | Does not contain | `title !~ "draft"` |

### Set Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `IN` | In list | `space IN ("DEV", "QA", "PROD")` |
| `NOT IN` | Not in list | `type NOT IN ("attachment", "comment")` |

---

## Functions

### Date/Time Functions

| Function | Description | Example |
|----------|-------------|---------|
| `now()` | Current date/time | `created >= now()` |
| `now("-7d")` | 7 days ago | `lastModified >= now("-7d")` |
| `now("+1w")` | 1 week from now | `created <= now("+1w")` |
| `startOfDay()` | Start of today | `created >= startOfDay()` |
| `endOfDay()` | End of today | `created <= endOfDay()` |
| `startOfWeek()` | Start of this week | `created >= startOfWeek()` |
| `endOfWeek()` | End of this week | `created <= endOfWeek()` |
| `startOfMonth()` | Start of this month | `created >= startOfMonth()` |
| `endOfMonth()` | End of this month | `created <= endOfMonth()` |
| `startOfYear()` | Start of this year | `created >= startOfYear()` |
| `endOfYear()` | End of this year | `created <= endOfYear()` |

**Time Intervals:**
- `d` = days
- `w` = weeks
- `m` = months (30 days)
- `y` = years (365 days)

### User Functions

| Function | Description | Example |
|----------|-------------|---------|
| `currentUser()` | Currently logged in user | `creator = currentUser()` |

---

## Content Types

| Type | Description |
|------|-------------|
| `page` | Standard Confluence page |
| `blogpost` | Blog post |
| `attachment` | File attachment |
| `comment` | Page/blog comment |
| `space` | Space (limited support) |

**Example:**
```cql
type = page
type = blogpost
type IN ("page", "blogpost")
```

---

## Sorting

Use `ORDER BY` to sort results:

```cql
ORDER BY field [ASC|DESC]
```

**Sortable Fields:**
- `created`
- `lastModified`
- `title`

**Examples:**
```cql
ORDER BY created DESC
ORDER BY lastModified DESC
ORDER BY title ASC
```

**Complex Queries:**
```cql
space = "DEV" AND type = page ORDER BY created DESC
```

---

## Common Query Patterns

### Search by Title

```cql
# Exact match
title = "API Documentation"

# Contains
title ~ "API"

# Starts with (use wildcards)
title ~ "API*"
```

### Search by Space

```cql
# Single space
space = "DEV"

# Multiple spaces
space IN ("DEV", "QA", "PROD")

# All spaces except
space != "ARCHIVE"
```

### Search by Text Content

```cql
# Body text contains
text ~ "authentication"

# Multiple keywords (AND)
text ~ "api" AND text ~ "rest"

# Any keyword (OR)
text ~ "authentication" OR text ~ "authorization"
```

### Search by Label

```cql
# Single label
label = "api"

# Multiple labels (any)
label IN ("api", "documentation")

# Multiple labels (all) - requires separate conditions
label = "api" AND label = "documentation"
```

### Search by Date

```cql
# Created after date
created >= "2024-01-01"

# Created in last 7 days
created >= now("-7d")

# Created this week
created >= startOfWeek() AND created <= endOfWeek()

# Created this month
created >= startOfMonth()

# Modified in last 30 days
lastModified >= now("-30d")
```

### Search by Creator

```cql
# Your own content
creator = currentUser()

# Specific user
creator = "john.doe"

# Multiple users
creator IN ("john.doe", "jane.smith")
```

### Search by Contributor

```cql
# Anyone who edited
contributor = currentUser()

# Specific contributor
contributor = "john.doe"
```

### Recent Content

```cql
# Recently modified (all types)
lastModified >= now("-7d") ORDER BY lastModified DESC

# Recently created pages
type = page AND created >= now("-7d") ORDER BY created DESC

# Recently modified in space
space = "DEV" AND lastModified >= now("-7d") ORDER BY lastModified DESC
```

### Hierarchical Queries

```cql
# Children of page
parent = "123456"

# All descendants (children, grandchildren, etc.)
ancestor = "123456"

# Root pages (no parent)
parent IS NULL
```

---

## Complex Query Examples

### 1. API Documentation in DEV Space

```cql
space = "DEV" AND type = page AND label = "api" ORDER BY created DESC
```

### 2. Recently Updated Pages by Current User

```cql
creator = currentUser() AND type = page AND lastModified >= now("-30d") ORDER BY lastModified DESC
```

### 3. Draft Pages Needing Review

```cql
label = "draft" AND space IN ("DEV", "QA") AND created >= now("-90d")
```

### 4. Documentation Hub

```cql
(space = "DEV" OR space = "DOCS") AND label IN ("api", "documentation", "guide") ORDER BY title ASC
```

### 5. Content for Migration

```cql
space = "OLD" AND type = page AND lastModified <= now("-365d")
```

### 6. Team Contributions This Week

```cql
contributor IN ("john.doe", "jane.smith", "bob.jones") AND created >= startOfWeek()
```

### 7. Technical Specifications

```cql
text ~ "specification" AND label IN ("technical", "architecture") AND space != "ARCHIVE"
```

### 8. Outdated Content

```cql
type = page AND lastModified <= now("-180d") AND label != "archived" ORDER BY lastModified ASC
```

### 9. Meeting Notes This Month

```cql
label = "meeting-notes" AND created >= startOfMonth() ORDER BY created DESC
```

### 10. All Blog Posts in Q1 2024

```cql
type = blogpost AND created >= "2024-01-01" AND created <= "2024-03-31" ORDER BY created DESC
```

---

## Best Practices

### 1. Use Specific Queries

❌ Too broad:
```cql
text ~ "api"
```

✅ More specific:
```cql
space = "DEV" AND type = page AND label = "api" AND created >= now("-90d")
```

### 2. Filter Early

Put most restrictive conditions first:

✅ Better:
```cql
space = "DEV" AND type = page AND text ~ "api"
```

❌ Slower:
```cql
text ~ "api" AND type = page AND space = "DEV"
```

### 3. Use Labels for Organization

```cql
label = "api"
label = "documentation"
label = "archived"
```

### 4. Limit Results

Always use limits in CLI:
```bash
npm run confluence query search --query "space = DEV" --limit 100
```

### 5. Use Date Functions

✅ Readable:
```cql
created >= now("-7d")
```

❌ Hard to maintain:
```cql
created >= "2024-01-23"
```

### 6. Combine with ORDER BY

```cql
space = "DEV" AND type = page ORDER BY lastModified DESC
```

### 7. Test Queries Incrementally

Build complex queries step by step:

```cql
# Step 1
space = "DEV"

# Step 2
space = "DEV" AND type = page

# Step 3
space = "DEV" AND type = page AND label = "api"

# Step 4
space = "DEV" AND type = page AND label = "api" ORDER BY created DESC
```

---

## Performance Tips

### 1. Narrow Scope with Space Filter

```cql
space = "DEV" AND text ~ "api"
```

### 2. Use IDs for Specific Content

```cql
id = "123456"
```

### 3. Avoid Unbounded Text Searches

❌ Slow:
```cql
text ~ "the"
```

✅ Faster:
```cql
space = "DEV" AND text ~ "authentication protocol"
```

### 4. Use Labels Instead of Text Search

✅ Faster:
```cql
label = "api"
```

❌ Slower:
```cql
text ~ "API Documentation"
```

### 5. Limit Date Ranges

```cql
created >= now("-30d") AND created <= now()
```

---

## Limitations

1. **No Wildcards**: CQL doesn't support `*` or `?` wildcards (except in some cloud instances)
2. **No Regex**: No regular expression support
3. **Case Sensitive**: Field names are case-sensitive
4. **Limited Nesting**: Complex boolean logic can be challenging
5. **No Joins**: Can't query across different content types in one query
6. **Rate Limits**: Atlassian Cloud has rate limits for API calls

---

## Testing Queries

### Via CLI

```bash
# Test query
npm run confluence query search --query 'space = "DEV" AND type = page'

# Get JSON output
npm run confluence query search --query 'space = "DEV"' --json

# With limit
npm run confluence query search --query 'space = "DEV"' --limit 10
```

### Via TypeScript

```typescript
import { getConfluenceClient } from './scripts/confluence-client';

const client = await getConfluenceClient();
const results = await client.search('space = "DEV" AND type = page', 25);

console.log(`Found ${results.totalSize} results`);
results.results.forEach(page => {
  console.log(`- ${page.title} (${page.id})`);
});
```

---

## Additional Resources

- **Atlassian CQL Documentation**: https://developer.atlassian.com/cloud/confluence/advanced-searching-using-cql/
- **CQL Operators**: https://developer.atlassian.com/cloud/confluence/cql-operators/
- **CQL Functions**: https://developer.atlassian.com/cloud/confluence/cql-functions/
- **CQL Fields**: https://developer.atlassian.com/cloud/confluence/cql-fields/

---

## Quick Reference

```bash
# Show examples
npm run confluence query examples

# Search
npm run confluence query search -q 'space = "DEV"'

# Pages in space
npm run confluence query pages -s DEV

# Recent updates
npm run confluence query recent

# By label
npm run confluence query labels -l api

# List spaces
npm run confluence query spaces
```

---
