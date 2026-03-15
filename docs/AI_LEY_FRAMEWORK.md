# AI-Ley Framework Guide

**Version 1.1.24** | A Comprehensive AI Kit Framework for VS Code Copilot

---

## Table of Contents

1. [Overview](#overview)
2. [Personas](#personas)
3. [Instructions](#instructions)
4. [Prompts](#prompts)
5. [Skills](#skills)
6. [Agents](#agents)
7. [Flows](#flows)
8. [Templates](#templates)
9. [Kit Catalogs](#kit-catalogs)
10. [Configuration](#configuration)

---

## Overview

AI-Ley is an AI kit framework designed for VS Code Copilot that provides a structured, modular approach to organizing and managing AI-powered development workflows. It defines a convention-based directory structure within `.github/` where teams can manage **personas**, **instructions**, **prompts**, **skills**, **agents**, **flows**, and **templates** — collectively known as *AI kits*.

### Why AI-Ley?

- **Consistency** — Enforces a standard structure across projects so AI agents behave predictably
- **Reusability** — Share kits across repositories via catalogs
- **Customization** — Override any resource with `.my/` personal overrides
- **Discovery** — Auto-indexing lets extensions and agents find resources automatically
- **Composability** — Combine personas, skills, and instructions into powerful agent configurations

### Directory Structure

```
.github/
├── ai-ley/
│   ├── personas/           # Role definitions with personality & expertise
│   ├── instructions/       # Behavioral rules and guidelines
│   │   ├── shared/         # Shared across all contexts
│   │   └── project/        # Project-specific instructions
│   ├── agents/             # Agent definitions with orchestration
│   ├── flows/              # Workflow automation chains
│   └── templates/          # Reusable code/document templates
├── prompts/                # Prompt templates (VS Code Copilot standard)
├── skills/                 # Skill definitions with capabilities
│   └── <skill-name>/
│       └── SKILL.md
└── aicc/
    ├── catalogs/           # Kit catalog sources
    └── indexes/            # Auto-generated resource indexes
```

### Core Concepts

| Concept       | Purpose                                      | Location                          |
|---------------|----------------------------------------------|-----------------------------------|
| **Persona**   | Define AI personality, tone, and expertise    | `.github/ai-ley/personas/`        |
| **Instruction** | Behavioral rules and constraints            | `.github/ai-ley/instructions/`    |
| **Prompt**    | Reusable prompt templates with variables      | `.github/prompts/`                |
| **Skill**     | Domain-specific capability with tools         | `.github/skills/*/SKILL.md`       |
| **Agent**     | Orchestrated AI role combining above          | `.github/ai-ley/agents/`          |
| **Flow**      | Multi-step workflow automation                | `.github/ai-ley/flows/`           |
| **Template**  | Reusable code/doc scaffolds                   | `.github/ai-ley/templates/`       |

---

## Personas

Personas define the personality, tone, expertise, and behavioral characteristics of an AI agent. They answer the question: *"Who is the AI acting as?"*

### Location

```
.github/ai-ley/personas/
├── technical-writer/
│   └── documentation-specialist.md
├── developer/
│   ├── api-developer.md
│   └── fullstack-developer.md
└── architect/
    └── solution-architect.md
```

### Format

Persona files use YAML frontmatter followed by Markdown content:

```markdown
---
name: Documentation Specialist
id: technical-writer-docs
category: technical-writer
tone: Clear, professional, accessible
expertise:
  - Technical documentation
  - API documentation
  - User guides
  - Code commenting
version: 1.0.0
---

# Documentation Specialist

You are a documentation specialist focused on creating clear,
comprehensive technical documentation...

## Responsibilities
- Write inline code comments and docstrings
- Create API documentation with examples
- Maintain architecture documentation

## Communication Style
- Use plain language over jargon
- Provide concrete examples
- Structure content with clear headings
```

### Activation

Personas are activated in several ways:

1. **Agent reference** — An agent definition specifies which persona to use
2. **Mode selection** — VS Code Copilot mode instructions reference a persona
3. **Direct reference** — A prompt or instruction file references a persona path

### Frontmatter Properties

| Property    | Type       | Required | Description                      |
|-------------|------------|----------|----------------------------------|
| `name`      | `string`   | Yes      | Display name                     |
| `id`        | `string`   | Yes      | Unique identifier                |
| `category`  | `string`   | Yes      | Grouping category                |
| `tone`      | `string`   | No       | Communication tone description   |
| `expertise` | `string[]` | No       | Areas of expertise               |
| `version`   | `string`   | No       | Semantic version                 |

---

## Instructions

Instructions define behavioral rules, constraints, and guidelines that shape how AI agents operate. They answer: *"How should the AI behave?"*

### Location

```
.github/ai-ley/instructions/
├── shared/
│   └── global-instructions.md      # Applied to all contexts
├── project/
│   └── coding-standards.md         # Project-specific rules
└── best-practices/
    └── code-commenting.md          # Best practice guides
```

### Shared vs. Project Instructions

- **Shared** (`shared/`) — Universal rules applied across all projects. Typically installed via kit catalogs.
- **Project** (`project/`) — Rules specific to the current repository (coding conventions, architecture decisions).

### `.my/` Overrides

Any instruction file can be overridden locally by placing a file with the same relative path under `.my/`:

```
.github/ai-ley/instructions/shared/global-instructions.md    # Kit default
.my/ai-ley/instructions/shared/global-instructions.md        # Personal override
```

The `.my/` version takes precedence. This allows developers to customize behavior without modifying shared kit files.

### Format

```markdown
---
name: Global Instructions
id: global-instructions
scope: shared
priority: 100
version: 1.0.0
---

# Global Instructions

## General Guidelines

- Follow the project's established coding conventions
- Write self-documenting code with clear variable names
- Add comments explaining "why" not "what"
- Keep functions focused and single-purpose

## Error Handling

- Always handle errors explicitly
- Log errors with sufficient context for debugging
- Use typed error classes where available
```

### Priority System

Instructions are merged by priority (higher number = higher precedence):

| Priority Range | Use Case                     |
|----------------|------------------------------|
| 0–49           | Default kit instructions      |
| 50–99          | Project-level instructions    |
| 100–149        | Team-level overrides          |
| 150+           | Personal `.my/` overrides     |

---

## Prompts

Prompts are reusable templates that can be invoked from the VS Code command palette or referenced by agents. They follow the VS Code Copilot prompt file standard.

### Location

```
.github/prompts/
├── ailey-build-scaffold.prompt.md
├── ailey-code-review.prompt.md
├── ailey-document-api.prompt.md
└── ailey-plan-task.prompt.md
```

### Format

Prompt files use YAML frontmatter with a `mode` and optional `tools`:

```markdown
---
mode: agent
tools:
  - name: read_file
  - name: replace_string_in_file
  - name: run_in_terminal
description: Scaffold a new feature module with tests
---

# Scaffold Feature Module

Create a new feature module with the following structure:

1. Source file at `src/features/{{featureName}}.ts`
2. Test file at `src/test/{{featureName}}.test.ts`
3. Export from `src/features/index.ts`

## Requirements

- Use TypeScript strict mode
- Include JSDoc comments on all exports
- Follow existing project patterns
```

### Variables

Prompts support template variables using `{{variableName}}` syntax:

| Variable            | Source                              |
|---------------------|-------------------------------------|
| `{{featureName}}`   | User input at invocation            |
| `{{folders.docs}}`  | Resolved from kit configuration     |
| `{{folders.wiki}}`  | Resolved from kit configuration     |
| `{{folders.api}}`   | Resolved from kit configuration     |

### Using Prompts

1. **Command Palette** — `Cmd+Shift+P` → type the prompt name
2. **Copilot Chat** — Reference with `#prompt:filename`
3. **Agent orchestration** — Agents can invoke prompts programmatically

---

## Skills

Skills are domain-specific capability modules that provide specialized knowledge and tools. Each skill is self-contained with its own documentation, scripts, and configuration.

### Location

```
.github/skills/
├── ailey-tools-audio/
│   └── SKILL.md
├── ailey-tools-video/
│   └── SKILL.md
├── ailey-com-slack/
│   └── SKILL.md
└── ailey-atl-jira/
    └── SKILL.md
```

### Discovery

Skills are auto-discovered by scanning for `SKILL.md` files matching the pattern `.github/skills/*/SKILL.md`. The AI Command Center extension indexes all discovered skills and makes them available to agents.

### SKILL.md Format

```markdown
---
name: Slack Integration Manager
id: ailey-com-slack
category: communication
version: 1.0.0
capabilities:
  - Send messages
  - Manage channels
  - Handle webhooks
  - OAuth authentication
requires:
  - SLACK_BOT_TOKEN
  - SLACK_SIGNING_SECRET
---

# Slack Integration Manager

Comprehensive Slack integration with workspace tier detection,
OAuth authentication, channel management...

## Setup

1. Create a Slack App at https://api.slack.com/apps
2. Configure bot token scopes
3. Set environment variables

## Operations

### Send Message
\`\`\`typescript
await slack.chat.postMessage({
  channel: '#general',
  text: 'Hello from AI-Ley!'
});
\`\`\`

### Manage Channels
...
```

### Frontmatter Properties

| Property       | Type       | Required | Description                         |
|----------------|------------|----------|-------------------------------------|
| `name`         | `string`   | Yes      | Human-readable skill name           |
| `id`           | `string`   | Yes      | Unique identifier                   |
| `category`     | `string`   | Yes      | Grouping (tools, com, data, etc.)   |
| `version`      | `string`   | No       | Semantic version                    |
| `capabilities` | `string[]` | No       | List of what the skill can do       |
| `requires`     | `string[]` | No       | Required env vars or dependencies   |

### Skill Categories

| Prefix          | Domain                  | Examples                    |
|-----------------|-------------------------|-----------------------------|
| `ailey-tools-`  | Utility tools           | audio, video, image, data   |
| `ailey-com-`    | Communication platforms | slack, teams, email, zoom   |
| `ailey-soc-`    | Social media            | twitter, instagram, youtube |
| `ailey-data-`   | Data platforms          | kafka, databases            |
| `ailey-media-`  | Content creation        | canva, capcut, gamma        |
| `ailey-shop-`   | E-commerce              | woocommerce, shopify        |
| `ailey-atl-`    | Atlassian               | jira, confluence            |
| `ailey-admin-`  | Admin/management        | catalog, plan, index        |

---

## Agents

Agents are orchestrated AI roles that combine personas, instructions, skills, and prompts into a coherent, task-specific configuration. They answer: *"What can this AI do end-to-end?"*

### Location

```
.github/ai-ley/agents/
├── ailey-base.agent.md
├── ailey-developer.agent.md
├── ailey-documentation.agent.md
├── ailey-reviewer.agent.md
└── ailey-architect.agent.md
```

### Format

```markdown
---
name: Documentation Agent
id: ailey-documentation
extends: ailey-base
persona: technical-writer/documentation-specialist
instructions:
  - shared/global-instructions
  - best-practices/code-commenting
skills:
  - ailey-tools-model
  - ailey-admin-manage-plan
version: 1.0.0
---

# Documentation Agent

Specializes in creating comprehensive technical documentation.

## Role & Responsibilities

- Inline code comments and docstrings
- API documentation with examples
- Technical writing (architecture, user guides)
- Knowledge transfer and collaboration

## Approach

**Tone**: Clear, professional, and accessible
**Depth**: Comprehensive with detailed explanations
```

### Agent Inheritance

Agents support an `extends` property for inheritance:

```yaml
extends: ailey-base    # Inherits from ailey-base.agent.md
```

The base agent provides common behaviors (variable definitions, folder structure, core toolkit). Specialized agents extend it with domain-specific capabilities.

### Agent Detection

The extension's `AgentDetector` class monitors active agents and provides:

- **Polling** — Checks agent status at configurable intervals
- **Change events** — Fires callbacks when agent availability changes
- **Extension watching** — Monitors GitHub Copilot Chat and other agent extensions

---

## Flows

Flows define multi-step workflow automation chains. They orchestrate a sequence of operations that may span multiple agents, skills, or tools.

### Location

```
.github/ai-ley/flows/
├── code-review-flow.md
├── release-flow.md
└── documentation-flow.md
```

### Format

Flow files use YAML frontmatter with `triggers` (manual, on-pr-merge, etc.) and `steps` arrays. Each step specifies an `agent`, `action`, optional `input`/`output` references for data piping between steps, and an optional `condition` for conditional execution.

Example: a documentation flow might chain `analyze-codebase → generate-docs → review-docs` across the documentation and reviewer agents.

---

## Templates

Templates are reusable scaffolds for code, documentation, or configuration files. They accelerate project setup and enforce consistency.

### Location

```
.github/ai-ley/templates/
├── feature-module/
│   ├── template.yaml
│   ├── src/
│   │   └── {{name}}.ts.tmpl
│   └── test/
│       └── {{name}}.test.ts.tmpl
├── api-endpoint/
│   └── template.yaml
└── documentation/
    └── template.yaml
```

### Template Definition

Each template directory contains a `template.yaml` with `name`, `id`, `description`, `variables` (with `name`, `prompt`, `required`, `default`), and `files` (mapping `source` templates to `target` output paths). Templates support `{{variable}}` interpolation — variables are prompted at invocation time.

Use templates via: `Cmd+Shift+P` → `AICC: Use Template` → Select template → Fill variables.

---

## Kit Catalogs

Kit catalogs are repositories that package and distribute AI-Ley resources. They allow teams to share and reuse personas, instructions, skills, and other resources across projects.

### Installing a Kit

```
Cmd+Shift+P → "AICC: Install AI Kit"
```

Or use the AI Kit Catalog tab in the secondary panel to browse, search, and install kits.

### Catalog Structure

A kit catalog repository contains a `catalog.json` manifest alongside resource directories (`personas/`, `instructions/`, `prompts/`, `skills/`, `agents/`). The manifest declares which glob patterns map to each resource type.

### Kit Management

| Operation    | Description                                    |
|--------------|------------------------------------------------|
| **Install**  | Clone kit resources into `.github/`            |
| **Update**   | Pull latest changes from the source repo       |
| **Uninstall**| Remove kit files with surgical tracking        |
| **List**     | Show installed kits and their status            |

### File Tracking

Installed kit files are tracked in `.github/aicc/catalogs/installed.json`, enabling clean uninstallation without affecting user-created files.

---

## Configuration

### Extension Settings

AI-Ley framework behavior is controlled through VS Code settings (`settings.json`):

```json
{
  "aicc.advancedMode": false,
  "aicc.logLevel": "info",
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "stdio",
  "aicc.mcp.port": 3000,
  "aicc.mcp.host": "localhost"
}
```

### Key Settings

| Setting              | Type      | Default   | Description                         |
|----------------------|-----------|-----------|-------------------------------------|
| `aicc.advancedMode`  | `boolean` | `false`   | Enable sidebar tree + editor panel  |
| `aicc.logLevel`      | `string`  | `"info"`  | Log level (debug, info, warn, error)|
| `aicc.mcp.enabled`   | `boolean` | `true`    | Enable MCP server                   |
| `aicc.mcp.transport` | `string`  | `"stdio"` | Transport (stdio, http, https, ws)  |
| `aicc.mcp.port`      | `number`  | `3000`    | HTTP/WS server port                 |
| `aicc.mcp.host`      | `string`  | `"localhost"` | Server bind address            |

### `.my/` Personal Overrides

The `.my/` directory at workspace root provides personal overrides that are gitignored, override same-path files from kits or shared instructions, and allow individual developers to customize AI behavior without modifying shared files. Place overrides at the same relative path under `.my/` (see [Instructions](#instructions) for details).

### Environment Variables

Skills and integrations may require environment variables. Store them in a `.env` file at workspace root or configure via your shell profile:

```bash
# .env (gitignored)
SLACK_BOT_TOKEN=xoxb-...
JIRA_API_TOKEN=...
OPENAI_API_KEY=sk-...
```

### Instruction Sources

The Version Override System manages instruction sources with priority-based merging. View and manage sources via the status bar (`$(file-code) N instructions`). Sources are configured in `.project/config/instruction-sources.json` with `id`, `name`, `type`, `location`, `priority`, and `enabled` fields.
```

---

## Quick Reference

### File Extensions

| Extension          | Purpose              |
|--------------------|----------------------|
| `.md`              | Personas, instructions, skills |
| `.prompt.md`       | Prompt templates     |
| `.agent.md`        | Agent definitions    |
| `SKILL.md`         | Skill entry point    |
| `template.yaml`    | Template definitions |
| `catalog.json`     | Kit catalog manifest |

### Common Commands

| Command                         | Description                    |
|---------------------------------|--------------------------------|
| `AICC: Install AI Kit`          | Install a kit from catalog     |
| `AICC: Use Template`            | Scaffold from a template       |
| `AICC: Initialize Plan`         | Create a new PLAN.json         |
| `AICC: Show Instruction Sources`| Manage active instructions     |
| `AICC: Refresh Instructions`    | Reload all instruction sources |

---

*For more information, see the [User Guide](USER_GUIDE.md) and [What's New](WHATS_NEW.md).*
