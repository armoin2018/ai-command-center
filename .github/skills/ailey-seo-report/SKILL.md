---
id: 
name: ailey-seo-report
description: Comprehensive SEO analysis and reporting tool with interactive HTML, Markdown, and JSON reports
keywords: [seo-audit, web-crawler, performance-analysis, content-analysis, technical-seo, core-web-vitals]
version: 1.0.0
category: Analysis & Reporting
tags: [seo, analysis, web-crawling, reporting, performance, content-optimization]
author: AI-ley
created: Fri Jan 19 2024 18:00:00 GMT-0600 (Central Standard Time)
updated: Fri Jan 19 2024 18:00:00 GMT-0600 (Central Standard Time)
status: active
dependencies: [cheerio, lighthouse, puppeteer, axios, commander, chalk]
---
# AI-ley SEO Report Skill

Comprehensive SEO analysis and reporting tool that crawls websites, analyzes technical SEO, content quality, performance metrics, and generates actionable recommendations in multiple formats.

## Overview

The SEO Report skill provides enterprise-grade SEO auditing capabilities through a TypeScript-based toolkit. It crawls websites, collects technical data, analyzes content quality and performance metrics, calculates SEO scores, and generates detailed reports with prioritized recommendations.

### Key Features

- **Intelligent Web Crawling**: Respects robots.txt, handles authentication, follows internal links
- **Technical SEO Analysis**: HTTPS, sitemaps, robots.txt, canonical tags, structured data, broken links
- **Content Analysis**: Title tags, meta descriptions, headings, keyword optimization, readability, image optimization
- **Performance Metrics**: Core Web Vitals (LCP, FID, CLS), page speed, optimization opportunities
- **Scoring System**: 0-100 scores across 5 categories with letter grades (A-F)
- **Interactive Reports**: HTML with visualizations, Markdown summaries, JSON data, CSV exports
- **Actionable Recommendations**: Prioritized by impact and effort with implementation roadmaps
- **Extensible Architecture**: Plugin-based collectors, analyzers, and reporters

## Installation

```bash
cd .github/skills/ailey-seo-report
npm install
```

## Reference Documentation

**Skill Resources:**
- **SEO Report Instructions**: [references/seo-report.instructions.md](references/seo-report.instructions.md) - Comprehensive guide for generating SEO audit reports
- **Accessibility & SEO**: [references/accessibility-seo.md](references/accessibility-seo.md) - Integration of web accessibility best practices with SEO optimization

**AI-ley Ecosystem:**
- **SEO Expert Persona**: `.github/ai-ley/personas/marketing/seo-expert.md` - SEO strategy and optimization expertise
- **Technical Analyst Persona**: `.github/ai-ley/personas/analyst/technical-analyst.md` - Performance analysis expertise
- **Marketing Agent**: `.github/agents/ailey-marketing.agent.md` - Recommended agent for SEO workflows

**Related Skills:**
- `ailey-tools-data-converter` - Convert report formats (JSON to CSV, etc.)
- `ailey-tools-image` - Optimize images identified in reports

**Related Prompts:**
- `ailey-report-seo.prompt.md` - Generate SEO reports (delegates to this skill)


### Command Line Interface

```bash
# Basic SEO audit
npm run seo-report -- --url https://example.com

# Full audit with competitors and custom depth
npm run seo-report -- \
  --url https://example.com \
  --competitors https://competitor1.com,https://competitor2.com \
  --keywords "primary keyword,secondary keyword" \
  --depth 3 \
  --max-pages 50 \
  --output ./reports/example-audit

# Quick audit with minimal pages
npm run seo-report -- -u https://example.com -m 10 -o ./quick-audit
```

### CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--url` | `-u` | Website URL to analyze (required) | - |
| `--output` | `-o` | Output directory for reports | `./seo-reports` |
| `--max-pages` | `-m` | Maximum pages to crawl | `25` |
| `--depth` | `-d` | Maximum crawl depth | `2` |
| `--keywords` | `-k` | Comma-separated keywords to track | `[]` |
| `--competitors` | `-c` | Comma-separated competitor URLs | `[]` |
| `--focus` | `-f` | Focus areas (technical/content/performance/all) | `all` |

### Programmatic Usage

```typescript
import { analyzeSite } from './.github/skills/ailey-seo-report/scripts/seo-report.js';

const report = await analyzeSite({
  url: 'https://example.com',
  maxPages: 25,
  crawlDepth: 2,
  keywords: ['seo', 'optimization'],
  competitors: ['https://competitor.com'],
  userAgent: 'SEO-Analyzer/1.0',
  timeout: 30000,
  respectRobots: true
});

console.log(`Overall SEO Score: ${report.scores.overall}/100`);
console.log(`Health Grade: ${report.executiveSummary.healthGrade}`);
```


### HTML Report (`seo-audit-report.html`)

Interactive HTML report with:
- Executive summary with overall health score and grade
- Visual score breakdown with progress bars
- Critical issues and quick wins highlighted
- Detailed technical, content, and performance analysis
- Prioritized recommendations with implementation guides
- 30/90/180-day implementation roadmap
- Responsive design for all devices
- Print-friendly formatting

### Markdown Report (`seo-audit-summary.md`)

Clean, readable Markdown summary with:
- All report sections in structured format
- Tables for scores and technical elements
- Prioritized recommendations by category
- Implementation roadmap with timelines
- Easy to include in documentation or wikis

### JSON Data (`technical-analysis.json`)

Complete analysis data in JSON format:
- All raw data and calculated scores
- Page-level details for every crawled page
- Full recommendation list with metadata
- Programmatic access to all metrics
- Integration-ready format

### CSV Recommendations (`recommendations.csv`)

Spreadsheet-compatible recommendation export:
- ID, priority, category, title, impact, effort, timeline
- Sortable and filterable for project planning
- Import into project management tools
- Track implementation progress


### Collectors (`lib/collectors/`)

**WebCrawler** (`crawler.ts`):
- Robots.txt parsing and compliance
- Page content extraction with Cheerio
- Meta tag collection (OG, Twitter Cards, schema)
- Link analysis (internal/external, broken links)
- Image data (alt tags, lazy loading)
- Concurrent crawling with queue management

### Analyzers (`lib/analyzers/`)

**SEOScorer** (`scorer.ts`):
- 0-100 scoring across all categories
- Weighted category scores (Technical 25%, Content 30%, Performance 25%, UX 10%, Authority 10%)
- Granular subscores for specific elements
- Letter grade conversion (A-F)
- Score interpretation messages

### Reporters (`lib/reporters/`)

**HTMLReportGenerator** (`html-reporter.ts`):
- Interactive HTML with CSS styling
- Progress bar visualizations
- Color-coded scores and priorities
- Responsive layout
- Print-friendly formatting

**MarkdownReportGenerator** (`markdown-reporter.ts`):
- Clean Markdown with tables
- Section organization
- Priority indicators
- Timeline information


### Overall Score Calculation

```
Overall Score = (Technical × 0.25) + (Content × 0.30) + 
                (Performance × 0.25) + (UX × 0.10) + (Authority × 0.10)
```

### Technical SEO Score (25% weight)

Components:
- **Crawlability** (25%): Robots.txt, sitemaps, indexability, redirects
- **Site Structure** (25%): Canonical tags, broken links, URL structure
- **Mobile Optimization** (25%): Responsive design, mobile-friendly test
- **Schema Implementation** (25%): Structured data, JSON-LD, validity

### Content Score (30% weight)

Components:
- **Title Optimization** (20%): Length, keywords, uniqueness
- **Meta Descriptions** (20%): Quality, keywords, CTR potential
- **Content Quality** (30%): Word count, readability, topical depth
- **Keyword Optimization** (20%): Placement, density, relevance
- **Image Optimization** (10%): Alt tags, lazy loading, compression

### Performance Score (25% weight)

Components:
- **Core Web Vitals** (40%): LCP, FID, CLS, TTFB
- **Page Speed** (30%): Load time, time to interactive, speed index
- **Resource Optimization** (20%): Image compression, minification
- **Caching** (10%): Browser caching, CDN usage

### User Experience Score (10% weight)

Components:
- **Mobile Usability** (50%): Touch targets, viewport, text readability
- **Accessibility** (30%): ARIA labels, color contrast, keyboard navigation
- **Best Practices** (20%): HTTPS, console errors, deprecated APIs

### Authority Score (10% weight)

Components:
- **Domain Authority** (40%): Overall site authority (requires external API)
- **Backlink Quality** (40%): Quality and quantity of backlinks
- **Brand Mentions** (20%): Online brand presence and citations

**Note**: Authority metrics require integration with external SEO APIs (Moz, Ahrefs, SEMrush). Currently returns placeholder data.


### Priority Levels

- **Critical**: Major SEO issues causing significant ranking problems (fix immediately)
- **High**: Important optimizations with high impact (within 1-2 weeks)
- **Medium**: Beneficial improvements with moderate impact (within 1-3 months)
- **Low**: Nice-to-have enhancements (ongoing optimization)

### Impact Assessment

- **High Impact**: 20%+ potential traffic increase
- **Medium Impact**: 10-20% potential traffic increase
- **Low Impact**: 5-10% potential traffic increase

### Effort Estimation

- **Low Effort**: < 1 day of work
- **Medium Effort**: 1-5 days of work
- **High Effort**: 1-4 weeks of work

### Implementation Roadmap

**30-Day Quick Wins**:
- Critical and high-priority items
- Low to medium effort
- Immediate impact on rankings

**90-Day Strategic Improvements**:
- High and medium-priority items
- Medium to high effort
- Significant long-term benefits

**6-Month Goals**:
- Medium-priority items
- High effort or ongoing work
- Comprehensive optimization

**Ongoing Optimization**:
- Content updates
- Backlink building
- Performance monitoring
- Competitive analysis


### Run Test Suite

```bash
npm test
```

### Test Coverage

15 comprehensive tests covering:

1. **Type Definitions**: Verify all exports and types
2. **SEOScorer Initialization**: Class instantiation and methods
3. **Crawlability Scoring**: Technical SEO scoring logic
4. **Title Optimization**: Content scoring algorithms
5. **Content Quality**: Word count and readability scoring
6. **Grade Conversion**: Score to letter grade mapping
7. **WebCrawler Initialization**: Crawler setup and configuration
8. **HTML Reporter**: Valid HTML generation
9. **Markdown Reporter**: Valid Markdown generation
10. **Complete Data Handling**: Complex data structure support
11. **Score Interpretation**: Human-readable messages
12. **Recommendation Priority**: Priority logic validation
13. **Implementation Roadmap**: Roadmap structure validation
14. **Executive Summary**: Summary completeness
15. **Report Metadata**: Metadata integrity

### Test Fixtures

Mock data in `tests/fixtures/mock-data.ts`:
- `createMockReport()`: Standard test report
- `createComplexMockReport()`: Complex scenarios with edge cases


### Add Custom Collector

```typescript
// lib/collectors/custom-collector.ts
import type { SEOConfig } from '../types.js';

export class CustomCollector {
  async collect(config: SEOConfig): Promise<any> {
    // Your collection logic
    return data;
  }
}
```

### Add Custom Analyzer

```typescript
// lib/analyzers/custom-analyzer.ts
export class CustomAnalyzer {
  analyze(data: any): number {
    // Your analysis logic
    return score;
  }
}
```

### Add Custom Reporter

```typescript
// lib/reporters/custom-reporter.ts
import { promises as fs } from 'fs';
import type { SEOReport } from '../types.js';

export class CustomReporter {
  async generate(report: SEOReport, outputPath: string): Promise<void> {
    const content = this.format(report);
    await fs.writeFile(outputPath, content);
  }

  private format(report: SEOReport): string {
    // Your formatting logic
    return formattedContent;
  }
}
```


### Common Issues

**Issue**: Crawl blocked by robots.txt

**Solution**: Use `--respect-robots false` (only for sites you own)

```bash
npm run seo-report -- -u https://mysite.com --respect-robots false
```

**Issue**: Timeout errors on slow sites

**Solution**: Increase timeout value

```typescript
await analyzeSite({
  url: 'https://example.com',
  timeout: 60000 // 60 seconds
});
```

**Issue**: Memory issues with large sites

**Solution**: Reduce max pages and depth

```bash
npm run seo-report -- -u https://example.com -m 10 -d 1
```

## Performance Considerations

- Default crawl limit: 25 pages (adjustable with `--max-pages`)
- Average analysis time: 30-60 seconds for 25 pages
- Memory usage: ~100MB for typical sites
- Concurrent requests: 5 (configurable in crawler)
- Lighthouse runs: Skipped by default (heavy operation)

## Best Practices

1. **Start Small**: Use low page limits (10-15) for initial audits
2. **Respect Rate Limits**: Add delays between requests for large sites
3. **Review Robots.txt**: Always respect crawling rules
4. **Regular Audits**: Run monthly for ongoing optimization tracking
5. **Competitor Analysis**: Compare 2-3 competitors for benchmarking
6. **Focus Areas**: Use `--focus` flag to analyze specific aspects
7. **Baseline First**: Establish baseline scores before making changes
8. **Track Changes**: Keep historical reports for progress tracking

## Future Enhancements

- [ ] Lighthouse integration for real Core Web Vitals data
- [ ] External API integration for authority metrics (Moz, Ahrefs)
- [ ] Historical trend tracking and comparison
- [ ] PDF report generation with charts
- [ ] Email report delivery
- [ ] Scheduled automated audits
- [ ] Multi-language support
- [ ] Custom scoring weights
- [ ] A/B test impact tracking
- [ ] Google Search Console integration

## License

MIT - Part of the AI-ley toolkit

## Support

For issues, feature requests, or contributions:
- Create an issue in the AI-ley repository
- Reference: `.github/skills/ailey-seo-report`
- Documentation: This file (SKILL.md)

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-20  
**Status**: Active  
**Maintained By**: AI-ley Team

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.3
---