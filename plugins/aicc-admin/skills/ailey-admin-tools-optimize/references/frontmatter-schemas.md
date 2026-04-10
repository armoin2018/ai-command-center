---
name: 'Frontmatter Schema Reference'
description: 'Complete frontmatter schemas for all AI-ley kit resource types'
---

# Frontmatter Schema Reference

## Overview

All AI-ley kit resources use YAML frontmatter for metadata. This reference defines the schema for each resource type.

## Common Fields

These fields apply to all resource types:

```yaml
id: string              # Base filename (auto-generated)
name: string            # Human-readable name (required)
description: string     # What it does and when to use it (required)
keywords: string[]      # Search and categorization keywords
tools: string[]         # Tools or dependencies used
version: string         # Semver version (X.Y.Z)
author: string          # Creator or maintainer
created: string         # ISO date (YYYY-MM-DD)
updated: string         # ISO date (YYYY-MM-DD)
status: string          # active | draft | deprecated
```

## Instructions

**File Pattern**: `*.instructions.md`  
**Location**: `.github/ai-ley/instructions/**/*.instructions.md`

```yaml
---
id: instruction-name
name: Instruction Title
description: What this instruction covers and when to apply it
applyTo: 'code-generation, testing, documentation'
category: string        # development | testing | documentation | architecture
keywords: [instruction, guidance, best-practice]
tools: [tool1, tool2]
---
```

**Special Fields:**
- `applyTo`: Comma-separated contexts where instruction applies (string, not array)
- `category`: Instruction category for organization

**Example:**
```yaml
---
id: typescript-testing
name: TypeScript Testing Guidelines
description: Best practices for testing TypeScript code with Jest and Vitest
applyTo: 'typescript, testing, jest, vitest'
category: testing
keywords: [typescript, testing, jest, unit-tests]
tools: [jest, vitest, ts-jest]
---
```

## Personas

**File Pattern**: `*.persona.md`  
**Location**: `.github/ai-ley/personas/**/*.persona.md`

```yaml
---
id: persona-name
name: Persona Title
description: Role and expertise of this persona
role: string            # Primary role or title
expertise: string[]     # Areas of expertise
domain: string          # Primary domain (development, marketing, design, etc.)
keywords: [persona, expert, role]
tools: [tool1, tool2]
---
```

**Special Fields:**
- `role`: Primary role or job title
- `expertise`: Array of expertise areas
- `domain`: Primary domain for categorization

**Example:**
```yaml
---
id: seo-expert
name: SEO Expert
description: Expert persona specializing in search engine optimization and web analytics
role: SEO Specialist
expertise: [technical-seo, content-optimization, analytics, core-web-vitals]
domain: marketing
keywords: [seo, search-optimization, web-analytics]
tools: [semrush, ahrefs, google-analytics, lighthouse]
---
```

## Agents

**File Pattern**: `*.agent.md`  
**Location**: `.github/agents/*.agent.md`

```yaml
---
id: agent-name
name: Agent Title
description: What this agent does and when to use it
extends: string         # Parent agent (if any)
mode: string            # Operational mode or specialty
capabilities: string[]  # Agent capabilities
keywords: [agent, automation, workflow]
tools: [tool1, tool2]
---
```

**Special Fields:**
- `extends`: Parent agent for inheritance
- `mode`: Operational mode (orchestrator, specialist, etc.)
- `capabilities`: Array of agent capabilities

**Example:**
```yaml
---
id: ailey-orchestrator
name: AI-ley Orchestrator
description: Advanced orchestrator for complex multi-step operations and intelligent resource selection
extends: ailey-base
mode: orchestrator
capabilities: [task-decomposition, resource-selection, multi-pass-processing]
keywords: [orchestrator, multi-step, planning, execution]
tools: [typescript, node, mcp]
---
```

## Skills

**File Pattern**: `SKILL.md`  
**Location**: `.github/skills/**/SKILL.md`

```yaml
---
id: skill-name
name: Skill Title
description: What the skill does AND specific triggers (file types, tasks, scenarios)
category: string        # analysis, development, reporting, optimization, etc.
tags: string[]          # Descriptive tags
dependencies: string[]  # npm packages or other skills
keywords: [skill, capability, tool]
tools: [tool1, tool2]
---
```

**Special Fields:**
- `category`: Skill category for organization
- `tags`: Descriptive tags for discovery
- `dependencies`: npm packages or other skills required

**Example:**
```yaml
---
id: ailey-tools-seo-report
name: SEO Report Generator
description: Comprehensive SEO analysis and reporting for websites with technical audits, content optimization, and performance metrics. Use when analyzing websites, generating SEO reports, or auditing technical SEO.
category: analysis
tags: [seo, web-crawling, performance, reporting]
dependencies: [cheerio, lighthouse, puppeteer, axios]
keywords: [seo-audit, website-analysis, performance-metrics]
tools: [typescript, node, lighthouse]
---
```

## Prompts

**File Pattern**: `*.prompt.md`  
**Location**: `.github/prompts/*.prompt.md`

```yaml
---
id: prompt-name
name: Prompt Title
description: What this prompt does and expected outcomes
agent: string           # Recommended agent (default: AI-ley Orchestrator)
skills: string[]        # Skills used by this prompt
model: string           # Recommended model (optional)
argument-hint: string   # Argument format hint (optional)
keywords: [prompt, command, workflow]
tools: [tool1, tool2]
---
```

**Special Fields:**
- `agent`: Recommended agent for execution (default: "AI-ley Orchestrator")
- `skills`: Array of skills leveraged by prompt
- `model`: Recommended AI model (optional)
- `argument-hint`: Format hint for arguments (optional)

**Example:**
```yaml
---
id: ailey-report-seo
name: SEO Report Generator
description: Generate comprehensive SEO analysis reports with ratings, gradings, and actionable recommendations
agent: AI-ley Marketing
skills: [ailey-tools-seo-report]
keywords: [seo, analysis, reporting, website-audit]
tools: [lighthouse, cheerio, puppeteer]
---
```

## Footer Schema

All resource types use this footer format:

```yaml
---
version: 1.0.0          # Semver version
updated: 2026-01-29     # Last update date (ISO)
reviewed: 2026-01-29    # Last review date (ISO)
score: 4.5              # Quality score (0.0-5.0)
---
```

**Footer Fields:**
- `version`: Semantic version (X.Y.Z format)
- `updated`: Date of last modification (YYYY-MM-DD)
- `reviewed`: Date of last quality review (YYYY-MM-DD)
- `score`: Quality assessment score (0.0-5.0, 1 decimal place)

## Validation Rules

### Frontmatter

1. **Required Fields** (all types):
   - `id`: Must match base filename
   - `name`: 1-100 characters
   - `description`: 10-1024 characters

2. **Array Fields**:
   - Must be valid YAML arrays: `[item1, item2, item3]`
   - No trailing commas
   - Items can be quoted or unquoted

3. **Deprecated Fields**:
   - `agents` (removed, use `agent` in prompts)
   - Use optimizer to clean up

### Footer

1. **Version**:
   - Format: `X.Y.Z` (semver)
   - Example: `1.0.0`, `2.1.3`

2. **Dates**:
   - Format: `YYYY-MM-DD` (ISO 8601)
   - Example: `2026-01-29`

3. **Score**:
   - Range: `0.0` to `5.0`
   - Precision: 1 decimal place
   - Example: `4.5`, `3.0`

## Examples

### Complete Instruction Example

```markdown
---
id: typescript-best-practices
name: TypeScript Best Practices
description: Coding standards and best practices for TypeScript development
applyTo: 'typescript, javascript, node'
category: development
keywords: [typescript, best-practices, coding-standards]
tools: [typescript, eslint, prettier]
---

# TypeScript Best Practices

[Content here...]

---
version: 1.0.0
updated: 2026-01-29
reviewed: 2026-01-29
score: 4.5
---
```

### Complete Skill Example

```markdown
---
id: ailey-tools-image
name: Image Manipulation Toolkit
description: Comprehensive image processing with format conversion, animation, editing, and OCR. Use when working with images, creating animations, or extracting text from scans.
category: media-processing
tags: [images, conversion, ocr, animation]
dependencies: [sharp, jimp, tesseract.js, pdf-lib]
keywords: [image-processing, ocr, format-conversion]
tools: [sharp, jimp, puppeteer, tesseract]
---

# Image Manipulation Toolkit

[Content here...]

---
version: 1.0.0
updated: 2026-01-29
reviewed: 2026-01-29
score: 4.8
---
```

## Best Practices

1. **Descriptions**:
   - Include WHAT and WHEN
   - Keep concise (10-200 chars ideal)
   - Use action verbs

2. **Keywords**:
   - 3-10 keywords
   - Lowercase, hyphenated
   - Include synonyms and related terms

3. **Tools**:
   - List actual npm packages or tools
   - Use lowercase names
   - Include major dependencies only

4. **IDs**:
   - Match base filename exactly
   - Use lowercase with hyphens
   - Prefix with `ailey-` for ai-ley kit skills

5. **Versions**:
   - Start at `1.0.0` for new resources
   - Increment patch for fixes (1.0.1)
   - Increment minor for features (1.1.0)
   - Increment major for breaking changes (2.0.0)

---

version: 1.0.0  
updated: 2026-01-29  
reviewed: 2026-01-29  
score: 4.5
