---
name: 'Quality Scoring Guide'
description: 'Quality assessment methodology and scoring criteria for AI-ley kit resources'
---

# Quality Scoring Guide

## Overview

The AI-ley Admin Optimize Kit uses a comprehensive quality scoring system to assess resource content across six dimensions. This guide explains the methodology and how to improve scores.

## Scoring Dimensions

### 1. Clarity (20% weight)

**What it measures**: How easily users can understand the content

**Assessment Criteria:**
- Heading quality (length, descriptiveness)
- Paragraph length (readability)
- Jargon explanation (accessibility)

**Perfect Score (5.0)**:
- All headings 10-100 characters
- All paragraphs < 200 words
- All acronyms/jargon explained

**Common Deductions**:
- Unclear headings (< 10 or > 100 chars): -0.1 each
- Long paragraphs (> 200 words): -0.2 each
- Unexplained jargon: -0.1 per term

**Improvement Tips**:
- Use descriptive headings: "Installation" → "Installation and Setup"
- Break long paragraphs into smaller chunks
- Define acronyms on first use: "MCP (Model Context Protocol)"
- Add explanatory notes for technical terms

### 2. Conciseness (15% weight)

**What it measures**: Efficiency of content delivery

**Assessment Criteria:**
- Line count (target ≤ 300)
- Content redundancy
- Wordy phrase usage

**Perfect Score (5.0)**:
- ≤ 300 lines
- No redundant sentences
- No wordy phrases

**Common Deductions**:
- Lines > 300: -(lines - 300)/100 up to -2.0
- Redundant content: -2.0 × redundancy ratio
- Wordy phrases: -0.2 each

**Improvement Tips**:
- Extract code blocks to `scripts/` directories
- Extract examples to `examples/` directories
- Remove redundant explanations
- Replace wordy phrases:
  - "in order to" → "to"
  - "due to the fact that" → "because"
  - "at this point in time" → "now"
  - "for the purpose of" → "for"

### 3. Accuracy (25% weight)

**What it measures**: Correctness and precision of content

**Assessment Criteria:**
- Link validity
- Terminology consistency
- Language precision

**Perfect Score (5.0)**:
- All links valid
- Consistent terminology
- Precise language (no vague terms)

**Common Deductions**:
- Inconsistent terminology: -0.2 per variant
- Vague language ("might", "maybe", "probably"): -0.1 each
- Broken links (estimated): -0.5 each

**Improvement Tips**:
- Use consistent terminology:
  - "AI-ley" (not "ailey", "AILEY", "ai-ley")
  - "TypeScript" (not "typescript", "Typescript")
  - "MCP" (not "mcp", "Mcp")
- Replace vague language:
  - "might work" → "works" or "does not work"
  - "probably correct" → "correct" or "verify"
  - "maybe useful" → specific use cases
- Verify all internal and external links

### 4. Reference Material (15% weight)

**What it measures**: Supporting documentation and examples

**Assessment Criteria:**
- Citations and links
- Code examples
- Structured data (tables, lists)

**Perfect Score (5.0)**:
- 10+ citations/links
- 5+ code examples
- 10+ tables/structured lists

**Common Additions**:
- Citations/links: +0.1 each up to +1.0
- Code examples: +0.2 each up to +1.0
- Tables/lists: +0.05 each up to +0.5

**Improvement Tips**:
- Add links to related resources
- Include code examples for key concepts
- Use tables for comparisons and reference data
- Add structured lists for steps and options
- Link to external documentation and standards

### 5. Sufficiency (15% weight)

**What it measures**: Completeness and adequacy of content

**Assessment Criteria:**
- Content length (lines and words)
- Structural completeness (headings)
- Example presence

**Perfect Score (5.0)**:
- 50-300 lines
- 500-3000 words
- 3+ heading levels
- Includes examples

**Common Additions**:
- Adequate line count (50-300): +1.0
- Adequate word count (500-3000): +1.0
- Sufficient headings (3+): +0.5
- Includes examples: +0.5

**Improvement Tips**:
- Aim for 100-250 lines (sweet spot)
- Include introduction, workflows, examples, reference
- Use heading hierarchy (H1 → H2 → H3)
- Add at least one example per major concept
- Balance depth with conciseness

### 6. No Conjunctions (10% weight)

**What it measures**: Avoidance of problematic conjunctions

**Assessment Criteria:**
- Problematic conjunction usage

**Perfect Score (5.0)**:
- Zero problematic conjunctions

**Common Deductions**:
- "and/or": -0.5 each
- "but also": -0.5 each
- "as well as": -0.5 each

**Improvement Tips**:
- Replace "and/or" with specific alternatives:
  - "A and/or B" → "A, B, or both"
  - "X and/or Y" → "X or Y (or both)"
- Replace "but also" with clearer phrasing:
  - "not only X but also Y" → "X and Y"
- Replace "as well as" with "and":
  - "A as well as B" → "A and B"

## Overall Score Calculation

### Formula

```
Overall = (Clarity × 0.20) + (Conciseness × 0.15) + 
          (Accuracy × 0.25) + (References × 0.15) + 
          (Sufficiency × 0.15) + (NoConjunctions × 0.10)
```

### Weights Rationale

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Accuracy | 25% | Correctness is paramount |
| Clarity | 20% | Understanding is critical |
| Conciseness | 15% | Efficiency matters |
| References | 15% | Supporting material aids learning |
| Sufficiency | 15% | Completeness ensures value |
| No Conjunctions | 10% | Minor but measurable quality factor |

### Score Interpretation

| Score | Grade | Interpretation |
|-------|-------|----------------|
| 5.0 | A+ | Perfect or near-perfect |
| 4.5-4.9 | A | Excellent quality |
| 4.0-4.4 | A- | Very good quality |
| 3.5-3.9 | B+ | Good quality |
| 3.0-3.4 | B | Satisfactory quality |
| 2.5-2.9 | C+ | Acceptable with issues |
| 2.0-2.4 | C | Needs improvement |
| 1.5-1.9 | D | Poor quality |
| 0.0-1.4 | F | Unacceptable |

## Optimization Strategies

### For Low Clarity (< 3.0)

1. Review all headings for descriptiveness
2. Break long paragraphs (> 200 words)
3. Add explanations for technical terms
4. Use bulleted lists for complex information
5. Add visual separators (horizontal rules, sections)

### For Low Conciseness (< 3.0)

1. Extract code blocks to `scripts/` directories
2. Extract examples to `examples/` directories
3. Remove redundant explanations
4. Replace wordy phrases with concise alternatives
5. Combine related sections

### For Low Accuracy (< 3.0)

1. Verify all links and references
2. Standardize terminology throughout
3. Replace vague language with specifics
4. Add citations for claims
5. Review for factual errors

### For Low References (< 3.0)

1. Add code examples for key concepts
2. Link to related resources
3. Create tables for reference data
4. Add structured lists for procedures
5. Include external documentation links

### For Low Sufficiency (< 3.0)

1. Expand key sections with details
2. Add introduction and overview sections
3. Include examples for major workflows
4. Add troubleshooting section
5. Create comprehensive command reference

### For Low No Conjunctions (< 3.0)

1. Find and replace "and/or" with specific alternatives
2. Rewrite "but also" constructions
3. Replace "as well as" with "and"
4. Review for other problematic conjunctions

## Continuous Improvement

### Monthly Review Cycle

1. **Week 1**: Run AI review on all resources
2. **Week 2**: Focus on resources scoring < 3.0
3. **Week 3**: Optimize mid-tier resources (3.0-4.0)
4. **Week 4**: Refine high-quality resources (4.0-5.0)

### Tracking Progress

Use optimizer to generate baseline scores:

```bash
npm run optimize all -- --ai-review --dry-run > baseline.txt
```

After improvements, re-run and compare:

```bash
npm run optimize all -- --ai-review --dry-run > improved.txt
diff baseline.txt improved.txt
```

### Quality Goals

- **Minimum acceptable**: 3.0 overall
- **Target for all resources**: 4.0 overall
- **Excellence threshold**: 4.5 overall
- **Perfect**: 5.0 overall (rare but achievable)

---

version: 1.0.0  
updated: 2026-01-29  
reviewed: 2026-01-29  
score: 4.5
