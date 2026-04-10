---
id: ailey-build-plan
name: Plan
description: Generate a comprehensive project plan from requirements, outputting Epic-Story-Task items into .project/PLAN.json conforming to plan.v1.schema.json.
keywords: [planning, epic, story, task, jira, project-management, prompt, ailey]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator
---

## Goal

Convert requirements from `.project/REQUIREMENTS.md` into a comprehensive, actionable project plan stored in `.project/PLAN.json` using the Epic → Story → Task hierarchy defined by `.github/aicc/schemas/plan.v1.schema.json`.

All variable resolution, persona selection, instruction loading, and path resolution are handled by the **AI-ley Orchestrator** and **AI-ley Base** agents — do not duplicate that logic here.

---

## Prerequisites

Before generating the plan, check for existing design and architecture artifacts:

1. `.project/plan/architecture/design.md`
2. `.project/plan/architecture/architecture.md`
3. `.project/plan/architecture/adrs/`

**If missing**, ask the user:

```
⚠️  Design and architecture artifacts not found.

Would you like to generate them first?
- Run /build-design to create the design document
- Run /build-architecture to create the architecture document

Continue with planning anyway? (y/n)
```

**If present**, load and integrate design components (D-###), architecture components (A-###), interface contracts (I-###), and ADRs into epic/story/task decomposition.

---

## Inputs

Load and analyze:

| Source | Purpose |
|--------|---------|
| `.project/REQUIREMENTS.md` | Primary requirements input |
| `.project/SUGGESTIONS.md` | Enhancement suggestions to integrate |
| `.project/ASK.md` | New feature requests to incorporate |
| `.project/BUGS.md` | Known issues to include as bug items |
| Design/architecture docs (if present) | Technical context and component mapping |

Integrate items from SUGGESTIONS, ASK, and BUGS into the requirements before decomposition.

---

## Plan Schema

All output conforms to `.github/aicc/schemas/plan.v1.schema.json`.

### PLAN.json Structure

```json
{
  "$schema": ".github/aicc/schemas/plan.v1.schema.json",
  "version": "1.0.0",
  "generatedAt": "ISO-8601",
  "source": ".project",
  "metadata": {
    "projectName": "",
    "projectCode": "AICC",
    "currentSprint": "Sprint 1",
    "currentMilestone": "",
    "defaultAssignee": "",
    "defaultAgent": "",
    "createdBy": "",
    "updatedBy": ""
  },
  "statusCounts": { "BACKLOG": 0, "READY": 0, "IN-PROGRESS": 0, "BLOCKED": 0, "REVIEW": 0, "DONE": 0, "SKIP": 0 },
  "items": []
}
```

### PlanItem Properties

Each item in the `items` array must include:

| Property | Required | Description |
|----------|----------|-------------|
| `id` | ✅ | Pattern: `PROJ-NNNN` (e.g., `AICC-0001`) |
| `type` | ✅ | `epic`, `story`, `task`, or `bug` |
| `summary` | ✅ | Brief title |
| `description` | | Detailed markdown description |
| `status` | ✅ | `BACKLOG`, `READY`, `IN-PROGRESS`, `BLOCKED`, `REVIEW`, `DONE`, `SKIP` |
| `priority` | | `critical`, `high`, `medium`, `low` |
| `parentId` | | Parent item ID (stories → epic, tasks → story) |
| `children` | | Array of child item IDs |
| `storyPoints` | | Fibonacci: 1, 2, 3, 5, 8, 13, 21 |
| `sprint` | | Sprint identifier |
| `milestone` | | Milestone identifier |
| `assignee` | | Person assigned |
| `agent` | | AI agent assigned |
| `estimatedHours` | | Estimated effort |
| `acceptanceCriteria` | | Completion criteria |
| `tags` | | Keyword tags array |
| `instructions` | | Instruction file references |
| `personas` | | Persona references |
| `contexts` | | File/folder paths for context |
| `links` | | URLs or file path references |
| `linkedRelationships` | | `{ type, itemId }` — types: `blocks`, `blocked-by`, `relates-to`, `duplicates`, `depends-on` |
| `gitRepoUrl` | | Repository URL |
| `gitRepoBranch` | | Branch name |
| `comments` | | `{ createdOn, createdBy, comment, enabled }` |
| `metadata` | ✅ | `{ createdAt, updatedAt, createdBy, updatedBy }` |

---

## Decomposition Process

### Step 1: Requirements Analysis

- Parse all functional requirements (REQ-XXX) and non-functional requirements (NFR-XXX)
- Extract user stories, acceptance criteria, dependencies, and constraints
- If design/architecture docs exist, map design components (D-###) and architecture components (A-###) to requirements

### Step 2: Epic Decomposition

Group related requirements into epics:

- Each epic delivers standalone business value
- Target 15–40 story points per epic
- Define epic-level acceptance criteria and success metrics
- Establish epic sequencing and dependencies via `linkedRelationships`
- Set `type: "epic"`, no `parentId`

### Step 3: Story Decomposition

Break each epic into user stories:

- Follow "As a [user], I want [goal], so that [benefit]" in `description`
- Target 3–8 story points per story (completable in one sprint)
- Set `parentId` to the owning epic's ID and add story ID to epic's `children`
- Assign `acceptanceCriteria`, `sprint`, `priority`, and relevant `tags`

### Step 4: Task Decomposition

Break each story into actionable tasks:

- Target 1–4 hours per task
- Set `parentId` to the owning story's ID and add task ID to story's `children`
- Include specific `acceptanceCriteria` and `estimatedHours`
- Reference relevant `instructions` and `contexts` for implementation guidance

### Step 5: Bug Items

For each known issue from `.project/BUGS.md`:

- Create items with `type: "bug"`
- Assign to the most relevant parent story or epic via `parentId`
- Set appropriate `priority` based on severity

### Step 6: Dependency Mapping

Wire all cross-item dependencies using `linkedRelationships`:

- `depends-on` — must complete before this item starts
- `blocks` / `blocked-by` — bidirectional blocking
- `relates-to` — informational association

### Step 7: Validation

Before writing `PLAN.json`:

- [ ] Every requirement from `.project/REQUIREMENTS.md` is addressed by at least one item
- [ ] All `parentId` / `children` references are consistent and bidirectional
- [ ] `statusCounts` accurately reflect the items array
- [ ] No orphaned tasks (every task has a story parent, every story has an epic parent)
- [ ] Sprint assignments are sequenced logically with dependencies
- [ ] `id` values are unique and follow the `PROJ-NNNN` pattern
- [ ] Schema validates against `.github/aicc/schemas/plan.v1.schema.json`

---

## Supporting Artifacts

After generating `PLAN.json`, create or update these files in `.project/plan/`:

| Artifact | Path | Purpose |
|----------|------|---------|
| Gantt chart | `.project/plan/planning/gantt-chart.puml` | PlantUML timeline with dependencies and milestones |
| Jira import | `.project/plan/planning/jira-import.csv` | CSV for Jira bulk import (Summary, Issue Type, Priority, Description, Epic Link, Story Points, Sprint, Dependencies) |
| Resource allocation | `.project/plan/planning/resource-allocation.md` | Team structure, persona assignments, sprint capacity |
| Business case | `.project/plan/business/business-case.md` | Executive summary, problem statement, ROI, risk assessment |

---

## Next Steps

After plan generation, suggest:

- Run `/build-design` if design artifacts are missing
- Run `/build-architecture` if architecture artifacts are missing
- Run `/scaffold` to generate project scaffold from the plan
- Use the `ailey-atl-jira` skill to sync `PLAN.json` with Jira

---

version: 2.0.0
updated: 2026-02-20
reviewed: 2026-02-20
score: 4.5
