---
id: ailey-build-market-research
name: Market Research and Analysis
description: Build comprehensive market research with industry analysis, future trends, and strategic opportunities
keywords: [build, market, research, prompt, ailey]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator
---

## Variables

- Folders, Files and Indexes are stored in `.github/ai-ley/ai-ley.json`
- Files and folders in this document will be referenced using the `folders`, `files`, and `indexes` variables defined in the folder structure YAML file using the mustache syntax such as `{{folders.plan}}`.

## References

- **Personas:** `.github/ai-ley/personas/marketing/**/*.md`
- **Instructions:** `.github/ai-ley/instructions/business/**/*.md`, `.github/ai-ley/instructions/tools/seo-report.instructions.md`
- **Agent:** `.github/agents/ailey-marketing.agent.md`

## Goal

**Given:** Project requirements from `{{files.requirements}}` including industry context, customer segments, competitive landscape, and geographic focus.

**Produce:** Comprehensive market research report written to `{{folders.plan}}/business/market-research.md` covering industry analysis, opportunity assessment, customer personas, DMA targeting, and marketing strategy recommendations.

## Command

You are a market research analyst and strategic insights expert. Read `{{files.requirements}}`, then produce the deliverable using the output template below.

### Step 1: Industry Analysis

- Extract target industry sectors, segments, and competitive landscape from requirements
- Research current trends: technology disruptions, regulatory changes, consumer behavior shifts
- Project 3-5 year market evolution with size, growth rate, and disruption factors
- Assess Porter's Five Forces (barriers to entry, supplier/buyer power, substitutes, rivalry)

### Step 2: Market Opportunity Assessment

- Identify underserved segments with demographics, psychographics, pain points, and unmet needs
- Evaluate each opportunity: revenue potential, CAC, CLV, entry difficulty, investment required
- Map competitive gaps: segment coverage, solution quality, price points, geographic white space
- Forecast disruptive technologies and innovation adoption timeline

### Step 3: Customer Segmentation and Personas

- Define primary and secondary segments with demographic, psychographic, and behavioral profiles
- Build 2-3 detailed personas per segment: goals, pain points, buying behavior, media preferences
- Analyze the buyer journey: awareness triggers, consideration criteria, purchase barriers, post-purchase expansion
- Conduct DMA analysis for geographic targeting with entry priority scoring

### Step 4: Marketing Strategy Recommendations

- Define strategic positioning, value proposition, and competitive differentiation
- Develop per-segment strategies: objectives, messaging, channels, content, campaigns
- Build acquisition funnel with conversion targets and optimization tactics per stage
- Create phased market entry timeline (6/12/18 months) with investment and ROI projections
- Define KPI tracking framework with monthly/quarterly/annual review cadence

---

## Output Template

```markdown
## Executive Summary

**Market Context**: {industry-and-market-overview}
**Research Scope**: {geographic-demographic-psychographic-scope}
**Key Findings**: {primary-research-insights}
**Strategic Opportunities**: {top-opportunities}
**Recommended Focus**: {priority-segments-and-strategies}

## 1. Industry Overview

**Definition**: {industry-and-subsectors} | **Market Size**: ${TAM} | **CAGR**: {rate}% | **Maturity**: {stage}

**Industry Structure (Porter's Five Forces)**:
| Force | Rating | Details |
|-------|--------|---------|
| Barriers to Entry | {H/M/L} | {specifics} |
| Supplier Power | {H/M/L} | {specifics} |
| Buyer Power | {H/M/L} | {specifics} |
| Threat of Substitutes | {H/M/L} | {specifics} |
| Competitive Rivalry | {H/M/L} | {specifics} |

### Trends

For each trend (technology, consumer behavior, regulatory/economic):
- **{Trend Name}**: {description} | Impact: {H/M/L} | Timeline: {short/mid/long-term} | Implications: {opportunities-and-threats}

### Market Size Projections
| Year | Market Size | Growth Rate | Key Drivers | Disruption Factors |
|------|-------------|-------------|-------------|-------------------|
| Current | ${size} | — | {drivers} | {disruptions} |
| Year 1 | ${size} | {rate}% | {drivers} | {disruptions} |
| Year 3 | ${size} | {rate}% | {drivers} | {disruptions} |
| Year 5 | ${size} | {rate}% | {drivers} | {disruptions} |

## 2. Market Opportunities

### Opportunity: {Name}
<!-- Repeat for each opportunity -->
- **Description**: {emerging-opportunity}
- **Addressable Size**: ${size} | **Disruption Potential**: {H/M/L}
- **Pain Point Addressed**: {problem-solved}
- **Early Adopters**: {customer-segments}
- **Entry Investment**: ${cost} | **Revenue Model**: {model}
- **Success Probability**: {H/M/L} — {rationale}

### Underserved Segments

#### {Segment Name}
<!-- Repeat for each underserved segment -->
- **Profile**: {demographics, psychographics, size, current solutions}
- **Why Underserved**: {barriers, solution gaps, accessibility issues}
- **Unmet Needs**: {functional, emotional, economic, experience}
- **Opportunity**: Revenue ${amount} | CAC ${amount} | CLV ${amount} | Growth {rate}%
- **Entry Strategy**: {product adaptations, pricing, channels, messaging, partnerships}

### Competitive Gap Analysis
| Segment | Competitor Coverage | Solution Quality | Price Points | Satisfaction |
|---------|-------------------|-----------------|-------------|-------------|
| {name} | {H/M/L} | {excellent/good/poor} | {premium/mid/value} | {H/M/L} |

**White Space**: {segment-solution gaps, geographic gaps, price gaps, channel gaps}

## 3. Target Market and Customers

### Segment: {Name}
<!-- Repeat for each segment -->
- **Demographics**: age, income, education, geography, employment
- **Psychographics**: values, lifestyle, motivations, pain points, goals
- **Behavior**: purchase patterns, brand loyalty, information sources, tech usage
- **Market Value**: size {N}, value ${amount}, growth {rate}%, CLV ${amount}, CAC ${amount}
- **B2B additions** (if applicable): company size, industry, decision structure, buying process, sales cycle

### Persona: "{Name}" — {Role}
<!-- Create 2-3 personas per segment -->
- **Demographics**: age, income, location, education, family/company
- **Day in Life**: routine, responsibilities, tech usage, information sources
- **Goals**: primary objectives, success metrics, aspirations
- **Pain Points**: frustrations, challenges, unmet needs, constraints
- **Buying Behavior**: research process, decision criteria, triggers, price sensitivity, channel preferences
- **Quote**: "{representative-mindset-quote}"

### DMA Analysis

#### Primary: {DMA Name} (Rank #{N})
- **Market**: population {N}, households {N}, economic profile {details}
- **Opportunity**: target density {N}%, buying power ${amount}, growth trends
- **Entry Strategy**: approach, timeline, investment ${amount}, success metrics

#### Secondary DMAs
| Rank | Market | Population | Target Density | Score | Priority |
|------|--------|-----------|---------------|-------|----------|
| #{N} | {name} | {pop} | {pct}% | {N}/10 | {H/M/L} |

### Buyer Journey
| Stage | Triggers/Process | Key Questions/Criteria | Content Needs | Channels |
|-------|-----------------|----------------------|--------------|----------|
| Awareness | {triggers} | {questions} | {content} | {channels} |
| Consideration | {evaluation} | {criteria} | {content} | {channels} |
| Purchase | {process} | {barriers} | {support} | {channels} |
| Post-Purchase | {onboarding} | {success metrics} | {expansion} | {advocacy} |

## 4. Marketing Strategy

**Positioning**: {market-position} | **Value Prop**: {validated-prop} | **Differentiation**: {unique-advantages}

### Per-Segment Strategy: {Segment Name}
<!-- Repeat for each segment -->
**Objectives**: awareness {N}%, leads {N}/mo, conversion {N}%, acquisition {N}/mo, share {N}%
**Messaging**: primary message, emotional appeal, rational benefits, proof points
**Channels**: primary, secondary, content distribution, paid, earned media
**Campaigns**: launch, awareness, demand generation, retention

### DMA Marketing Plan: {Primary DMA}
**Tactics**: local advertising, digital geo-targeting, community engagement, influencers, partnerships

| Tactic | Monthly Budget | Reach | Leads | ROI |
|--------|---------------|-------|-------|-----|
| {tactic} | ${amount} | {reach} | {leads} | {roi}% |

### Acquisition Funnel
| Stage | Target Rate | Tactics | Content | Optimization |
|-------|------------|---------|---------|-------------|
| Awareness → Interest | {N}% | {tactics} | {content} | {channel perf} |
| Interest → Consideration | {N}% | {nurture strategy} | {enablement} | {personalization} |
| Consideration → Purchase | {N}% | {sales process} | {decision support} | {objection handling} |

### Retention & Expansion
- **Retention**: onboarding, ongoing support, value realization, feedback loops
- **Upsell**: target segments, triggers, process, success rate target {N}%
- **Cross-sell**: complementary offerings, timing, bundling strategy

### Channel ROI Projections
| Channel | Monthly Investment | Customers | CAC | CLV | ROI | Payback |
|---------|-------------------|-----------|-----|-----|-----|---------|
| {channel} | ${amount} | {N} | ${cac} | ${clv} | {roi}% | {months} |

### Market Entry Timeline
| Phase | Period | Investment | Focus | Expected Results |
|-------|--------|-----------|-------|-----------------|
| Entry | Months 1-6 | ${amount} | {objectives} | {results} |
| Expansion | Months 7-12 | ${amount} | {scaling} | {cumulative results} |
| Leadership | Months 13-18 | ${amount} | {competitive advantage} | {market position} |

### KPIs
| Metric | Target | Month 3 | Month 6 | Month 12 | Status |
|--------|--------|---------|---------|----------|--------|
| Brand Awareness | {N}% | | | | |
| Market Share | {N}% | | | | |
| Customer Acquisition | {N} | | | | |
| CAC | ${N} | | | | |
| Marketing ROI | {N}% | | | | |
| CLV | ${N} | | | | |

**Review Cadence**: Monthly performance reviews → Quarterly strategy assessments → Annual plan evolution
```

---

## Example

**Input**: `build-market-research` (SaaS project management platform)

**Expected Output**:
```
📊 Building comprehensive market research analysis...

🏭 Industry: Project management software ($4.2B, 12% CAGR)
📈 Trends: Remote work, AI integration, mobile-first
🔮 Forecast: $8.1B by 2028, AI-powered automation mainstream

💡 Opportunities:
- Freelancers & micro-businesses (2.3M market, $180M addressable)
- Gap: Simple, affordable solutions with smart automation

🎯 Segments: Small agencies (10-50 employees, $2-10M revenue)
👤 Personas: Operations Managers, Project Directors, Team Leads
📍 DMAs: Top 10 metros, 67% target concentration

🚀 Strategy: Content 40% | LinkedIn B2B 30% | Events 20% | Referral 10%

✅ Written to .project/business/market-research.md
```

---

version: 1.0.0
updated: 2026-04-05
reviewed: 2026-04-05
score: 4.5
---