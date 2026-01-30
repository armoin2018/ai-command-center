---
id: ailey-seo-report
name: seoReport
description: 'Generate comprehensive SEO analysis reports with ratings, gradings, remediations and recommendations for website optimization'
agent: AI-ley Marketing
---

# Copilot Command: SEO Report Generator

> **Note**: This prompt now delegates to the **ailey-seo-report** skill for comprehensive SEO analysis.  
> Skill location: `.github/skills/ailey-seo-report/`  
> Skill documentation: `.github/skills/ailey-seo-report/SKILL.md`

## Quick Start

Use the **ailey-seo-report** skill directly for SEO audits:

```bash
# Basic SEO audit
cd .github/skills/ailey-seo-report
npm run seo-report -- --url https://example.com

# Comprehensive audit with competitors
npm run seo-report -- \
  --url https://mysite.com \
  --competitors https://competitor1.com,https://competitor2.com \
  --keywords "primary keyword,secondary keyword" \
  --max-pages 50 \
  --depth 3
```

## Skill Resources

**Primary Documentation:**
- Skill Overview: `.github/skills/ailey-seo-report/SKILL.md`
- SEO Report Instructions: `.github/skills/ailey-seo-report/references/seo-report.instructions.md`
- Accessibility & SEO Integration: `.github/skills/ailey-seo-report/references/accessibility-seo.md`

**Personas:**
- SEO Expert: `.github/ai-ley/personas/marketing/seo-expert.md`
- Technical Analyst: `.github/ai-ley/personas/analyst/technical-analyst.md`

**Agent:**
- Marketing Agent: `.github/agents/ailey-marketing.agent.md`

## What the Skill Provides

The **ailey-seo-report** skill delivers all capabilities originally defined in this prompt:

✅ **Technical SEO Analysis**: Crawlability, sitemaps, robots.txt, schema, Core Web Vitals  
✅ **Content Optimization**: Title/meta analysis, keyword optimization, header structure  
✅ **Performance Metrics**: Page speed, Core Web Vitals, resource optimization  
✅ **UX Analysis**: Mobile usability, accessibility, best practices  
✅ **Authority Assessment**: Domain authority, backlinks, brand mentions  
✅ **Competitor Analysis**: Keyword gaps, technical benchmarking  
✅ **Actionable Recommendations**: Prioritized by impact and effort  
✅ **Implementation Roadmap**: 30/90/180-day plans  
✅ **Multiple Report Formats**: HTML, Markdown, JSON, CSV

## Variables

- Folders, Files and Indexes are stored in `.github/ai-ley/ai-ley.yaml`
- Files and folders in this document will be referenced using the `folders`, `files`, and `indexes` variables defined in the folder structure YAML file using the mustache syntax such as `{{folders.plan}}`.

## Goal

Generate comprehensive SEO analysis reports using the **ailey-seo-report** skill.

Given:
- A website URL to be crawled and analyzed
- Optional focus keywords for targeted SEO evaluation
- Optional competitor URLs for comparative analysis

Produce:
- A comprehensive interactive SEO report stored in `.project/seo/{domain}/{YYYY.MM.DD}/`
- Technical SEO analysis with ratings and gradings (0-100 scale)
- Content optimization recommendations with priority levels
- Performance metrics and Core Web Vitals analysis
- Actionable remediation strategies with implementation timelines
- Multiple report formats (HTML, Markdown, JSON, CSV)

## Command

Use the **ailey-seo-report** skill for SEO audits. The skill provides all analysis capabilities below.

**Skill Location**: `.github/skills/ailey-seo-report/`  
**Documentation**: See `SKILL.md` and `references/seo-report.instructions.md`  
**Personas**: SEO Expert, Technical Analyst  
**Agent**: ailey-marketing

### Analysis Steps (Performed by ailey-seo-report skill)

The skill executes these steps automatically:

1. **Initial Setup**: URL validation, domain extraction, directory creation
2. **Technical SEO Analysis**: Crawlability, sitemaps, robots.txt, schema, Core Web Vitals
3. **Content Analysis**: Title/meta optimization, headings, keywords, images
4. **Performance Analysis**: Page speed, Core Web Vitals, resource optimization
5. **UX Analysis**: Mobile usability, accessibility, best practices
6. **Authority Analysis**: Domain authority, backlinks, brand mentions (requires API)
7. **Competitor Analysis**: Keyword gaps, technical benchmarking (optional)
8. **Report Generation**: HTML, Markdown, JSON, CSV formats
9. **Validation**: Completeness checks, scoring consistency
10. **Delivery**: Comprehensive report package in `.project/seo/{domain}/{YYYY.MM.DD}/`

**Full details**: See `.github/skills/ailey-seo-report/references/seo-report.instructions.md`

## Examples

### Example 1: Basic SEO Audit
```
/seo-report https://example.com
```

Expected Output:
```
✅ SEO Analysis Complete for example.com

Report Generated: .project/seo/example.com/2025.09.20/
- Overall SEO Score: 72/100
- Critical Issues: 3 High Priority
- Quick Wins: 8 identified
- Files Created: 6 report files

Top Recommendations:
1. [HIGH] Fix Core Web Vitals - LCP 4.2s (target <2.5s)
2. [HIGH] Optimize title tags - 15 pages missing target keywords
3. [MEDIUM] Improve internal linking - 45% pages have <3 internal links
```

### Example 2: Competitive SEO Analysis
```
/seo-report https://mystore.com --competitors https://competitor1.com,https://competitor2.com --keywords "online shopping,e-commerce,retail"
```

Expected Output:
```
✅ Competitive SEO Analysis Complete

Report Generated: .project/seo/mystore.com/2025.09.20/
- Your SEO Score: 68/100
- Competitor Average: 75/100
- Keyword Gap: 23 opportunities identified
- Content Gap: 45 topics to target

Competitive Insights:
1. Competitor1.com leads in technical SEO (85/100)
2. Missing schema markup opportunities
3. Content depth gap in product categories
4. 12 high-value keywords not targeted
```

### Example 3: Technical SEO Focus
```
/seo-report https://webapp.com --analysis-depth deep-dive --focus technical
```

Expected Output:
```
✅ Deep Technical SEO Analysis Complete

Report Generated: .project/seo/webapp.com/2025.09.20/
- Technical SEO Score: 45/100 (Needs Improvement)
- Core Web Vitals: FAILED (all metrics)
- Crawl Errors: 23 identified
- Schema Coverage: 15% implemented

Critical Technical Issues:
1. [CRITICAL] CLS score 0.45 (target <0.1)
2. [HIGH] 404 errors on 23 internal links
3. [HIGH] Missing XML sitemap
4. [MEDIUM] Render-blocking resources delay LCP
```

## Notes

- SEO analysis may take 5-15 minutes depending on site size and analysis depth
- Reports include both machine-readable data (JSON/CSV) and human-readable formats (HTML/Markdown)
- Scoring methodology based on industry standards and Google's ranking factors
- Recommendations prioritized by impact vs. effort matrix
- All report files include timestamp and methodology documentation
- Interactive HTML reports work offline and can be shared with stakeholders
- Consider website performance impact during crawling and analysis
- Respect robots.txt and crawl-delay directives during analysis
---

version: 1.0.0
updated: 2026-01-11
reviewed: 2026-01-11
score: 4.0
