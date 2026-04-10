# Specification-Driven Development with GitHub Spec Kit

## A 1-Hour Working Session

**Duration:** 60 minutes
**Format:** Presentation + Live Demos + Hands-On Exercises
**Audience:** Developers, Product Managers, Architects, Technical Leads
**Prerequisites:** Python 3.11+, uv package manager, Git, AI coding agent (Copilot, Claude Code, Gemini CLI, etc.)

---

## Agenda

| Time | Section | Format |
|------|---------|--------|
| 0:00–0:08 | 1. The Power Inversion — Why Spec-Driven Development | Presentation |
| 0:08–0:18 | 2. Spec Kit Anatomy — The 6-Step Process | Presentation + Demo |
| 0:18–0:30 | 3. Live Demo — From Idea to Specification | Live Coding |
| 0:30–0:42 | 4. Live Demo — From Specification to Implementation Plan | Live Coding |
| 0:42–0:52 | 5. Hands-On Exercise — Build Your Own Spec | Guided Exercise |
| 0:52–0:58 | 6. The Constitution & Advanced Patterns | Presentation |
| 0:58–1:00 | 7. Wrap-Up & Resources | Q&A |

---

# Section 1: The Power Inversion — Why Spec-Driven Development (8 min)

## The Traditional Problem

For decades, code has been king. Specifications were scaffolding — built and discarded once the "real work" of coding began.

**What goes wrong:**
- PRDs written to guide development, then never updated — code becomes the only source of truth
- Architecture decisions made in meetings with no traceable record
- Intent drifts from implementation as code evolves independently
- Context lost between stakeholders, architects, and developers
- Pivots require manually propagating changes through docs, design, and code

**The cost:**
- 56% of software defects originate in **requirements** (IBM Systems Sciences Institute)
- Fixing a requirements defect in production costs **100x** more than catching it during specification
- Teams spend 20–40% of development time on rework caused by ambiguous specs

## The SDD Inversion

Spec-Driven Development flips the relationship: **specifications don't serve code — code serves specifications.**

```
Traditional:
  Idea → PRD (discarded) → Code (source of truth)

Spec-Driven:
  Idea → Specification (source of truth) → Implementation Plan → Generated Code
              ↑                                                        │
              └────────── Feedback Loop ───────────────────────────────┘
```

**Key insight:** The PRD isn't a guide for implementation — it's the source that *generates* implementation. Technical plans aren't documents that inform coding — they're precise definitions that *produce* code.

## Why Now?

Three converging trends:

1. **AI capability threshold** — Natural language specifications can now reliably generate working code
2. **Exponential complexity** — Modern systems integrate dozens of services; manual alignment is failing
3. **Pace of change** — Pivots are expected, not exceptional. SDD transforms requirement changes from obstacles into normal workflow

---

# Section 2: Spec Kit Anatomy — The 6-Step Process (10 min)

## What is Spec Kit?

An open-source toolkit from GitHub that operationalizes Spec-Driven Development through a structured 6-step process with AI coding agents.

**Repository:** github.com/github/spec-kit

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Step 1-2   │───▶│   Step 3-4   │───▶│   Step 5-6   │
│  Install &   │    │  Specify &   │    │  Plan &      │
│ Constitution │    │   Clarify    │    │  Implement   │
└──────────────┘    └──────────────┘    └──────────────┘
     Setup              Define             Execute
```

## Installation

Spec Kit uses `uv` (Python package manager) and provides a CLI called `specify`:

```bash
# Create a new project
uvx --from git+https://github.com/github/spec-kit.git specify init my-project

# Initialize in current directory
uvx --from git+https://github.com/github/spec-kit.git specify init .

# Specify your AI agent
uvx --from git+https://github.com/github/spec-kit.git specify init my-project --ai copilot
```

**Supported AI agents:** Claude Code, GitHub Copilot, Codebuddy CLI, Gemini CLI, Pi Coding Agent

## The 6 Steps at a Glance

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `specify init` | Install CLI, scaffold project structure |
| 2 | `/speckit.constitution` | Define immutable architectural principles |
| 3 | `/speckit.specify` | Describe WHAT you want to build (not HOW) |
| 4 | `/speckit.clarify` | Resolve ambiguities iteratively |
| 5 | `/speckit.plan` | Provide tech stack, generate implementation plan |
| 6 | `/speckit.tasks` + `/speckit.implement` | Break down into tasks and execute |

## Project Structure After Init

```
my-project/
├── .specify/
│   ├── memory/
│   │   └── constitution.md         # Architectural principles
│   ├── scripts/
│   │   ├── *.sh                    # Bash automation
│   │   └── *.ps1                   # PowerShell automation
│   └── templates/
│       ├── feature-spec.md         # Specification template
│       └── implementation-plan.md  # Plan template
├── specs/                          # Your feature specs live here
│   └── 001-feature-name/
│       ├── spec.md                 # Feature specification
│       ├── plan.md                 # Implementation plan
│       ├── tasks.md                # Task breakdown
│       ├── data-model.md           # Data schemas
│       ├── research.md             # Technical research
│       └── contracts/              # API contracts
└── .github/prompts/                # Slash commands (Copilot)
    └── speckit.*.md
```

## Context Awareness

Spec Kit automatically detects the active feature based on your **current Git branch**:

```bash
git checkout -b 001-photo-albums    # Spec Kit knows you're working on feature 001
git checkout -b 002-user-auth       # Switch features by switching branches
```

No manual configuration needed — branch name IS the feature context.

---

# Section 3: Live Demo — From Idea to Specification (12 min)

## Demo Scenario: "Taskify" — A Team Productivity Platform

We'll build a Kanban-style task management app step by step using Spec Kit.

### Step 1: Initialize the Project

```bash
# Create the project
uvx --from git+https://github.com/github/spec-kit.git specify init taskify --ai copilot

cd taskify

# Verify installation
specify check
```

**What you get:** Slash commands installed, templates ready, scripts scaffolded.

### Step 2: Define the Constitution

In your AI agent's chat:

```
/speckit.constitution Taskify is a "Security-First" application. All user inputs 
must be validated. We use a microservices architecture. Code must be fully 
documented. We follow Test-Driven Development strictly.
```

**What happens:** Creates `.specify/memory/constitution.md` — the immutable architectural DNA that governs all generated code.

### Step 3: Create the Specification

Focus on the **what** and **why**, not the tech stack:

```
/speckit.specify Develop Taskify, a team productivity platform. It should allow 
users to create projects, add team members, assign tasks, comment and move tasks 
between boards in Kanban style. In this initial phase, let's have multiple users 
but predefined — five users in two categories: one product manager and four 
engineers. Three sample projects. Standard Kanban columns: "To Do," "In Progress," 
"In Review," and "Done." No login for this initial phase.
```

**What happens:**
- Automatic feature numbering (001, 002, ...)
- Branch creation (`001-create-taskify`)
- Template-based generation of `specs/001-create-taskify/spec.md`
- Structured requirements with user stories and acceptance criteria
- `[NEEDS CLARIFICATION]` markers for anything ambiguous

### Step 4: Clarify and Refine

```
/speckit.clarify I want to clarify the task card details. For each task in the UI, 
you should be able to change the current status between columns. You should be able 
to leave unlimited comments. You should be able to assign one of the valid users 
from the task card.
```

Add more detail iteratively:

```
/speckit.clarify When you first launch Taskify, it gives you a list of five users 
to pick from. No password required. Clicking a user opens the main view with a 
list of projects. Clicking a project opens its Kanban board. Your assigned cards 
appear in a different color. You can edit/delete your own comments but not others'.
```

**Key principle:** Each `/speckit.clarify` call refines the spec. Ambiguities are resolved, edge cases are captured, and the specification becomes progressively more precise.

### Validate the Specification

```
/speckit.checklist
```

**What it checks:**
- No `[NEEDS CLARIFICATION]` markers remain
- Requirements are testable and unambiguous
- Success criteria are measurable
- All user stories have acceptance criteria

---

# Section 4: From Specification to Implementation Plan (12 min)

## Step 5: Generate the Technical Plan

NOW you specify the tech stack:

```
/speckit.plan We are going to generate this using .NET Aspire, using Postgres as 
the database. The frontend should use Blazor server with drag-and-drop task boards, 
real-time updates. There should be a REST API created with a projects API, tasks 
API, and a notifications API.
```

**What gets generated:**

| File | Contents |
|------|----------|
| `plan.md` | High-level implementation plan with phases |
| `data-model.md` | Database schemas, entity relationships |
| `contracts/` | REST API specs, WebSocket event definitions |
| `research.md` | Library comparisons, tech research |
| `quickstart.md` | Key validation scenarios |

### Plan Structure: Phase Gates

The plan enforces architectural discipline through **pre-implementation gates**:

```markdown
### Phase -1: Pre-Implementation Gates

#### Simplicity Gate (Article VII)
- [ ] Using ≤3 projects?
- [ ] No future-proofing?

#### Anti-Abstraction Gate (Article VIII)
- [ ] Using framework directly?
- [ ] Single model representation?

#### Integration-First Gate (Article IX)
- [ ] Contracts defined?
- [ ] Contract tests written?
```

These gates prevent over-engineering. The AI cannot proceed without passing them or documenting justified exceptions.

## Step 6: Break Down and Implement

```
/speckit.tasks
```

Generates `tasks.md` with:
- Concrete, actionable tasks derived from the plan
- `[P]` markers for tasks that can run in parallel
- Dependencies and ordering
- Acceptance criteria per task

Validate before executing:

```
/speckit.analyze
```

Then execute:

```
/speckit.implement
```

### The Time Savings

```
Traditional Approach:              SDD with Spec Kit:
─────────────────────              ──────────────────
Write PRD:      2-3 hours         /speckit.specify:  5 min
Design docs:    2-3 hours         /speckit.clarify:  5 min
Project setup:  30 min            /speckit.plan:     5 min
Tech specs:     3-4 hours         /speckit.tasks:    5 min
Test plans:     2 hours           ─────────────────────────
──────────────────────            Total: ~20 minutes
Total: ~12 hours
```

In 20 minutes you have: complete feature specification, detailed implementation plan, API contracts, data models, test scenarios, and all documents versioned in a feature branch.

---

# Section 5: Hands-On Exercise — Build Your Own Spec (10 min)

## Exercise: Spec a Feature from Scratch

**Goal:** Participants create a specification for a feature of their choice using the Spec Kit workflow.

### Setup (2 min)

```bash
# If not already installed
uvx --from git+https://github.com/github/spec-kit.git specify init my-exercise --ai copilot
cd my-exercise
```

### Choose Your Feature (1 min)

Pick one or bring your own:

| Feature | Complexity | Good For |
|---------|------------|----------|
| Personal bookmark manager | Simple | First-timers |
| Expense tracker with receipt OCR | Medium | Product managers |
| Multi-tenant API gateway | Complex | Architects |
| Real-time collaborative whiteboard | Advanced | Full-stack devs |

### Steps (7 min)

1. **Define your constitution** (1 min)
   ```
   /speckit.constitution [Your project's core principles — 2-3 sentences]
   ```

2. **Write the specification** (2 min)
   ```
   /speckit.specify [Describe WHAT your feature does, not HOW]
   ```

3. **Clarify ambiguities** (2 min)
   ```
   /speckit.clarify [Review generated spec, resolve NEEDS CLARIFICATION markers]
   ```

4. **Generate the plan** (2 min)
   ```
   /speckit.plan [Specify your preferred tech stack]
   ```

### Discussion Prompts

- What did the AI mark as `[NEEDS CLARIFICATION]`? Were those valid ambiguities?
- How did the constitution influence the generated plan?
- What would you add to the constitution for your real projects?

---

# Section 6: The Constitution & Advanced Patterns (6 min)

## The Constitutional Foundation

The constitution (`memory/constitution.md`) is the **architectural DNA** of your project. It defines immutable principles that govern all generated code.

### The Nine Articles of Development

| Article | Principle | What It Enforces |
|---------|-----------|-----------------|
| I | Library-First | Every feature starts as a standalone library |
| II | CLI Interface Mandate | All functionality exposed via CLI with text I/O |
| III | Test-First Imperative | No code before tests — NON-NEGOTIABLE |
| IV-VI | (Project-specific) | Customized per organization |
| VII | Simplicity | Maximum 3 projects; no future-proofing |
| VIII | Anti-Abstraction | Use frameworks directly, no unnecessary wrapping |
| IX | Integration-First Testing | Real databases over mocks, actual services over stubs |

### Constitutional Power

```
"While principles are immutable, their application can evolve."
```

- **Consistency across time:** Code generated today follows the same principles as code generated next year
- **Consistency across LLMs:** Different AI models produce architecturally compatible code
- **Quality guarantees:** Test-first, library-first, and simplicity principles ensure maintainable output

## Template-Driven Quality

Templates don't just save time — they **constrain LLM behavior** for higher quality:

| Constraint | Effect |
|-----------|--------|
| "Focus on WHAT, not HOW" | Prevents premature implementation details |
| `[NEEDS CLARIFICATION]` markers | Forces explicit uncertainty instead of guessing |
| Requirement checklists | Acts as "unit tests" for the specification itself |
| Phase gates | Prevents over-engineering through explicit justification |
| File creation order (contracts → tests → source) | Enforces test-first thinking |
| "No speculative features" | Stops "nice to have" bloat |

## Advanced Patterns

### Parallel Exploration

Generate multiple implementations from the same specification:

```bash
# Same spec, different tech stacks
/speckit.plan React with TypeScript, PostgreSQL
/speckit.plan Vue with Python FastAPI, MongoDB
/speckit.plan .NET Blazor with SQL Server
```

Compare approaches before committing to one.

### Brownfield Modernization

Spec Kit supports iterative enhancement of existing systems:

```
/speckit.specify Add real-time notifications to our existing order management 
system. Users should receive in-app and email notifications when order status 
changes.
```

### Feature Branching as Spec Branching

```bash
git checkout -b 001-core-kanban       # Phase 1: Basic structure
git checkout -b 002-drag-drop         # Phase 2: Drag-and-drop
git checkout -b 003-real-time         # Phase 3: Real-time updates
```

Each branch is an independent, versioned specification. Implement in phases to avoid context saturation.

### Enterprise Constraints

Incorporate organizational requirements directly:

```
/speckit.constitution This project MUST deploy to Azure. Authentication uses 
Azure AD B2C. All APIs must conform to our company's OpenAPI standards. 
Data at rest encrypted with AES-256.
```

The constitution ensures every generated plan respects these constraints automatically.

---

# Section 7: Wrap-Up & Resources (2 min)

## Key Takeaways

1. **Specs are the source of truth** — Code is a generated expression of specifications
2. **The 6-step process** provides structure that prevents AI from guessing or over-engineering
3. **Constitutions enforce discipline** — Immutable principles produce consistent, maintainable output
4. **Templates constrain LLMs** — Structure produces higher quality than freeform prompting
5. **Pivots become systematic** — Change specs and regenerate, don't manually rewrite

## When to Use Spec Kit

| Scenario | Fit |
|----------|-----|
| Greenfield 0→1 development | Excellent |
| Creative exploration (multiple approaches) | Excellent |
| Brownfield modernization | Good |
| Quick prototyping (< 1 hour) | Overkill |
| Solo scripting (100 lines) | Overkill |

## Resources

| Resource | Link |
|----------|------|
| Spec Kit Documentation | github.github.com/spec-kit |
| GitHub Repository | github.com/github/spec-kit |
| Quick Start Guide | github.github.com/spec-kit/quickstart.html |
| SDD Methodology (deep dive) | github.com/github/spec-kit/blob/main/spec-driven.md |
| Installation Guide | github.github.com/spec-kit/installation.html |
| Contributing | github.com/github/spec-kit/blob/main/CONTRIBUTING.md |

## Command Quick Reference

```
specify init <project> --ai <agent>   Initialize a new project
/speckit.constitution <principles>     Define architectural principles
/speckit.specify <description>         Create feature specification
/speckit.clarify <details>             Resolve ambiguities
/speckit.checklist                     Validate specification completeness
/speckit.plan <tech-stack>             Generate implementation plan
/speckit.tasks                         Break down into actionable tasks
/speckit.analyze                       Audit the implementation plan
/speckit.implement                     Execute the plan
```

---

# Appendix A: Comparison — Traditional vs. Spec-Driven Development

| Dimension | Traditional | Spec-Driven (Spec Kit) |
|-----------|-------------|----------------------|
| Source of truth | Code | Specification |
| PRD lifecycle | Write once, discard | Living, versioned, executable |
| Architecture decisions | Meeting notes | Constitution + Phase Gates |
| Pivoting | Manual propagation (days) | Regeneration (minutes) |
| Testing | Written after code | Defined in specification, generated before code |
| Consistency | Varies by developer | Enforced by constitution |
| Tech stack changes | Major rewrite | Re-plan from same spec |
| Onboarding | Read the code | Read the spec |

---

# Appendix B: Presenter Notes

## Section 1 (8 min)
- Open with a relatable story: "How many hours have you spent debugging something that was actually a requirements misunderstanding?"
- Emphasize the cost multiplier: catching defects in requirements vs. production
- The "power inversion" is the core mental model shift — pause and let it sink in

## Section 2 (10 min)
- Walk through the project structure visually — show how organized the output is
- Highlight that `specify check` validates the entire setup
- The Git branch = feature context is an elegant design choice — emphasize it

## Section 3 (12 min)
- Live demo: Type the commands in real time. Let participants see the AI thinking
- Point out `[NEEDS CLARIFICATION]` markers as they appear — this is a feature, not a bug
- Show the generated `spec.md` and highlight how structured it is vs. a typical PRD
- Let the audience suggest one clarification to add interactively

## Section 4 (12 min)
- Show the Phase -1 gates — this is where engineers get excited
- Walk through `plan.md` to show how requirements trace to technical decisions
- The time savings comparison slide is powerful — let the numbers speak
- Demo `speckit.analyze` to show the AI auditing its own plan

## Section 5 (10 min)
- Have participants work in pairs if possible
- Walk around and help with first-time setup issues
- Common issue: uv not installed — have `pip install uv` as fallback
- Debrief: ask 2-3 people to share what the AI clarified for them

## Section 6 (6 min)
- The Nine Articles are aspirational — participants should customize for their org
- The template constraints section explains WHY Spec Kit works better than raw prompting
- Parallel exploration is a "wow moment" — run the same spec with different tech stacks
