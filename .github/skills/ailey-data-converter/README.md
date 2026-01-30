# AI-ley Data Converter - Quick Start

## Installation

```bash
cd .github/skills/ailey-data-converter
npm install
```

## Basic Usage

### Convert Between Formats

```bash
# JSON to YAML
npx tsx scripts/convert.ts -i data.json -o data.yaml -f json -t yaml

# CSV to JSON (with auto-detection)
npx tsx scripts/convert.ts -i data.csv -o data.json --to json --detect

# XML to JSON
npx tsx scripts/convert.ts -i data.xml -o data.json -f xml -t json
```

### Compression

```bash
# Compress output
npx tsx scripts/convert.ts -i data.json -o data.yaml.gz -f json -t yaml --output-compression gzip

# Decompress input
npx tsx scripts/convert.ts -i data.json.gz -o data.yaml -f json -t yaml --input-compression gzip
```

### Streaming

```bash
# Stdin/stdout pipeline
cat data.json | npx tsx scripts/convert.ts --stdin --stdout -f json -t yaml > data.yaml
```

### Chunking

```bash
# Split large file by lines
npx tsx scripts/convert.ts \
  -i large.csv \
  -o chunks/output.json \
  -f csv \
  -t json \
  --chunk \
  --chunk-mode line \
  --chunk-size 1000 \
  --chunk-pattern "chunk-{index}.json"
```

### Bulk Conversion

```bash
# Convert all JSON files to YAML
npx tsx scripts/convert.ts --bulk "data/*.json" --to yaml --detect
```

## Testing

```bash
# Run full test suite
npm test

# Run specific test
npx tsx scripts/convert.ts \
  --input tests/fixtures/sample.json \
  --output /tmp/test.yaml \
  --from json \
  --to yaml \
  --verbose
```

## Supported Formats

- **JSON** (.json) - Read/Write, Hierarchical ✓
- **YAML** (.yaml, .yml) - Read/Write, Hierarchical ✓
- **XML** (.xml) - Read/Write, Hierarchical ✓
- **CSV** (.csv) - Read/Write, Flat
- **TSV** (.tsv, .tab) - Read/Write, Flat
- **Parquet** (.parquet) - Read/Write, Hierarchical ✓
- **Avro** (.avro) - Read/Write, Hierarchical ✓
- **ORC** (.orc) - Read only, Hierarchical ✓
- **Thrift** (.thrift) - Schema required

## Architecture

```
lib/
├── types.ts           # TypeScript type definitions
├── registry.ts        # Plugin registry
├── chunker.ts         # Chunking utilities
├── formats/           # Format handlers (9 formats)
├── compression/       # Compression handlers (gzip, zip)
└── io/               # IO handlers (file, stdio, URL)
```

## Extension

Create custom handlers:

```typescript
import { registerFormat } from './lib/registry.js';

const myHandler: FormatHandler = {
  name: 'custom',
  extensions: ['custom'],
  canRead: true,
  canWrite: true,
  supportsHierarchical: true,
  async parse(data) { /* ... */ },
  async serialize(data) { /* ... */ },
};

registerFormat(myHandler);
```

See [references/extending-handlers.md](references/extending-handlers.md) for details.

## Performance

- **Memory efficient**: Streaming support for large files
- **Fast**: Parallel processing for bulk operations  
- **Optimized**: Smart chunking with natural boundaries
- **Compressed**: Efficient gzip/zip handling

## VS Code Integration

The skill is automatically loaded by VS Code Copilot when:

- Working with data files
- Converting between formats
- Processing API responses
- Batch file operations

Enable with: `"chat.useAgentSkills": true`

## Examples

### API to Local File

```bash
npx tsx scripts/convert.ts \
  --url https://api.example.com/data \
  --auth bearer \
  --token $API_TOKEN \
  --output data.yaml \
  -f json \
  -t yaml
```

### Compressed Pipeline

```bash
# Fetch → Convert → Compress
npx tsx scripts/convert.ts \
  --url https://data.source.com/export \
  --output data.yaml.gz \
  -f json \
  -t yaml \
  --output-compression gzip
```

### Large File Processing

```bash
# Chunk for analysis
npx tsx scripts/convert.ts \
  -i large-data.json \
  -o chunks/data.txt \
  -f json \
  -t json \
  --chunk \
  --chunk-mode character \
  --chunk-size 10000 \
  --chunk-pattern "data-{index}.json" \
  --verbose
```

## Documentation

- [SKILL.md](SKILL.md) - Complete skill documentation
- [references/extending-handlers.md](references/extending-handlers.md) - Extension guide
- [tests/test-runner.ts](tests/test-runner.ts) - Test examples

## Version

1.0.0 - January 19, 2026
