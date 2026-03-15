---
id: 
name: ailey-admin-skill-creator
description: Guide for creating effective VS Code Copilot skills following ai-ley kit standards. Use when users want to create a new skill, update an existing skill, or need guidance on skill structure, TypeScript scripts, MCP servers, or skill best practices.
---
# AI-ley Skill Creator

Create effective VS Code Copilot skills that extend AI capabilities with specialized knowledge, workflows, and tool integrations following ai-ley kit standards.


### Conciseness is Key

Context window is a shared resource. Only add information the AI doesn't already have.

**Default assumption: AI is already very smart.**

Challenge each piece of information:
- "Does the AI really need this explanation?"
- "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Progressive Disclosure

Skills use three-level loading:
1. **Metadata** (name + description) - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words, keep under 500 lines)
3. **Bundled resources** - As needed (unlimited because scripts can execute without reading)

Keep SKILL.md lean by moving details to reference files.

### Set Appropriate Degrees of Freedom

Match specificity to task fragility:

**High freedom** (text instructions):
- Multiple approaches valid
- Decisions depend on context
- Heuristics guide approach

**Medium freedom** (pseudocode/parameterized scripts):
- Preferred pattern exists
- Some variation acceptable
- Configuration affects behavior

**Low freedom** (specific scripts):
- Operations fragile and error-prone
- Consistency critical
- Specific sequence required

## Skill Anatomy

Every skill consists of:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (required)
│   │   ├── name: (required - lowercase, hyphens, max 64 chars)
│   │   └── description: (required - what + when, max 1024 chars)
│   └── Markdown body (instructions)
└── Optional Resources
    ├── scripts/          - TypeScript executable code
    ├── references/       - Documentation loaded as needed
    └── assets/           - Files used in output
```

### SKILL.md Structure

**Frontmatter (YAML)**:
```yaml
---
name: skill-name
description: Complete description of what the skill does AND specific triggers/contexts for when to use it
---
```

**Critical**:
- Description is PRIMARY triggering mechanism
- Include all "when to use" information in description
- Body only loads AFTER triggering

**Body (Markdown)**:
- What skill accomplishes
- Step-by-step procedures
- Examples of input/output
- References to bundled resources


#### Scripts (`scripts/`)

Executable TypeScript code for deterministic operations.

**When to include**:
- Same code rewritten repeatedly
- Deterministic reliability needed
- Complex error-prone operations

**AI-ley TypeScript Requirements**:

```typescript
#!/usr/bin/env node
/**
 * Script Name - Brief description
 * 
 * Can be run independently: node scripts/script-name.ts
 * Can be executed by AI agent within skill context
 */

import { promises as fs } from 'fs';

async function main() {
  // Implementation
  console.log('✅ Operation complete');
}

// Standalone execution
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

// Export for module usage
export { main };
```

**Script Guidelines**:
- Must be executable standalone
- Include `#!/usr/bin/env node`
- Export main function
- Use TypeScript for type safety
- Handle errors gracefully
- Provide clear console output

#### References (`references/`)

Documentation loaded into context as needed.

**When to include**:
- API documentation
- Database schemas
- Domain knowledge
- Detailed workflow guides
- Information too lengthy for SKILL.md

**Best practices**:
- Table of contents for files >100 lines
- Avoid duplication with SKILL.md
- Move detailed content here to keep SKILL.md lean

#### Assets (`assets/`)

Files used in output, not loaded into context.

**When to include**:
- Templates (.pptx, .docx, .html)
- Boilerplate code directories
- Images, icons, fonts
- Sample data files

### What NOT to Include

Do NOT create extraneous documentation:
- ❌ README.md (skill is self-documenting)
- ❌ INSTALLATION_GUIDE.md
- ❌ CHANGELOG.md
- ❌ QUICK_REFERENCE.md

Only include files needed for AI agent to perform the task.

## Skill Creation Process

Follow these steps in order:

### Step 1: Understand with Concrete Examples

Gather concrete examples of skill usage:
- What functionality should it support?
- Can you provide examples of how it will be used?
- What should trigger this skill?
- What would a user say to activate it?

Don't ask too many questions at once. Start with most important.

Conclude when functionality is clearly understood.

### Step 2: Plan Reusable Contents

Analyze each example:
1. Consider how to execute from scratch
2. Identify helpful scripts, references, assets

**Example Analysis**:

PDF editor for "Help me rotate this PDF":
- Rotating requires re-writing same code each time
- → Create `scripts/rotate-pdf.ts`

Frontend builder for "Build me a todo app":
- Writing webapp requires same boilerplate
- → Create `assets/hello-world/` template

BigQuery skill for "How many users logged in today?":
- Requires re-discovering table schemas
- → Create `references/schema.md`

### Step 3: Initialize Skill

Create directory structure using the provided initialization script:

```bash
cd .github/skills
node ../skills/ailey-admin-skill-creator/scripts/init-skill.ts skill-name --path .github/skills
```

This creates:
- `skill-name/SKILL.md` - Main skill file with template
- `skill-name/package.json` - Node.js configuration
- `skill-name/tsconfig.json` - TypeScript configuration
- `skill-name/mcp.json` - MCP stdio configuration (optional)
- `skill-name/toolset.json` - VS Code toolset configuration (optional)
- `skill-name/scripts/example.ts` - Example script template
- `skill-name/scripts/mcp-server.ts` - MCP server template (optional)
- `skill-name/references/api_reference.md` - Reference documentation template
- `skill-name/assets/example_asset.txt` - Asset file example

**Delete unused files**:
- Remove `mcp.json` and `scripts/mcp-server.ts` if not using MCP
- Remove `toolset.json` if not using VS Code toolset
- Remove `references/` if no reference docs needed
- Remove `assets/` if no asset files needed
- Remove example files after creating actual implementations

Alternatively, create manually:

```bash
# macOS / Linux (bash/zsh)
mkdir -p .github/skills/skill-name/{scripts,references,assets}
touch .github/skills/skill-name/SKILL.md

# Windows (PowerShell)
'scripts','references','assets' | ForEach-Object { New-Item -ItemType Directory -Force -Path ".github\skills\skill-name\$_" }
New-Item -ItemType File -Force -Path ".github\skills\skill-name\SKILL.md"
```

For TypeScript skills, add `package.json`:

```json
{
  "name": "ailey-skill-name",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

And `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./scripts",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["scripts/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Implement Resources

**Start with bundled resources**:
- Implement scripts (test by running them)
- Create reference documentation
- Add asset files
- Delete unused example directories

**Test Scripts**:
- Run scripts independently to verify functionality
- Ensure proper error handling
- Validate output matches expectations

**User Input**:
- May need user-provided content
- Brand assets for brand-guidelines skill
- Documentation for reference files


#### Frontmatter

```yaml
---
name: skill-name
description: What the skill does and when to use it. Include specific triggers like file types (.docx), tasks (creating documents), or scenarios (working with tracked changes).
---
```

**Critical**:
- Include WHAT it does AND WHEN to use
- This is primary triggering mechanism
- No other frontmatter fields

#### Body

Choose structure that fits skill purpose:

**1. Workflow-Based** (sequential processes):
```markdown
## Overview
## Workflow Decision Tree
## Step 1: [Action]
## Step 2: [Action]
```

**2. Task-Based** (tool collections):
```markdown
## Overview
## Quick Start
## Task Category 1
## Task Category 2
```

**3. Reference/Guidelines** (standards):
```markdown
## Overview
## Guidelines
## Specifications
## Usage
```

**4. Capabilities-Based** (integrated systems):
```markdown
## Overview
## Core Capabilities
### 1. Feature
### 2. Feature
```

**Writing Guidelines**:
- Use imperative/infinitive form
- Be concise
- Include concrete examples
- Reference bundled resources with relative paths

**Progressive Disclosure Patterns**:

Pattern 1: High-level guide with references
```markdown
# Quick Start
[Basic example]

# Advanced Features
- **Form Filling**: See [forms.md](./references/forms.md)
- **API Reference**: See [api.md](./references/api.md)
```

Pattern 2: Domain-specific organization
```
skill/
├── SKILL.md (navigation)
└── references/
    ├── aws.md
    ├── azure.md
    └── gcp.md
```

When user chooses AWS, AI only reads aws.md.

### Step 6: Create MCP Server (Optional)

If skill needs external resource access, create MCP stdio server.

**Note**: The `init-skill.ts` script automatically generates starter files:
- `mcp.json` - MCP stdio configuration
- `scripts/mcp-server.ts` - MCP server template
- `toolset.json` - VS Code toolset configuration

These files can be customized or deleted if not needed.

#### MCP Server Template

The auto-generated `scripts/mcp-server.ts` provides a starting point:

```typescript
#!/usr/bin/env node
/**
 * MCP stdio server for [skill-name]
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class SkillServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'skill-name-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'tool_name',
          description: 'Tool description',
          inputSchema: {
            type: 'object',
            properties: {
              param: { type: 'string', description: 'Param description' },
            },
            required: ['param'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'tool_name') {
        return {
          content: [{ type: 'text', text: 'Result' }],
        };
      }
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Server running on stdio');
  }
}

async function main() {
  const server = new SkillServer();
  await server.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { SkillServer };
```

#### MCP Configuration

The auto-generated `mcp.json` file provides the stdio configuration:

```json
{
  "mcpServers": {
    "skill-name": {
      "command": "node",
      "args": [".github/skills/skill-name/scripts/mcp-server.js"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

#### VS Code Toolset Configuration

The auto-generated `toolset.json` file configures the skill for VS Code tools:

```json
{
  "version": "0.1.0",
  "tools": [
    {
      "name": "skill-name",
      "displayName": "Skill Title",
      "description": "Description of what this tool does",
      "modelDescription": "Detailed description for AI model",
      "inputSchema": {
        "type": "object",
        "properties": {
          "action": {
            "type": "string",
            "description": "The action to perform",
            "enum": ["example-action"]
          }
        },
        "required": ["action"]
      }
    }
  ]
}
```

**Customization**:
- Update tool definitions in `mcp-server.ts`
- Modify MCP configuration in `mcp.json`
- Customize toolset schema in `toolset.json`
- Delete these files if MCP/toolset not needed

**Dual Implementation Pattern**:
- Create standalone script for direct execution
- Create MCP server that wraps standalone functionality
- Enables testing without MCP complexity
- Provides fallback if MCP unavailable

### Step 7: Test Skill

**Manual Testing**:
1. Enable `chat.useAgentSkills` in VS Code settings
2. Reload VS Code
3. Test with prompts that should trigger skill
4. Verify skill loads and executes correctly
5. Test all workflows in SKILL.md
6. Execute scripts independently

**Script Testing**:
```bash
node .github/skills/skill-name/scripts/script-name.ts --test
```

**Validation Checklist**:
- [ ] Valid YAML frontmatter
- [ ] Name lowercase, hyphenated, <64 chars
- [ ] Description includes what AND when (<1024 chars)
- [ ] Body uses imperative form
- [ ] Scripts executable and standalone
- [ ] TypeScript scripts have proper types
- [ ] MCP server (if present) implements required interfaces
- [ ] References linked from SKILL.md
- [ ] No extraneous documentation
- [ ] Skill triggers on appropriate prompts

### Step 8: Iterate

After using skill on real tasks:
1. Notice struggles or inefficiencies
2. Identify needed updates to SKILL.md or resources
3. Implement changes and test again


### Sequential Workflows

For complex multi-step tasks:

```markdown
Process involves these steps:

1. Analyze input (run analyze.ts)
2. Create mapping (edit config.json)
3. Validate mapping (run validate.ts)
4. Execute process (run execute.ts)
5. Verify output (run verify.ts)
```

### Conditional Workflows

For branching logic:

```markdown
1. Determine operation type:
   **Creating new?** → Follow "Creation workflow"
   **Editing existing?** → Follow "Editing workflow"

2. Creation workflow: [steps]
3. Editing workflow: [steps]
```

### Output Patterns

For specific output formats:

**Templates**:
```markdown
Use this template structure:

\`\`\`json
{
  "field1": "value",
  "field2": "value"
}
\`\`\`
```

**Examples**:
```markdown
## Example 1: Simple Case
Input: [example]
Output: [expected result]

## Example 2: Complex Case
Input: [example]
Output: [expected result]
```


### Naming Convention

Prefix ai-ley kit skills with `ailey-`:
- `ailey-admin-skill-creator`
- `ailey-indexer`
- `ailey-tester`

### Integration References

Reference personas when appropriate:
```markdown
This skill leverages:
- `.github/ai-ley/personas/ai/mcp-expert.md`
- `.github/ai-ley/personas/development/typescript-expert.md`
```

Reference instructions:
```markdown
Follows best practices from:
- `.github/ai-ley/instructions/development/typescript/**/*.md`
- `.github/ai-ley/instructions/vscode/**/*.md`
```

### TypeScript Standards

Follow ai-ley TypeScript conventions:
- Strict mode enabled
- Proper error handling
- JSDoc comments
- Export main function
- Standalone execution capability

## Resources

This skill references:
- [VS Code Skills Guide](../../../ai-ley/instructions/vscode/copilot-skills.md)
- [MCP Expert Persona](../../../ai-ley/personas/ai/mcp-expert.md)
- [TypeScript Instructions](../../../ai-ley/instructions/development/typescript/)

---

**Version**: 1.0.0  
**Created**: 2026-01-19

---
version: 1.1.0
updated: 2026-03-03
reviewed: 2026-03-03
score: 4.2
---