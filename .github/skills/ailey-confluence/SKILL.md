---
id: ailey-confluence
name: ailey-confluence
description: Confluence integration with CRUD operations, document conversion (Markdown/Word/PDF to/from Confluence), content export, and CQL query support. Use when managing Confluence pages, converting documents, exporting content, or querying documentation.
keywords: [confluence, documentation, wiki, markdown, docx, pdf, export, import, conversion, cql, query, knowledge-base]
tools: [axios, commander, turndown, showdown, mammoth, pdf-parse, jsdom]
---

# AI-ley Confluence Integration

Comprehensive Confluence integration for creating, reading, updating, and managing Confluence pages with advanced document conversion capabilities.

## Overview

The ailey-confluence skill provides complete integration with Atlassian Confluence:

- **CRUD Operations**: Create, read, update, delete, and list Confluence pages
- **Document Import**: Convert Markdown, Word (DOCX), PDF, and HTML to Confluence Storage Format
- **Content Export**: Export Confluence pages to Markdown, HTML, or JSON
- **CQL Querying**: Search and filter content using Confluence Query Language
- **Label Management**: Tag and organize content
- **Batch Operations**: Import/export entire directories or spaces
- **Format Conversion**: Intelligent conversion between formats with code block, image, and macro support

## When to Use

- **Documentation Migration**: Move documentation from Markdown/Word/PDF into Confluence
- **Content Publishing**: Automate Confluence page creation from source files
- **Documentation Export**: Extract Confluence content for backup or conversion
- **Knowledge Base Search**: Query documentation using CQL
- **Batch Updates**: Import/export multiple pages simultaneously
- **Format Conversion**: Convert between documentation formats
- **Content Management**: Programmatic page and space management
- **Integration**: Connect Confluence with other tools in the ai-ley ecosystem

## Installation

```bash
cd .github/skills/ailey-confluence
npm install
```

## Authentication Setup

Configure Confluence credentials in one of three locations (checked in order):

1. **Global**: `~/.vscode/.env`
2. **Project**: `.env`
3. **Local** (gitignored): `.env.local`

**Required Environment Variables:**

```bash
# Confluence instance URL (without /wiki path)
ATLASSIAN_URL=https://your-domain.atlassian.net

# Your Confluence username/email
ATLASSIAN_USER=your-email@example.com

# API token (recommended) - generate at https://id.atlassian.com/manage-profile/security/api-tokens
ATLASSIAN_APIKEY=your-api-token

# OR password (less secure)
ATLASSIAN_PASSWORD=your-password
```

## Quick Start

```bash
# Test connection
npm run confluence test

# Create a page
npm run confluence crud create -s DEV -t "API Documentation" -c "<p>API docs here</p>"

# Import Markdown file
npm run confluence import file -f README.md -s DEV -t "Project Documentation"

# Export page to Markdown
npm run confluence export page -i 123456 -o docs/exported.md -f markdown

# Search for pages
npm run confluence query search -q 'space = "DEV" AND type = page AND label = "api"'

# List spaces
npm run confluence query spaces
```

---

## Workflow 1: CRUD Operations

Manage Confluence pages programmatically.

### Create a Page

```bash
# Create from content string
npm run confluence crud create \
  --space DEV \
  --title "Getting Started" \
  --content "<p>Welcome to our documentation!</p>" \
  --labels "onboarding,docs"

# Create from file
npm run confluence crud create \
  --space DEV \
  --title "API Reference" \
  --file content.html \
  --parent 123456
```

**TypeScript API:**

```typescript
import { getConfluenceClient } from './scripts/confluence-client';

const client = await getConfluenceClient();

const page = await client.createPage(
  'DEV',                                    // Space key
  'Getting Started',                        // Title
  '<p>Welcome to our documentation!</p>',   // Content (Storage Format)
  undefined                                 // Parent ID (optional)
);

// Add labels
await client.addLabel(page.id, 'onboarding');
await client.addLabel(page.id, 'docs');
```

### Read/Get a Page

```bash
# By ID
npm run confluence crud get --id 123456 --content

# By space and title
npm run confluence crud get --space DEV --title "Getting Started" --content
```

**TypeScript API:**

```typescript
// By ID
const page = await client.getContent('123456');

// By title
const page = await client.getContentByTitle('DEV', 'Getting Started');

console.log(page.title);
console.log(page.body.storage.value);  // HTML Storage Format
console.log(page.version.number);
```

### Update a Page

```bash
# Update title and content
npm run confluence crud update \
  --id 123456 \
  --title "Updated Title" \
  --content "<p>Updated content</p>"

# Update from file
npm run confluence crud update \
  --id 123456 \
  --file updated-content.html
```

**TypeScript API:**

```typescript
// Get current version
const current = await client.getContent('123456');

// Update
const updated = await client.updatePage(
  '123456',
  'Updated Title',
  '<p>Updated content</p>',
  current.version.number  // Must provide current version
);
```

### Delete a Page

```bash
# Delete with confirmation
npm run confluence crud delete --id 123456 --force
```

**TypeScript API:**

```typescript
await client.deletePage('123456');
```

### List Pages in Space

```bash
npm run confluence crud list --space DEV --limit 50
```

**TypeScript API:**

```typescript
const cql = 'space = "DEV" AND type = page';
const results = await client.search(cql, 50);

results.results.forEach(page => {
  console.log(`${page.title} (ID: ${page.id})`);
});
```

---

## Workflow 2: Document Import

Convert and import documents from various formats to Confluence.

### Import Single File

Supports: Markdown (`.md`), Word (`.docx`), PDF (`.pdf`), HTML (`.html`)

```bash
# Import Markdown
npm run confluence import file \
  --file docs/README.md \
  --space DEV \
  --title "Project Documentation" \
  --labels "documentation,project"

# Import Word document
npm run confluence import file \
  --file proposal.docx \
  --space SALES \
  --parent 789012

# Import PDF (text extraction)
npm run confluence import file \
  --file report.pdf \
  --space REPORTS \
  --title "Q4 Report"

# Preview conversion without creating page
npm run confluence import file \
  --file README.md \
  --space DEV \
  --dry-run
```

**TypeScript API:**

```typescript
import { fileToStorage } from './scripts/format-converters';
import { getConfluenceClient } from './scripts/confluence-client';

// Convert file to Confluence Storage Format
const content = await fileToStorage('docs/README.md');

// Create page
const client = await getConfluenceClient();
const page = await client.createPage('DEV', 'Documentation', content);
```

### Import Directory

Batch import all supported files from a directory.

```bash
# Import all Markdown files
npm run confluence import directory \
  --dir ./docs \
  --space DEV \
  --parent 123456 \
  --labels "documentation,auto-import"

# Preview without creating
npm run confluence import directory \
  --dir ./docs \
  --space DEV \
  --dry-run
```

### Import Markdown Directly

```bash
# From string
npm run confluence import markdown \
  --space DEV \
  --title "Quick Note" \
  --content "# Heading\n\nParagraph with **bold** text."

# From file
npm run confluence import markdown \
  --space DEV \
  --title "Documentation" \
  --file docs/guide.md
```

**TypeScript API:**

```typescript
import { markdownToStorage } from './scripts/format-converters';

const markdown = `
# API Documentation

## Installation

\`\`\`bash
npm install our-package
\`\`\`

## Usage

Call the \`initialize()\` function first.
`;

const content = await markdownToStorage(markdown);
const page = await client.createPage('DEV', 'API Docs', content);
```

---

## Workflow 3: Content Export

Export Confluence content to various formats.

### Export Single Page

```bash
# Export to Markdown
npm run confluence export page \
  --id 123456 \
  --output docs/exported.md \
  --format markdown

# Export to HTML
npm run confluence export page \
  --id 123456 \
  --output docs/exported.html \
  --format html

# Export to JSON (full page metadata)
npm run confluence export page \
  --id 123456 \
  --output data/page.json \
  --format json
```

**TypeScript API:**

```typescript
import { storageToMarkdown, storageToHtml } from './scripts/format-converters';
import { writeFile } from 'fs/promises';

const page = await client.getContent('123456');

// Convert to Markdown
const markdown = storageToMarkdown(page.body.storage.value);
await writeFile('exported.md', markdown, 'utf-8');

// Convert to HTML
const html = storageToHtml(page.body.storage.value);
await writeFile('exported.html', html, 'utf-8');
```

### Export Entire Space

```bash
# Export all pages to Markdown
npm run confluence export space \
  --space DEV \
  --output ./exports/dev-docs \
  --format markdown \
  --limit 100

# Export to HTML
npm run confluence export space \
  --space QA \
  --output ./exports/qa-docs \
  --format html
```

### Export by CQL Query

```bash
# Export recently modified pages
npm run confluence export search \
  --query 'space = "DEV" AND lastModified >= now("-7d")' \
  --output ./exports/recent \
  --format markdown

# Export pages by label
npm run confluence export search \
  --query 'label = "api" AND space = "DEV"' \
  --output ./exports/api-docs \
  --format markdown
```

### Export Attachments

```bash
# List attachments (download URLs provided)
npm run confluence export attachments \
  --id 123456 \
  --output ./attachments
```

---

## Workflow 4: CQL Querying

Search and filter Confluence content using CQL (Confluence Query Language).

### Basic Search

```bash
# Search by title
npm run confluence query search \
  --query 'title ~ "documentation"' \
  --limit 10

# Search by text content
npm run confluence query search \
  --query 'text ~ "api authentication"'

# Get JSON output
npm run confluence query search \
  --query 'space = "DEV"' \
  --json > results.json
```

### Search Pages in Space

```bash
# All pages in space
npm run confluence query pages --space DEV

# Filter by title
npm run confluence query pages \
  --space DEV \
  --title "API"
```

### Recently Updated Content

```bash
# Recent across all spaces
npm run confluence query recent --limit 20

# Recent in specific space
npm run confluence query recent --space DEV
```

### Search by Label

```bash
# Pages with specific label
npm run confluence query labels --label "api"

# In specific space
npm run confluence query labels \
  --label "documentation" \
  --space DEV
```

### List Spaces

```bash
npm run confluence query spaces
```

### CQL Examples

```bash
# Show comprehensive CQL examples
npm run confluence query examples
```

**Common CQL Patterns:**

```cql
# Pages in specific space
space = "DEV" AND type = page

# Recent updates (last 7 days)
lastModified >= now("-7d")

# By creator
creator = currentUser()

# Multiple labels
label in ("api", "documentation")

# Complex query
space = "DEV" AND type = page AND label = "api" AND lastModified >= now("-30d") ORDER BY created DESC
```

**TypeScript API:**

```typescript
// Search with CQL
const results = await client.search(
  'space = "DEV" AND type = page AND label = "api"',
  25
);

// List spaces
const spaces = await client.getSpaces(50);

// Get specific space
const space = await client.getSpace('DEV');
```

---

## Integration with AI-ley Ecosystem

### With ailey-image-tool

Process images before uploading as attachments:

```typescript
// 1. Optimize image
// Use ailey-image-tool to resize/compress

// 2. Upload as attachment
const attachment = await client.uploadAttachment(
  pageId,
  'optimized-image.png',
  'Optimized screenshot'
);

// 3. Reference in page content
import { createImageMacro } from './scripts/format-converters';
const imageMacro = createImageMacro('optimized-image.png', 800);
```

### With ailey-data-converter

Convert structured data to Confluence tables:

```typescript
// 1. Use ailey-data-converter to read CSV/JSON
// 2. Convert to HTML table
// 3. Embed in Confluence page content
```

### With ailey-manage-plan

Sync project plans to Confluence:

```typescript
// 1. Read PLAN.json with ailey-manage-plan
// 2. Convert plan items to Confluence pages
// 3. Create hierarchical documentation structure
```

---

## Format Conversion Details

### Markdown → Confluence

- **Headings**: `#` → `<h1>`, `##` → `<h2>`, etc.
- **Bold/Italic**: `**bold**` → `<strong>`, `*italic*` → `<em>`
- **Code Blocks**: ` ```language ` → `<ac:structured-macro ac:name="code">`
- **Inline Code**: `` `code` `` → `<code>`
- **Links**: `[text](url)` → `<a href="url">`
- **Lists**: `-` or `1.` → `<ul>` or `<ol>`
- **Images**: `![alt](url)` → `<img>` (or `<ac:image>` for attachments)

### Confluence → Markdown

- **Confluence Macros**: Code macros → ` ```language ` blocks
- **Storage Format**: XHTML → clean HTML → Markdown
- **Images**: `<ac:image>` → `![filename](filename)`
- **Links**: `<ac:link>` → `[text](url)`

### Word (DOCX) → Confluence

- Uses Mammoth.js for conversion
- Preserves headings, paragraphs, lists, tables
- Converts inline styles to HTML
- Extracts embedded images (requires manual upload as attachments)

### PDF → Confluence

- Text extraction only (no layout preservation)
- Converts to plain text → Markdown → Confluence
- Best for text-heavy documents
- Complex layouts may need manual formatting

---

## Troubleshooting

### Connection Errors

```bash
# Test connection
npm run confluence test
```

Check:
- `ATLASSIAN_URL` is correct (without `/wiki` path)
- `ATLASSIAN_USER` is your email
- `ATLASSIAN_APIKEY` is valid (generate new token if expired)
- Network can reach Atlassian (firewall, VPN)

### Permission Errors

Ensure your user has:
- View permission on target space
- Create/Edit permission for creating/updating pages
- Delete permission for deleting pages

### Version Conflicts

When updating pages:
```
Error: version: Stale page version
```

Solution: Get latest version before updating:

```typescript
const current = await client.getContent(pageId);
await client.updatePage(pageId, title, content, current.version.number);
```

### Format Conversion Issues

**Confluence macros not converting:**
- Custom macros may not have Markdown equivalents
- Use HTML output format or manual conversion

**Images not appearing:**
1. Upload images as attachments first
2. Use `createImageMacro()` to reference attachments
3. External URLs: Ensure Confluence can access them

**Code blocks losing language:**
- Ensure language is specified in Markdown: ` ```javascript `
- Check Confluence supports the language

### CQL Query Errors

```
Error: CQL syntax error
```

Check:
- String values are quoted: `space = "DEV"`
- Field names are correct (case-sensitive)
- Operators are valid: `=`, `~`, `>=`, `IN`, etc.
- Use `npm run confluence query examples` for reference

### Rate Limiting

Atlassian Cloud has rate limits:
- Reduce batch sizes
- Add delays between requests
- Use CQL queries to filter instead of retrieving all pages

---

## Advanced Usage

### Custom Format Converters

```typescript
import { htmlToStorage, storageToMarkdown } from './scripts/format-converters';

// Custom HTML → Confluence
const custom = `
<div class="custom-section">
  <h2>Custom Content</h2>
  <pre><code class="language-python">print("Hello")</code></pre>
</div>
`;

const storage = htmlToStorage(custom);
await client.createPage('DEV', 'Custom Page', storage);
```

### Hierarchical Page Structure

```typescript
// Create parent
const parent = await client.createPage('DEV', 'API Documentation', '<p>Root</p>');

// Create children
const endpoints = await client.createPage('DEV', 'Endpoints', '<p>...</p>', parent.id);
const auth = await client.createPage('DEV', 'Authentication', '<p>...</p>', parent.id);

// Create grandchildren
await client.createPage('DEV', 'GET /users', '<p>...</p>', endpoints.id);
await client.createPage('DEV', 'POST /users', '<p>...</p>', endpoints.id);
```

### Batch Operations with Error Handling

```typescript
const files = ['doc1.md', 'doc2.md', 'doc3.md'];
const results = { success: 0, failed: 0, errors: [] };

for (const file of files) {
  try {
    const content = await fileToStorage(file);
    const page = await client.createPage('DEV', file.replace('.md', ''), content);
    console.log(`✅ ${file} → ${page.id}`);
    results.success++;
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`);
    results.failed++;
    results.errors.push({ file, error: error.message });
  }
}

console.log(`Summary: ${results.success} succeeded, ${results.failed} failed`);
```

---

## Reference Documentation

- **[CQL Guide](references/cql-guide.md)**: Complete Confluence Query Language reference
- **[Storage Format Guide](references/storage-format-guide.md)**: Confluence Storage Format specification
- **[Setup Guide](SETUP.md)**: Detailed authentication and configuration

---

version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.5
---
