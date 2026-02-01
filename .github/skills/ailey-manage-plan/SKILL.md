---
id: 
name: ailey-manage-plan
description: Manage .project/PLAN.json with schema evolution, CRUD operations, and jq-style queries. Use when creating, reading, updating, or deleting plan items, validating against schemas, migrating between schema versions, or querying plan data with complex filters. Supports ID and name-based searches.
---
# AI-ley Manage Plan

Comprehensive management tool for `.project/PLAN.json` with schema evolution, CRUD operations, and jq-style querying capabilities.

## Overview

The manage-plan skill provides complete lifecycle management for PLAN.json:

**Schema Management:**
- Initialize empty PLAN.json from schema
- Validate against versioned schemas (`.github/aicc/schemas/plan.v*.schema.json`)
- Check schema evolution and compatibility
- Migrate data between schema versions
- Support forward/backward/full compatibility modes

**Data Operations:**
- **CRUD**: Create, Read, Update, Delete plan items
- **Search**: Find items by ID or name
- **Query**: jq-style queries for complex filtering
- **Bulk**: Update or delete multiple items with queries

**Integration:**
- Leverages ailey-tools-data-converter modules for shared functionality
- Schema validation with AJV
- Compatible with existing PLAN.json structure

## When to Use

Use this skill when:

- **Initializing**: Creating new PLAN.json from scratch
- **Querying**: Finding specific items by ID, name, or complex criteria
- **Updating**: Modifying plan items, status, or metadata
- **Bulk Operations**: Updating multiple items at once
- **Schema Evolution**: Migrating to new schema versions
- **Validation**: Ensuring PLAN.json conforms to schema
- **Statistics**: Generating reports on plan status and progress


### Initialize PLAN.json

Create empty PLAN.json from schema:

```bash
tsx scripts/manage-plan.ts create --init --schema v1
```

### Find Items

Search by ID:

```bash
tsx scripts/manage-plan.ts read --id AICC-001
```

Search by name (partial match):

```bash
tsx scripts/manage-plan.ts read --name "authentication"
```

### Query with jq-style

Find all backlog items:

```bash
tsx scripts/manage-plan.ts query '.items[] | select(.status == "BACKLOG")'
```

Find high-priority items:

```bash
tsx scripts/manage-plan.ts read --query '.items[] | select(.priority == "high")'
```

### Update Items

Update by ID:

```bash
tsx scripts/manage-plan.ts update --id AICC-001 --value '{"status":"IN-PROGRESS"}'
```

Bulk update with query:

```bash
tsx scripts/manage-plan.ts update \
  --query '.items[] | select(.status == "READY")' \
  --set '.status = "IN-PROGRESS"'
```

### Delete Items

Delete by ID:

```bash
tsx scripts/manage-plan.ts delete --id AICC-999
```

Delete by query:

```bash
tsx scripts/manage-plan.ts delete --query '.items[] | select(.status == "SKIP")'
```


### Workflow 1: Initialize and Populate Plan

Create new PLAN.json and add items:

1. **Initialize from schema**:
   ```bash
   tsx scripts/manage-plan.ts create --init --schema v1
   ```

2. **Add first item**:
   ```bash
   tsx scripts/manage-plan.ts create \
     --path '.items' \
     --value '{"id":"PROJ-001","type":"epic","summary":"Project Setup","status":"BACKLOG","priority":"high"}'
   ```

3. **Validate**:
   ```bash
   tsx scripts/manage-plan.ts schema validate
   ```

### Workflow 2: Query and Update

Find and update specific items:

1. **Find ready items**:
   ```bash
   tsx scripts/manage-plan.ts query '.items[] | select(.status == "READY")' --output table
   ```

2. **Move to in-progress**:
   ```bash
   tsx scripts/manage-plan.ts update \
     --query '.items[] | select(.status == "READY")' \
     --set '.status = "IN-PROGRESS"'
   ```

3. **Verify changes**:
   ```bash
   tsx scripts/manage-plan.ts stats
   ```

### Workflow 3: Schema Evolution

Migrate to new schema version:

1. **Check compatibility**:
   ```bash
   tsx scripts/manage-plan.ts schema evolve \
     --from v1 \
     --to v2 \
     --check backward \
     --report
   ```

2. **Migrate data**:
   ```bash
   tsx scripts/manage-plan.ts schema migrate \
     --from v1 \
     --to v2 \
     --backup
   ```

3. **Validate**:
   ```bash
   tsx scripts/manage-plan.ts schema validate --schema v2
   ```

### Workflow 4: Bulk Updates

Update multiple items efficiently:

1. **Find items to update**:
   ```bash
   tsx scripts/manage-plan.ts read --query '.items[] | select(.assignee == null)'
   ```

2. **Bulk assign**:
   ```bash
   tsx scripts/manage-plan.ts update \
     --query '.items[] | select(.assignee == null)' \
     --set '.assignee = "team@example.com"'
   ```

3. **Verify**:
   ```bash
   tsx scripts/manage-plan.ts stats
   ```


### Create

```bash
# Initialize empty PLAN.json
tsx scripts/manage-plan.ts create --init [--schema v1]

# Create item at path
tsx scripts/manage-plan.ts create \
  --path <jq-path> \
  --value <json>
```

**Options:**
- `--file <path>` - PLAN.json location (default: `.project/PLAN.json`)
- `--schema <version>` - Schema version for init (default: `v1`)
- `--path <jq-path>` - Path to create item
- `--value <json>` - JSON value
- `--init` - Initialize empty file

### Read

```bash
# Read all
tsx scripts/manage-plan.ts read

# Read by ID
tsx scripts/manage-plan.ts read --id <item-id>

# Read by name
tsx scripts/manage-plan.ts read --name <partial-name>

# Read with query
tsx scripts/manage-plan.ts read --query <jq-expression>

# Read at path
tsx scripts/manage-plan.ts read --path <jq-path>
```

**Options:**
- `--file <path>` - PLAN.json location
- `--id <id>` - Search by ID
- `--name <name>` - Search by name (partial match)
- `--query <jq>` - jq-style query
- `--path <jq-path>` - Path to read
- `--output <format>` - Output format: json, yaml, table (default: json)

### Update

```bash
# Update by ID
tsx scripts/manage-plan.ts update \
  --id <item-id> \
  --value <json>

# Update by query
tsx scripts/manage-plan.ts update \
  --query <jq-expression> \
  --set <jq-set-expression>

# Update at path
tsx scripts/manage-plan.ts update \
  --path <jq-path> \
  --value <json>
```

**Options:**
- `--file <path>` - PLAN.json location
- `--id <id>` - Update by ID
- `--query <jq>` - Query to select items
- `--set <jq>` - Set expression (e.g., `.status = "DONE"`)
- `--path <jq-path>` - Path to update
- `--value <json>` - New value
- `--validate` - Validate after update (default: true)

### Delete

```bash
# Delete by ID
tsx scripts/manage-plan.ts delete --id <item-id>

# Delete by query
tsx scripts/manage-plan.ts delete --query <jq-expression>

# Delete at path
tsx scripts/manage-plan.ts delete --path <jq-path>
```

**Options:**
- `--file <path>` - PLAN.json location
- `--id <id>` - Delete by ID
- `--query <jq>` - Query to select items
- `--path <jq-path>` - Path to delete
- `--validate` - Validate after deletion (default: true)

### Query

```bash
# Query with jq expression
tsx scripts/manage-plan.ts query <expression> [options]
```

**Options:**
- `--file <path>` - PLAN.json location
- `--output <format>` - Output format: json, yaml, table
- `--compact` - Compact JSON output

**Query Examples:**

```bash
# All backlog items
'.items[] | select(.status == "BACKLOG")'

# High-priority items
'.items[] | select(.priority == "high")'

# Items by type
'.items[] | select(.type == "epic")'

# Multiple conditions
'.items[] | select(.status == "BACKLOG" and .priority == "high")'

# Just IDs
'.items[] | .id'

# Count by status
'.items | group_by(.status) | map({status: .[0].status, count: length})'
```

### Schema Management

```bash
# Validate
tsx scripts/manage-plan.ts schema validate [--schema v1]

# Check evolution
tsx scripts/manage-plan.ts schema evolve \
  --from v1 \
  --to v2 \
  --check <mode> \
  [--report]

# Migrate
tsx scripts/manage-plan.ts schema migrate \
  --from v1 \
  --to v2 \
  [--output <path>] \
  [--backup]
```

**Compatibility Modes:**
- `forward` - Old code can read new data
- `backward` - New code can read old data
- `full` - Both forward and backward
- `none` - No compatibility required

### Statistics

```bash
# Show plan statistics
tsx scripts/manage-plan.ts stats
```

**Output:**
- Version
- Total items
- Status counts (BACKLOG, READY, IN-PROGRESS, etc.)
- Last updated
- Schema version

## jq Query Syntax

Supported jq-style operations:

### Selectors

- `.field` - Access field
- `.field.nested` - Nested access
- `.items[]` - Iterate array
- `.items[0]` - Array index

### Filters

- `select(.field == "value")` - Filter items
- `select(.field != "value")` - Not equal
- `select(.field > 10)` - Greater than
- `select(.field < 10)` - Less than

### Operators

- `==` - Equal
- `!=` - Not equal
- `>` - Greater than
- `<` - Less than
- `>=` - Greater or equal
- `<=` - Less or equal

### Examples

```bash
# Status filter
'.items[] | select(.status == "BACKLOG")'

# Priority filter
'.items[] | select(.priority == "high")'

# Type filter
'.items[] | select(.type == "epic")'

# Multiple conditions (AND)
'.items[] | select(.status == "READY" and .priority == "high")'

# Field extraction
'.items[] | .id'
'.items[] | .summary'
```


### Compatibility Rules

**Forward Compatible:**
- ✅ Add optional fields
- ✅ Relax restrictions
- ❌ Remove fields
- ❌ Add required fields

**Backward Compatible:**
- ✅ Add optional fields with defaults
- ❌ Remove required fields
- ❌ Tighten restrictions

**Full Compatible:**
- Intersection of forward and backward rules

### Migration Process

1. **Check Compatibility**:
   ```bash
   tsx scripts/manage-plan.ts schema evolve --from v1 --to v2 --check backward --report
   ```

2. **Review Report**: Check for breaking changes

3. **Backup**: Create backup before migration

4. **Migrate**:
   ```bash
   tsx scripts/manage-plan.ts schema migrate --from v1 --to v2 --backup
   ```

5. **Validate**:
   ```bash
   tsx scripts/manage-plan.ts schema validate --schema v2
   ```

## Integration with Data Converter

This skill leverages shared modules from ailey-tools-data-converter:

```typescript
// Shared schema validation
import { SchemaValidator } from '../ailey-tools-data-converter/lib/schema';

// Shared query engine
import { QueryExecutor } from '../ailey-tools-data-converter/lib/query';

// Shared CRUD operations
import { CRUDOperations } from '../ailey-tools-data-converter/lib/crud';
```

**Benefits:**
- Consistent schema validation across skills
- Shared jq query engine
- Reusable CRUD patterns
- Reduced code duplication

## Performance

**Optimizations:**
- In-memory data loading for fast operations
- Efficient ID-based lookups
- Lazy schema loading
- Atomic file writes with backups

**Typical Performance:**
- Read: <10ms
- Update single item: <50ms
- Query (1000 items): <100ms
- Validation: <200ms

## Error Handling

The tool provides clear error messages:

```bash
❌ PLAN.json not found at .project/PLAN.json. Use 'create --init' to initialize.
❌ Item not found: AICC-999
❌ Schema not found: .github/aicc/schemas/plan.v3.schema.json
❌ PLAN.json validation failed
❌ Schemas are NOT backward compatible
```

## Resources

- **Script**: [scripts/manage-plan.ts](scripts/manage-plan.ts) - Main CLI tool
- **Library**: [lib/plan-manager.ts](lib/plan-manager.ts) - Core functionality
- **Schemas**: `.github/aicc/schemas/plan.v*.schema.json` - JSON Schema definitions
- **Data**: `.project/PLAN.json` - Plan data file

## Related Skills

- **ailey-tools-data-converter**: Shared modules for schema, query, CRUD operations
- **ailey-index-tool**: Index management for skill discovery
- **ailey-progress-report**: Generate progress reports from PLAN.json

---

**Version**: 1.0.0  
**Created**: 2026-01-29  
**Score**: 4.5

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.2
---