# AI-ley Web Crawler

Advanced web crawling and content downloading with intelligent filtering, parallelization, and authentication support.

## Features

- **Depth Control**: Configure crawl depth with breadth-first traversal
- **Parallelization**: Concurrent requests with configurable max degree (5-20 concurrent)
- **Pattern Filtering**: Include/exclude URL patterns with wildcard support
- **Cross-Site Crawling**: Optional navigation across multiple domains
- **File Type Filtering**: Download specific file types only
- **Authentication**: Basic, Bearer, form-based, and cookie authentication
- **Binary Downloads**: Optional binary file downloads with size limits
- **Resource Limits**: Max pages, duration, file size controls
- **Browser Control**: Custom headers, user agent, viewport, JavaScript
- **Robots.txt**: Automatic robots.txt compliance with crawl delays

## Quick Start

### Installation

```bash
cd .github/skills/ailey-tools-web-crawl
npm install
node install.cjs
```

### Basic Usage

```bash
# Crawl a website
npm run crawl -- --url "https://example.com" --depth 3

# Download documentation
npm run crawl -- --url "https://docs.example.com" --include "/docs/**" --depth 5

# Generate sitemap
npm run sitemap -- --url "https://example.com" --output sitemap.xml

# Download PDFs
npm run download -- --url "https://example.com" --types pdf,doc --output ./downloads
```

### Configuration

Create a `.env` file:

```bash
START_URL=https://example.com
OUTPUT_DIR=./crawled
MAX_DEPTH=3
MAX_PAGES=1000
MAX_CONCURRENT=5
```

## CLI Commands

### crawl

Full-featured website crawling:

```bash
npm run crawl -- \
  --url "https://example.com" \
  --depth 3 \
  --max-pages 1000 \
  --concurrent 5 \
  --output ./crawled
```

### sitemap

Generate sitemap from crawl:

```bash
npm run sitemap -- \
  --url "https://example.com" \
  --output sitemap.xml \
  --depth 5
```

### download

Download specific file types:

```bash
npm run download -- \
  --url "https://example.com" \
  --types pdf,doc,docx \
  --max-size 50 \
  --output ./downloads
```

### spider

Fast link discovery:

```bash
npm run spider -- \
  --url "https://example.com" \
  --depth 5 \
  --output links.json
```

### diagnose

System diagnostics:

```bash
npm run diagnose
```

## TypeScript API

```typescript
import { WebCrawler } from './src/index';

const crawler = new WebCrawler({
  startUrl: 'https://example.com',
  outputDir: './crawled',
  maxDepth: 3,
  maxConcurrent: 5,
  includePatterns: ['/docs/**'],
  authentication: {
    type: 'basic',
    username: 'user',
    password: 'pass'
  }
});

await crawler.start();
```

## Authentication

Supports multiple authentication types:

```typescript
// Basic Auth
authentication: { type: 'basic', username: 'user', password: 'pass' }

// Bearer Token
authentication: { type: 'bearer', token: 'your-token' }

// Form Login
authentication: {
  type: 'form',
  loginUrl: 'https://example.com/login',
  username: 'user',
  password: 'pass',
  usernameField: '#email',
  passwordField: '#password',
  submitSelector: 'button[type="submit"]'
}

// Cookies
authentication: {
  type: 'cookie',
  cookies: [{ name: 'session', value: 'abc123', domain: '.example.com' }]
}
```

## Filter Patterns

Include/exclude URLs with patterns:

```typescript
includePatterns: ['/docs/**', '/api/**', '**/tutorial/*.html']
excludePatterns: ['/admin/**', '*.pdf', '**/logout']
```

## Performance

- **Small Sites**: 3-5 concurrent requests
- **Medium Sites**: 5-10 concurrent requests
- **Large Sites**: 10-20 concurrent requests

Tips:
- Increase `maxConcurrent` for faster crawling
- Enable `compressOutput` to save 70-90% disk space
- Disable `javascriptEnabled` for static sites (faster)
- Use `downloadBinaries: false` to skip images/videos

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Slow crawling | Increase `maxConcurrent` to 10-20 |
| Rate limited | Increase `requestDelay`, lower `maxConcurrent` |
| 403 Forbidden | Change `userAgent`, add custom `headers` |
| Memory issues | Reduce `maxConcurrent`, enable `compressOutput` |
| Timeout errors | Increase `browser.timeout` |
| Missing content | Enable `javascriptEnabled`, use Puppeteer |

## Resources

- [Full Documentation](./SKILL.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Puppeteer Docs](https://pptr.dev/)
- [Cheerio Docs](https://cheerio.js.org/)

## License

Part of the AI-ley toolkit. See main repository for license.
