---
name: ailey-index-tool
description: Comprehensive index management for AI-ley kit resources - reindex resources to .github/aicc/indexes/*.index.json with ID-based keying and .my/ override support, plus search/query capabilities with multiple output formats. Use for rebuilding indexes, searching resources by name/keywords/content, or exporting index data in various formats (JSON, YAML, XML, CSV, Markdown, HTML).
---

# AI-ley Index Tool

Complete index management solution: reindex AI-ley kit resources, search with powerful filters, and transform data with multiple output formats.

## Overview

The ailey-index-tool provides two primary capabilities:

1. **Reindexing**: Scan and rebuild indexes for all AI-ley kit resources with ID-based keying and override support
2. **Search & Query**: Find and transform indexed resources with powerful filtering and export options

Indexes are stored in `.github/aicc/indexes/*.index.json` and support hierarchical overrides from `.my/` directories.

## When to Use

### Reindexing

Use when you need to:
- Add or modify agents, skills, personas, instructions, flows, or prompts
- Rebuild indexes after bulk updates
- Refresh metadata and ensure indexes are current
- Set up a new ai-ley kit instance
- Apply overrides from `.my/` directories

### Search & Query

Use when you need to:

### Search & Query

Use when you need to:

- **Find specific resources**: Search by name, keywords, or content
- **Discover related resources**: Find all resources with specific keywords
- **Export index data**: Generate reports in different formats (CSV, Markdown, HTML)
- **Transform data**: Apply jq queries for advanced filtering and transformation
- **Get resource lists**: Extract just names for scripting purposes
- **Filter by type**: Search specific index types (agents, skills, personas, etc.)

## Quick Start

### Reindex All Resources

```bash
# Rebuild all indexes
node scripts/reindex.ts

# Reindex specific type
node scripts/reindex.ts --type personas

# Reindex with verbose output
node scripts/reindex.ts --verbose

# Available types:
#   agents, skills, personas, instructions, flows, prompts
```

### Basic Search

```bash
# Search for TypeScript-related resources
node scripts/search.ts --keywords typescript

# Find resources by name pattern
node scripts/search.ts --name "seo"

# Search for text anywhere in resources
node scripts/search.ts --string "web crawler"
```

### Different Output Formats

```bash
# Get results as Markdown table
node scripts/search.ts --keywords testing --format markdown

# Export to HTML report
node scripts/search.ts --type skills --format html --output skills-report.html

# Get just the names
node scripts/search.ts --keywords api --names-only
```

## Workflows

### Workflow 1: Reindex Resources

Rebuild indexes after adding or modifying resources:

1. **Run reindexer**:
   ```bash
   node scripts/reindex.ts
   ```

2. **Indexes are created** in `.github/aicc/indexes/`:
   - `agents.index.json`
   - `skills.index.json`
   - `personas.index.json`
   - `instructions.index.json`
   - `flows.index.json`
   - `prompts.index.json`

3. **Overrides applied** from `.my/` directories:
   - `.my/agents/` overrides for agents
   - `.my/personas/` overrides for personas
   - `.my/aicc/instructions/` overrides for instructions
   - `.my/{{kit}}/{{type}}/` for kit-specific overrides

### Workflow 2: Search by Criteria

### Workflow 2: Search by Criteria

Find resources matching specific criteria:

1. **Choose search criteria**:
   - `--name <pattern>`: Filter by name (regex supported)
   - `--keywords <kw1> <kw2>`: Filter by keywords
   - `--string <text>`: Search in name, description, keywords
   - `--regex <pattern>`: Advanced regex search

2. **Optionally filter by type**:
   ```bash
   --type agents skills personas
   ```

3. **Run search**:
   ```bash
   node scripts/search.ts --keywords "typescript" "testing"
   ```

### Workflow 3: Export in Different Formats

Generate reports in various formats:

1. **Choose output format**:
   - `json`: Pretty-printed JSON (default)
   - `json-array`: Compact JSON array
   - `yaml`: YAML format
   - `xml`: XML format
   - `txt`: Plain text list
   - `csv`: CSV with headers
   - `markdown`: Markdown table
   - `html`: Interactive HTML report
   - `prompt`: Formatted for AI prompts

2. **Run with format**:
   ```bash
   node scripts/search.ts --type skills --format html --output report.html
   ```

### Workflow 4: Advanced jq Queries

Apply jq transformations to filter and reshape data:

1. **Basic jq query**:
   ```bash
   # Get only names and descriptions
   node scripts/search.ts --jq '.[] | {name, description}'
   ```

2. **Complex filtering**:
   ```bash
   # Find high-scoring resources
   node scripts/search.ts --jq '.[] | select(.score >= 4.0)'
   ```

3. **From file**:
   ```bash
   # Use query from file
   node scripts/search.ts --jq-file query.jq --jq-output-file transform.jq
   ```

### Workflow 5: Get Resource Names Only

Extract just resource names for scripting:

```bash
# Get all skill names
node scripts/search.ts --type skills --names-only

# Find all TypeScript-related resources
node scripts/search.ts --keywords typescript --names-only > typescript-resources.txt
```

## Index Format & Structure

### Index File Structure

Each index file (e.g., `agents.index.json`, `personas.index.json`) uses ID-based keying:

```json
{
  "type": "personas",
  "lastUpdated": "2026-01-29T12:00:00Z",
  "totalCount": 42,
  "resources": {
    "typescript-expert": {
      "id": "typescript-expert",
      "name": "TypeScript Expert",
      "path": ".github/ai-ley/personas/development/typescript-expert.persona.md",
      "description": "Expert in TypeScript development",
      "keywords": ["typescript", "development", "types"],
      "version": "1.0.0",
      "score": 4.5,
      "updated": "2026-01-20"
    },
    "backend-dev": {
      "id": "backend-dev",
      "name": "Backend Developer",
      "path": ".github/ai-ley/personas/development/backend-dev.persona.md",
      ...
    }
  }
}
```

### ID Generation Rules

1. **Explicit ID**: If frontmatter contains `id:` field, use it
2. **Auto-generated**: Otherwise, generate from filename:
   - Remove type suffix: `typescript-expert.persona.md` → `typescript-expert`
   - Remove extensions: `backend-dev.md` → `backend-dev`
   - Normalize to kebab-case

### Metadata Extraction

From YAML frontmatter:
- `id`: Resource identifier (required, auto-generated if missing)
- `name`: Display name
- `description`: What it does/provides
- `keywords`: Searchable tags (array)
- `version`: Version number (semver)
- `score`: Quality rating (0-5)
- `updated`: Last modification date

### Override System

Resources can be overridden by placing files with matching IDs in `.my/` directories:

**Override Locations** (in priority order):
1. `.my/{{type}}/{{id}}.{{type}}.md` - Type-specific override
2. `.my/aicc/{{type}}/{{id}}.{{type}}.md` - AICC-specific override
3. `.my/{{kit}}/{{type}}/{{id}}.{{type}}.md` - Kit-specific override

**Example**:
```
Original: .github/ai-ley/personas/development/typescript-expert.persona.md
Override: .my/personas/typescript-expert.persona.md
Result: Override metadata merged with original, takes precedence
```

**Merge Behavior**:
- Override fields replace original fields
- Arrays are replaced (not merged)
- `null` values in override remove original fields

## Reindex Options

| Option | Description | Example |
|--------|-------------|---------|
| `-t, --type <types...>` | Reindex specific types | `--type personas instructions` |
| `-v, --verbose` | Show detailed progress | `--verbose` |
| `-f, --force` | Force full reindex | `--force` |
| `--validate` | Validate after reindex | `--validate` |
| `--output <dir>` | Custom output directory | `--output .custom/indexes` |


| Option | Description | Example |
|--------|-------------|---------|
| `-n, --name <pattern>` | Filter by name (regex) | `--name "^ailey-"` |
| `-k, --keywords <kw...>` | Filter by keywords | `--keywords typescript testing` |
| `-s, --string <text>` | Search in name/desc/keywords | `--string "web crawler"` |
| `-r, --regex <pattern>` | Advanced regex search | `--regex "seo\|audit"` |
| `-t, --type <types...>` | Filter by index type | `--type skills personas` |

### Output Options

| Option | Description | Example |
|--------|-------------|---------|
| `-f, --format <fmt>` | Output format | `--format markdown` |
| `-o, --output <file>` | Write to file | `--output results.html` |
| `--names-only` | Return only names | `--names-only` |

### jq Options

| Option | Description | Example |
|--------|-------------|---------|
| `--jq <query>` | Apply jq query | `--jq '.[] \| select(.score > 4)'` |
| `--jq-file <file>` | Query from file | `--jq-file filter.jq` |
| `--jq-output <query>` | Transform output | `--jq-output 'map(.name)'` |
| `--jq-output-file <file>` | Transform from file | `--jq-output-file format.jq` |

## Output Formats

### JSON (default)

Pretty-printed JSON with all resource data:
```json
[
  {
    "name": "ailey-seo-report",
    "path": ".github/skills/ailey-seo-report/SKILL.md",
    "description": "Comprehensive SEO analysis...",
    "keywords": ["seo-audit", "web-crawler"],
    "version": "1.0.0",
    "score": 4.5,
    "updated": "2026-01-20"
  }
]
```

### Markdown

Table format for documentation:
```markdown
| Name | Description | Keywords | Score |
|------|-------------|----------|-------|
| ailey-seo-report | Comprehensive SEO... | seo-audit, web-crawler | 4.5 |
```

### HTML

Interactive HTML report with styling and keyword tags.

### CSV

Spreadsheet-compatible format with headers.

### YAML

YAML format for configuration files.

### XML

XML structure for integration with XML-based tools.

### Prompt

Formatted as AI prompt instructions with resource details.

## Examples

### Example 1: Find All Testing Resources

```bash
$ node scripts/search.ts --keywords testing --format markdown

# Search Results

Total: 5 resources

| Name | Description | Keywords | Score |
|------|-------------|----------|-------|
| test-generator | Generate test files... | testing, typescript | 4.0 |
```

### Example 2: Export Skills to HTML Report

```bash
$ node scripts/search.ts --type skills --format html --output skills.html

Results written to skills.html
```

### Example 3: Find High-Quality Resources with jq

```bash
$ node scripts/search.ts --jq '.[] | select(.score >= 4.5) | {name, score}'

[
  {
    "name": "ailey-orchestrator",
    "score": 5.0
  },
  {
    "name": "ailey-seo-report",
    "score": 4.5
  }
]
```

### Example 4: Search Multiple Index Types

```bash
$ node scripts/search.ts --type skills personas --keywords typescript --names-only

ailey-data-converter
ailey-indexer
typescript-expert
backend-developer
```

### Example 5: Regex Search

```bash
$ node scripts/search.ts --regex "seo|audit|performance" --format txt

ailey-seo-report
  Path: .github/skills/ailey-seo-report/SKILL.md
  Description: Comprehensive SEO analysis and reporting tool...
  Keywords: seo-audit, web-crawler, performance-analysis
```

### Example 6: Complex jq Transformation

```bash
$ node scripts/search.ts --jq 'group_by(.path | split("/")[3]) | map({type: .[0].path | split("/")[3], count: length})'

[
  {
    "type": "agents",
    "count": 22
  },
  {
    "type": "skills",
    "count": 4
  }
]
```

## Integration with AI-ley Kit

### Orchestrator Agent

The orchestrator agent uses indexes for:
- Resource selection during prompt optimization
- Identifying relevant personas for tasks
- Finding applicable instructions
- Discovering available skills
- Quick ID-based lookups for performance

### Prompts

Prompts reference indexes:
```markdown
Query instruction indexes (`.github/aicc/indexes/instructions.index.json`)
Apply personas by ID from `.github/aicc/indexes/personas.index.json`
Load skills using ID keys for fast lookup
```

### Override Workflow

1. **Project-level customization**: Place overrides in `.my/{{type}}/`
2. **AICC-specific**: Use `.my/aicc/{{type}}/` for AI Command Center overrides
3. **Kit-specific**: Use `.my/{{kit}}/{{type}}/` for specific kit overrides
4. **Reindex**: Run `node scripts/reindex.ts` to apply overrides
5. **ID matching**: Override must have matching `id` field or filename

### Use in Scripts

Import and use programmatically:

```typescript
import { reindex, loadIndex, searchResources } from './scripts/index.js';

// Reindex specific type
await reindex({ types: ['personas'], verbose: true });

// Load index with ID-based lookup
const personas = await loadIndex('personas');
const expert = personas.resources['typescript-expert'];

// Search
const results = searchResources(['personas'], {
  keywords: ['typescript'],
  format: 'json'
});
```

## Best Practices

### When to Reindex

**Always reindex after**:
- Adding new resource files
- Modifying frontmatter metadata
- Renaming or moving resources
- Adding/updating overrides in `.my/` directories
- Bulk updates to multiple files

**Schedule regular reindexing**:
- Pre-commit hook
- CI/CD pipeline step
- Weekly automated job

### ID Management

**Best practices for IDs**:
- Use kebab-case: `typescript-expert`, `seo-report`
- Be descriptive but concise
- Avoid version numbers in ID (use `version` field)
- Keep IDs stable (don't rename unless necessary)
- Document ID changes in version history

### Override Management

**Organizing overrides**:
- Keep overrides minimal (only override what's needed)
- Document why overrides exist
- Review overrides regularly
- Use version control for `.my/` directories
- Test after applying overrides

### Maintaining Quality

**Update metadata in resources**:
- Keep descriptions current and concise
- Add relevant, searchable keywords
- Update version numbers following semver
- Review and adjust quality scores regularly
- Ensure IDs are unique and descriptive

## Tips

### Reindexing Tips

1. **Use type-specific reindex** for faster updates:
   ```bash
   node scripts/reindex.ts --type personas
   ```

2. **Validate after major changes**:
   ```bash
   node scripts/reindex.ts --validate
   ```

3. **Check override conflicts**: Review verbose output for override warnings

### Search Tips

1. **Combine filters**: Use multiple filters for precise results
   ```bash
   node scripts/search.ts --type skills --keywords testing --name "ailey-"
   ```

2. **Pipe to other tools**: Use `--names-only` for scripting
   ```bash
   node scripts/search.ts --keywords api --names-only | xargs -I {} echo "Process: {}"
   ```

3. **Save complex queries**: Use `--jq-file` for reusable queries
   ```bash
   echo '.resources | to_entries | map(select(.value.score >= 4))' > high-quality.jq
   node scripts/search.ts --jq-file high-quality.jq
   ```

4. **Export for sharing**: Generate HTML reports for team reviews
   ```bash
   node scripts/search.ts --type skills --format html --output team-report.html
   ```

5. **ID-based lookup**: Access resources directly by ID in scripts

## Performance

### Optimization Techniques

The indexer uses:
- **ID-based keying**: O(1) lookup time for resource access
- **Parallel processing**: Process multiple files concurrently
- **Efficient parsing**: Minimal file reads, YAML frontmatter only
- **Incremental overrides**: Only merge changed overrides
- **Caching**: Reuse parsed metadata when possible

### Typical Performance

On standard ai-ley kit installation:
- ~100 resources: <2 seconds reindex, <0.1s search
- ~500 resources: <5 seconds reindex, <0.5s search
- ~1000 resources: <10 seconds reindex, <1s search

**ID-based lookups**: Instant (O(1) access)

## Troubleshooting

### Index Out of Date

```bash
# Force full reindex
node scripts/reindex.ts --force

# Reindex with validation
node scripts/reindex.ts --validate
```

### Missing Resources in Index

```bash
# Verbose output shows skipped files
node scripts/reindex.ts --verbose

# Check for missing IDs
node scripts/search.ts --jq '.resources | keys'
```

### Override Not Applied

```bash
# Verify ID matches
# Override file: .my/personas/typescript-expert.persona.md
# Must have: id: typescript-expert in frontmatter
# Or filename must be: typescript-expert.persona.md

# Check with verbose reindex
node scripts/reindex.ts --type personas --verbose
```

### Invalid Frontmatter

Indexer will skip files with invalid frontmatter and log warnings:
```
⚠️  Warning: Invalid frontmatter in personas/example.persona.md
⚠️  Warning: Missing ID for skills/unnamed.skill.md - generated: unnamed
```

Fix the frontmatter and reindex.

### Duplicate IDs

```
❌ Error: Duplicate ID 'typescript-expert' found in:
   - .github/ai-ley/personas/development/typescript-expert.persona.md
   - .github/ai-ley/personas/expert/typescript-expert.persona.md
```

Rename one file or add explicit unique IDs in frontmatter.

### Performance Issues

For large repositories:
```bash
# Index specific type only
node scripts/reindex.ts --type personas

# Use parallel mode (default, but adjustable)
node scripts/reindex.ts --parallel 10
```

## Requirements

- Node.js 18+
- jq (for jq query support, optional)
- Dependencies: commander, js-yaml, xml-js, glob

## Installation

```bash
cd .github/skills/ailey-index-tool
npm install
npm run build
```

## Resources

- **Reindex Script**: `scripts/reindex.ts` - Rebuild indexes with ID-based keying
- **Search Script**: `scripts/search.ts` - Query and transform indexed resources
- **Index Files**: `.github/aicc/indexes/*.index.json` - ID-keyed resource data
- **Override Locations**: `.my/{{type}}/` - Project-level overrides

## Migration from ailey-indexer

If migrating from the separate ailey-indexer skill:

1. **Index location changed**: `.github/ai-ley/indexes/` → `.github/aicc/indexes/`
2. **Format changed**: Array-based → ID-based keying (object with resource IDs as keys)
3. **Script name**: `reindex-all.ts` → `reindex.ts`
4. **New features**: ID-based lookups, override system, merged search capabilities

---

**Version**: 2.0.0  
**Updated**: 2026-01-29  
**Score**: 4.5
