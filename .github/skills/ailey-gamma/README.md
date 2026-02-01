# ailey-gamma

> Gamma presentation and content creation toolkit for AI-ley

Create professional presentations, PowerPoints, PDFs, and websites from markdown or text files using Gamma's AI-powered platform.

## Features

- **Content Conversion**: Transform markdown/text into presentations
- **Theme Selection**: Choose from Gamma's professional themes
- **Multiple Exports**: PowerPoint (PPTX), PDF, web pages
- **Project Management**: List, view, and manage Gamma projects
- **CLI & API**: Full command-line and TypeScript API access
- **Batch Processing**: Process multiple files (coming soon)

## Quick Start

### Installation

```bash
cd .github/skills/ailey-gamma
npm install
```

### Configuration

Get API key from https://gamma.app/api and add to environment:

```bash
echo "GAMMA_API_KEY=your-key-here" >> ~/.vscode/.env
```

### Test Connection

```bash
npm run gamma test
```

## Example Commands

```bash
# List themes
npm run gamma themes

# Create presentation
npm run gamma create file -i slides.md --theme modern

# Export to PowerPoint
npm run gamma export pptx -p PROJECT_ID -o presentation.pptx

# List projects
npm run gamma projects
```

## Documentation

- **[SKILL.md](SKILL.md)** - Complete workflows and usage guide
- **[SETUP.md](SETUP.md)** - Installation and configuration
- **[Gamma API Reference](references/gamma-api.md)** - API details
- **[Themes Guide](references/themes.md)** - Available themes

## Commands Reference

### Test Connection
```bash
npm run gamma test
```

### Create Presentation
```bash
npm run gamma create file -i <input> [options]
  -i, --input <path>      Input file (markdown, text)
  -t, --title <title>     Presentation title
  --theme <theme>         Theme name or ID
  --type <type>           Type: presentation, document, webpage
  -o, --output <path>     Save project info JSON
```

### List Themes
```bash
npm run gamma themes [options]
  -f, --format <format>   Format: table, json, list
  -o, --output <path>     Save to file
```

### List Projects
```bash
npm run gamma projects [options]
  -f, --format <format>   Format: table, json, list
  --type <type>           Filter: presentation, document, webpage
  -o, --output <path>     Save to file
```

### Export Presentation
```bash
# PowerPoint
npm run gamma export pptx -p <project-id> -o <output.pptx>

# PDF
npm run gamma export pdf -p <project-id> -o <output.pdf>
```

## Supported Formats

### Input Formats
- Markdown (.md)
- Plain Text (.txt)
- Any text-based format

### Output Formats
- PowerPoint (.pptx)
- PDF (.pdf)
- Web Page (live URL)

### Content Types
- Presentation (slides)
- Document (long-form)
- Webpage (web-optimized)

## TypeScript API

```typescript
import { GammaClient } from './scripts/gamma-client.js';

const client = new GammaClient();

// Create presentation
const project = await client.createPresentationFromFile('slides.md', {
  title: 'Q4 Review',
  theme: 'modern',
  type: 'presentation',
});

console.log(`View at: ${project.url}`);

// Export to PowerPoint
const pptx = await client.exportPresentation({
  format: 'pptx',
  projectId: project.id,
});
fs.writeFileSync('output.pptx', pptx);

// List themes
const themes = await client.listThemes();
console.log(themes);

// List projects
const projects = await client.listProjects();
console.log(projects);
```

## Workflows

### 1. Create and Export

```bash
# Create presentation
npm run gamma create file \
  -i slides.md \
  -o project.json \
  --theme modern

# Extract project ID
PROJECT_ID=$(cat project.json | jq -r '.projectId')

# Export to PowerPoint
npm run gamma export pptx -p $PROJECT_ID -o slides.pptx

# Export to PDF
npm run gamma export pdf -p $PROJECT_ID -o slides.pdf
```

### 2. Browse and Select Theme

```bash
# View all themes
npm run gamma themes

# Create with specific theme
npm run gamma create file -i content.md --theme professional
```

### 3. Manage Projects

```bash
# List all projects
npm run gamma projects

# Filter by type
npm run gamma projects --type presentation

# Export as JSON
npm run gamma projects --format json -o projects.json
```

## Integration

### With ailey-tag-n-rag

```bash
# Query RAG for content
npm run rag query "features" -o content.md

# Create presentation
npm run gamma create file -i content.md
```

### With ailey-tools-data-converter

```bash
# Convert data to markdown
npm run convert -i data.json -o slides.md -f markdown

# Create presentation
npm run gamma create file -i slides.md
```

## Troubleshooting

**API Key Issues:**
```bash
# Verify key is set
echo $GAMMA_API_KEY

# Test connection
npm run gamma test
```

**Invalid API Key:**
1. Get new key from https://gamma.app/api
2. Update .env file
3. Test again

**Module Errors:**
```bash
npm install
```

## License

MIT

---
