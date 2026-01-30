# AI-ley Admin Optimize Kit

Comprehensive optimization and normalization toolkit for AI-ley kit resources.

## Quick Start

```bash
# Install dependencies
npm install

# Optimize all resources with AI review
npm run optimize all -- --ai-review --extract-code --extract-examples

# Preview changes (dry run)
npm run optimize all -- --dry-run --verbose

# Optimize specific resource type
npm run optimize instructions
npm run optimize personas
npm run optimize agents
npm run optimize skills
npm run optimize prompts

# Optimize single file
npm run optimize file path/to/file.md -- --ai-review
```

## Features

- **Frontmatter Normalization**: Standardize metadata across all resource types
- **Footer Normalization**: Consistent versioning, dates, and quality scores
- **Code Extraction**: Move code blocks to `scripts/` directories
- **Example Extraction**: Move examples to `examples/` directories
- **AI Quality Review**: Assess clarity, conciseness, accuracy, references, sufficiency
- **Line Count Management**: Target ≤ 300 lines per file
- **Batch Processing**: Process entire categories or individual files

## Documentation

- **SKILL.md**: Complete skill documentation with workflows
- **references/frontmatter-schemas.md**: Frontmatter schemas for all resource types
- **references/quality-scoring.md**: Quality assessment methodology

## Quality Metrics

The AI reviewer assesses content across six dimensions:

1. **Clarity** (20%): Understandability, heading quality, jargon explanation
2. **Conciseness** (15%): Line count, redundancy, wordy phrases
3. **Accuracy** (25%): Link validity, terminology consistency, precision
4. **References** (15%): Citations, code examples, structured data
5. **Sufficiency** (15%): Content length, structure, examples
6. **No Conjunctions** (10%): Avoidance of problematic conjunctions

Overall score: 0.0-5.0 (weighted average)

## Example Usage

```bash
# Full optimization with all features
npm run optimize all -- \
  --extract-code \
  --extract-examples \
  --ai-review \
  --target-lines 300 \
  --verbose

# Quick normalization (frontmatter + footer only)
npm run optimize prompts

# Preview changes before applying
npm run optimize skills -- --dry-run --verbose
```

## Output

```
Found 25 files matching pattern: .github/skills/**/SKILL.md
Processing: .github/skills/ailey-seo-report/SKILL.md
✓ .github/skills/ailey-seo-report/SKILL.md
  - Normalized frontmatter
  - Normalized footer
  - Extracted 3 code blocks
  - Extracted 2 examples
  - AI review completed (score: 4.5)

Summary:
  Total files: 25
  Successful: 25
  Failed: 0
  Total changes: 87
  Average quality score: 4.3/5.0
```

## License

MIT - Part of the AI-ley toolkit
