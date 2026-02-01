# AI-ley Web Crawler Summary

## Overview

The **AI-ley Web Crawler** is a production-grade web scraping and content downloading tool built with TypeScript, Puppeteer, and Cheerio. It provides advanced crawling capabilities with fine-grained control over depth, parallelization, filtering, authentication, and resource limits.

## Core Features

### 1. Depth Control
- Configurable max crawl depth (default: 3 levels)
- Breadth-first URL queue traversal
- Depth tracking for each discovered URL

### 2. Parallelization
- Concurrent request processing with `p-queue`
- Configurable max concurrent requests (default: 5, recommended: 5-20)
- Request delay control (default: 1000ms)
- Automatic retry with exponential backoff

### 3. Pattern Filtering
- Include URL patterns: `/docs/**`, `/api/**`
- Exclude URL patterns: `/admin/**`, `*.pdf`
- Wildcard support: `*` (one segment), `**` (any segments), `?` (one char)
- Custom filter functions for complex logic

### 4. Cross-Site Crawling
- Optional cross-domain navigation
- Allowed domains whitelist
- Automatic same-domain restriction by default

### 5. File Type Filtering
- Allowed file types: `html`, `htm`, `pdf`, `txt`, etc.
- MIME type detection with `mime-types`
- Binary vs. text content handling

### 6. Authentication
- **Basic Auth**: HTTP Basic Authentication
- **Bearer Token**: JWT/API token authentication
- **Form Login**: Automated form-based login with Puppeteer
- **Cookie Auth**: Pre-configured session cookies

### 7. Binary Downloads
- Optional binary file downloads (images, videos, PDFs)
- Binary extension filter: `jpg`, `png`, `svg`, `mp4`, etc.
- Max file size limit (default: 100 MB)

### 8. Resource Limits
- Max pages to crawl (default: 1000)
- Max crawl duration in minutes (default: 60)
- Max file size per download (default: 100 MB)
- Max total download size (default: 10 GB)

### 9. Browser Configuration
- Headless Chrome via Puppeteer
- Custom user agent strings
- Viewport configuration (width, height)
- JavaScript enable/disable
- Wait conditions: `load`, `domcontentloaded`, `networkidle0`, `networkidle2`
- Custom HTTP headers
- Timeout configuration

### 10. Robots.txt Compliance
- Automatic `robots.txt` fetching and parsing
- Respect `Disallow` rules
- Apply `Crawl-delay` directives
- User-agent specific rules
- Optional override with min crawl delay

### 11. Output Options
- Save HTML content (with optional gzip compression)
- Save metadata JSON (URL, title, links, images, timestamps)
- Save screenshots (PNG or JPEG)
- Compression reduces disk usage by 70-90%

### 12. Performance Optimization
- Hybrid architecture: Puppeteer for JS-heavy sites, Axios/Cheerio for static HTML
- Intelligent queue management with `p-queue`
- Configurable concurrency and rate limiting
- Memory-efficient streaming for large files

## Technology Stack

### Core Dependencies
- **TypeScript 5.3.3**: Type-safe development
- **Puppeteer 21.6.0**: Headless Chrome automation for JavaScript-heavy sites
- **Axios 1.6.0**: HTTP client for simple requests
- **Cheerio 1.0.0-rc.12**: Fast HTML parsing for static content
- **p-queue 8.0.1**: Promise-based queue for parallelization control

### Utility Libraries
- **url-pattern 1.0.3**: URL pattern matching for filters
- **mime-types 2.1.35**: File type detection
- **robots-parser 3.0.1**: robots.txt parsing and compliance
- **commander 11.0.0**: CLI framework
- **chalk 5.3.0**: Terminal output styling
- **dotenv 16.3.1**: Environment variable management

## Architecture

### WebCrawler Class

Main class with event-driven architecture:

```typescript
class WebCrawler extends EventEmitter {
  constructor(config: CrawlerConfig)
  
  // Control
  start(): Promise<CrawlStats>
  pause(): void
  resume(): void
  stop(): void
  
  // Status
  getStats(): CrawlStats
  isRunning(): boolean
  isPaused(): boolean
  
  // Output
  generateSitemap(path: string): Promise<void>
  exportLinks(path: string): Promise<void>
  getVisitedUrls(): string[]
}
```

### Event System

Real-time progress monitoring:

- `page-crawled` - Page successfully crawled
- `file-downloaded` - File downloaded
- `link-discovered` - New URL found
- `error` - Error occurred
- `page-error` - HTTP error
- `complete` - Crawl completed
- `paused`, `resumed`, `stopped` - State changes

### Crawl Algorithm

1. **Initialization**: Load robots.txt, authenticate, create output directory
2. **Queue Management**: BFS queue with depth tracking and visited set
3. **URL Filtering**: Apply include/exclude patterns, domain checks, file type filters
4. **Request Execution**: Use Puppeteer for JS sites, Axios for static sites
5. **Content Extraction**: Parse HTML with Cheerio, extract links and images
6. **Content Saving**: Write HTML, metadata JSON, optional screenshots
7. **Link Enqueueing**: Add discovered links to queue with incremented depth
8. **Completion**: Generate stats, close browser, emit complete event

## CLI Commands

### 1. setup
Interactive setup wizard for `.env` configuration.

### 2. crawl
Full-featured website crawling with all options:
- Depth control, page limits, duration limits
- Parallelization, request delay
- Include/exclude patterns
- Cross-site crawling
- Authentication (basic, bearer, form, cookie)
- Binary downloads
- Browser configuration
- Robots.txt compliance

### 3. sitemap
Generate XML sitemap from crawled URLs:
- Fast link discovery mode (no downloads)
- Configurable priority and change frequency
- XML format compatible with search engines

### 4. download
Download specific file types:
- Target file types: PDF, DOC, images, etc.
- Max file size and count limits
- Metadata tracking

### 5. spider
Fast link discovery without full page downloads:
- High concurrency (default: 20)
- JavaScript disabled for speed
- JSON output with all discovered URLs

### 6. diagnose
System diagnostics and configuration check:
- Node.js version check
- Dependency verification
- Environment variable validation
- Proxy and authentication testing

## File Structure

```
ailey-tools-web-crawl/
├── package.json          # NPM configuration and dependencies
├── tsconfig.json         # TypeScript compiler configuration
├── .env.example          # Environment variable template
├── .gitignore            # Git exclusion rules
├── SKILL.md              # Comprehensive documentation
├── README.md             # Quick start guide
├── QUICK_REFERENCE.md    # Command reference
├── SUMMARY.md            # Project overview (this file)
├── install.sh            # Automated installation script
└── src/
    ├── index.ts          # WebCrawler class and core logic
    └── cli.ts            # CLI commands and option parsing
```

## Output Structure

```
./crawled/
├── example.com/
│   ├── index.html
│   ├── index.meta.json
│   ├── index.png (if screenshots enabled)
│   ├── docs/
│   │   ├── guide.html
│   │   ├── guide.meta.json
│   └── api/
│       ├── reference.html
│       └── reference.meta.json
```

### Metadata Format

Each crawled page generates a `.meta.json` file:

```json
{
  "url": "https://example.com/docs/guide",
  "title": "User Guide",
  "depth": 2,
  "timestamp": "2026-02-01T10:30:00Z",
  "statusCode": 200,
  "contentType": "text/html; charset=utf-8",
  "size": 45678,
  "links": ["https://example.com/api", "https://example.com/tutorial"],
  "images": ["https://example.com/logo.png", "https://example.com/diagram.svg"]
}
```

## Performance Guidelines

### Small Sites (< 1,000 pages)
- Max concurrent: 3-5
- Request delay: 1000ms
- Expected speed: 30-50 pages/min

### Medium Sites (1,000 - 10,000 pages)
- Max concurrent: 5-10
- Request delay: 500-1000ms
- Expected speed: 60-100 pages/min

### Large Sites (> 10,000 pages)
- Max concurrent: 10-20
- Request delay: 200-500ms
- Expected speed: 100-200 pages/min

### Optimization Tips

1. **Increase Concurrency**: Higher `maxConcurrent` for faster crawls
2. **Disable JavaScript**: Set `javascriptEnabled: false` for static sites
3. **Skip Binaries**: Set `downloadBinaries: false` to skip images/videos
4. **Enable Compression**: Reduce disk usage by 70-90%
5. **Use Axios Mode**: Puppeteer slower; use Axios for simple HTML

## Use Cases

### 1. Documentation Archival
Download entire documentation sites for offline access:
```typescript
const crawler = new WebCrawler({
  startUrl: 'https://docs.example.com',
  maxDepth: 5,
  includePatterns: ['/docs/**'],
  compressOutput: true
});
```

### 2. Content Migration
Extract content from legacy sites:
```typescript
const crawler = new WebCrawler({
  startUrl: 'https://old-site.com',
  authentication: { type: 'basic', username: 'admin', password: 'pass' },
  saveMetadata: true
});
```

### 3. SEO Analysis
Crawl sites for SEO auditing:
```typescript
const crawler = new WebCrawler({
  startUrl: 'https://example.com',
  maxDepth: 10,
  saveMetadata: true,
  saveScreenshots: true
});
```

### 4. Research Data Collection
Gather data from multiple sources:
```typescript
const crawler = new WebCrawler({
  startUrl: 'https://research.example.com',
  allowCrossSite: true,
  allowedDomains: ['research.example.com', 'papers.example.com'],
  downloadBinaries: true,
  binaryExtensions: ['pdf']
});
```

### 5. Sitemap Generation
Build comprehensive site maps:
```typescript
const crawler = new WebCrawler({
  startUrl: 'https://example.com',
  maxDepth: 5,
  saveHtml: false,
  saveMetadata: false
});
await crawler.start();
await crawler.generateSitemap('sitemap.xml');
```

## Authentication Workflows

### Basic Authentication
HTTP Basic Auth for simple protected sites:
```bash
npm run crawl -- --url "https://example.com" --auth-type basic --auth-user admin --auth-pass secret
```

### Bearer Token
API token authentication:
```bash
npm run crawl -- --url "https://api.example.com" --auth-type bearer --auth-token "eyJhbGci..."
```

### Form-Based Login
Automated login form submission:
```typescript
authentication: {
  type: 'form',
  loginUrl: 'https://example.com/login',
  username: 'user',
  password: 'pass',
  usernameField: '#email',
  passwordField: '#password',
  submitSelector: 'button[type="submit"]'
}
```

### Cookie-Based Sessions
Pre-authenticated sessions with cookies:
```typescript
authentication: {
  type: 'cookie',
  cookies: [
    { name: 'session_id', value: 'abc123', domain: '.example.com' }
  ]
}
```

## Error Handling

### Automatic Retry
- Configurable retry attempts (default: 3)
- Exponential backoff with retry delay
- Retry on specific HTTP status codes: 408, 429, 500, 502, 503, 504

### Error Events
- `error` event with error details and context
- `page-error` event for HTTP errors (404, 403, etc.)
- Graceful degradation: skip failed pages and continue

### Timeout Management
- Per-page timeout (default: 30 seconds)
- Navigation timeout (default: 60 seconds)
- Automatic timeout on max duration limit

## Resource Management

### Memory Optimization
- Streaming file writes to avoid memory bloat
- Gzip compression for HTML content
- Browser instance pooling with cleanup

### Disk Space
- Configurable max total size limit
- Per-file size limits
- Optional compression (70-90% reduction)

### Network Efficiency
- Respect robots.txt crawl delays
- Configurable request rate limiting
- Connection pooling and reuse

## Statistics Tracking

Real-time crawl statistics:

```typescript
{
  pagesVisited: 542,
  pagesQueued: 612,
  filesDownloaded: 438,
  totalSizeMB: 1234.56,
  elapsedMinutes: 12.5,
  pagesPerMinute: 43.4,
  errors: 8,
  startTime: Date,
  endTime: Date
}
```

## Compliance and Best Practices

### Robots.txt
- Automatic fetching and parsing
- Respect `Disallow` rules
- Apply `Crawl-delay` directives
- User-agent specific compliance

### Rate Limiting
- Configurable request delay between pages
- Respect server crawl-delay headers
- Throttle based on robots.txt

### Ethical Crawling
- Identify bot with user agent: `Mozilla/5.0 (compatible; AIleyBot/1.0)`
- Respect rate limits to avoid overwhelming servers
- Check `robots.txt` before crawling
- Use appropriate concurrency levels

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Slow crawling | Low concurrency | Increase `maxConcurrent` to 10-20 |
| Rate limited | Too fast | Increase `requestDelay`, lower `maxConcurrent` |
| 403 Forbidden | Bot detected | Change `userAgent`, add custom `headers` |
| Memory issues | Too many concurrent requests | Reduce `maxConcurrent`, enable `compressOutput` |
| Timeout errors | Slow pages or network | Increase `browser.timeout` |
| Missing content | JavaScript required | Enable `javascriptEnabled` (default: true) |
| Auth fails | Wrong credentials | Verify credentials, test login manually |
| Robots blocks | Disallowed by robots.txt | Check robots.txt, set `respectRobotsTxt: false` if allowed |

## Future Enhancements

Potential improvements:

1. **Incremental Crawls**: Detect and crawl only changed pages
2. **Scheduling**: Cron-based periodic crawling
3. **Change Detection**: Compare with previous crawls
4. **Distributed Crawling**: Multi-machine coordination
5. **Advanced Selectors**: CSS/XPath selectors for content extraction
6. **Database Integration**: Store crawl data in databases
7. **Webhook Notifications**: Real-time crawl progress notifications
8. **Cloud Storage**: S3/GCS integration for output storage

## Resources

- **Documentation**: [SKILL.md](./SKILL.md)
- **Quick Start**: [README.md](./README.md)
- **Command Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Puppeteer**: [pptr.dev](https://pptr.dev/)
- **Cheerio**: [cheerio.js.org](https://cheerio.js.org/)
- **Robots.txt**: [robotstxt.org](https://www.robotstxt.org/)

---

**Version**: 1.0.0  
**Updated**: 2026-02-01  
**Maintained by**: AI-ley Toolkit  
**License**: See main repository
