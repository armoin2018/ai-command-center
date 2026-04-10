---
id: ailey-add-agent
name: addAgent
description: Creates a new AI-ley agent in .github/agents/ following established ai-ley agent conventions including YAML frontmatter, inheritance chain, role definition, phased workflow, and footer metadata.
keywords: [ai-ley, agent-creation, copilot-agent, orchestrator, custom-agent]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator
---

## Variables

- Folders, Files and Indexes are stored in `.github/ai-ley/ai-ley.json`
- Files and folders in this document will be referenced using the `folders`, `files`, and `indexes` variables defined in the folder structure YAML file using the mustache syntax such as `{{folders.plan}}`.

## References

**Personas:** Leverage domain expertise from `.github/ai-ley/personas/**/*.md`

**Instructions:** Follow best practices from `.github/ai-ley/instructions/**/*.md`

**Agents:** Existing agents in `.github/agents/*.agent.md`

## Recommended Personas

Consider leveraging these persona domains:

- `.github/ai-ley/personas/ai/**/*.md`
- `.github/ai-ley/personas/_general/**/*.md`

## Recommended Instructions

Consider referencing these instruction files:

- `.github/ai-ley/instructions/vscode/**/*.md`
- `.github/ai-ley/instructions/development/**/*.md`

## Recommended Agent

This prompt works best with the **ailey-orchestrator** agent from `.github/agents/ailey-orchestrator.agent.md`.

## Goal

**Given:**

- Agent name and domain focus
- Description of the agent's role and responsibilities
- Parent agent to extend (`ailey-base` or `ailey-orchestrator`)
- Core capabilities and expertise areas
- Relevant personas and instruction references

**Produce:**

- A new `.agent.md` file in `.github/agents/` that follows the established ai-ley agent conventions
- Consistent structure with existing agents (frontmatter, inheritance, sections, footer)
- Appropriate tool selection based on the agent's role

## Command

Create a new AI-ley agent file following the conventions established by existing agents in `.github/agents/`.

### Step 1: Gather Requirements

1. **Ask clarifying questions**:
   - What is the agent's domain focus and specialization?
   - What role and responsibilities should it have?
   - Should it extend `ailey-base.agent.md` (standard) or `ailey-orchestrator.agent.md` (complex multi-step)?
   - What tools does it need? (execute, read, edit, search, web, agent, todo)
   - Are there specific personas or instructions it should reference?

2. **Review existing agents** in `.github/agents/` for naming patterns and structural conventions.

### Step 2: Create Agent File

Create the file at `.github/agents/ailey-<name>.agent.md` following this structure:

#### YAML Frontmatter

```yaml
---
id: ailey-<name>
name: AI-ley <Display Name>
description: <Role summary — one line, used for agent picker and subagent discovery>
keywords: [<domain>, <specialty>, <related-terms>]
tools: [execute, read, edit, search, web, agent, todo]
---
```

- `id`: Lowercase with hyphens, matches filename without `.agent.md`
- `name`: Human-readable display name prefixed with "AI-ley "
- `description`: Concise role summary — this is the primary discovery surface for delegation
- `keywords`: Domain terms for indexing and search
- `tools`: Minimal set needed for the role; omit tools the agent should not use

#### Heading and Inheritance Block

```markdown
# AI-ley <Display Name> Agent

**Extends:** `ailey-base.agent.md`

This agent inherits all behaviors from the base agent including:

- Variable definitions and folder structure
- Core AI toolkit behaviors and standards
- Standard workflows and protocols

Specializes in <one-line specialization summary>.
```

Use `ailey-orchestrator.agent.md` as parent when the agent needs prompt optimization, smart chunking, or multi-pass execution.

#### Role & Responsibilities Section

```markdown
## Role & Responsibilities

<Role summary> specialist focused on:

- <Primary responsibility>
- <Secondary responsibility>
- <Additional responsibilities>
```

#### Approach Section

```markdown
## Approach

**Tone**: <Communication style — e.g., Strategic, Thorough, Collaborative>
**Depth**: <Analysis depth — e.g., Comprehensive, Surface-level, As-needed>
**Focus**: <Primary concern — e.g., Maintainability, Performance, Creativity>

### Core Capabilities

**<Category 1>**:

- <Capability>
- <Capability>

**<Category 2>**:

- <Capability>
- <Capability>
```

#### Phased Workflow

Define 3-4 numbered phases that describe how the agent operates:

```markdown
### Phase 1: <Analysis/Planning Phase>

- <Step>
- <Step>

### Phase 2: <Execution Phase>

- <Step>
- <Step>

### Phase 3: <Validation Phase>

- <Step>
- <Step>
```

#### Key Considerations (Optional)

Domain-specific principles, standards, or guidelines the agent should follow.

#### References Section

```markdown
## References

Use these resources from the AI-ley toolkit:

- `{{folders.personas}}/<domain>/<persona>.md`
- `{{folders.instructions}}/<category>/<instruction>.md`
```

#### Footer Metadata

```markdown
---

version: 1.0.0
updated: <YYYY-MM-DD>
reviewed: <YYYY-MM-DD>
score: 4.5
```

### Step 3: Validate

1. Verify frontmatter YAML syntax is valid
2. Confirm `id` matches filename (e.g., `ailey-foo` → `ailey-foo.agent.md`)
3. Confirm inheritance block references a valid parent agent
4. Verify tool list is appropriate for the role
5. Ensure description is keyword-rich for agent delegation discovery
6. Check that the file follows the same section ordering as existing agents

### Step 4: Register

Update the agent index if one exists at `.github/ai-ley/indexes/agents.index.json`.

---
version: 1.1.0
updated: 2026-04-03
reviewed: 2026-04-03
score: 4.5
---