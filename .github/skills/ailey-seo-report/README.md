# AI-ley SEO Report

> Comprehensive SEO analysis and reporting tool

## Quick Start

```bash
# Install dependencies
npm install

# Run SEO audit
npm run seo-report -- --url https://example.com

# Run tests
npm test
```

## Basic Usage

```bash
# Audit with output directory
npm run seo-report -- \
  --url https://example.com \
  --output ./reports/example

# Full analysis with competitors
npm run seo-report -- \
  --url https://example.com \
  --competitors https://competitor.com \
  --keywords "seo,optimization,marketing" \
  --max-pages 50
```

## Output Reports

- **HTML**: Interactive visual report
- **Markdown**: Text-based summary
- **JSON**: Complete data export
- **CSV**: Recommendations spreadsheet

## Documentation

See [SKILL.md](./SKILL.md) for complete documentation.

## Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

## Architecture

```
lib/
├── collectors/             # Data collection
│   └── crawler.ts         # Web crawler
├── analyzers/             # Analysis & scoring
│   └── scorer.ts          # SEO scoring engine
├── reporters/             # Report generation
│   ├── html-reporter.ts   # HTML reports
│   └── markdown-reporter.ts # Markdown reports
└── types.ts               # TypeScript definitions

scripts/
└── seo-report.ts          # Main CLI script

tests/
├── test-runner.ts         # Test suite
└── fixtures/              # Mock data
    └── mock-data.ts
```

## Key Features

✅ Intelligent web crawling with robots.txt support  
✅ Technical SEO analysis (HTTPS, sitemaps, canonical tags)  
✅ Content quality scoring (titles, meta, readability)  
✅ Performance metrics (Core Web Vitals)  
✅ Prioritized recommendations with roadmaps  
✅ Multiple report formats (HTML, Markdown, JSON, CSV)  
✅ Extensible plugin architecture  
✅ Comprehensive test coverage (15 tests passing)

## Scoring

- **Overall**: 0-100 score with letter grade (A-F)
- **Technical SEO**: 25% weight
- **Content**: 30% weight
- **Performance**: 25% weight
- **User Experience**: 10% weight
- **Authority**: 10% weight

## License

MIT - Part of the AI-ley toolkit
