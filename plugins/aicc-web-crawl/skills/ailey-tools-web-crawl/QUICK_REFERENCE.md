# Web Crawler Quick Reference

## CLI Commands

### Setup

```bash
npm run setup
```

Interactive setup wizard.

### Crawl

```bash
npm run crawl -- [options]

Options:
  -u, --url <url>              Starting URL (required)
  -o, --output <dir>           Output directory (default: ./crawled)
  -d, --depth <number>         Max crawl depth (default: 3)
  --max-pages <number>         Max pages to crawl (default: 1000)
  --max-duration <minutes>     Max crawl time (default: 60)
  -c, --concurrent <number>    Max concurrent requests (default: 5)
  --delay <ms>                 Request delay (default: 1000)
  --include <patterns>         Include URL patterns (comma-separated)
  --exclude <patterns>         Exclude URL patterns (comma-separated)
  --cross-site                 Allow cross-site crawling
  --allowed-domains <domains>  Allowed domains (comma-separated)
  --types <types>              File types (default: html,htm)
  --binaries                   Download binary files
  --auth-type <type>           Auth type (none, basic, bearer, form, cookie)
  --auth-user <username>       Auth username
  --auth-pass <password>       Auth password
  --auth-token <token>         Bearer token
  --headless                   Headless browser (default: true)
  --no-headless                Show browser UI
  --user-agent <agent>         Custom user agent
  --no-js                      Disable JavaScript
  --screenshots                Save screenshots
  --compress                   Compress output
  --no-robots                  Ignore robots.txt
  -v, --verbose                Verbose logging
```

### Sitemap

```bash
npm run sitemap -- [options]

Options:
  -u, --url <url>         Starting URL (required)
  -o, --output <file>     Output file (default: sitemap.xml)
  -d, --depth <number>    Max depth (default: 5)
```

### Download

```bash
npm run download -- [options]

Options:
  -u, --url <url>           Starting URL (required)
  -t, --types <types>       File types (default: pdf,doc,docx)
  -o, --output <dir>        Output directory (default: ./downloads)
  --max-size <mb>           Max file size in MB (default: 100)
  --max-files <number>      Max files (default: 1000)
  -d, --depth <number>      Max depth (default: 3)
```

### Spider

```bash
npm run spider -- [options]

Options:
  -u, --url <url>           Starting URL (required)
  -o, --output <file>       Output file (default: links.json)
  -d, --depth <number>      Max depth (default: 5)
  -c, --concurrent <number> Max concurrent (default: 20)
```

### Diagnose

```bash
npm run diagnose [options]

Options:
  --check-proxy    Test proxy connection
  --check-auth     Test authentication
  --check-robots   Check robots.txt
```

## Common Examples

### Basic Website Crawl

```bash
npm run crawl -- --url "https://example.com" --depth 2
```

### Documentation Download

```bash
npm run crawl -- \
  --url "https://docs.example.com" \
  --depth 3 \
  --include "/docs/**" \
  --max-pages 500
```

### Authenticated Crawl

```bash
npm run crawl -- \
  --url "https://secure.example.com" \
  --auth-type basic \
  --auth-user admin \
  --auth-pass secret
```

### High-Speed Parallel Crawl

```bash
npm run crawl -- \
  --url "https://example.com" \
  --depth 3 \
  --concurrent 10 \
  --delay 500 \
  --max-pages 5000
```

### PDF Download

```bash
npm run download -- \
  --url "https://example.com" \
  --types pdf \
  --max-size 50 \
  --output ./pdfs
```

### Generate Sitemap

```bash
npm run sitemap -- \
  --url "https://example.com" \
  --depth 5 \
  --output sitemap.xml
```

### Link Discovery

```bash
npm run spider -- \
  --url "https://example.com" \
  --depth 5 \
  --output links.json
```

## Filter Patterns

### Include Patterns

```bash
--include "/docs/**,/api/**,/guide/**"
```

Patterns:
- `/docs/**` - All docs pages
- `/api/v2/**` - API v2 only
- `**/tutorial/*.html` - Tutorials anywhere
- `/blog/2024/**` - 2024 blog posts

### Exclude Patterns

```bash
--exclude "/admin/**,*.pdf,**/logout"
```

Patterns:
- `/admin/**` - Admin pages
- `*.pdf` - PDF files
- `**/logout` - Logout pages
- `**/?page=*` - Pagination

## Authentication Types

### Basic Auth

```bash
--auth-type basic --auth-user user --auth-pass pass
```

### Bearer Token

```bash
--auth-type bearer --auth-token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Form Login

Set in `.env`:
```bash
AUTH_TYPE=form
AUTH_LOGIN_URL=https://example.com/login
AUTH_USERNAME=user
AUTH_PASSWORD=pass
AUTH_USERNAME_FIELD=#email
AUTH_PASSWORD_FIELD=#password
AUTH_SUBMIT_SELECTOR=button[type="submit"]
```

### Cookie Auth

Set in `.env`:
```bash
AUTH_TYPE=cookie
COOKIES=[{"name":"session","value":"abc123","domain":".example.com"}]
```

## Environment Variables

Create `.env` file:

```bash
# Basic config
START_URL=https://example.com
OUTPUT_DIR=./crawled

# Limits
MAX_DEPTH=3
MAX_PAGES=1000
MAX_DURATION_MINUTES=60
MAX_FILE_SIZE_MB=100

# Parallelization
MAX_CONCURRENT=5
REQUEST_DELAY_MS=1000

# Filtering
INCLUDE_PATTERNS=/docs/**,/api/**
EXCLUDE_PATTERNS=/admin/**,*.pdf
ALLOWED_FILE_TYPES=html,htm,pdf,txt

# Cross-site
ALLOW_CROSS_SITE=false
ALLOWED_DOMAINS=example.com,docs.example.com

# Binaries
DOWNLOAD_BINARIES=false
BINARY_EXTENSIONS=jpg,png,svg

# Browser
HEADLESS=true
USER_AGENT=Mozilla/5.0 (compatible; Bot/1.0)
JAVASCRIPT_ENABLED=true

# Authentication
AUTH_TYPE=basic
AUTH_USERNAME=user
AUTH_PASSWORD=pass

# Robots.txt
RESPECT_ROBOTS_TXT=true

# Output
SAVE_HTML=true
SAVE_METADATA=true
SAVE_SCREENSHOTS=false
COMPRESS_OUTPUT=false

# Logging
LOG_LEVEL=info
VERBOSE=false
```

## TypeScript API

### Basic Usage

```typescript
import { WebCrawler } from './src/index';

const crawler = new WebCrawler({
  startUrl: 'https://example.com',
  maxDepth: 3,
  maxConcurrent: 5
});

await crawler.start();
```

### With Events

```typescript
crawler.on('page-crawled', (url, depth) => {
  console.log(`Crawled: ${url}`);
});

crawler.on('error', (error, url) => {
  console.error(`Error: ${url}`);
});

crawler.on('complete', (stats) => {
  console.log(`Done: ${stats.pagesVisited} pages`);
});

await crawler.start();
```

### Control Methods

```typescript
await crawler.start();   // Start crawling
crawler.pause();         // Pause crawl
crawler.resume();        // Resume crawl
crawler.stop();          // Stop crawl
crawler.getStats();      // Get statistics
crawler.isRunning();     // Check if running
crawler.isPaused();      // Check if paused
```

### Output Methods

```typescript
await crawler.generateSitemap('sitemap.xml');
await crawler.exportLinks('links.json');
const urls = crawler.getVisitedUrls();
```

## Events

- `page-crawled` - (url, depth) - Page successfully crawled
- `file-downloaded` - (url, path, size) - File downloaded
- `link-discovered` - (url, sourceUrl) - New URL found
- `error` - (error, url, context) - Error occurred
- `page-error` - (url, statusCode) - HTTP error
- `complete` - (stats) - Crawl completed
- `paused` - () - Crawl paused
- `resumed` - () - Crawl resumed
- `stopped` - () - Crawl stopped

## Performance Tips

### Speed Up Crawling

```bash
# Increase parallelization
--concurrent 20 --delay 200

# Disable JavaScript for static sites
--no-js

# Skip binaries
# (binary downloads disabled by default)
```

### Save Disk Space

```bash
# Compress output (70-90% reduction)
--compress

# Save metadata only
SAVE_HTML=false
SAVE_METADATA=true
```

### Reduce Memory

```bash
# Lower concurrency
--concurrent 3

# Enable compression
--compress
```

## Troubleshooting

### Slow Crawling

```bash
# Increase concurrency
--concurrent 10

# Reduce delay
--delay 500
```

### Rate Limited

```bash
# Increase delay
--delay 2000

# Lower concurrency
--concurrent 3
```

### 403 Forbidden

```bash
# Change user agent
--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# Use headless browser
--headless
```

### Memory Issues

```bash
# Reduce concurrency
--concurrent 3

# Enable compression
--compress

# Limit pages
--max-pages 500
```

### Timeout Errors

Set in `.env`:
```bash
BROWSER_TIMEOUT=60000
BROWSER_NAVIGATION_TIMEOUT=90000
```

### Missing Content

```bash
# Enable JavaScript
# (enabled by default)

# Wait for network idle
WAIT_UNTIL=networkidle0
```

## Output Structure

```
./crawled/
├── example.com/
│   ├── index.html
│   ├── index.meta.json
│   ├── docs/
│   │   ├── guide.html
│   │   ├── guide.meta.json
│   └── api/
│       ├── reference.html
│       └── reference.meta.json
```

### Metadata Format

```json
{
  "url": "https://example.com/docs/guide",
  "title": "Guide",
  "depth": 2,
  "timestamp": "2026-02-01T10:30:00Z",
  "statusCode": 200,
  "contentType": "text/html",
  "size": 45678,
  "links": ["https://example.com/api"],
  "images": ["https://example.com/logo.png"]
}
```

## Pattern Syntax

- `*` - Matches one path segment
- `**` - Matches any number of segments
- `?` - Matches one character
- `[abc]` - Matches any character in brackets

Examples:
```
/docs/**          → /docs/api, /docs/guide/intro
/blog/*.html      → /blog/post.html
/api/v[12]/       → /api/v1/, /api/v2/
/page-?.html      → /page-1.html, /page-a.html
```

## Resource Limits

```bash
MAX_DEPTH=3              # Max crawl depth
MAX_PAGES=1000           # Max pages to visit
MAX_DURATION_MINUTES=60  # Max crawl time
MAX_FILE_SIZE_MB=100     # Max file size
MAX_TOTAL_SIZE_MB=10000  # Max total download size
```

## Resources

- [Full Documentation](./SKILL.md)
- [README](./README.md)
- [Puppeteer](https://pptr.dev/)
- [Cheerio](https://cheerio.js.org/)
