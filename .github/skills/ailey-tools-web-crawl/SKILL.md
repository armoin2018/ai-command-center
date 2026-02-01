---
name: ailey-tools-web-crawl
description: Advanced web crawler with depth control, pattern filtering, parallelization, authentication, and resource limits. Crawl websites with custom browser settings, download files, respect robots.txt, and handle cross-site navigation. Use when downloading web content, building sitemaps, or archiving websites.
keywords: [web-crawler, spider, scraper, download, parallel, puppeteer, authentication, sitemap, robots-txt]
tools: [execute, read, write]
---

# AI-ley Web Crawler

Advanced web crawling and downloading with parallelization, authentication, and intelligent filtering.

## Overview

The Web Crawler skill provides powerful website crawling capabilities with fine-grained control over depth, parallelization, filtering, and resource limits. Built on Puppeteer and Axios with intelligent queuing and rate limiting.

### Key Features

1. **Depth Control**: Configurable crawl depth with breadth-first traversal
2. **Pattern Filtering**: Include/exclude URL patterns with wildcards
3. **Cross-Site Crawling**: Optional navigation across domains
4. **File Type Filtering**: Download specific file types only
5. **Parallelization**: Concurrent requests with configurable max degree
6. **Authentication**: Basic, Bearer, form-based, and cookie auth
7. **Binary Downloads**: Optional binary file downloads with size limits
8. **Resource Limits**: Max pages, max duration, max file size
9. **Browser Control**: Custom headers, user agent, viewport, JavaScript
10. **Robots.txt**: Respect crawl delays and disallowed paths

## When to Use

- **Website Archival**: Download entire websites for offline access
- **Content Migration**: Extract content from legacy sites
- **Sitemap Generation**: Build comprehensive site maps
- **Link Validation**: Check for broken links across sites
- **SEO Analysis**: Crawl sites for SEO auditing
- **Research**: Gather data from multiple web sources
- **Documentation**: Download documentation sites

## Installation

```bash
cd .github/skills/ailey-tools-web-crawl
npm install
./install.sh
```

## Configuration

### Environment Variables

```bash
# Start URL and output
START_URL=https://example.com
OUTPUT_DIR=./crawled

# Depth and limits
MAX_DEPTH=3
MAX_PAGES=1000
MAX_DURATION_MINUTES=60
MAX_FILE_SIZE_MB=100

# Cross-site crawling
ALLOW_CROSS_SITE=false
ALLOWED_DOMAINS=example.com,docs.example.com

# Parallelization
MAX_CONCURRENT=5
REQUEST_DELAY_MS=1000

# Filter patterns
INCLUDE_PATTERNS=/docs/**,/api/**
EXCLUDE_PATTERNS=/admin/**,*.pdf

# File types
ALLOWED_FILE_TYPES=html,htm,pdf,txt,md
DOWNLOAD_BINARIES=false
BINARY_EXTENSIONS=jpg,png,gif,svg

# Authentication
AUTH_TYPE=basic
AUTH_USERNAME=user
AUTH_PASSWORD=pass

# Browser settings
HEADLESS=true
USER_AGENT=Mozilla/5.0 (compatible; AIleyBot/1.0)
JAVASCRIPT_ENABLED=true
```

### AI-ley Configuration

```yaml
skills:
  web-crawl:
    type: tools
    path: .github/skills/ailey-tools-web-crawl
    config:
      crawl:
        maxDepth: 3
        maxPages: 1000
        maxDuration: 60
      parallelization:
        maxConcurrent: 5
        requestDelay: 1000
      filters:
        includePatterns: ['/docs/**', '/api/**']
        excludePatterns: ['/admin/**']
      browser:
        headless: true
        userAgent: 'Mozilla/5.0'
```

## Quick Start

### 1. Basic Website Crawl

```bash
npm run crawl -- \
  --url "https://example.com" \
  --depth 2 \
  --output ./crawled
```

### 2. Download Documentation Site

```bash
npm run crawl -- \
  --url "https://docs.example.com" \
  --depth 3 \
  --include "/docs/**" \
  --exclude "/api/**" \
  --max-pages 500
```

### 3. Authenticated Crawl

```bash
npm run crawl -- \
  --url "https://secure.example.com" \
  --auth-type basic \
  --auth-user admin \
  --auth-pass secret \
  --depth 2
```

### 4. Parallel High-Speed Crawl

```bash
npm run crawl -- \
  --url "https://example.com" \
  --depth 3 \
  --concurrent 10 \
  --max-pages 5000 \
  --delay 500
```

## CLI Commands

### crawl

Full-featured website crawling with all options.

```bash
npm run crawl -- \
  --url <start-url> \
  [--depth <number>] \
  [--max-pages <number>] \
  [--max-duration <minutes>] \
  [--concurrent <number>] \
  [--output <directory>] \
  [--include <patterns>] \
  [--exclude <patterns>] \
  [--cross-site] \
  [--auth-type <type>] \
  [--binaries]
```

**Options:**
- `--url`: Starting URL (required)
- `--depth`: Maximum crawl depth (default: 3)
- `--max-pages`: Maximum pages to download (default: 1000)
- `--max-duration`: Maximum crawl time in minutes (default: 60)
- `--concurrent`: Max concurrent requests (default: 5)
- `--output`: Output directory (default: ./crawled)
- `--include`: Include URL patterns (comma-separated)
- `--exclude`: Exclude URL patterns (comma-separated)
- `--cross-site`: Allow cross-site crawling
- `--auth-type`: Authentication type (none, basic, bearer, form, cookie)
- `--binaries`: Download binary files (images, videos, etc.)

### sitemap

Generate sitemap from crawled URLs.

```bash
npm run sitemap -- \
  --url <start-url> \
  --output sitemap.xml \
  [--depth <number>] \
  [--priority-pattern <pattern>]
```

**Output:** XML sitemap with URLs, priorities, and change frequencies

### download

Download specific file types from a website.

```bash
npm run download -- \
  --url <start-url> \
  --types pdf,doc,docx \
  --output ./downloads \
  [--max-size <mb>] \
  [--max-files <number>]
```

**Use Cases:** Download PDFs, documentation, media files

### spider

Fast link discovery without full page downloads.

```bash
npm run spider -- \
  --url <start-url> \
  --depth 5 \
  --output links.json
```

**Output:** JSON file with discovered URLs and metadata

### diagnose

Run system diagnostics and configuration check.

```bash
npm run diagnose

# Check specific components
npm run diagnose -- --check-proxy
npm run diagnose -- --check-auth
npm run diagnose -- --check-robots
```

## TypeScript API

### Basic Usage

```typescript
import { WebCrawler } from './src/index';

const crawler = new WebCrawler({
  startUrl: 'https://example.com',
  outputDir: './crawled',
  maxDepth: 3,
  maxPages: 1000,
  maxConcurrent: 5
});

await crawler.start();
```

### With Filtering

```typescript
const crawler = new WebCrawler({
  startUrl: 'https://docs.example.com',
  maxDepth: 3,
  includePatterns: ['/docs/**', '/api/**', '/guide/**'],
  excludePatterns: ['/admin/**', '/login/**', '*.pdf'],
  allowedFileTypes: ['html', 'htm', 'txt', 'md']
});

await crawler.start();

console.log(`Crawled ${crawler.getStats().pagesVisited} pages`);
console.log(`Downloaded ${crawler.getStats().filesDownloaded} files`);
```

### With Authentication

```typescript
const crawler = new WebCrawler({
  startUrl: 'https://secure.example.com',
  maxDepth: 2,
  authentication: {
    type: 'basic',
    username: process.env.AUTH_USERNAME!,
    password: process.env.AUTH_PASSWORD!
  }
});

await crawler.start();
```

### Advanced Configuration

```typescript
const crawler = new WebCrawler({
  startUrl: 'https://example.com',
  outputDir: './crawled',
  
  // Depth and limits
  maxDepth: 5,
  maxPages: 10000,
  maxDuration: 120, // minutes
  maxFileSize: 100, // MB
  
  // Parallelization
  maxConcurrent: 10,
  requestDelay: 500, // ms
  retryAttempts: 3,
  
  // Cross-site
  allowCrossSite: true,
  allowedDomains: ['example.com', 'docs.example.com'],
  
  // Filtering
  includePatterns: ['/docs/**', '/blog/**'],
  excludePatterns: ['/admin/**', '*.zip'],
  allowedFileTypes: ['html', 'pdf', 'txt'],
  
  // Binaries
  downloadBinaries: true,
  binaryExtensions: ['jpg', 'png', 'svg'],
  
  // Browser
  browser: {
    headless: true,
    userAgent: 'Mozilla/5.0 (compatible; Bot/1.0)',
    viewport: { width: 1920, height: 1080 },
    javascriptEnabled: true,
    waitUntil: 'networkidle2'
  },
  
  // Authentication
  authentication: {
    type: 'form',
    loginUrl: 'https://example.com/login',
    username: 'user',
    password: 'pass',
    usernameField: '#username',
    passwordField: '#password',
    submitSelector: 'button[type="submit"]'
  },
  
  // Robots.txt
  respectRobotsTxt: true,
  
  // Output
  saveHtml: true,
  saveMetadata: true,
  saveScreenshots: false,
  compressOutput: true
});

await crawler.start();
```

### Event Handling

```typescript
crawler.on('page-crawled', (url, depth) => {
  console.log(`Crawled: ${url} (depth ${depth})`);
});

crawler.on('file-downloaded', (url, path) => {
  console.log(`Downloaded: ${url} -> ${path}`);
});

crawler.on('error', (error, url) => {
  console.error(`Error crawling ${url}: ${error.message}`);
});

crawler.on('complete', (stats) => {
  console.log('Crawl complete:', stats);
});

await crawler.start();
```

### Progress Monitoring

```typescript
const crawler = new WebCrawler(config);

// Start crawling
const crawlPromise = crawler.start();

// Monitor progress
const interval = setInterval(() => {
  const stats = crawler.getStats();
  console.log(`Progress: ${stats.pagesVisited}/${stats.pagesQueued} pages`);
  console.log(`Speed: ${stats.pagesPerMinute} pages/min`);
  console.log(`Duration: ${stats.elapsedMinutes} minutes`);
}, 5000);

await crawlPromise;
clearInterval(interval);
```

### Pause and Resume

```typescript
const crawler = new WebCrawler(config);

// Start crawling
crawler.start();

// Pause after 100 pages
crawler.on('page-crawled', (url, depth) => {
  const stats = crawler.getStats();
  if (stats.pagesVisited === 100) {
    crawler.pause();
    console.log('Paused at 100 pages');
    
    // Resume after 10 seconds
    setTimeout(() => {
      crawler.resume();
      console.log('Resumed crawling');
    }, 10000);
  }
});
```

## Workflows

### Workflow 1: Documentation Site Download

Download entire documentation site with filtering:

```typescript
const crawler = new WebCrawler({
  startUrl: 'https://docs.example.com',
  outputDir: './docs-backup',
  maxDepth: 5,
  maxPages: 5000,
  includePatterns: ['/docs/**', '/guides/**', '/api/**'],
  excludePatterns: ['/search/**', '/login/**'],
  allowedFileTypes: ['html', 'pdf', 'md', 'txt'],
  downloadBinaries: false,
  maxConcurrent: 8,
  saveMetadata: true,
  compressOutput: true
});

await crawler.start();

// Generate sitemap
await crawler.generateSitemap('./docs-sitemap.xml');
```

### Workflow 2: Authenticated Content Extraction

Crawl behind authentication:

```typescript
const crawler = new WebCrawler({
  startUrl: 'https://portal.example.com',
  outputDir: './portal-content',
  maxDepth: 3,
  
  authentication: {
    type: 'form',
    loginUrl: 'https://portal.example.com/login',
    username: process.env.PORTAL_USER!,
    password: process.env.PORTAL_PASS!,
    usernameField: '#email',
    passwordField: '#password',
    submitSelector: 'button.login-btn'
  },
  
  includePatterns: ['/dashboard/**', '/reports/**'],
  maxConcurrent: 3, // Slower for authenticated sessions
  requestDelay: 2000
});

await crawler.start();
```

### Workflow 3: Multi-Domain Research Crawl

Crawl across multiple related domains:

```typescript
const crawler = new WebCrawler({
  startUrl: 'https://main.example.com',
  outputDir: './research',
  maxDepth: 4,
  maxPages: 20000,
  
  allowCrossSite: true,
  allowedDomains: [
    'main.example.com',
    'docs.example.com',
    'blog.example.com',
    'research.example.com'
  ],
  
  includePatterns: [
    '**/*.html',
    '**/research/**',
    '**/publications/**'
  ],
  
  downloadBinaries: true,
  binaryExtensions: ['pdf', 'jpg', 'png'],
  maxFileSize: 50, // MB
  
  maxConcurrent: 10,
  requestDelay: 500
});

await crawler.start();
```

### Workflow 4: Media Download with Size Limits

Download specific media files:

```typescript
const crawler = new WebCrawler({
  startUrl: 'https://gallery.example.com',
  outputDir: './media',
  maxDepth: 3,
  
  downloadBinaries: true,
  binaryExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  maxFileSize: 10, // MB per file
  
  includePatterns: ['/gallery/**', '/images/**'],
  excludePatterns: ['/thumbnails/**'],
  
  maxConcurrent: 15, // High parallelization for images
  maxPages: 1000,
  
  browser: {
    headless: true,
    waitUntil: 'networkidle0' // Wait for all images
  }
});

await crawler.start();

const stats = crawler.getStats();
console.log(`Downloaded ${stats.filesDownloaded} images`);
console.log(`Total size: ${stats.totalSizeMB} MB`);
```

### Workflow 5: Scheduled Incremental Crawl

Periodic crawling with change detection:

```typescript
import { WebCrawler } from './src/index';
import cron from 'node-cron';

async function incrementalCrawl() {
  const crawler = new WebCrawler({
    startUrl: 'https://news.example.com',
    outputDir: `./crawls/${new Date().toISOString().split('T')[0]}`,
    maxDepth: 2,
    maxPages: 500,
    maxDuration: 30,
    
    includePatterns: ['/news/**', '/articles/**'],
    
    // Only crawl recent content
    customFilter: (url) => {
      const date = extractDateFromUrl(url);
      return date && isWithinDays(date, 7);
    },
    
    maxConcurrent: 5,
    saveMetadata: true
  });
  
  await crawler.start();
  
  // Compare with previous crawl
  await compareWithPrevious(crawler.outputDir);
}

// Run daily at 2 AM
cron.schedule('0 2 * * *', incrementalCrawl);
```

## Authentication Types

### Basic Authentication

```typescript
authentication: {
  type: 'basic',
  username: 'user',
  password: 'pass'
}
```

Used for HTTP Basic Auth. Credentials sent in `Authorization` header.

### Bearer Token

```typescript
authentication: {
  type: 'bearer',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

Used for API token authentication. Token sent in `Authorization: Bearer` header.

### Form-Based Login

```typescript
authentication: {
  type: 'form',
  loginUrl: 'https://example.com/login',
  username: 'user',
  password: 'pass',
  usernameField: '#email',
  passwordField: '#password',
  submitSelector: 'button[type="submit"]',
  successUrl: '/dashboard' // Optional: URL after login
}
```

Automates form login using Puppeteer. Waits for navigation after submit.

### Cookie-Based Authentication

```typescript
authentication: {
  type: 'cookie',
  cookies: [
    {
      name: 'session_id',
      value: 'abc123xyz',
      domain: '.example.com',
      path: '/',
      httpOnly: true,
      secure: true
    }
  ]
}
```

Injects cookies before crawling. Useful for pre-authenticated sessions.

## Filter Patterns

### Include Patterns

Whitelist URLs matching these patterns:

```typescript
includePatterns: [
  '/docs/**',           // All docs pages
  '/api/v2/**',         // API v2 only
  '**/tutorial/*.html', // Tutorials anywhere
  '/blog/2024/**'       // 2024 blog posts
]
```

### Exclude Patterns

Blacklist URLs matching these patterns:

```typescript
excludePatterns: [
  '/admin/**',          // Admin pages
  '/login/**',          // Login flows
  '**/*.pdf',           // PDF files
  '**/*.zip',           // ZIP archives
  '**/logout',          // Logout pages
  '**/?page=*'          // Pagination
]
```

### Pattern Syntax

- `*`: Matches one path segment
- `**`: Matches any number of path segments
- `?`: Matches one character
- `[abc]`: Matches any character in brackets

**Examples:**
```
/docs/**          → /docs/api, /docs/guide/intro
/blog/*.html      → /blog/post.html (not /blog/2024/post.html)
/api/v[12]/       → /api/v1/, /api/v2/
/page-?.html      → /page-1.html, /page-a.html
```

## Browser Configuration

### Headless Mode

```typescript
browser: {
  headless: true  // No UI (faster)
  // headless: false  // Show browser (debugging)
}
```

### User Agent

```typescript
browser: {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}
```

Identify bot or mimic real browser.

### Viewport

```typescript
browser: {
  viewport: {
    width: 1920,
    height: 1080
  }
}
```

Affects responsive layouts and screenshots.

### JavaScript Control

```typescript
browser: {
  javascriptEnabled: true,
  waitUntil: 'networkidle2'  // or 'networkidle0', 'load', 'domcontentloaded'
}
```

- `networkidle2`: Wait until max 2 network connections for 500ms
- `networkidle0`: Wait until 0 network connections
- `load`: Wait for load event
- `domcontentloaded`: Wait for DOMContentLoaded

### Custom Headers

```typescript
browser: {
  headers: {
    'Accept-Language': 'en-US,en;q=0.9',
    'X-API-Key': 'your-key',
    'Referer': 'https://example.com'
  }
}
```

## Parallelization

### Concurrent Requests

```typescript
maxConcurrent: 10  // Max 10 simultaneous requests
```

**Guidelines:**
- Small sites: 3-5 concurrent
- Medium sites: 5-10 concurrent
- Large sites: 10-20 concurrent
- Be respectful: Don't overwhelm servers

### Request Delay

```typescript
requestDelay: 1000  // 1 second between requests
```

Throttle requests to avoid rate limiting.

### Retry Logic

```typescript
retryAttempts: 3,
retryDelay: 2000  // Wait 2 seconds between retries
```

Automatically retry failed requests.

## Resource Limits

### Max Pages

```typescript
maxPages: 1000  // Stop after 1000 pages
```

Prevents runaway crawls.

### Max Duration

```typescript
maxDuration: 60  // Stop after 60 minutes
```

Time limit for crawl completion.

### Max File Size

```typescript
maxFileSize: 100  // MB
```

Skip files larger than limit. Prevents downloading huge files.

### Max Total Size

```typescript
maxTotalSize: 10000  // MB (10 GB total)
```

Stop crawl when total downloaded size exceeds limit.

## Robots.txt Compliance

### Enable Robots.txt

```typescript
respectRobotsTxt: true
```

Automatically fetches and parses `robots.txt`. Respects:
- `Disallow` rules
- `Crawl-delay` directives
- `User-agent` specific rules

### Custom Crawl Delay

```typescript
respectRobotsTxt: true,
minCrawlDelay: 2000  // Override robots.txt (min 2 seconds)
```

## Output Options

### Save HTML

```typescript
saveHtml: true
```

Save full HTML content of each page.

### Save Metadata

```typescript
saveMetadata: true
```

Save JSON metadata for each page:
```json
{
  "url": "https://example.com/page",
  "title": "Page Title",
  "depth": 2,
  "timestamp": "2026-02-01T10:30:00Z",
  "statusCode": 200,
  "contentType": "text/html",
  "size": 45678,
  "links": ["https://example.com/other"],
  "images": ["https://example.com/image.jpg"]
}
```

### Save Screenshots

```typescript
saveScreenshots: true,
screenshotFormat: 'png',  // or 'jpeg'
screenshotQuality: 90
```

Capture page screenshots (requires Puppeteer).

### Compress Output

```typescript
compressOutput: true
```

Gzip HTML files to save disk space.

## Error Handling

### Retry Strategy

```typescript
const crawler = new WebCrawler({
  retryAttempts: 3,
  retryDelay: 2000,
  retryOn: [408, 429, 500, 502, 503, 504]  // HTTP status codes
});
```

### Error Events

```typescript
crawler.on('error', (error, url, context) => {
  console.error(`Error crawling ${url}:`, error.message);
  console.log(`Context:`, context);
});

crawler.on('page-error', (url, statusCode) => {
  if (statusCode === 404) {
    console.log(`404 Not Found: ${url}`);
  }
});
```

### Timeout Configuration

```typescript
browser: {
  timeout: 30000,  // 30 seconds per page
  navigationTimeout: 60000  // 60 seconds for navigation
}
```

## Performance Tips

### 1. Increase Parallelization

```typescript
maxConcurrent: 20,
requestDelay: 200
```

Faster crawling but higher server load.

### 2. Use Headless Browser Wisely

```typescript
useHeadlessBrowser: false  // Use axios for simple pages
```

Puppeteer is slower. Use axios for static HTML.

### 3. Disable JavaScript

```typescript
browser: {
  javascriptEnabled: false
}
```

Faster page loads if JS not needed.

### 4. Limit Binary Downloads

```typescript
downloadBinaries: false
```

Skip images/videos unless needed.

### 5. Compress Output

```typescript
compressOutput: true
```

Save 70-90% disk space.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Slow crawling | Low concurrency | Increase `maxConcurrent` to 10-20 |
| Rate limited | Too fast | Increase `requestDelay`, lower `maxConcurrent` |
| 403 Forbidden | Bot detected | Change `userAgent`, add `headers` |
| Memory issues | Too many pages | Reduce `maxConcurrent`, enable `compressOutput` |
| Timeout errors | Slow pages | Increase `browser.timeout` |
| Missing content | JS required | Enable `javascriptEnabled`, use Puppeteer |
| Auth fails | Wrong credentials | Check `authentication` config, test login manually |
| Robots.txt blocks | Disallowed path | Disable `respectRobotsTxt` (if allowed) |

## API Reference

### WebCrawler Class

```typescript
class WebCrawler {
  constructor(config: CrawlerConfig)
  
  // Control
  start(): Promise<CrawlStats>
  pause(): void
  resume(): void
  stop(): void
  
  // Status
  getStats(): CrawlStats
  getProgress(): CrawlProgress
  isRunning(): boolean
  isPaused(): boolean
  
  // Events
  on(event: string, callback: Function): void
  
  // Output
  generateSitemap(path: string): Promise<void>
  exportLinks(path: string): Promise<void>
  getVisitedUrls(): string[]
  
  // Utilities
  clearCache(): void
  saveState(path: string): Promise<void>
  loadState(path: string): Promise<void>
}
```

### Events

- `page-crawled`: (url, depth) - Page successfully crawled
- `file-downloaded`: (url, path, size) - File downloaded
- `link-discovered`: (url, sourceUrl) - New URL found
- `error`: (error, url, context) - Error occurred
- `page-error`: (url, statusCode) - HTTP error
- `complete`: (stats) - Crawl completed
- `paused`: () - Crawl paused
- `resumed`: () - Crawl resumed
- `stopped`: () - Crawl stopped

## Resources

- **Puppeteer**: [pptr.dev](https://pptr.dev/)
- **Cheerio**: [cheerio.js.org](https://cheerio.js.org/)
- **Robots.txt**: [robotstxt.org](https://www.robotstxt.org/)
- **Web Scraping Best Practices**: [scrapinghub.com/guides](https://www.scrapinghub.com/guides/)

---
version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.7
---
