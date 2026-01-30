---
name: 'SEO Report Instructions'
description: 'Comprehensive instructions for generating SEO audit reports using ailey-seo-report skill'
applyTo: 'web-analysis, seo-audits, performance-optimization'
---

# SEO Report Generation Instructions

## Overview

This instruction file provides comprehensive guidance for generating SEO audit reports using the **ailey-seo-report** skill. Follow these instructions to produce thorough, actionable SEO analysis reports.

## Prerequisites

- ailey-seo-report skill installed: `.github/skills/ailey-seo-report/`
- Dependencies installed: `npm install` in skill directory
- Target website URL accessible for crawling
- Robots.txt permissions verified (if applicable)

## Report Generation Process

### 1. Initial Setup and Validation

**Directory Structure:**
```
.project/seo/{domain}/{YYYY.MM.DD}/
  ├── seo-audit-report.html      # Interactive HTML report
  ├── seo-audit-summary.md        # Markdown summary
  ├── technical-analysis.json     # Structured data
  ├── recommendations.csv         # Actionable items
  └── performance-metrics.json    # Core Web Vitals data
```

**URL Validation:**
- Extract domain name for directory organization
- Validate URL accessibility and basic crawling permissions
- Identify website platform/CMS (WordPress, Shopify, Next.js, etc.)
- Check robots.txt for crawl restrictions
- Perform initial site reconnaissance

### 2. Technical SEO Analysis

Execute comprehensive technical audit covering:

**Core Technical Elements:**
- **Crawlability**: Robots.txt compliance, XML sitemap validation, indexability assessment
- **Site Structure**: URL hierarchy, canonical tags, redirects, broken links
- **Mobile Optimization**: Responsive design, mobile-first indexing compatibility, viewport configuration
- **Schema Markup**: JSON-LD implementation, structured data types, rich snippet eligibility
- **Core Web Vitals**: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)

**Technical Scoring Components (0-100 scale):**
- Crawlability Score (25% of Technical)
- Site Structure Score (25% of Technical)
- Mobile Optimization Score (25% of Technical)
- Schema Implementation Score (25% of Technical)

**Weight**: Technical SEO = 25% of Overall Score

### 3. On-Page Content Analysis

Perform detailed content evaluation:

**Content Quality Assessment:**
- **Title Tags**: Length (50-60 characters), keyword placement, uniqueness across pages
- **Meta Descriptions**: Length (150-160 characters), CTR optimization, keyword usage
- **Header Structure**: H1 uniqueness, H2-H6 hierarchy, keyword distribution
- **Content Depth**: Word count (min 300 words), topical coverage, readability (Flesch-Kincaid)
- **Keyword Optimization**: Primary/secondary keyword placement, semantic variations, keyword stuffing detection
- **Image Optimization**: Alt text presence, file size, lazy loading, format optimization (WebP, AVIF)

**Content Scoring Components (0-100 scale):**
- Title Optimization Score (20% of Content)
- Meta Description Quality Score (20% of Content)
- Content Quality Score (30% of Content)
- Keyword Optimization Score (20% of Content)
- Image SEO Score (10% of Content)

**Weight**: Content = 30% of Overall Score

### 4. Performance Analysis

Analyze UX factors impacting SEO:

**Performance Metrics:**
- **Core Web Vitals Breakdown**:
  - LCP: Target < 2.5s (Good), 2.5s-4.0s (Needs Improvement), > 4.0s (Poor)
  - FID: Target < 100ms (Good), 100ms-300ms (Needs Improvement), > 300ms (Poor)
  - CLS: Target < 0.1 (Good), 0.1-0.25 (Needs Improvement), > 0.25 (Poor)
- **Page Speed**: Load time, time to interactive, speed index, first contentful paint
- **Resource Optimization**: Image compression, CSS/JS minification, render-blocking resources
- **Caching**: Browser caching headers, CDN implementation, service worker usage

**Performance Scoring Components (0-100 scale):**
- Core Web Vitals Score (40% of Performance)
- Page Speed Score (30% of Performance)
- Resource Optimization Score (20% of Performance)
- Caching Score (10% of Performance)

**Weight**: Performance = 25% of Overall Score

### 5. User Experience Analysis

Evaluate UX factors:

**UX Metrics:**
- **Mobile Usability**: Touch target sizes (min 48x48px), viewport configuration, text readability
- **Accessibility**: ARIA labels, color contrast (WCAG AA), keyboard navigation, alt text
- **Best Practices**: HTTPS implementation, console errors, deprecated APIs, security headers

**UX Scoring Components (0-100 scale):**
- Mobile Usability Score (50% of UX)
- Accessibility Score (30% of UX)
- Best Practices Score (20% of UX)

**Weight**: User Experience = 10% of Overall Score

### 6. Authority Analysis

Evaluate off-page SEO factors:

**Authority Metrics:**
- **Domain Authority**: Overall site authority (0-100 scale)
- **Backlink Profile**: Quality, quantity, diversity of referring domains
- **Brand Mentions**: Online brand presence, unlinked mentions, citations
- **Local SEO**: NAP consistency, Google Business Profile, local citations (if applicable)

**Authority Scoring Components (0-100 scale):**
- Domain Authority Score (40% of Authority)
- Backlink Quality Score (40% of Authority)
- Brand Mention Score (20% of Authority)

**Weight**: Authority = 10% of Overall Score

**Note**: Authority metrics require external API integration (Moz, Ahrefs, SEMrush). Skill returns placeholder data without API keys.

### 7. Competitor Analysis (Optional)

If competitor URLs provided:

**Comparative Metrics:**
- Keyword gap analysis (keywords competitors rank for, but target site doesn't)
- Content strategy comparison (topic coverage, content depth)
- Technical implementation benchmarking (schema, performance, mobile)
- Backlink profile comparison (authority, diversity, anchor text)
- SERP positioning analysis (shared keywords, ranking differences)

### 8. Report Generation

Create comprehensive SEO audit report:

**Executive Summary:**
- Overall SEO Health Score (0-100)
- Letter Grade (A-F based on score)
- Top 5 critical issues requiring immediate attention
- Quick wins for immediate improvement (low effort, high impact)
- Long-term strategic recommendations

**Detailed Analysis Sections:**
1. **Technical SEO Analysis**
   - Detailed technical findings with examples
   - Core Web Vitals performance breakdown
   - Mobile optimization assessment
   - Schema markup implementation status
   - Critical technical issues and remediation steps

2. **Content Optimization Report**
   - Page-by-page content analysis
   - Keyword optimization opportunities
   - Content gap identification
   - Title and meta description recommendations
   - Header structure improvements

3. **Performance and UX Analysis**
   - Page speed optimization recommendations
   - User experience improvements
   - Accessibility compliance review
   - Mobile usability enhancements

4. **Authority and Off-Page Analysis**
   - Backlink profile assessment
   - Link building opportunities
   - Brand mention analysis
   - Local SEO recommendations (if applicable)

5. **Competitor Insights** (if applicable)
   - Competitive positioning analysis
   - Keyword gap opportunities
   - Content strategy recommendations
   - Technical advantage identification

6. **Actionable Recommendations**
   - Prioritized action items (Critical, High, Medium, Low)
   - Implementation timelines and effort estimates
   - Required resources and team assignments
   - Success measurement criteria

7. **Implementation Roadmap**
   - 30-day quick wins (critical + high priority, low-medium effort)
   - 90-day strategic improvements (high-medium priority, medium-high effort)
   - 6-month goals (medium priority, high effort)
   - Ongoing optimization (content, backlinks, monitoring)

### 9. Output File Formats

Generate all report files in output directory:

**HTML Report** (`seo-audit-report.html`):
- Interactive, responsive design
- Visual score breakdown with progress bars
- Color-coded priorities (red=critical, orange=high, yellow=medium, green=low)
- Expandable sections for detailed findings
- Print-friendly formatting

**Markdown Summary** (`seo-audit-summary.md`):
- Clean, structured format
- Tables for scores and metrics
- Prioritized recommendations by category
- Implementation roadmap with timelines
- Easy to include in wikis/documentation

**JSON Data** (`technical-analysis.json`):
- Complete analysis data
- Page-level details for every crawled page
- All calculated scores and subscores
- Full recommendation list with metadata
- Programmatic access ready

**CSV Recommendations** (`recommendations.csv`):
- Spreadsheet-compatible format
- Columns: ID, Priority, Category, Title, Impact, Effort, Timeline
- Sortable and filterable
- Import into project management tools

**Performance Metrics** (`performance-metrics.json`):
- Core Web Vitals data
- Page speed metrics
- Resource optimization details
- Caching analysis

### 10. Validation and Quality Assurance

**Report Completeness Checks:**
- [ ] All scoring categories present (Technical, Content, Performance, UX, Authority)
- [ ] Overall score calculated correctly (weighted average)
- [ ] Letter grade assigned (A: 90-100, B: 80-89, C: 70-79, D: 60-69, F: 0-59)
- [ ] Minimum 5 recommendations provided
- [ ] Critical issues identified and prioritized
- [ ] Implementation roadmap includes 30/90/180-day items
- [ ] All output files generated successfully
- [ ] Metadata includes timestamp, analyzed URL, page count

**Data Accuracy Checks:**
- [ ] Technical findings verified against actual page source
- [ ] Performance metrics from real measurements (not estimated)
- [ ] Content scoring based on actual page content
- [ ] Recommendations actionable and specific
- [ ] No duplicate recommendations
- [ ] Competitor data accurate (if provided)

### 11. Usage Examples

**Basic SEO Audit:**
```bash
cd .github/skills/ailey-seo-report
npm run seo-report -- --url https://example.com
```

**Comprehensive Audit with Competitors:**
```bash
npm run seo-report -- \
  --url https://mysite.com \
  --competitors https://competitor1.com,https://competitor2.com \
  --keywords "primary keyword,secondary keyword" \
  --max-pages 50 \
  --depth 3
```

**Quick Technical Focus:**
```bash
npm run seo-report -- \
  --url https://webapp.com \
  --focus technical \
  --max-pages 10 \
  --depth 1
```

**Programmatic Usage:**
```typescript
import { analyzeSite } from './.github/skills/ailey-seo-report/scripts/seo-report.js';

const report = await analyzeSite({
  url: 'https://example.com',
  maxPages: 25,
  crawlDepth: 2,
  keywords: ['seo', 'optimization'],
  competitors: ['https://competitor.com']
});

console.log(`Overall Score: ${report.scores.overall}/100`);
console.log(`Grade: ${report.executiveSummary.healthGrade}`);
console.log(`Critical Issues: ${report.executiveSummary.criticalIssues.length}`);
```

## Scoring Methodology

### Overall Score Formula

```
Overall Score = (Technical × 0.25) + (Content × 0.30) + 
                (Performance × 0.25) + (UX × 0.10) + (Authority × 0.10)
```

### Grade Conversion

- **A (90-100)**: Excellent SEO health, minimal issues
- **B (80-89)**: Good SEO health, minor improvements needed
- **C (70-79)**: Average SEO health, moderate issues present
- **D (60-69)**: Poor SEO health, significant issues
- **F (0-59)**: Critical SEO health, major overhaul needed

### Priority Assignment Logic

**Critical Priority:**
- Security issues (no HTTPS)
- Major technical errors (broken canonical, noindex on important pages)
- Core Web Vitals failures (all metrics poor)
- Crawlability blockers (robots.txt blocking important pages)

**High Priority:**
- Missing or poor title tags/meta descriptions on important pages
- Slow page speed (LCP > 4s, CLS > 0.25)
- Mobile usability issues
- Missing schema markup on key pages
- Broken internal links (404s)

**Medium Priority:**
- Suboptimal content length (< 300 words on key pages)
- Missing alt text on images
- Inefficient resource loading
- Missing canonical tags
- Accessibility issues (WCAG AA violations)

**Low Priority:**
- Content improvements (readability, keyword optimization)
- Image optimization opportunities
- Minor accessibility enhancements
- Additional schema markup types

## Best Practices

1. **Start with Baseline**: Run initial audit before making changes
2. **Regular Cadence**: Monthly audits for tracking progress
3. **Focus First**: Use `--focus` flag for targeted analysis
4. **Respect Limits**: Start with low page counts (10-25) for large sites
5. **Track Changes**: Keep historical reports for trend analysis
6. **Prioritize Impact**: Address critical and high-priority items first
7. **Validate Results**: Cross-reference with Google Search Console
8. **Document Changes**: Track implementations and measure results

## Troubleshooting

**Issue**: Crawl blocked by robots.txt  
**Solution**: Verify ownership, use `--respect-robots false` for owned sites

**Issue**: Timeout errors on slow sites  
**Solution**: Increase timeout value in config

**Issue**: Memory issues with large sites  
**Solution**: Reduce `--max-pages` and `--depth` parameters

**Issue**: Missing authority scores  
**Solution**: Authority metrics require external API integration (placeholder data without API keys)

## Integration with AI-ley Ecosystem

**Personas to Reference:**
- `.github/ai-ley/personas/marketing/seo-expert.md` - SEO strategy and optimization
- `.github/ai-ley/personas/analyst/technical-analyst.md` - Performance analysis

**Related Skills:**
- `ailey-data-converter` - Convert report formats (JSON to CSV, etc.)
- `ailey-image-tool` - Optimize images identified in reports

**Related Prompts:**
- `ailey-report-seo.prompt.md` - Generate SEO reports (redirects to this skill)

## Performance Expectations

- **Analysis Time**: 30-60 seconds for 25 pages
- **Memory Usage**: ~100MB for typical sites
- **Concurrent Requests**: 5 (adjustable)
- **Default Crawl Limit**: 25 pages (adjustable with `--max-pages`)
- **Report Generation**: < 5 seconds after analysis complete

---

version: 1.0.0  
updated: 2026-01-29  
reviewed: 2026-01-29  
score: 4.5
