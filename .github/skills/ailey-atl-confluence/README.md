# ailey-atl-confluence

Confluence integration for AI-ley kit with CRUD operations, document conversion, and CQL querying.

## Features

- ✅ **CRUD Operations**: Create, read, update, delete Confluence pages
- ✅ **Document Import**: Markdown, Word (DOCX), PDF, HTML → Confluence
- ✅ **Content Export**: Confluence → Markdown, HTML, JSON
- ✅ **CQL Querying**: Search with Confluence Query Language
- ✅ **Batch Operations**: Import/export directories and spaces
- ✅ **Label Management**: Tag and organize content
- ✅ **Format Conversion**: Intelligent conversion with code block support

## Quick Start

```bash
# Install
cd .github/skills/ailey-atl-confluence
npm install

# Configure .env
echo 'ATLASSIAN_URL=https://your-domain.atlassian.net' >> .env
echo 'ATLASSIAN_USER=your-email@example.com' >> .env
echo 'ATLASSIAN_APIKEY=your-api-token' >> .env

# Test connection
npm run confluence test

# Create page
npm run confluence crud create -s DEV -t "Test Page" -c "<p>Hello!</p>"

# Import Markdown
npm run confluence import file -f README.md -s DEV

# Export to Markdown
npm run confluence export page -i 123456 -o exported.md

# Search
npm run confluence query search -q 'space = "DEV" AND type = page'
```

## Documentation

- **[SKILL.md](SKILL.md)**: Complete documentation with workflows and examples
- **[SETUP.md](SETUP.md)**: Quick setup guide
- **[CQL Guide](references/cql-guide.md)**: Confluence Query Language reference
- **[Storage Format Guide](references/storage-format-guide.md)**: Format specification

## Commands

```bash
# Test connection
npm run confluence test

# CRUD operations
npm run confluence crud create --space <key> --title <text> --content <html>
npm run confluence crud get --id <id>
npm run confluence crud update --id <id> --title <text>
npm run confluence crud delete --id <id> --force
npm run confluence crud list --space <key>

# Import content
npm run confluence import file --file <path> --space <key>
npm run confluence import directory --dir <path> --space <key>
npm run confluence import markdown --content <md> --space <key> --title <text>

# Export content
npm run confluence export page --id <id> --output <path> --format markdown
npm run confluence export space --space <key> --output <dir>
npm run confluence export search --query <cql> --output <dir>

# Query
npm run confluence query search --query <cql>
npm run confluence query pages --space <key>
npm run confluence query recent
npm run confluence query labels --label <name>
npm run confluence query spaces
npm run confluence query examples
```

## TypeScript API

```typescript
import { getConfluenceClient } from './scripts/confluence-client';
import { markdownToStorage, storageToMarkdown } from './scripts/format-converters';

// Create client
const client = await getConfluenceClient();

// Create page
const page = await client.createPage('DEV', 'Title', '<p>Content</p>');

// Get page
const page = await client.getContent('123456');

// Update page
await client.updatePage('123456', 'New Title', '<p>Updated</p>', currentVersion);

// Delete page
await client.deletePage('123456');

// Search
const results = await client.search('space = "DEV" AND type = page', 25);

// Convert formats
const storage = await markdownToStorage('# Markdown\n\nContent');
const markdown = storageToMarkdown('<h1>Heading</h1><p>Content</p>');
```

## License

MIT

---
