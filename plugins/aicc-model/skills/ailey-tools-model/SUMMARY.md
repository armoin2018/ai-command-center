# AI-ley Tools Model - Summary

## Overview

Comprehensive Mermaid and PlantUML diagram toolkit providing generation, translation, validation, and optional API-based rendering capabilities. Build diagrams from natural language, structured data, or templates, with bidirectional format conversion and VS Code integration.

## Core Features

1. **Diagram Generation**: Create Mermaid/PlantUML diagrams from:
   - Natural language descriptions (NLP-powered)
   - JSON data structures
   - YAML configurations
   - CSV files (for ER diagrams)
   - Pre-built templates with variable substitution

2. **Format Conversion**: Bidirectional translation between Mermaid and PlantUML with:
   - Automatic format detection
   - Comment preservation
   - Formatting preservation
   - Syntax compatibility mapping

3. **Parsing & Validation**: Comprehensive syntax validation and analysis:
   - Syntax error detection
   - Complexity analysis (node/edge counting, depth calculation)
   - Metadata extraction
   - AST generation

4. **API Rendering** (Optional): Generate images via external APIs:
   - Mermaid.ink (free, unlimited, no auth)
   - PlantUML Server (public or self-hosted)
   - SVG, PNG, PDF formats
   - Theme support

5. **Template System**: Reusable diagram patterns:
   - 15+ built-in templates
   - Custom template creation
   - Mustache-style variable substitution
   - Template library management

6. **Batch Processing**: Efficient multi-file operations:
   - Glob pattern matching
   - Concurrent processing
   - Batch conversion, rendering, validation
   - Progress tracking

7. **VS Code Integration**: Native Mermaid preview support:
   - Built-in preview (Cmd+K V)
   - Live editing
   - No external dependencies

8. **CLI Interface**: 8 comprehensive commands:
   - generate, convert, parse, render, validate, template, batch, diagnose

9. **TypeScript API**: Full programmatic access:
   - Typed interfaces
   - Event system
   - Promise-based async operations
   - Extensive configuration options

10. **AI-ley Integration**: Seamless kit integration:
    - YAML configuration
    - Integration with AI workflows
    - Documented setup procedures

## Technology Stack

**Core Dependencies:**
- **TypeScript**: 5.3.3 (type-safe development)
- **Node.js**: 18+ (modern JavaScript runtime)
- **commander**: 11.0.0 (CLI framework)
- **chalk**: 4.1.2 (terminal styling)
- **axios**: 1.6.0 (HTTP client for API rendering)
- **js-yaml**: 4.1.0 (YAML parsing)
- **marked**: 9.0.0 (Markdown parsing)
- **papaparse**: 5.4.0 (CSV parsing)
- **chevrotain**: 11.0.0 (parser generator)
- **fs-extra**: 11.1.0 (file operations)
- **inquirer**: 9.2.0 (interactive prompts)
- **dotenv**: 16.0.3 (environment configuration)

**No External Binaries Required:**
- Pure Node.js/TypeScript implementation
- No Java runtime needed
- No PlantUML JAR dependency
- Optional API rendering only

## Architecture

### ModelClient Class

**Configuration:**
```typescript
interface ModelClientConfig {
  // Rendering
  enableApiRendering?: boolean;
  mermaidInkUrl?: string;
  plantumlServerUrl?: string;
  defaultRenderFormat?: 'svg' | 'png' | 'pdf';
  
  // Generation
  defaultDiagramType?: string;
  defaultTheme?: string;
  enableNlpGeneration?: boolean;
  
  // Conversion
  defaultConversionDirection?: 'auto' | 'mermaid-to-plantuml' | 'plantuml-to-mermaid';
  preserveComments?: boolean;
  preserveFormatting?: boolean;
  
  // Validation
  enableSyntaxValidation?: boolean;
  enableComplexityAnalysis?: boolean;
  maxDiagramComplexity?: number;
  
  // Templates
  templateDirectory?: string;
  enableCustomTemplates?: boolean;
  
  // Output
  outputDirectory?: string;
  outputNamingPattern?: string;
  overwriteExisting?: boolean;
}
```

**Generation API:**
- `generate.fromNaturalLanguage(description, options)` - NLP-powered generation
- `generate.fromJSON(data, options)` - JSON to diagram
- `generate.fromYAML(data, options)` - YAML to diagram
- `generate.fromCSV(filePath, options)` - CSV to ER diagram
- `generate.fromTemplate(name, options)` - Template-based generation

**Conversion API:**
- `convert.mermaidToPlantUML(code, options)` - Mermaid → PlantUML
- `convert.plantUMLToMermaid(code, options)` - PlantUML → Mermaid
- `convert.auto(code, options)` - Auto-detect and convert

**Validation API:**
- `validate(code)` - Syntax validation with error reporting
- `analyze(code)` - Complexity analysis (nodes, edges, depth, score)
- `parse(code)` - AST generation and metadata extraction

**Rendering API:**
- `render(code, options)` - Generate image via API
- `getRenderUrl(code, options)` - Get render URL without downloading

**Template API:**
- `template.list()` - List available templates
- `template.get(name)` - Get template content
- `template.use(name, data)` - Generate from template
- `template.create(name, content)` - Create custom template
- `template.delete(name)` - Delete template

**Batch API:**
- `batch.process(patterns, options)` - Process multiple files

**Event System:**
- `diagram-generated` - Diagram creation complete
- `conversion-complete` - Format conversion complete
- `validation-failed` - Validation errors detected
- `render-complete` - Rendering complete
- `batch-progress` - Batch processing progress
- `generation-started` - Generation initiated
- `conversion-started` - Conversion initiated
- `render-started` - Rendering initiated
- `template-created` - Template created
- `template-deleted` - Template deleted

## File Structure

```
ailey-tools-model/
├── package.json              # NPM configuration
├── tsconfig.json             # TypeScript config
├── .env.example              # Environment template
├── .gitignore                # Git exclusions
├── README.md                 # Quick start guide
├── SKILL.md                  # Full documentation
├── QUICK_REFERENCE.md        # Command reference
├── SUMMARY.md                # This file
├── install.cjs                # Installation script
├── src/
│   ├── index.ts              # ModelClient class
│   └── cli.ts                # CLI interface
├── dist/                     # Compiled output
├── templates/                # Template library
├── output/                   # Generated diagrams
├── logs/                     # Log files
└── .cache/                   # API cache
```

## CLI Commands

### generate
Generate diagrams from natural language, JSON, YAML, CSV, or templates.

```bash
npm run generate -- <input> [options]
```

**Key Options:**
- `-t, --type <type>` - Diagram type (flowchart, sequence, class, er, gantt, state, pie, mindmap, timeline, sankey)
- `-f, --format <format>` - Output format (mermaid, plantuml)
- `-o, --output <file>` - Output file path
- `--nl` - Natural language mode
- `--template <name>` - Use template

### convert
Bidirectional Mermaid ↔ PlantUML conversion.

```bash
npm run convert -- <input> [options]
```

**Key Options:**
- `-f, --format <format>` - Target format (mermaid, plantuml, auto)
- `-o, --output <file>` - Output file
- `--preserve-comments` - Keep comments
- `--preserve-formatting` - Keep formatting

### parse
Parse and analyze diagram syntax.

```bash
npm run parse -- <input> [options]
```

**Key Options:**
- `--analyze` - Complexity analysis
- `--extract` - Extract metadata
- `--ast` - Output AST
- `-o, --output <file>` - Save to file

### render
Render diagrams via API (optional).

```bash
npm run render -- <input> [options]
```

**Key Options:**
- `-f, --format <format>` - Output format (svg, png, pdf)
- `-o, --output <file>` - Output file
- `--api <api>` - API (mermaid-ink, plantuml-server)
- `--theme <theme>` - Theme

### validate
Validate diagram syntax.

```bash
npm run validate -- <input> [options]
```

**Key Options:**
- `--strict` - Strict validation
- `--max-complexity <n>` - Max complexity threshold

### template
Manage template library.

```bash
npm run template -- <command> [name] [options]
```

**Commands:**
- `list` - List templates
- `use <name>` - Use template
- `create <name>` - Create template
- `delete <name>` - Delete template

### batch
Process multiple diagrams.

```bash
npm run batch -- <pattern> [options]
```

**Key Options:**
- `--convert <format>` - Convert all
- `--render <format>` - Render all
- `--validate` - Validate all
- `--concurrency <n>` - Parallel processing

### diagnose
System diagnostics.

```bash
npm run diagnose
```

## Supported Diagram Types

### Mermaid (12 types)
flowchart, sequence, class, er, gantt, state, pie, mindmap, timeline, sankey, gitgraph, quadrant

### PlantUML (15 types)
sequence, usecase, class, activity, component, deployment, state, object, timing, network, wireframe, archimate, gantt, mindmap, wbs

## Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build TypeScript

```bash
npm run build
```

### Step 3: Configure Environment (Optional)

```bash
cp .env.example .env
# Edit .env for API rendering
```

**For API Rendering:**

```env
ENABLE_API_RENDERING=true
MERMAID_INK_URL=https://mermaid.ink
PLANTUML_SERVER_URL=https://www.plantuml.com/plantuml
DEFAULT_RENDER_FORMAT=svg
```

### Step 4: Verify Installation

```bash
npm run diagnose
```

## AI-ley Configuration

Add to `.ai-ley/config/integrations.yaml`:

```yaml
tools-model:
  type: tools
  name: Mermaid & PlantUML Model Tools
  enabled: true
  config:
    # Generation
    defaultDiagramType: flowchart
    defaultTheme: default
    enableNlpGeneration: true
    
    # Rendering (optional)
    enableApiRendering: false
    mermaidInkUrl: https://mermaid.ink
    plantumlServerUrl: https://www.plantuml.com/plantuml
    defaultRenderFormat: svg
    
    # Conversion
    defaultConversionDirection: auto
    preserveComments: true
    preserveFormatting: true
    
    # Validation
    enableSyntaxValidation: true
    enableComplexityAnalysis: true
    maxDiagramComplexity: 1000
    
    # Templates
    templateDirectory: ./templates
    enableCustomTemplates: true
    
    # Output
    outputDirectory: ./output
    outputNamingPattern: "{name}.{format}"
    overwriteExisting: false
    
    # Performance
    batchConcurrency: 5
    apiTimeout: 10000
    enableCache: true
    cacheTtl: 3600
    
    # VS Code
    useVscodePreview: true
    openInVscode: false
```

## Use Cases

1. **Documentation Generation**: Create diagrams from code structures, database schemas, or API specifications
2. **Format Migration**: Convert existing PlantUML diagrams to Mermaid for better VS Code integration
3. **Template-Based Workflows**: Standardize diagram creation with reusable templates
4. **Batch Documentation**: Generate visual documentation for entire codebases
5. **API Documentation**: Create sequence diagrams for API flows and interactions
6. **Database Schema Visualization**: Generate ER diagrams from CSV schema exports
7. **Project Planning**: Create Gantt charts and timelines from YAML project data
8. **Architecture Diagrams**: Generate component and deployment diagrams from JSON configurations

## Performance Guidelines

- **Batch Processing**: Use `--concurrency` to optimize for your system
- **Caching**: Enable caching to avoid redundant API calls
- **Local Preview**: Use VS Code preview instead of API rendering for development
- **Template Reuse**: Create templates for frequently used diagram patterns
- **Complexity Analysis**: Monitor diagram complexity to maintain readability
- **Self-Hosted APIs**: Run PlantUML server locally for faster, private rendering

## API Rendering Details

### Mermaid.ink
- **Cost**: Free, unlimited (rate limited)
- **Auth**: Not required
- **Formats**: SVG, PNG
- **Themes**: Supported
- **Limitations**: ~50KB diagram size

### PlantUML Server
- **Public**: `https://www.plantuml.com/plantuml` (free)
- **Self-Hosted**: Docker available
- **Formats**: SVG, PNG, PDF
- **Privacy**: Self-host for sensitive diagrams
- **Docker**: `docker run -d -p 8080:8080 plantuml/plantuml-server:jetty`

## Error Handling

All methods throw descriptive errors:
- **Invalid syntax**: Detailed error messages with line numbers
- **API failures**: Network error handling with retry logic
- **Template errors**: Clear template variable mismatch reporting
- **File errors**: Path validation and permission checks
- **Conversion errors**: Format compatibility warnings

## Future Enhancements

1. **Enhanced NLP**: Improved natural language diagram generation
2. **AI-Powered Suggestions**: Diagram optimization recommendations
3. **Extended Template Library**: More pre-built templates
4. **Format Extensions**: Support for additional diagram formats (GraphViz, D2)
5. **VS Code Extension**: Dedicated extension with enhanced features
6. **Collaborative Features**: Team template sharing and versioning
7. **Advanced Parsing**: Full AST manipulation and transformation
8. **Performance Optimization**: Faster batch processing and caching

## Resources

- [Mermaid Documentation](https://mermaid.js.org/)
- [PlantUML Documentation](https://plantuml.com/)
- [Mermaid.ink API](https://mermaid.ink/)
- [PlantUML Server GitHub](https://github.com/plantuml/plantuml-server)
- [VS Code Mermaid Extension](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.8
---
