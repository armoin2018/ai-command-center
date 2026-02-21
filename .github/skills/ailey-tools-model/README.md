# AI-ley Tools Model

Mermaid and PlantUML diagram generation, translation, and optional API-based rendering toolkit.

## Features

- **Diagram Generation**: Create diagrams from natural language, JSON, YAML, or CSV
- **Format Conversion**: Bidirectional Mermaid ↔ PlantUML translation
- **Syntax Validation**: Validate diagram syntax and complexity
- **API Rendering** (Optional): Generate SVG/PNG/PDF via Mermaid.ink or PlantUML server
- **Template Library**: Pre-built patterns for common diagram types
- **VS Code Integration**: Built-in Mermaid preview support
- **Batch Processing**: Process multiple diagrams efficiently

## Quick Start

### Installation

```bash
npm install
./install.sh
```

### Generate Diagram from Natural Language

```bash
npm run generate -- "User login with authentication and error handling" --type flowchart --output login.mmd
```

### Convert Between Formats

```bash
npm run convert -- diagram.mmd --output diagram.puml
```

### Validate Syntax

```bash
npm run validate -- diagram.mmd
```

### Render to Image (Optional)

```bash
npm run render -- diagram.mmd --format svg --output diagram.svg
```

## CLI Commands

| Command    | Description                        | Example                                                   |
| ---------- | ---------------------------------- | --------------------------------------------------------- |
| `generate` | Generate diagrams from inputs      | `npm run generate -- "Login flow" --type sequence`       |
| `convert`  | Convert between Mermaid/PlantUML   | `npm run convert -- input.mmd --output output.puml`      |
| `parse`    | Parse and analyze diagram          | `npm run parse -- diagram.mmd --analyze`                 |
| `render`   | Render to image via API            | `npm run render -- diagram.mmd --format svg`             |
| `validate` | Validate diagram syntax            | `npm run validate -- diagram.mmd`                        |
| `template` | Manage templates                   | `npm run template -- list`                               |
| `batch`    | Process multiple diagrams          | `npm run batch -- ./diagrams/*.mmd --convert plantuml`   |
| `diagnose` | System diagnostics                 | `npm run diagnose`                                       |

## TypeScript API

```typescript
import { ModelClient } from './index';

const client = new ModelClient({
  enableApiRendering: false,
  defaultTheme: 'default'
});

// Generate from natural language
const diagram = await client.generate.fromNaturalLanguage(
  'User registration with email verification',
  { type: 'sequence', format: 'mermaid' }
);

// Convert formats
const plantuml = await client.convert.mermaidToPlantUML(diagram);

// Validate
const result = await client.validate(diagram);
console.log(result.isValid); // true

// Render (optional)
await client.render(diagram, {
  format: 'svg',
  output: './diagram.svg'
});
```

## Supported Diagram Types

### Mermaid

- **flowchart**: Flow diagrams with decision logic
- **sequence**: Interaction sequences
- **class**: Class relationships
- **er**: Entity-relationship diagrams
- **gantt**: Project timelines
- **state**: State machines
- **pie**: Pie charts
- **mindmap**: Mind maps
- **timeline**: Event timelines
- **sankey**: Flow diagrams with quantities

### PlantUML

- **sequence**: Sequence diagrams
- **class**: Class diagrams
- **usecase**: Use case diagrams
- **activity**: Activity diagrams
- **component**: Component diagrams
- **deployment**: Deployment diagrams
- **state**: State diagrams
- **gantt**: Gantt charts

## API Rendering

### Mermaid.ink (Free)

```bash
# Enable in .env
ENABLE_API_RENDERING=true
MERMAID_INK_URL=https://mermaid.ink
```

### PlantUML Server

```bash
# Public server
PLANTUML_SERVER_URL=https://www.plantuml.com/plantuml

# Self-hosted (Docker)
docker run -d -p 8080:8080 plantuml/plantuml-server:jetty
PLANTUML_SERVER_URL=http://localhost:8080
```

## AI-ley Configuration

Add to `.ai-ley/config/integrations.yaml`:

```yaml
tools-model:
  type: tools
  name: Mermaid & PlantUML Model Tools
  enabled: true
  config:
    defaultDiagramType: flowchart
    defaultTheme: default
    enableApiRendering: false
    outputDirectory: ./output
    useVscodePreview: true
```

## Resources

- [Full Documentation](SKILL.md)
- [Quick Reference](QUICK_REFERENCE.md)
- [Project Summary](SUMMARY.md)
- [Mermaid Docs](https://mermaid.js.org/)
- [PlantUML Docs](https://plantuml.com/)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.7
---
