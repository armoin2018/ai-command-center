---
id: ailey-add-feature
name: addFeature
description: Integrates user requests and ideas into requirements, adding entries to ask and suggestions files while following comprehensive analysis guidelines
keywords: [ask-integration, requirements, feature-addition, suggestions, analysis, prioritization]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator
---
## Context & Resources

**Variables:** All paths use mustache syntax from `.github/ai-ley/ai-ley.yaml` (e.g., `{{folders.plan}}`, `{{files.requirements}}`)

**Expertise:** 
- Personas: `.github/ai-ley/personas/_general/**/*.md`
- Instructions: `.github/ai-ley/instructions/_general/developer/**/*.md`
- Agent: `ailey-orchestrator` from `.github/agents/ailey-orchestrator.agent.md`

## Objective

Transform user `<ask>` input into structured requirements, ask items, and suggestions across three files:
- `{{files.requirements}}` - Formal requirements with acceptance criteria
- `{{files.ask}}` - Categorized ask items with status tracking
- `{{files.suggestions}}` - Enhancement ideas with priority scoring

**Optional Workflow Extension:** Can trigger build-plan → run-plan for end-to-end feature development.


### 1. Parse & Classify Ask

Extract explicit/implicit requirements, categorize by type (functional, non-functional, enhancement, bug, strategic), assess complexity/impact/dependencies.

**Context:** Load existing files and persona indexes for alignment analysis.

**Output:** ASK_CLASSIFICATION pattern:

```
## Ask Analysis: [Date]
### Immediate (Critical/High) - [Description] - [Rationale]
### Enhancement (Medium) - [Description] - [Value/Impact]  
### Future (Low/Deferred) - [Description] - [Deferral reason]
### Clarifications - [Description] - [Questions needed]
```

### 2. Integrate Requirements

For "Immediate" items: Map to existing requirements, generate acceptance criteria, assign priority/complexity, identify dependencies.

**Pattern:** REQUIREMENT_FORMAT

```
**R[X]: [Title]**
- Description: [From ask]
- Business Value: [Why it matters]
- Acceptance Criteria: [ ] [Testable conditions]
- Priority: High/Medium/Low | Complexity: Simple/Moderate/High/Expert
- Dependencies: [Requirements/systems]
- Source: ASK-[ID] - [Date]
```

**Pattern:** USER_STORY (when applicable)
```
**US[X]: [Title]**
As a [user type] I want [functionality] So that [value]
- Acceptance Criteria: [ ] [Conditions]
- Related: R[X], R[Y] | Source: ASK-[ID] - [Date]
```

**Pattern:** FEATURE_SECTION (for comprehensive features)
```
## Feature: [Name]
### Description
[Detailed overview]
### User Stories
- As a [type], I want [functionality] so that [benefit]
### Acceptance Criteria
- [ ] [Testable criteria]
### Technical Requirements
- [Specifications, performance, security]
### Dependencies
- [External/internal dependencies]
### Priority
[High/Medium/Low with justification]
```

### 3. Update Ask File

**Pattern:** ASK_ITEM_FORMAT for `{{files.ask}}`:

```

## Active - High Priority
#### ASK-[ID]: [Title]
- Date: [ISO] | Requestor: [Name]
- Description: [Full ask]
- Business Impact: [Why high priority]
- Status: Integrated as R[X]-R[Y] / Pending / Under analysis
- Integration: [x] Requirements [x] Review [ ] Feasibility

## Active - Medium Priority  
#### ASK-[ID]: [Title]
- Date: [ISO] | Description: [Full ask]
- Value: [Benefits] | Status: [Status]
- Complexity: [Estimate] | Dependencies: [List]

## Backlog - Future
#### ASK-[ID]: [Title]
- Date: [ISO] | Description: [Ask]
- Deferral: [Reason] | Future Context: [When relevant]

## Clarifications
#### ASK-[ID]: [Title]
- Date: [ISO] | Description: [Request]
- Needed: [Questions] | Stakeholder: [Who] | Target: [Date]

## Processed (Reference)
#### ASK-[ID]: [Title] - INTEGRATED/REJECTED
- Date: [ISO] | Requirements: R[X] | Reason: [If rejected]
```

### 4. Update Suggestions

**Pattern:** SUGGESTION_FORMAT for `{{files.suggestions}}`:

```

## Active - User Experience
#### SUG-[ID]: [Title]
- Source: ASK-[X] - [Date]
- Description: [Enhancement]
- Value: [UX improvements]
- Effort: Low/Medium/High | Score: [1-10] | Dependencies: [List]
- Status: Proposed / Review / Approved

## Active - Performance/Technical
#### SUG-[ID]: [Title]
- Source: ASK-[X] - [Date]
- Technical: [Improvement details]
- Impact: [Performance gains]
- Complexity: [Assessment] | Risk: [Assessment & mitigation]

## Active - Features
#### SUG-[ID]: [Title]
- Source: ASK-[X] - [Date]
- Overview: [Feature description]
- Users: [Target] | Market: [Value]
- Resources: [Estimates]

## Under Evaluation | Approved | Implemented (Reference)
```

### 5. Impact Analysis

**Pattern:** IMPACT_ASSESSMENT

```
## Impact Analysis
- Requirements: [N] new (R[X]-R[Y]), [N] modified, [N] stories (US[X]-US[Y])
- Scope: High/Medium/Low - [Rationale]
- Timeline: [Estimate] | Resources: [Needs]
- Risks: Technical: [List] | Business: [List] | Mitigation: [Strategies]
- Reviews: [ ] Product [ ] Technical [ ] Design [ ] Security
- Next: 1. [Action] 2. [Action] 3. [Follow-up]
```

### 6. Validate Quality

**Checks:**
- [ ] Unique IDs, proper categorization
- [ ] High-priority → requirements with acceptance criteria
- [ ] Suggestions with value assessments
- [ ] Dependencies/conflicts identified
- [ ] Impact/complexity assessed
- [ ] Stakeholder reviews flagged
- [ ] Consistency with standards

**Cross-Reference:**
- [ ] Personas referenced appropriately
- [ ] Aligns with `{{files.indexes.instructions}}`
- [ ] No unresolved conflicts
- [ ] Stories map to user personas
- [ ] Acceptance criteria testable

### 7. Generate Summary

**Pattern:** INTEGRATION_SUMMARY

```

## Original Ask
> [Quote input]

## Results
- Requirements: R[X]: [Title] - [Priority] | US[Z]: [Story]
- Ask Items: ASK-[X]: [Priority] - [Status]
- Suggestions: SUG-[X]: [Enhancement] - [Score]
- Actions: [ ] [Immediate] [ ] [Review] [ ] [Clarification]
- Files: ✅ requirements ([N]) ✅ ask ([N]) ✅ suggestions ([N])

## Next
1. Immediate: [Action]
2. Short-term: [Follow-up]
3. Long-term: [Strategic]
```

**Optional:** SUCCESS_REPORT (for feature development workflow)
```
✅ Feature Development: [Name]
📋 Requirements: Feature added | Stories: [N] | Criteria: [N]
📊 Plan: Epics: [N] | Stories: [N] | Tasks: [N] | Effort: [Estimate]
🚀 Implementation: Tasks: [N]/[Total] | Status: [Status]
📝 Next: [Remaining] | [Testing] | [Deployment]
```

## Examples

**Feature Request:** "Users need favorites accessible on mobile/desktop"
→ R25 (Medium, Moderate): User Favorites | US12: Quick Access | ASK-012

**Performance Issue:** "30s load times on large datasets, need caching/pagination"  
→ NF8 (High, High): Large Dataset Performance | SUG-015 (9/10): Redis caching | ASK-013

## Guidelines

- Maintain traceability: ASK → Requirements
- Use ISO dates for all tracking
- Prioritize by business value, not ease
- Flag stakeholder reviews clearly
- Consider mobile/accessibility for all features
- Document decisions and rationale

**Workflow Integration:**
- Can chain with build-plan.md for implementation planning
- Can extend to run-plan.md for full feature execution
- Maintains compatibility with build-requirements.md patterns
- End-to-end: Requirements → Planning → Implementation
---

version: 1.0.0
updated: 2026-01-11
reviewed: 2026-01-11
score: 4.0

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.5
---