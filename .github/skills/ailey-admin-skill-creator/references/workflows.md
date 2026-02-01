# Skill Creation Workflow Patterns

## Table of Contents

- [Sequential Workflows](#sequential-workflows)
- [Conditional Workflows](#conditional-workflows)
- [Output Patterns](#output-patterns)
- [Progressive Disclosure Strategies](#progressive-disclosure-strategies)

## Sequential Workflows

For complex tasks that require multiple steps in sequence, provide a clear overview of the process.

### Example: PDF Form Filling

```markdown
Filling a PDF form involves these steps:

1. Analyze the form structure (run scripts/analyze-form.ts)
2. Create field mapping (edit fields.json)
3. Validate mapping (run scripts/validate-fields.ts)
4. Fill the form (run scripts/fill-form.ts)
5. Verify output (run scripts/verify-output.ts)
```

### Example: Document Processing

```markdown
Processing workflow:

1. **Intake**: Read and parse document
   - Extract metadata
   - Identify document type
   
2. **Transform**: Apply transformations
   - Convert format if needed
   - Apply style templates
   
3. **Validate**: Check output
   - Verify structure
   - Validate content
   
4. **Export**: Generate final output
```

## Conditional Workflows

For tasks with branching logic, guide through decision points clearly.

### Example: Content Modification

```markdown
1. Determine the modification type:
   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Initialize structure
   - Generate content
   - Apply templates
   
3. Editing workflow:
   - Load existing content
   - Apply modifications
   - Preserve original formatting
```

### Example: Deployment Strategy

```markdown
Choose deployment approach:

**First deployment?**
1. Initialize infrastructure
2. Configure environment
3. Deploy application

**Updating existing?**
1. Backup current state
2. Apply migrations
3. Deploy update
4. Verify deployment
```

## Output Patterns

### Template-Based Outputs

Provide exact templates when output format is critical:

```markdown
## Output Format

Use this exact structure:

\`\`\`json
{
  "version": "1.0.0",
  "metadata": {
    "created": "ISO-8601-timestamp",
    "author": "string"
  },
  "content": {
    "field1": "value",
    "field2": "value"
  }
}
\`\`\`
```

### Example-Based Outputs

Show concrete examples for each use case:

```markdown
## Example 1: Simple Case

**Input**: 
\`\`\`
User request: "Create a basic report"
\`\`\`

**Output**:
\`\`\`markdown
# Report Title

## Section 1
Content here...

## Section 2
Content here...
\`\`\`

## Example 2: Complex Case

**Input**:
\`\`\`
User request: "Create a detailed technical report with charts"
\`\`\`

**Output**:
[More complex example...]
\`\`\`
```

### Validation Patterns

Define success criteria explicitly:

```markdown
## Validation Criteria

Output must satisfy:

1. **Structure**: Contains all required sections
2. **Format**: Valid JSON/YAML/Markdown
3. **Completeness**: No placeholder text remains
4. **Consistency**: Follows naming conventions
5. **Quality**: Passes automated checks

Run validation: `node scripts/validate.ts output.json`
```

## Progressive Disclosure Strategies

### Strategy 1: Core + Optional

Keep common workflows in SKILL.md, advanced features in references:

```markdown
# Core Functionality

## Quick Start
[Essential workflow here]

## Common Operations
- Operation 1
- Operation 2

## Advanced Features

Need more capabilities? See:
- **Advanced Configuration**: [config.md](./references/config.md)
- **API Reference**: [api.md](./references/api.md)
- **Troubleshooting**: [troubleshooting.md](./references/troubleshooting.md)
```

### Strategy 2: Domain Separation

Organize by domain to avoid loading irrelevant context:

**Structure**:
```
skill/
├── SKILL.md (navigation hub)
└── references/
    ├── frontend.md
    ├── backend.md
    ├── database.md
    └── deployment.md
```

**SKILL.md**:
```markdown
# Full-Stack Developer Skill

## Domains

Select your domain:

- **Frontend Development**: See [frontend.md](./references/frontend.md)
- **Backend Development**: See [backend.md](./references/backend.md)
- **Database Design**: See [database.md](./references/database.md)
- **Deployment**: See [deployment.md](./references/deployment.md)

Each domain reference contains specialized workflows and examples.
```

### Strategy 3: Framework/Tool Variants

When supporting multiple frameworks or tools:

**Structure**:
```
skill/
├── SKILL.md (framework selection)
└── references/
    ├── react.md
    ├── vue.md
    ├── angular.md
    └── svelte.md
```

**SKILL.md**:
```markdown
# Frontend Framework Skill

## Framework Selection

1. Identify project framework
2. Load appropriate reference:
   - **React**: [react.md](./references/react.md)
   - **Vue**: [vue.md](./references/vue.md)
   - **Angular**: [angular.md](./references/angular.md)
   - **Svelte**: [svelte.md](./references/svelte.md)

Each reference contains framework-specific patterns and best practices.
```

### Strategy 4: Tiered Complexity

Layer information from simple to complex:

```markdown
# Data Processing Skill

## Level 1: Basic Processing
[Simple examples and common patterns]

## Level 2: Intermediate Features
Need more control?
- **Custom Transformations**: [transformations.md](./references/transformations.md)
- **Batch Processing**: [batch.md](./references/batch.md)

## Level 3: Advanced Optimization
For performance-critical scenarios:
- **Performance Tuning**: [performance.md](./references/performance.md)
- **Distributed Processing**: [distributed.md](./references/distributed.md)
```

## Reference File Organization

### Large Reference Files

For files >100 lines, always include a table of contents:

```markdown
# Complete API Reference

## Table of Contents

- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
  - [Users](#users)
  - [Data](#data)
  - [Reports](#reports)
- [Advanced Features](#advanced-features)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

## Authentication
[Content...]

## Core Endpoints
### Users
[Content...]
```

### Multi-File References

Keep references one level deep from SKILL.md:

✅ **Good**:
```
skill/
├── SKILL.md
└── references/
    ├── api.md (linked from SKILL.md)
    ├── schemas.md (linked from SKILL.md)
    └── examples.md (linked from SKILL.md)
```

❌ **Avoid**:
```
skill/
├── SKILL.md
└── references/
    ├── api/
    │   └── endpoints.md (nested too deep)
    └── schemas/
        └── database.md (nested too deep)
```

## Anti-Patterns to Avoid

### Don't Include Everything Upfront

❌ **Bad**:
```markdown
# Skill Title

## Overview
[Long explanation...]

## Complete API Documentation
[Hundreds of lines of API docs...]

## All Possible Examples
[Dozens of examples...]
```

✅ **Good**:
```markdown
# Skill Title

## Overview
[Concise explanation]

## Quick Start
[Essential example]

## Resources
- API Documentation: [api.md](./references/api.md)
- Examples: [examples.md](./references/examples.md)
```

### Don't Repeat Information

❌ **Bad**: Same content in both SKILL.md and references/

✅ **Good**: Brief overview in SKILL.md, details in references/

### Don't Create Deeply Nested Workflows

❌ **Bad**: 
```markdown
If X then:
  If Y then:
    If Z then:
      Do A
    Else:
      Do B
  Else:
    Do C
```

✅ **Good**:
```markdown
Determine scenario:
- Scenario 1 (X and Y and Z): Do A
- Scenario 2 (X and Y, not Z): Do B
- Scenario 3 (X, not Y): Do C
```

---

**Version**: 1.0.0  
**Created**: 2026-01-19
