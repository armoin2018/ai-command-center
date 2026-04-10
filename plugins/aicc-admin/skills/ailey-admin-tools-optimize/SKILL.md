---
id: 
name: ailey-admin-tools-optimize
description: Optimize and normalize AI-ley kit resources including instructions, personas, agents, skills, and prompts. Normalize frontmatter and footers, extract code and examples, apply AI quality review, and assess scores. Use when maintaining consistency across AI-ley resources or batch optimizing files.
---
# AI-ley Admin Optimize Kit

Comprehensive optimization and normalization toolkit for AI-ley kit resources. Process instructions, personas, agents, skills, and prompts to ensure consistency, quality, and maintainability.

## Overview

The Admin Optimize Kit provides automated optimization for all AI-ley resources:

- **Frontmatter Normalization**: Standardize metadata across all resource types
- **Footer Normalization**: Consistent versioning, dates, and quality scores
- **Code Extraction**: Move code blocks to separate `scripts/` directories
- **Example Extraction**: Move examples to separate `examples/` directories
- **AI Quality Review**: Assess clarity, conciseness, accuracy, references, sufficiency
- **Line Count Management**: Target ≤ 300 lines per file
- **Batch Processing**: Process entire resource categories or individual files

## When to Use

- Standardizing frontmatter across multiple resources
- Maintaining consistent file structure and organization
- Extracting code and examples to reduce file size
- Assessing and improving content quality scores
- Batch updating version numbers and review dates
- Normalizing new or legacy resources to current standards
- Preparing resources for release or documentation

## Installation

```bash
cd .github/skills/ailey-admin-tools-optimize
npm install
```

## Quick Start

```bash
# Optimize all instruction files
npm run optimize instructions

# Dry run (preview changes)
npm run optimize instructions -- --dry-run --verbose

# Optimize with AI review and extraction
npm run optimize all -- --ai-review --extract-code --extract-examples

# Optimize single file
npm run optimize file path/to/file.md -- --ai-review --verbose
```


### Workflow 1: Normalize Frontmatter

Standardize metadata across resources:

```bash
# Normalize all prompts
npm run optimize prompts

# With verbose output
npm run optimize prompts -- --verbose
```

**Frontmatter Schema:**
```yaml
id: base-filename
name: Resource Name
description: What it does and when to use it
keywords: [array, of, keywords]
tools: [array, of, tools]
agent: AI-ley Orchestrator  # Prompts only
skills: [array, of, skills]  # Prompts only
```

**Normalization Actions:**
- Sets `id` to base filename
- Generates `name` from filename if missing
- Ensures `description` present
- Converts `keywords` and `tools` to arrays
- Removes deprecated `agents` field
- Adds `agent` and `skills` for prompts

### Workflow 2: Normalize Footers

Ensure consistent versioning and quality scores:

```bash
# Normalize all resources
npm run optimize all
```

**Footer Schema:**

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.6
---