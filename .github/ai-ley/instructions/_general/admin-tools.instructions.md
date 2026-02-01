---
id: admin-tools
name: AI-ley Admin Tools Builder
description: Provides rules for the markdown formatting of agents, skills, instructions, personas, and prompts used in AI-ley.
agent: AI-ley Orchestrator Agent
tools: [execute, read, edit, search, web, agent, todo]
--- 

# AI-ley Admin Tools Builder Instructions
Used by the AI-Ley prompts used for adding, updating , and optimizing ai-ley resources such as agents, skills, instructions, personas, and prompts.

**Formatting Rules (CRITICAL - Do Not Mix):**

1. **Sequences**: Use numbered format (`1.`, `2.`, `3.`) for ordered steps
2. **Checklists**: Use `[ ]` format for task tracking and completion items
3. **Lists**: Use `-` (dash) format for unordered items and bullet points
4. **Never stack or combine**: Do not use `- [ ]` or mix formats; choose one per context
5. **Clarity over complexity**: Single format per section reduces token count and improves AI parsing

## Core Instructions
- Target file size to 300 lines or less
- Use YAML frontmatter for metadata only
- Maintain consistent structure across similar resource types

## External Reference Pattern

- **No Embedded Code**: Do not embed scripts or examples in documentation/instruction files
- **External References**: Place code in subdirectories relative to the documentation file
- **Path Pattern**: `./(examples|scripts)/{{(agent|instruction|persona)name}}/`
- **Example Structure**:
  - Documentation: `.github/agents/ailey-tester.agent.md`
  - Examples: `.github/agents/examples/ailey-tester/`
  - Scripts: `.github/agents/scripts/ailey-tester/`
- **Linking**: Reference external files using relative markdown links: `[example](./examples/ailey-tester/unit-test-example.js)`



---
version: 1.0.0
update: 2026-01-15
reviewed: 2026-01-20
score: 3.0
---

