---
id: ailey-media-gamma
name: Gamma Presentation Creator
description: Create presentations, PowerPoints, PDFs, and websites using Gamma AI. Convert markdown or text files into professional presentations with themes, export to PPTX/PDF, and manage projects. Use when asked to create presentations with Gamma or convert content to slides.
keywords:
  - gamma
  - presentation
  - powerpoint
  - slides
  - pptx
  - pdf
  - website
  - theme
tools:
  - gamma-api
  - typescript
  - cli
---

# Gamma Presentation Creator

Create professional presentations, documents, and websites from text or markdown files using Gamma's AI-powered platform. Convert content to PowerPoint, PDF, or web pages with customizable themes.

## Overview

The Gamma skill provides:

- **Content Conversion**: Transform markdown/text files into presentations
- **Theme Selection**: Choose from Gamma's professional theme library
- **Multiple Formats**: Export to PowerPoint (PPTX), PDF, or web pages
- **Project Management**: List, view, and manage Gamma projects
- **API Integration**: Full Gamma API access via CLI and TypeScript

## When to Use

Use this skill when:

- Creating presentations from markdown or text content
- Converting documentation into slide decks
- Generating PowerPoint or PDF presentations programmatically
- Building websites from structured content
- Managing Gamma projects via CLI
- **Specifically when asked to use Gamma** for presentation creation

## Installation

```bash
cd .github/skills/ailey-media-gamma
npm install
```

**Prerequisites:**
- Node.js 18+
- Gamma API key from https://gamma.app/api

## Quick Start

```bash
# Test API connection
npm run gamma test

# List available themes
npm run gamma themes

# Create presentation from markdown
npm run gamma create file -i content.md --theme modern

# Export to PowerPoint
npm run gamma export pptx -p PROJECT_ID -o presentation.pptx

# List your projects
npm run gamma projects
```

## Workflow 1: Create Presentation from File

Convert a markdown or text file into a Gamma presentation.

### Basic Usage

```bash
# Create presentation (default theme)
npm run gamma create file -i content.md

# Specify title and theme
npm run gamma create file \
  -i content.md \
  -t "My Presentation" \
  --theme modern

# Create document instead of presentation
npm run gamma create file \
  -i article.md \
  --type document

# Create webpage
npm run gamma create file \
  -i landing-page.md \
  --type webpage

# Save project info for later export
npm run gamma create file \
  -i slides.md \
  -o project-info.json
```

### Input File Format

**Markdown Example:**

```markdown
# Introduction

Welcome to our product presentation.

## Problem Statement

- Challenge 1
- Challenge 2
- Challenge 3

## Our Solution

Revolutionary approach to solving the problem.

### Key Features

1. Feature A
2. Feature B
3. Feature C

## Results

Impressive metrics and outcomes.
```

**Output:**
- Live Gamma presentation URL
- Project ID for future exports
- Editable in Gamma web interface

### TypeScript API

```typescript
import { GammaClient } from './scripts/gamma-client.js';

const client = new GammaClient();

// Create from file
const project = await client.createPresentationFromFile('slides.md', {
  title: 'Q4 Review',
  theme: 'modern',
  type: 'presentation',
});

console.log(`Created: ${project.url}`);
```

## Workflow 2: List and Select Themes

Browse available Gamma themes before creating presentations.

### List Themes

```bash
# Table format (default)
npm run gamma themes

# JSON output
npm run gamma themes --format json

# List format
npm run gamma themes --format list

# Save to file
npm run gamma themes --format json -o themes.json
```

### Example Output

```
Found 15 themes:

ID                  Name                          Description
--------------------------------------------------------------------------------
default             Gamma Default                 Clean and modern default theme
modern              Modern Minimal                Sleek minimalist design
vibrant             Vibrant Colors                Bold and energetic palette
professional        Professional                  Corporate business theme
creative            Creative Studio               Artistic and expressive
```

### Use Theme in Creation

```bash
# Use specific theme
npm run gamma create file \
  -i content.md \
  --theme professional

# Default theme (if omitted)
npm run gamma create file -i content.md
```

## Workflow 3: Manage Projects

View and manage your Gamma projects.

### List Projects

```bash
# All projects
npm run gamma projects

# Filter by type
npm run gamma projects --type presentation
npm run gamma projects --type document
npm run gamma projects --type webpage

# JSON output
npm run gamma projects --format json

# Save to file
npm run gamma projects --format json -o projects.json
```

### Example Output

```
Found 8 projects:

ID                       Name                          Type            Created
----------------------------------------------------------------------------------------------------
abc123def456            Q4 Sales Review               presentation    1/15/2026
xyz789ghi012            Product Documentation         document        1/20/2026
mno345pqr678            Landing Page                  webpage         1/25/2026

Total: 8 projects
```

### TypeScript API

```typescript
// List projects
const projects = await client.listProjects();

// Get specific project
const project = await client.getProject('abc123def456');

// Delete project
await client.deleteProject('old-project-id');
```

## Workflow 4: Export to PowerPoint or PDF

Export Gamma presentations to standard formats.

### Export to PowerPoint

```bash
# Basic export
npm run gamma export pptx \
  -p PROJECT_ID \
  -o presentation.pptx

# The .pptx extension is added automatically if omitted
npm run gamma export pptx \
  -p abc123def456 \
  -o quarterly-review
```

### Export to PDF

```bash
# Basic export
npm run gamma export pdf \
  -p PROJECT_ID \
  -o presentation.pdf

# The .pdf extension is added automatically if omitted
npm run gamma export pdf \
  -p abc123def456 \
  -o sales-deck
```

### Complete Workflow Example

```bash
# Step 1: Create presentation
npm run gamma create file \
  -i slides.md \
  -o project.json \
  --theme modern

# Step 2: Extract project ID from JSON
PROJECT_ID=$(cat project.json | jq -r '.projectId')

# Step 3: Export to PowerPoint
npm run gamma export pptx \
  -p $PROJECT_ID \
  -o final-presentation.pptx

# Step 4: Export to PDF
npm run gamma export pdf \
  -p $PROJECT_ID \
  -o final-presentation.pdf
```

### TypeScript API

```typescript
// Export to PowerPoint
const pptxBuffer = await client.exportPresentation({
  format: 'pptx',
  projectId: 'abc123def456',
});
fs.writeFileSync('output.pptx', pptxBuffer);

// Export to PDF
const pdfBuffer = await client.exportPresentation({
  format: 'pdf',
  projectId: 'abc123def456',
});
fs.writeFileSync('output.pdf', pdfBuffer);
```

## Workflow 5: Batch Processing

Process multiple files into presentations.

### Batch Creation (Coming Soon)

```bash
# Create presentations from all markdown files
npm run gamma create batch \
  -i "content/**/*.md" \
  -o output-dir/ \
  --theme modern
```

**Current Workaround:**

```bash
# Loop through files
for file in content/*.md; do
  npm run gamma create file -i "$file" --theme modern
done
```

## Advanced Usage

### Custom Content Types

```bash
# Presentation (default)
npm run gamma create file -i slides.md --type presentation

# Document (longer form)
npm run gamma create file -i article.md --type document

# Webpage (web-optimized)
npm run gamma create file -i landing.md --type webpage
```

### API Key Configuration

**Priority Order:**
1. `.env.local` (skill-specific)
2. `.env` (project-level)
3. `~/.vscode/.env` (global)

**Setup:**

```bash
# Global configuration
echo "GAMMA_API_KEY=your-api-key-here" >> ~/.vscode/.env

# Project configuration
echo "GAMMA_API_KEY=your-api-key-here" >> .env

# Skill-specific
echo "GAMMA_API_KEY=your-api-key-here" >> .github/skills/ailey-media-gamma/.env.local
```

### Error Handling

```typescript
try {
  const project = await client.createPresentationFromFile('slides.md');
  console.log(project.url);
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid or missing API key');
  } else if (error.message.includes('File not found')) {
    console.error('Input file does not exist');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Integration

### With ailey-tools-tag-n-rag

Create presentations from RAG-indexed content:

```bash
# Query RAG for content
npm run rag query "product features" -o features.md

# Create presentation
npm run gamma create file -i features.md --theme modern
```

### With ailey-tools-data-converter

Convert data to markdown, then to presentation:

```bash
# Convert JSON to markdown
npm run convert -i data.json -o content.md -f markdown

# Create presentation
npm run gamma create file -i content.md
```

### CI/CD Pipeline

```yaml
# .github/workflows/presentations.yml
name: Generate Presentations

on:
  push:
    paths:
      - 'content/presentations/**/*.md'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd .github/skills/ailey-media-gamma
          npm install
      
      - name: Generate presentations
        env:
          GAMMA_API_KEY: ${{ secrets.GAMMA_API_KEY }}
        run: |
          for file in content/presentations/*.md; do
            npm run gamma create file -i "$file"
          done
```

## Troubleshooting

### API Key Issues

**Problem:** `Gamma API key not found`

**Solution:**
```bash
# Verify API key is set
echo $GAMMA_API_KEY

# Or check .env files
cat ~/.vscode/.env | grep GAMMA_API_KEY
cat .env | grep GAMMA_API_KEY

# Test connection
npm run gamma test
```

### Invalid API Key

**Problem:** `Failed to list themes: Unauthorized`

**Solution:**
1. Get new API key from https://gamma.app/api
2. Update environment variable
3. Test connection: `npm run gamma test`

### File Not Found

**Problem:** `Input file not found: content.md`

**Solution:**
```bash
# Use absolute path
npm run gamma create file -i /full/path/to/content.md

# Or relative from skill directory
npm run gamma create file -i ../../../content.md
```

### Export Fails

**Problem:** `Failed to export presentation: Project not found`

**Solution:**
```bash
# List projects to verify ID
npm run gamma projects

# Use correct project ID
npm run gamma export pptx -p correct-project-id -o output.pptx
```

### Rate Limiting

**Problem:** `Rate limit exceeded`

**Solution:**
- Wait 1 minute before retrying
- Reduce concurrent requests
- Upgrade Gamma API plan for higher limits

## API Reference

See [Gamma API Reference](references/gamma-api.md) for detailed API documentation.

## Theme Gallery

See [Gamma Themes](references/themes.md) for theme previews and descriptions.

## Best Practices

1. **Content Structure**: Use clear markdown headings for slide organization
2. **Theme Selection**: Preview themes before batch processing
3. **Project Management**: Save project IDs for later exports
4. **Error Handling**: Always check API key before batch operations
5. **Export Timing**: Export after content finalization to avoid re-exports

## Limitations

- Maximum file size: 10 MB per input file
- API rate limits apply (check Gamma plan)
- Batch processing requires manual loop (built-in coming soon)
- Theme customization via API is limited

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.5
---
