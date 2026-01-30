---
name: ailey-admin-optimize-kit
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
cd .github/skills/ailey-admin-optimize-kit
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

## Workflows

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
```yaml
---
version: 1.0.0
updated: 2026-01-29
reviewed: 2026-01-29
score: 4.5
---
```

**Normalization Actions:**
- Sets `version` to semver format (X.Y.Z)
- Updates `updated` to today's date
- Preserves or sets `reviewed` date
- Validates `score` (0.0-5.0 range)

### Workflow 3: Extract Code and Examples

Reduce file size by extracting embedded content:

```bash
# Extract code blocks and examples
npm run optimize skills -- --extract-code --extract-examples
```

**Code Extraction:**
- Identifies code blocks (````typescript, ```bash, etc.)
- Creates `scripts/{baseFileName}/` directory
- Saves each block as `script-N.{ext}`
- Replaces code blocks with references

**Example Extraction:**
- Identifies example sections (## Example headings)
- Creates `examples/{baseFileName}/` directory
- Saves each example as `example-N.md`
- Replaces examples with references

**Result:**
```
.github/ai-ley/instructions/example.instructions.md
.github/ai-ley/instructions/scripts/example/
  ├── script-1.ts
  └── script-2.sh
.github/ai-ley/instructions/examples/example/
  ├── example-1.md
  └── example-2.md
```

### Workflow 4: AI Quality Review

Assess content quality across multiple dimensions:

```bash
# Run AI review on all resources
npm run optimize all -- --ai-review
```

**Quality Metrics (0.0-5.0 each):**

1. **Clarity** (20% weight):
   - Clear headings (10-100 chars)
   - Reasonable paragraph length (< 200 words)
   - Explained jargon and acronyms

2. **Conciseness** (15% weight):
   - Target ≤ 300 lines
   - No redundant content
   - Avoids wordy phrases

3. **Accuracy** (25% weight):
   - Valid links and references
   - Consistent terminology
   - Precise language (no vague terms)

4. **Reference Material** (15% weight):
   - Citations and links
   - Code examples
   - Structured data (tables, lists)

5. **Sufficiency** (15% weight):
   - Adequate length (50-300 lines)
   - Proper structure (headings)
   - Includes examples

6. **No Conjunctions** (10% weight):
   - Avoids problematic conjunctions
   - Clear, direct statements

**Overall Score:**
Weighted average of all metrics, rounded to 1 decimal place.

### Workflow 5: Batch Process All Resources

Comprehensive optimization across all resource types:

```bash
# Full optimization with all features
npm run optimize all -- \
  --extract-code \
  --extract-examples \
  --ai-review \
  --target-lines 300 \
  --verbose
```

**Processes:**
1. Instructions (`.github/ai-ley/instructions/**/*.instructions.md`)
2. Personas (`.github/ai-ley/personas/**/*.persona.md`)
3. Agents (`.github/agents/*.agent.md`)
4. Skills (`.github/skills/**/SKILL.md`)
5. Prompts (`.github/prompts/*.prompt.md`)

**Summary Output:**
- Total files processed
- Successful vs failed
- Total changes applied
- Average quality score

### Workflow 6: Target Line Count Optimization

Ensure files meet target line count:

```bash
# Set custom target (default 300)
npm run optimize instructions -- --target-lines 250 --verbose
```

**Strategies:**
- Extract code blocks (saves ~50-200 lines)
- Extract examples (saves ~30-100 lines)
- Remove redundant content
- Use progressive disclosure

**Warning:**
Files exceeding target receive warning in changes list.

### Workflow 7: Dry Run Preview

Preview changes before applying:

```bash
# Preview all changes
npm run optimize all -- --dry-run --verbose
```

**Dry Run Output:**
- All changes listed
- No files modified
- Full metrics displayed
- Use to verify before committing

## Command Reference

### Commands

```bash
# Optimize instructions
npm run optimize instructions [options]

# Optimize personas
npm run optimize personas [options]

# Optimize agents
npm run optimize agents [options]

# Optimize skills
npm run optimize skills [options]

# Optimize prompts
npm run optimize prompts [options]

# Optimize all resources
npm run optimize all [options]

# Optimize single file
npm run optimize file <path> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview changes without writing | `false` |
| `--extract-code` | Extract code blocks to scripts/ | `false` |
| `--extract-examples` | Extract examples to examples/ | `false` |
| `--ai-review` | Run AI quality review | `false` |
| `--target-lines <number>` | Target maximum lines | `300` |
| `--verbose` | Show detailed output | `false` |

## Quality Scoring

### Score Interpretation

- **5.0 - Excellent**: Perfect structure, clarity, and completeness
- **4.0-4.9 - Good**: Minor improvements possible
- **3.0-3.9 - Satisfactory**: Meets basic standards
- **2.0-2.9 - Needs Work**: Significant issues present
- **0.0-1.9 - Poor**: Major overhaul required

### Improving Scores

**Clarity:**
- Use descriptive headings (10-100 characters)
- Keep paragraphs concise (< 200 words)
- Define acronyms and jargon

**Conciseness:**
- Target ≤ 300 lines
- Remove redundant content
- Avoid wordy phrases ("in order to" → "to")

**Accuracy:**
- Use consistent terminology
- Verify all links and references
- Replace vague language with precise terms

**Reference Material:**
- Add code examples
- Include citations and links
- Use structured data (tables, lists)

**Sufficiency:**
- Maintain 50-300 line range
- Include 3+ heading levels
- Provide examples

## Best Practices

1. **Always Dry Run First**: Preview changes before applying
2. **Version Control**: Commit before batch optimization
3. **Incremental Updates**: Process one resource type at a time
4. **Review AI Scores**: Manually verify quality assessments
5. **Preserve Semantics**: Ensure extracted code/examples still make sense
6. **Test After Extraction**: Verify code still runs in new location
7. **Update References**: Check that links to extracted content work

## Troubleshooting

**Issue**: Files not found by pattern  
**Solution**: Check glob patterns match actual file extensions

**Issue**: Frontmatter parsing errors  
**Solution**: Ensure YAML frontmatter properly formatted with `---` delimiters

**Issue**: Code extraction breaks references  
**Solution**: Manually update references to extracted code locations

**Issue**: Quality scores seem inaccurate  
**Solution**: AI review is heuristic-based; manually verify and adjust

## Integration

**Related Skills:**
- `ailey-data-converter` - Schema management for structured data
- `ailey-manage-plan` - Plan file optimization

**Related Prompts:**
- `ailey-add-skill` - Create new skills following standards
- `ailey-add-feature` - Feature requests and requirements

## Performance

- **Average time**: 0.5-2 seconds per file
- **Batch processing**: 50-100 files in 30-60 seconds
- **AI review overhead**: +0.2-0.5 seconds per file
- **Memory usage**: ~50MB for typical batch

---

version: 1.0.0  
updated: 2026-01-29  
reviewed: 2026-01-29  
score: 4.5
