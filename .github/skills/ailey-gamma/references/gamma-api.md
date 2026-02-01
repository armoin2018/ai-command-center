# Gamma API Reference

Comprehensive guide to the Gamma API for programmatic presentation creation.

## Overview

**Gamma API** provides programmatic access to Gamma's AI-powered presentation creation platform. Create, manage, and export presentations, documents, and web pages.

**Base URL:** `https://api.gamma.app/api/v1`

**Authentication:** Bearer token (API key)

**Rate Limits:**
- Free tier: 50 requests/hour
- Pro tier: 500 requests/hour
- Enterprise: Custom limits

## Authentication

### API Key

**Get API Key:**
1. Visit https://gamma.app/api
2. Sign in or create account
3. Navigate to Settings → API
4. Click "Generate API Key"
5. Copy key (format: `gamma_xxxxxxxx...`)

### Using API Key

**Environment Variable (Recommended):**
```bash
export GAMMA_API_KEY=gamma_your_api_key_here
```

**TypeScript:**
```typescript
import { GammaClient } from './scripts/gamma-client.js';

const client = new GammaClient(process.env.GAMMA_API_KEY);
```

**HTTP Header:**
```
Authorization: Bearer gamma_your_api_key_here
```

## Endpoints

### GET /user

Get current user information.

**Request:**
```bash
curl https://api.gamma.app/api/v1/user \
  -H "Authorization: Bearer $GAMMA_API_KEY"
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "pro",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### GET /themes

List available presentation themes.

**Request:**
```bash
curl https://api.gamma.app/api/v1/themes \
  -H "Authorization: Bearer $GAMMA_API_KEY"
```

**Response:**
```json
{
  "themes": [
    {
      "id": "default",
      "name": "Gamma Default",
      "description": "Clean and modern default theme",
      "preview_url": "https://gamma.app/themes/default/preview"
    },
    {
      "id": "modern",
      "name": "Modern Minimal",
      "description": "Sleek minimalist design",
      "preview_url": "https://gamma.app/themes/modern/preview"
    }
  ]
}
```

### GET /projects

List user projects.

**Request:**
```bash
curl https://api.gamma.app/api/v1/projects \
  -H "Authorization: Bearer $GAMMA_API_KEY"
```

**Query Parameters:**
- `type` - Filter by type: `presentation`, `document`, `webpage`
- `limit` - Number of results (default: 50, max: 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "Q4 Sales Review",
      "type": "presentation",
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-20T14:45:00Z",
      "url": "https://gamma.app/docs/proj_abc123"
    }
  ],
  "total": 8,
  "limit": 50,
  "offset": 0
}
```

### POST /generate

Create new presentation from content.

**Request:**
```bash
curl -X POST https://api.gamma.app/api/v1/generate \
  -H "Authorization: Bearer $GAMMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Presentation",
    "content": "# Introduction\n\nWelcome to my presentation.",
    "theme": "modern",
    "type": "presentation"
  }'
```

**Request Body:**
```typescript
interface GenerateRequest {
  title: string;           // Presentation title
  content: string;         // Markdown or text content
  theme?: string;          // Theme ID (default: "default")
  type?: string;           // "presentation" | "document" | "webpage"
}
```

**Response:**
```json
{
  "project": {
    "id": "proj_xyz789",
    "name": "My Presentation",
    "type": "presentation",
    "created_at": "2026-01-31T12:00:00Z",
    "updated_at": "2026-01-31T12:00:00Z",
    "url": "https://gamma.app/docs/proj_xyz789"
  }
}
```

### GET /projects/:id

Get project details.

**Request:**
```bash
curl https://api.gamma.app/api/v1/projects/proj_abc123 \
  -H "Authorization: Bearer $GAMMA_API_KEY"
```

**Response:**
```json
{
  "project": {
    "id": "proj_abc123",
    "name": "Q4 Sales Review",
    "type": "presentation",
    "theme": "modern",
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-20T14:45:00Z",
    "url": "https://gamma.app/docs/proj_abc123",
    "slides_count": 12,
    "pages_count": 1
  }
}
```

### POST /projects/:id/export

Export project to PowerPoint or PDF.

**Request (PowerPoint):**
```bash
curl -X POST https://api.gamma.app/api/v1/projects/proj_abc123/export \
  -H "Authorization: Bearer $GAMMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"format": "pptx"}' \
  --output presentation.pptx
```

**Request (PDF):**
```bash
curl -X POST https://api.gamma.app/api/v1/projects/proj_abc123/export \
  -H "Authorization: Bearer $GAMMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"format": "pdf"}' \
  --output presentation.pdf
```

**Request Body:**
```typescript
interface ExportRequest {
  format: 'pptx' | 'pdf';
}
```

**Response:** Binary file (PPTX or PDF)

### DELETE /projects/:id

Delete project.

**Request:**
```bash
curl -X DELETE https://api.gamma.app/api/v1/projects/proj_abc123 \
  -H "Authorization: Bearer $GAMMA_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

## TypeScript Client

### Initialize Client

```typescript
import { GammaClient } from './scripts/gamma-client.js';

const client = new GammaClient();
// Or with explicit API key
const client = new GammaClient('gamma_your_api_key');
```

### Create Presentation

```typescript
// From text content
const project = await client.createPresentation({
  title: 'My Presentation',
  content: '# Slide 1\n\nContent here',
  theme: 'modern',
  type: 'presentation',
});

// From file
const project = await client.createPresentationFromFile('slides.md', {
  theme: 'professional',
  type: 'presentation',
});

console.log(`Created: ${project.url}`);
```

### List Resources

```typescript
// List themes
const themes = await client.listThemes();
themes.forEach(theme => {
  console.log(`${theme.id}: ${theme.name}`);
});

// List projects
const projects = await client.listProjects();
projects.forEach(project => {
  console.log(`${project.name} (${project.type})`);
});

// Get specific project
const project = await client.getProject('proj_abc123');
console.log(project);
```

### Export Presentations

```typescript
import fs from 'fs';

// Export to PowerPoint
const pptxBuffer = await client.exportPresentation({
  format: 'pptx',
  projectId: 'proj_abc123',
});
fs.writeFileSync('presentation.pptx', pptxBuffer);

// Export to PDF
const pdfBuffer = await client.exportPresentation({
  format: 'pdf',
  projectId: 'proj_abc123',
});
fs.writeFileSync('presentation.pdf', pdfBuffer);
```

### Error Handling

```typescript
try {
  const project = await client.createPresentationFromFile('slides.md');
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid or missing API key');
  } else if (error.message.includes('Rate limit')) {
    console.error('Rate limit exceeded. Wait and retry.');
  } else if (error.message.includes('File not found')) {
    console.error('Input file does not exist');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Content Format

### Markdown Structure

Gamma converts markdown headings into slides:

```markdown
# Slide 1 Title

Slide 1 content

## Slide 2 Title

Slide 2 content

### Subsection (appears on same slide)

Details
```

### Supported Markdown

- **Headings**: `#`, `##`, `###` (slide hierarchy)
- **Lists**: Bullet (`-`, `*`) and numbered (`1.`)
- **Bold**: `**text**` or `__text__`
- **Italic**: `*text*` or `_text_`
- **Links**: `[text](url)`
- **Images**: `![alt](url)`
- **Code**: Inline \`code\` and blocks \`\`\`code\`\`\`
- **Quotes**: `> quote`
- **Tables**: GitHub-flavored markdown tables

### Content Types

**Presentation:**
- Slide-based layout
- H1 creates new slide
- H2 creates sub-slide
- Best for: Talks, pitches, reports

**Document:**
- Continuous flow layout
- Headings create sections
- Best for: Articles, documentation, long-form

**Webpage:**
- Web-optimized layout
- Responsive design
- Best for: Landing pages, portfolios, blogs

## Rate Limits

### Limits by Plan

| Plan | Requests/Hour | Requests/Day | Exports/Month |
|------|---------------|--------------|---------------|
| Free | 50 | 500 | 10 |
| Pro | 500 | 5,000 | 100 |
| Enterprise | Custom | Custom | Unlimited |

### Rate Limit Headers

Response includes rate limit information:

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 485
X-RateLimit-Reset: 1706745600
```

### Handling Rate Limits

```typescript
async function createWithRetry(content: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.createPresentation({
        title: 'My Presentation',
        content,
      });
    } catch (error) {
      if (error.message.includes('Rate limit')) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Error Codes

| Code | Message | Meaning | Solution |
|------|---------|---------|----------|
| 401 | Unauthorized | Invalid API key | Check API key format and validity |
| 403 | Forbidden | Insufficient permissions | Upgrade plan or check access |
| 404 | Not Found | Project/resource not found | Verify project ID |
| 429 | Too Many Requests | Rate limit exceeded | Wait and retry with backoff |
| 500 | Internal Server Error | Server-side issue | Retry later or contact support |

## Best Practices

1. **API Key Security**: Never commit API keys to version control
2. **Rate Limiting**: Implement exponential backoff for retries
3. **Error Handling**: Always catch and handle API errors
4. **Content Size**: Keep input files under 10 MB
5. **Batch Processing**: Add delays between requests to avoid rate limits
6. **Caching**: Cache theme and project lists to reduce API calls

## Webhooks (Coming Soon)

Future support for webhooks to notify on:
- Export completion
- Project updates
- Collaboration events

## Additional Resources

- **Gamma API Docs**: https://gamma.app/docs/api
- **Gamma Support**: https://gamma.app/support
- **Changelog**: https://gamma.app/changelog
- **Status Page**: https://status.gamma.app

---
