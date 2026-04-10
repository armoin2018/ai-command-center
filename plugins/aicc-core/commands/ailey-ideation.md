---
id: ailey-ideation
name: Idea Expansion and Innovation Analysis
description: Take a raw idea prompt or project plan item ID, expand and refine it through learning research and innovation analysis, and store the refined output in .project/IDEA_{N}.md with strategic scoring, opportunity analysis, and implementation roadmap
keywords: [ideation, brainstorm, innovation, idea-expansion, growth-opportunities, strategic-analysis, prompt, plan-id, ailey]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Brainstorm
---
## Variables

- Folders, Files and Indexes are stored in `.github/ai-ley/ai-ley.json`
- Files and folders in this document will be referenced using the `folders`, `files`, and `indexes` variables defined in the folder structure YAML file using the mustache syntax such as `{{folders.plan}}`.

## References

**Personas:** Leverage domain expertise from `.github/ai-ley/personas/**/*.md`

**Instructions:** Follow best practices from `.github/ai-ley/instructions/**/*.md`

**Agents:** This prompt is designed for the agent system. See the Recommended Agent section below.


## Recommended Personas

Consider leveraging these persona domains:

- `.github/ai-ley/personas/_general/**/*.md`

These personas provide specialized expertise and perspective.

## Recommended Instructions

Consider referencing these instruction files:

- `.github/ai-ley/instructions/_general/developer/**/*.md`

These provide domain-specific guidance and best practices.

## Recommended Agent

This prompt works best with the **ailey-brainstorm** agent from `.github/agents/ailey-brainstorm.agent.md`.

To use this agent, reference it in your chat or workflow configuration.

## Goal

Given:

- A raw idea provided as `{idea}` prompt input **OR** a project plan item ID (e.g. `AICC-0042`)
- If `{idea}` matches a project ID pattern (`{PROJECT_CODE}-{####}`), resolve it from `.project/PLAN.json` and use the item's summary, description, acceptance criteria, tags, and context as the idea seed
- Current market trends and technological innovations (via web research)
- Industry best practices and emerging patterns

Produce:

- An expanded and refined idea document stored in `.project/IDEA_{N}.md` (auto-sequenced)
- Structured analysis combining learning research and innovation opportunity scoring
- Strategic recommendations with implementation roadmap
- Risk assessment and success probability analysis
- If sourced from a plan item: back-link to the originating ID for traceability

## Command

You are an idea expansion specialist, innovation strategist, and project intelligence analyst with expertise in transforming raw concepts into comprehensive, actionable innovation documents.

### 1. **Determine Sequence Number**

Before any analysis, determine the next available IDEA file number:

- Scan `.project/` directory for existing `IDEA_*.md` files
- Extract the highest sequence number N
- Set the new file number to N+1 (or 1 if no files exist)
- Target output file: `.project/IDEA_{N}.md`

### 2. **Resolve Input Source**

Determine whether the input is a raw idea string or a project plan item ID:

```markdown
**Step 2.1: Input Classification**

**Check for Project ID**:

- Test if `{idea}` matches the pattern `{PROJECT_CODE}-{digits}` (e.g. `AICC-0042`, `ARMOIN-0007`)
- If it matches:
  1. Read `.project/PLAN.json`
  2. Search the `items` array for the object whose `id` matches the input
  3. If not found: report an error — "Plan item {idea} not found in PLAN.json" — and stop
  4. If found: extract the item and build the idea seed from it

**Build Idea Seed from Plan Item** (when project ID detected):

- **Core idea text**: Combine `summary` + `description` from the matched item
- **Item type**: Use `type` field (epic, story, task, bug) to set analysis scope:
  - `epic` → broad strategic analysis with multiple sub-opportunities
  - `story` → feature-level analysis with user-centric focus
  - `task` → tactical/implementation analysis with technical depth
  - `bug` → root-cause analysis with fix strategies and prevention
- **Extra context**: Pull in `acceptanceCriteria`, `tags`, `contexts`, `children` (resolve child items for richer context)
- **Constraints**: Extract `priority`, `storyPoints`, `sprint`, `milestone` as implementation constraints
- **Relationships**: Resolve `linkedRelationships` and `children` IDs to understand dependencies
- Set a `sourceId` variable to the plan item ID for back-linking in the output document

**Build Idea Seed from Raw Input** (when no project ID detected):

- Use `{idea}` as-is for the idea seed text
- Set `sourceId` to `null` (no plan item link)
```

### 3. **Idea Intake and Clarification**

**Parse and Expand the Raw Idea**:

```markdown
**Step 2.1: Idea Foundation Analysis**

**Parse Input**:

- Extract the core concept from {idea}
- Identify implicit assumptions and constraints
- Determine the domain, industry, and target audience
- Classify the idea type: product, service, feature, process, business model, or technology

**Expand the Seed**:

- Restate the idea in a clear, expanded form (2-3 paragraphs)
- Identify the core problem being solved or opportunity being captured
- Define the target user/customer and their pain points
- Articulate the value proposition
- List implicit requirements and assumptions
```

### 4. **Learning Research Phase**

**Scan Market, Technology, and Competitive Landscape**:

```markdown
**Step 3.1: Contextual Research**

**Industry Trend Research**:

- Research current industry trends affecting the idea domain
- Identify emerging technologies relevant to the concept
- Analyze competitor innovations and existing solutions
- Study best practices from successful similar implementations
- Investigate regulatory considerations impacting feasibility

**Technology Component Research**:

- Research available tools, platforms, and APIs
- Identify automation and integration opportunities
- Explore scalability and performance considerations
- Analyze build-vs-buy options for key components
- Research cost-effective implementation approaches

**Market Validation**:

- Research target audience behavior and preferences
- Identify market size (TAM, SAM, SOM)
- Analyze demand signals and validation indicators
- Research pricing strategies and revenue models
- Investigate distribution channels and go-to-market approaches
```

### 5. **Innovation Opportunity Analysis**

**Multi-Dimensional Scoring and Opportunity Mapping**:

```markdown
**Step 4.1: Strategic Opportunity Scoring**

**Innovation Categories** (identify 3+ opportunities per category):

- **Core Approaches**: Different ways to execute the idea
- **Peripheral Opportunities**: Adjacent markets or applications
- **Upstream Opportunities**: Supply chain, platform, or infrastructure plays
- **Downstream Opportunities**: Customer-facing extensions, distribution, monetization

**Scoring Matrix** (1-10 scale, weighted):

| Criteria         | Weight | Description                           |
| ---------------- | ------ | ------------------------------------- |
| Growth Potential  | 25%   | Market size, demand trends, scalability |
| Revenue Impact    | 30%   | Revenue generation potential and timeline |
| Cost Efficiency   | 20%   | Implementation cost vs. expected returns |
| ROI Projection    | 15%   | Return on investment and payback period |
| Strategic Fit     | 10%   | Alignment with capabilities and vision |
```

### 6. **Compose the IDEA Document**

Write the output to `.project/IDEA_{N}.md` using this structure:

````markdown
# IDEA {N}: {Idea Title}

> **Raw Input**: {original idea prompt}
> **Source**: {sourceId or "Free-form idea (no plan item)"}
> **Created**: {current-date}
> **Status**: Draft

---

## 1. Expanded Concept

{2-3 paragraph expansion of the raw idea with clear problem statement,
target audience, and value proposition}

### Core Problem
{What specific problem does this solve?}

### Target Audience
{Who benefits and why?}

### Value Proposition
{Why is this better than the status quo?}

### Plan Item Context (if sourced from project ID)
> _Include this section only when `{idea}` was resolved from PLAN.json_

| Field | Value |
|-------|-------|
| **ID** | {sourceId} |
| **Type** | {item-type: epic/story/task/bug} |
| **Priority** | {priority} |
| **Sprint** | {sprint} |
| **Milestone** | {milestone} |
| **Story Points** | {storyPoints} |
| **Tags** | {tags} |
| **Acceptance Criteria** | {acceptanceCriteria} |
| **Related Items** | {children and linkedRelationships} |

---

## 2. Market & Technology Research

### Industry Trends
| Trend | Relevance | Adoption Stage | Opportunity |
|-------|-----------|----------------|-------------|
| {trend-1} | {relevance} | {stage} | {opportunity} |
| {trend-2} | {relevance} | {stage} | {opportunity} |
| {trend-3} | {relevance} | {stage} | {opportunity} |

### Competitive Landscape
| Existing Solution | Approach | Gap / Differentiation |
|-------------------|----------|-----------------------|
| {solution-1} | {approach} | {gap} |
| {solution-2} | {approach} | {gap} |

### Technology Stack Options
| Component | Option | Maturity | Cost |
|-----------|--------|----------|------|
| {component-1} | {option} | {maturity} | {cost} |
| {component-2} | {option} | {maturity} | {cost} |

### Market Sizing
- **TAM**: {total-addressable-market}
- **SAM**: {serviceable-addressable-market}
- **SOM**: {serviceable-obtainable-market}

---

## 3. Innovation Opportunities

### Core Approaches
| # | Opportunity | Score | Key Benefit | Timeline |
|---|-------------|-------|-------------|----------|
| A1 | {approach-1} | {score}/10 | {benefit} | {timeline} |
| A2 | {approach-2} | {score}/10 | {benefit} | {timeline} |
| A3 | {approach-3} | {score}/10 | {benefit} | {timeline} |

### Peripheral Opportunities
| # | Opportunity | Score | Market Size | Entry Strategy |
|---|-------------|-------|-------------|----------------|
| P1 | {peripheral-1} | {score}/10 | {market} | {strategy} |
| P2 | {peripheral-2} | {score}/10 | {market} | {strategy} |

### Overall Ranking
| Rank | Opportunity | Category | Score | Revenue Potential | Timeline |
|------|-------------|----------|-------|-------------------|----------|
| #1 | {top} | {cat} | {score}/10 | {revenue} | {time} |
| #2 | {second} | {cat} | {score}/10 | {revenue} | {time} |
| #3 | {third} | {cat} | {score}/10 | {revenue} | {time} |

---

## 4. Strategic Recommendations

### Implementation Tiers
- **Tier 1 (0-3 months)**: {quick-wins-and-validation}
- **Tier 2 (3-9 months)**: {core-build-and-launch}
- **Tier 3 (9-18 months)**: {scale-and-expand}

### Resource Requirements
| Resource | Tier 1 | Tier 2 | Tier 3 |
|----------|--------|--------|--------|
| Team | {size} | {size} | {size} |
| Budget | ${amount} | ${amount} | ${amount} |
| Technology | {stack} | {stack} | {stack} |

### Revenue Projections
| Period | Conservative | Moderate | Aggressive |
|--------|-------------|----------|------------|
| Year 1 | ${amount} | ${amount} | ${amount} |
| Year 2 | ${amount} | ${amount} | ${amount} |
| Year 3 | ${amount} | ${amount} | ${amount} |

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {risk-1} | {H/M/L} | {H/M/L} | {strategy} |
| {risk-2} | {H/M/L} | {H/M/L} | {strategy} |
| {risk-3} | {H/M/L} | {H/M/L} | {strategy} |

---

## 6. Next Steps

- [ ] {immediate-action-1}
- [ ] {immediate-action-2}
- [ ] {immediate-action-3}
- [ ] {validation-step}
- [ ] {decision-point}

---

## 7. Research Sources

- {source-1}
- {source-2}
- {source-3}
````

### 7. **Validation**

- Verify `.project/IDEA_{N}.md` was created successfully
- Confirm all sections are populated with substantive content (not just placeholders)
- Ensure scoring is internally consistent (weights sum to 100%, scores are 1-10)
- Validate that research findings are grounded in real market data
- Check that recommendations are actionable and time-bound

### 8. **Deliver**

Provide a summary confirmation:

```
✅ Idea expanded and stored: .project/IDEA_{N}.md

📋 Idea: {idea-title}
� Source: {sourceId + " (" + item-type + ")" or "Free-form idea"}
�🔍 Research: {count} trends analyzed, {count} competitors reviewed
💡 Opportunities: {count} identified, top scored {score}/10
🎯 Top Recommendation: {top-opportunity-summary}
💰 Revenue Potential: ${range} over {timeframe}
⚡ Next Step: {most-immediate-action}
```


### Example 1: Product Idea

```
/ailey-ideation "AI-powered recipe generator that adapts to what's in your fridge using computer vision"
```

Expected Output:
```
✅ Idea expanded and stored: .project/IDEA_1.md

📋 Idea: AI Fridge-to-Recipe Generator
🔍 Research: 5 trends analyzed, 8 competitors reviewed
💡 Opportunities: 9 identified, top scored 8.7/10
🎯 Top Recommendation: MVP mobile app with pantry photo scanning
💰 Revenue Potential: $2.1M-$8.4M over 3 years
⚡ Next Step: Validate demand with landing page + waitlist
```

### Example 2: Business Model Idea

```
/ailey-ideation "subscription marketplace connecting local artisans with corporate gift buyers"
```

### Example 3: Feature Idea

```
/ailey-ideation "real-time collaborative whiteboarding with AI that auto-organizes sticky notes into action items"
```

### Example 4: From a Plan Item ID

```
/ailey-ideation AICC-0042
```

Expected Output:
```
✅ Idea expanded and stored: .project/IDEA_4.md

📋 Idea: [AICC-0042] Scheduler Recurring Job Support
📎 Source: AICC-0042 (story) — Sprint 8, Milestone: Automation Phase 1
🔍 Research: 4 trends analyzed, 6 competitors reviewed
💡 Opportunities: 7 identified, top scored 8.2/10
🎯 Top Recommendation: Cron-expression DSL with visual schedule builder
💰 Revenue Potential: Included in platform value — retention uplift est. 12-18%
⚡ Next Step: Prototype cron parser with preview UI
```

### Example 5: From an Epic-level Plan Item

```
/ailey-ideation AICC-0001
```

## Notes

- The `{idea}` input can be either a **free-form idea string** or a **project plan item ID** (e.g. `AICC-0042`)
- When a project ID is passed, the item's summary, description, acceptance criteria, tags, children, and context from `.project/PLAN.json` are used as the idea seed instead of `REQUIREMENTS.md`
- Item type determines analysis depth: epics get broad strategic scans, stories get feature-level UX focus, tasks get tactical/technical depth, bugs get root-cause + prevention analysis
- Each invocation creates a new sequenced file (`IDEA_1.md`, `IDEA_2.md`, etc.) — ideas are never overwritten
- When sourced from a plan item, the IDEA document includes a **Plan Item Context** section with traceability back to the originating ID
- Web research grounds the analysis in real market data rather than purely theoretical assessment
- The scoring matrix provides objective, comparable evaluation across different idea types
- Output is designed to be actionable: each IDEA file can feed directly into `ailey-build-requirements` or `ailey-build-plan`
- Keep research focused and time-boxed — depth over breadth for the most promising angles
---

version: 1.1.0
updated: 2026-02-26
reviewed: 2026-02-26
score: 4.3
---
