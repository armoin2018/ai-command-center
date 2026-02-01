---
id: ailey-add-skill
name: addSkill
description: Creates a new AI-ley skill in the .github/skills/ directory following ai-ley kit standards and best practices
keywords: [ai-ley, skill-creation, copilot-skill, typescript, mcp, documentation]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator
---
## Variables

- Folders, Files and Indexes are stored in `.github/ai-ley/ai-ley.yaml`
- Files and folders in this document will be referenced using the `folders`, `files`, and `indexes` variables defined in the folder structure YAML file using the mustache syntax such as `{{folders.plan}}`.

## References

**Personas:** Leverage domain expertise from `.github/ai-ley/personas/**/*.md`

**Instructions:** Follow best practices from `.github/ai-ley/instructions/**/*.md`

**Agents:** This prompt is designed for the agent system. See the Recommended Agent section below.

## Recommended Personas

Consider leveraging these persona domains:

- `.github/ai-ley/personas/development/typescript-expert.md`
- `.github/ai-ley/personas/ai/mcp-expert.md`
- `.github/ai-ley/personas/_general/**/*.md`

These personas provide specialized expertise and perspective.

## Recommended Instructions

Consider referencing these instruction files:

- `.github/ai-ley/instructions/vscode/copilot-skills.md`
- `.github/ai-ley/instructions/development/typescript/**/*.md`

These provide domain-specific guidance and best practices.

## Recommended Skills

Use the ailey-admin-skill-creator skill:

- `.github/skills/ailey-admin-skill-creator/SKILL.md`

This skill provides structured guidance for creating effective skills.

## Recommended Agent

This prompt works best with the **ailey-orchestrator** agent from `.github/agents/ailey-orchestrator.agent.md`.

To use this agent, reference it in your chat or workflow configuration.

## Goal

**Given:**

- Skill name and purpose
- Target functionality description
- Expected use cases and triggers
- Required resources (scripts, references, assets)

**Produce:**

- Complete skill directory structure in `.github/skills/`
- SKILL.md with proper frontmatter and body
- TypeScript scripts (if needed) that can run independently
- MCP server configuration (if external resources needed)
- Reference documentation (if needed)
- Validation that skill meets ai-ley standards

## Command

Create a new VS Code Copilot skill following ai-ley kit standards and best practices.


### Step 1: Understand Requirements

Gather concrete examples of skill usage:

1. **Ask clarifying questions**:
   - What functionality should this skill provide?
   - Can you give examples of how it will be used?
   - What should trigger this skill?
   - What file types, tasks, or scenarios should activate it?

2. **Identify resources needed**:
   - Scripts: Repetitive code or deterministic operations?
   - References: Documentation, schemas, workflows?
   - Assets: Templates, boilerplate, files for output?

3. **Determine MCP needs**:
   - External database access?
   - API integrations?
   - File system operations beyond workspace?

### Step 2: Initialize Skill Structure

Run the skill initializer:

```bash
cd .github/skills
node ../skills/ailey-admin-skill-creator/scripts/init-skill.ts <skill-name> --path .github/skills
```

This creates:
- Skill directory structure
- SKILL.md template
- Example scripts, references, assets
- package.json and tsconfig.json


#### Scripts

For each required script:

1. **Design TypeScript implementation**:
   - Use ai-ley TypeScript standards
   - Support standalone execution
   - Include proper error handling
   - Export main function

2. **Create script file**:
   ```typescript
   #!/usr/bin/env node
   /**
    * Script description
    */
   
   async function main() {
     // Implementation
   }
   
   if (require.main === module) {
     main().catch(console.error);
   }
   
   export { main };
   ```

3. **Test independently**:
   ```bash
   node scripts/script-name.ts
   ```

#### References

For documentation and reference material:

1. **Create reference files** in `references/` directory
2. **Include table of contents** for files >100 lines
3. **Avoid duplication** with SKILL.md content

#### Assets

For templates and output files:

1. **Add asset files** to `assets/` directory
2. **Organize by type** (templates, images, fonts, etc.)
3. **Document usage** in SKILL.md


#### Frontmatter

```yaml
---
name: skill-name
description: What the skill does AND when to use it. Include specific triggers like file types, tasks, or scenarios.
---
```

**Critical**: Description is the primary triggering mechanism.

#### Body

Choose appropriate structure:

- **Workflow-Based**: Sequential processes
- **Task-Based**: Tool collections
- **Reference/Guidelines**: Standards and specifications
- **Capabilities-Based**: Integrated systems

Include:
- Overview (what skill enables)
- When to use (specific scenarios)
- Quick start (basic example)
- Workflows (step-by-step procedures)
- Resources (references to scripts, references, assets)

**Guidelines**:
- Use imperative form
- Be concise (keep under 500 lines)
- Include concrete examples
- Reference bundled resources with relative paths

### Step 5: Create MCP Server (Optional)

If skill needs external resource access:

1. **Implement MCP server**:
   ```typescript
   // scripts/server.ts
   import { Server } from '@modelcontextprotocol/sdk/server/index.js';
   // ... MCP implementation
   ```

2. **Create standalone version**:
   ```typescript
   // scripts/standalone.ts
   // Same functionality without MCP wrapper
   ```

3. **Add MCP configuration**:
   ```json
   {
     "mcpServers": {
       "skill-name": {
         "command": "node",
         "args": [".github/skills/skill-name/scripts/server.ts"]
       }
     }
   }
   ```

### Step 6: Validate Skill

Run validation:

```bash
node .github/skills/ailey-admin-skill-creator/scripts/validate-skill.ts .github/skills/skill-name
```

**Check**:
- Valid YAML frontmatter
- Name format (lowercase, hyphens, max 64 chars)
- Description completeness (includes what AND when)
- Body uses imperative form
- Scripts are executable and standalone
- TypeScript scripts have proper types
- No extraneous documentation files

### Step 7: Test Skill

1. **Enable skills in VS Code**:
   - Set `chat.useAgentSkills` to `true`
   - Reload VS Code

2. **Test with prompts**:
   - Create prompts that should trigger skill
   - Verify skill loads correctly
   - Test all workflows in SKILL.md

3. **Test scripts independently**:
   ```bash
   node .github/skills/skill-name/scripts/script.ts
   ```

4. **Verify MCP server** (if present):
   ```bash
   node .github/skills/skill-name/scripts/server.ts
   ```

### Step 8: Update Indexes

After creating skill, reindex:

```bash
node .github/skills/ailey-indexer/scripts/reindex-all.ts --type skills
```

This updates `.github/ai-ley/indexes/skills.index.md` for resource discovery.


### Example 1: Simple Instruction-Only Skill

**Request**: "Create a skill for following Python PEP 8 style guidelines"

**Implementation**:
- No scripts needed (instruction-only)
- SKILL.md contains guidelines and examples
- Reference to PEP 8 documentation
- Triggers on Python file editing

### Example 2: Script-Based Skill

**Request**: "Create a skill for generating test files from source code"

**Implementation**:
- Scripts: `generate-tests.ts`
- References: Test patterns documentation
- SKILL.md: Workflows for different test types
- Triggers on test generation requests

### Example 3: MCP-Enabled Skill

**Request**: "Create a skill for querying project database"

**Implementation**:
- Scripts: `server.ts` (MCP), `standalone.ts`
- References: Database schema documentation
- MCP configuration for database access
- SKILL.md: Query patterns and examples

## Validation Checklist

Before completing:

- [ ] SKILL.md has valid YAML frontmatter
- [ ] Name is lowercase, hyphenated, max 64 chars
- [ ] Description includes WHAT and WHEN (max 1024 chars)
- [ ] Body uses imperative/infinitive form
- [ ] Scripts (if any) are TypeScript and executable standalone
- [ ] MCP server (if any) implements required interfaces
- [ ] References are linked from SKILL.md
- [ ] No extraneous documentation (README, etc.)
- [ ] Skill triggers on appropriate prompts
- [ ] Validation passes
- [ ] Indexes updated

## Notes

- Follow `.github/ai-ley/instructions/vscode/copilot-skills.md` for detailed guidance
- Use ailey-admin-skill-creator skill for structured workflow
- Prefix skill names with `ailey-` for ai-ley kit skills
- Keep SKILL.md under 500 lines using progressive disclosure
- Test thoroughly before committing

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-19
score: 4.3
---