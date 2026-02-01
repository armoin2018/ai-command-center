---
id: ailey-admin-index
name: Rebuild Indexes
description: Rebuild AI-Ley index files using the ailey-indexer skill to accurately reflect current state of all ai-ley kit resources
keywords: [index, rebuild, metadata, discovery, automation, skill, ailey-indexer]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator
---
## Overview

This command uses the **ailey-indexer** skill to rebuild all ai-ley kit indexes automatically. The indexer scans resource directories and generates comprehensive index files for agents, skills, personas, instructions, flows, and prompts.

## References

**Skill**: `.github/skills/ailey-indexer/` - Automated indexing tool

**Skill Documentation**: See `.github/skills/ailey-indexer/SKILL.md` for complete details

## Goal

Use the ailey-indexer skill to:

- Rebuild all index files in `.github/ai-ley/indexes/`:
  - `agents.index.json` - All AI agents
  - `skills.index.json` - All skills
  - `personas.index.json` - All personas
  - `instructions.index.json` - All instructions
  - `flows.index.json` - All workflow flows
  - `prompts.index.json` - All command prompts
- Extract metadata from YAML frontmatter
- Generate searchable indexes with descriptions and keywords
- Ensure indexes are current with repository state

## Command

Execute the ailey-indexer skill to rebuild all indexes:

### Step 1: Run the Indexer

```bash
node .github/skills/ailey-indexer/scripts/reindex-all.ts
```

This will:
- Scan all ai-ley kit resource directories
- Extract metadata from YAML frontmatter
- Generate index files in `.github/ai-ley/indexes/`
- Create searchable catalogs with descriptions and keywords

### Step 2: Verify Index Updates

Check the generated index files:

- `.github/ai-ley/indexes/agents.index.json`
- `.github/ai-ley/indexes/skills.index.json`
- `.github/ai-ley/indexes/personas.index.json`
- `.github/ai-ley/indexes/instructions.index.json`
- `.github/ai-ley/indexes/flows.index.json`
- `.github/ai-ley/indexes/prompts.index.json`

### Step 3: Review Changes

Confirm that:
- All new resources are indexed
- Modified resources have updated metadata
- Index counts match directory contents
- Descriptions and keywords are accurate


### Rebuild Specific Resource Type

To rebuild only one type of index:

```bash
# Rebuild only personas
node .github/skills/ailey-indexer/scripts/reindex-all.ts --type personas

# Rebuild only instructions
node .github/skills/ailey-indexer/scripts/reindex-all.ts --type instructions

# Available types: agents, skills, personas, instructions, flows, prompts
```

### Rebuild All (Default)

Run without options to rebuild all indexes:

```bash
node .github/skills/ailey-indexer/scripts/reindex-all.ts
```

## When to Use

Rebuild indexes when:

- **After adding new resources**: New agents, skills, personas, instructions, flows, or prompts
- **After updating metadata**: Changed descriptions, keywords, or versions in YAML frontmatter
- **After bulk changes**: Reorganized directories or renamed files
- **Before committing**: Ensure indexes reflect current state
- **Setting up new instance**: Initialize indexes for a new ai-ley kit installation


### Example 1: Rebuild All Indexes

```bash
$ node .github/skills/ailey-indexer/scripts/reindex-all.ts

Indexing agents...
  Found 5 agents
  ✓ agents.index.json updated

Indexing skills...
  Found 4 skills
  ✓ skills.index.json updated

Indexing personas...
  Found 12 personas
  ✓ personas.index.json updated

Indexing instructions...
  Found 8 instructions
  ✓ instructions.index.json updated

Indexing flows...
  Found 3 flows
  ✓ flows.index.json updated

Indexing prompts...
  Found 15 prompts
  ✓ prompts.index.json updated

✅ All indexes rebuilt successfully
```

### Example 2: Rebuild Specific Index

```bash
$ node .github/skills/ailey-indexer/scripts/reindex-all.ts --type skills

Indexing skills...
  Found 4 skills
  ✓ skills.index.json updated

✅ Skills index rebuilt successfully
```

## Index Format

Each generated index contains JSON with the following structure:

```json
{
  "type": "[resource-type]",
  "lastUpdated": "[ISO 8601 timestamp]",
  "totalCount": [number],
  "resources": [
    {
      "name": "[Resource Name]",
      "path": "[relative/path/to/resource.md]",
      "description": "[What it does and when to use it]",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "version": "[version number]" | null,
      "score": [quality rating 0-5] | null,
      "updated": "[date]" | null
    }
  ]
}
```

## Notes

- The indexer extracts metadata from YAML frontmatter in each resource file
- Indexes are automatically formatted as JSON for easy programmatic consumption
- Missing metadata will result in `null` values in JSON
- Quality scores (if present) help identify resources needing improvement
- Indexes are used by AI assistants for resource discovery and selection

## Troubleshooting

**Issue**: Script not found

**Solution**: Ensure you're running from the repository root and the path is correct

**Issue**: No resources found

**Solution**: Check that resource files exist in expected directories and have correct extensions

**Issue**: Missing metadata in index

**Solution**: Add YAML frontmatter to resource files with name, description, and keywords

**Issue**: Permission denied

**Solution**: Ensure the script is executable: `chmod +x .github/skills/ailey-indexer/scripts/reindex-all.ts`

## See Also

- **Skill Documentation**: `.github/skills/ailey-indexer/SKILL.md`
- **Index Files**: `.github/ai-ley/indexes/`
- **Resource Directories**: 
  - Agents: `.github/agents/`
  - Skills: `.github/skills/`
  - Personas: `.github/ai-ley/personas/`
  - Instructions: `.github/ai-ley/instructions/`
  - Flows: `.github/ai-ley/flows/`
  - Prompts: `.github/prompts/`

---

version: 2.0.0
updated: 2026-01-20
reviewed: 2026-01-20
score: 5.0

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.5
---