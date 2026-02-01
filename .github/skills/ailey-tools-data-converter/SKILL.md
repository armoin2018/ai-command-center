---
id: 
name: ailey-tools-data-converter
description: Convert files between data formats (JSON, YAML, XML, CSV, TSV, Parquet, Avro, ORC, Thrift) with schema generation/conversion/evolution, CRUD operations, jq-style queries, compression, streaming, and chunking support. Use for format conversion, schema management, data querying/manipulation, processing large files, or batch operations.
---
# AI-ley Data Converter

Comprehensive data conversion, schema management, and data manipulation tool with CRUD operations and jq-style querying.

## Overview

The data converter skill provides:

**Data Conversion:**
- **Formats**: JSON, YAML, XML, CSV, TSV, Parquet, Avro, ORC, Thrift
- **Compression**: gzip, zip with streaming support
- **IO Sources**: Files, stdin/stdout, URLs (with authentication)
- **Chunking**: Split large files by paragraph, sentence, character, word, or line

**Schema Management:**
- **Generation**: Auto-generate schemas from data (JSON Schema, Avro, Thrift)
- **Conversion**: Convert between schema formats
- **Evolution**: Track and manage schema version changes
- **Compatibility**: Validate forward/backward compatibility
- **Migration**: Convert data between schema versions

**Data Operations:**
- **CRUD**: Create, Read, Update, Delete operations on data
- **Queries**: jq-style queries for filtering and transformation
- **Validation**: Schema-based data validation
- **Transformation**: Complex data transformations with jq syntax

## When to Use

Use this skill when:

## When to Use

Use this skill when:

**Format Conversion:**
- Converting between data formats (JSON, YAML, XML, CSV, etc.)
- Processing large files with chunking
- Fetching and transforming data from APIs
- Batch converting multiple files
- Compressing/decompressing data

**Schema Management:**
- Generating schemas from existing data
- Converting schemas between formats (JSON Schema ↔ Avro ↔ Thrift)
- Managing schema versions and evolution
- Validating schema compatibility (forward/backward)
- Migrating data to new schema versions

**Data Operations:**
- Querying data with jq-style syntax
- CRUD operations on structured data
- Filtering, transforming, and aggregating data
- Validating data against schemas
- Complex data manipulations


### Data Conversion

Convert a single file:

```bash
tsx scripts/convert.ts --input data.json --output data.yaml --from json --to yaml
```

Auto-detect input format:

```bash
tsx scripts/convert.ts --input data.json --output data.yaml --to yaml --detect
```

### Schema Generation

Generate schema from data:

```bash
# Generate JSON Schema
tsx scripts/schema.ts generate --input data.json --output schema.json --format json-schema

# Generate Avro schema
tsx scripts/schema.ts generate --input users.json --output users.avsc --format avro

# Generate with strictness level
tsx scripts/schema.ts generate --input data.json --output schema.json --format json-schema --strict
```

### Schema Conversion

Convert between schema formats:

```bash
# JSON Schema to Avro
tsx scripts/schema.ts convert --input schema.json --output schema.avsc --from json-schema --to avro

# Avro to Thrift
tsx scripts/schema.ts convert --input schema.avsc --output schema.thrift --from avro --to thrift
```

### Schema Evolution

Track and validate schema changes:

```bash
# Check compatibility
tsx scripts/schema.ts evolve --old schema-v1.json --new schema-v2.json --check backward

# Generate migration script
tsx scripts/schema.ts evolve --old schema-v1.json --new schema-v2.json --migrate migration.js

# Compatibility modes: forward, backward, full, none
```

### Data Query (jq-style)

Query and filter data:

```bash
# Simple query
tsx scripts/query.ts --input data.json --query '.users[] | select(.age > 18)'

# Complex transformation
tsx scripts/query.ts --input data.json --query '.users | map({name, email}) | sort_by(.name)'

# With output format
tsx scripts/query.ts --input data.json --query '.items[] | select(.price < 100)' --output filtered.yaml
```

### CRUD Operations

Manipulate data with CRUD:

```bash
# Create
tsx scripts/crud.ts create --file data.json --path '.users' --value '{"name":"Alice","age":30}'

# Read
tsx scripts/crud.ts read --file data.json --path '.users[0]'

# Update
tsx scripts/crud.ts update --file data.json --path '.users[0].age' --value 31

# Delete
tsx scripts/crud.ts delete --file data.json --path '.users[1]'

# Query-based update
tsx scripts/crud.ts update --file data.json --query '.users[] | select(.name == "Bob")' --set '.age = 40'
```

### Compression

Compress output:

```bash
tsx scripts/convert.ts -i data.json -o data.yaml.gz -f json -t yaml --output-compression gzip
```

Decompress input:

```bash
tsx scripts/convert.ts -i data.json.gz -o data.yaml -f json -t yaml --input-compression gzip
```

### Streaming

Read from stdin, write to stdout:

```bash
cat data.json | tsx scripts/convert.ts --stdin --stdout --from json --to yaml > data.yaml
```

### URL Input

Fetch from URL with API key:

```bash
tsx scripts/convert.ts \
  --url https://api.example.com/data \
  --auth apikey \
  --api-key YOUR_KEY \
  --output data.json \
  --from json \
  --to yaml
```

### Chunking

Split large file into chunks:

```bash
tsx scripts/convert.ts \
  --input large-text.txt \
  --output chunks/output.txt \
  --from json \
  --to json \
  --chunk \
  --chunk-mode paragraph \
  --chunk-size 100 \
  --chunk-pattern "chunk-{index}.txt"
```

### Bulk Conversion

Convert all JSON files in a directory:

```bash
tsx scripts/convert.ts --bulk "data/*.json" --to yaml
```


### Workflow 1: Schema-Driven Development

Create and evolve schemas with data:

1. **Generate schema from existing data**:
   ```bash
   tsx scripts/schema.ts generate --input users.json --output users-v1.schema.json --format json-schema
   ```

2. **Validate data against schema**:
   ```bash
   tsx scripts/schema.ts validate --data users.json --schema users-v1.schema.json
   ```

3. **Evolve schema** (add new field):
   ```bash
   # Edit schema manually or generate v2 from new data
   tsx scripts/schema.ts generate --input users-new.json --output users-v2.schema.json
   ```

4. **Check compatibility**:
   ```bash
   tsx scripts/schema.ts evolve --old users-v1.schema.json --new users-v2.schema.json --check backward
   ```

5. **Migrate data**:
   ```bash
   tsx scripts/schema.ts migrate --data users.json --from-schema v1 --to-schema v2 --output users-migrated.json
   ```

### Workflow 2: Data Query and Transformation

Extract and transform data with jq-style queries:

1. **Query specific data**:
   ```bash
   tsx scripts/query.ts --input users.json --query '.users[] | select(.role == "admin")'
   ```

2. **Transform and aggregate**:
   ```bash
   tsx scripts/query.ts --input sales.json --query 'group_by(.region) | map({region: .[0].region, total: map(.amount) | add})'
   ```

3. **Export to different format**:
   ```bash
   tsx scripts/query.ts --input data.json --query '.items | map({id, name, price})' --output filtered.csv --format csv
   ```

### Workflow 3: CRUD Operations Pipeline

Programmatically manipulate data:

1. **Create new entries**:
   ```bash
   tsx scripts/crud.ts create --file products.json --path '.products' --value '{"id":"P001","name":"Widget","price":29.99}'
   ```

2. **Update based on query**:
   ```bash
   tsx scripts/crud.ts update --file products.json --query '.products[] | select(.price > 100)' --set '.discounted = true'
   ```

3. **Delete matching items**:
   ```bash
   tsx scripts/crud.ts delete --file products.json --query '.products[] | select(.stock == 0)'
   ```

4. **Validate after changes**:
   ```bash
   tsx scripts/schema.ts validate --data products.json --schema products.schema.json
   ```

### Workflow 4: API to File Conversion

Convert API response to local file with transformation:

1. **Fetch from API**:
   ```bash
   tsx scripts/convert.ts \
     --url https://api.example.com/users \
     --auth bearer \
     --token $API_TOKEN \
     --output users.yaml \
     --from json \
     --to yaml
   ```

2. **Verify output**:
   ```bash
   cat users.yaml
   ```

### Workflow 5: Large File Processing

Process and chunk large files for analysis:

1. **Convert and chunk**:
   ```bash
   tsx scripts/convert.ts \
     --input large-data.json \
     --output chunks/data.txt \
     --from json \
     --to json \
     --chunk \
     --chunk-mode paragraph \
     --chunk-size 1000 \
     --chunk-pattern "data-{index}.json" \
     --verbose
   ```

2. **Process each chunk** separately in your analysis pipeline

### Workflow 6: Format Migration

Migrate project data files from one format to another:

1. **Bulk convert**:
   ```bash
   tsx scripts/convert.ts --bulk "config/**/*.json" --to yaml --detect
   ```

2. **Verify conversions**:
   ```bash
   find config -name "*.yaml" | wc -l
   ```

### Workflow 7: Compressed Data Pipeline

Create a compressed data processing pipeline:

1. **Fetch and compress**:
   ```bash
   tsx scripts/convert.ts \
     --url https://data.source.com/export \
     --output data.json.gz \
     --from json \
     --to json \
     --output-compression gzip
   ```

2. **Process compressed**:
   ```bash
   tsx scripts/convert.ts \
     --input data.json.gz \
     --output processed.yaml.gz \
     --from json \
     --to yaml \
     --input-compression gzip \
     --output-compression gzip
   ```


### Data Conversion (convert.ts)

**Input/Output:**
- `-i, --input <file>` - Input file path
- `-o, --output <file>` - Output file path
- `--stdin` - Read from stdin
- `--stdout` - Write to stdout
- `--url <url>` - Input URL

**Formats:**
- `-f, --from <format>` - Input format
- `-t, --to <format>` - Output format (required)
- `-d, --detect` - Auto-detect input format from extension

Supported formats: `json`, `yaml`, `xml`, `csv`, `tsv`, `parquet`, `avro`, `orc`, `thrift`

**Compression:**
- `--input-compression <type>` - Input compression (gzip, zip, none)
- `--output-compression <type>` - Output compression (gzip, zip, none)

**Authentication:**
- `--auth <type>` - Auth type (basic, bearer, apikey)
- `--username <user>` - Username for basic auth
- `--password <pass>` - Password for basic auth
- `--token <token>` - Bearer token
- `--api-key <key>` - API key
- `--api-key-header <header>` - API key header name (default: X-API-Key)

**Chunking:**
- `--chunk` - Enable chunking
- `--chunk-mode <mode>` - Mode: paragraph, sentence, character, word, line
- `--chunk-size <size>` - Chunk size in units
- `--chunk-pattern <pattern>` - Filename pattern: `{name}-{index}.{ext}`
- `--chunk-overlap <overlap>` - Overlap between chunks

**Other:**
- `-a, --append` - Append to output file
- `-v, --verbose` - Verbose output
- `--bulk <pattern>` - Bulk convert files matching glob pattern

### Schema Operations (schema.ts)

**Generate:**
- `generate --input <file>` - Generate schema from data
- `--output <file>` - Output schema file
- `--format <format>` - Schema format (json-schema, avro, thrift)
- `--strict` - Strict schema generation
- `--nullable` - Allow nullable fields
- `--title <title>` - Schema title
- `--description <desc>` - Schema description

**Convert:**
- `convert --input <file>` - Input schema file
- `--output <file>` - Output schema file
- `--from <format>` - Input schema format
- `--to <format>` - Output schema format

**Evolve:**
- `evolve --old <file>` - Old schema version
- `--new <file>` - New schema version
- `--check <mode>` - Compatibility mode (forward, backward, full, none)
- `--migrate <file>` - Generate migration script
- `--report` - Generate evolution report

**Validate:**
- `validate --data <file>` - Data file to validate
- `--schema <file>` - Schema file
- `--strict` - Strict validation mode

**Migrate:**
- `migrate --data <file>` - Data to migrate
- `--from-schema <file>` - Source schema
- `--to-schema <file>` - Target schema
- `--output <file>` - Output migrated data

### Query Operations (query.ts)

- `--input <file>` - Input data file
- `--query <jq>` - jq-style query expression
- `--query-file <file>` - Read query from file
- `--output <file>` - Output file (optional)
- `--format <format>` - Output format (json, yaml, csv, etc.)
- `--raw` - Raw output (no formatting)
- `--compact` - Compact output
- `--sort-keys` - Sort object keys

### CRUD Operations (crud.ts)

**Create:**
- `create --file <file>` - Target file
- `--path <jq-path>` - Location to create (jq path)
- `--value <json>` - Value to create (JSON string)
- `--schema <file>` - Validate against schema

**Read:**
- `read --file <file>` - Target file
- `--path <jq-path>` - Path to read
- `--query <jq>` - Query filter
- `--format <format>` - Output format

**Update:**
- `update --file <file>` - Target file
- `--path <jq-path>` - Path to update
- `--value <json>` - New value
- `--query <jq>` - Query to select items
- `--set <jq>` - Set expression (jq)
- `--schema <file>` - Validate against schema

**Delete:**
- `delete --file <file>` - Target file
- `--path <jq-path>` - Path to delete
- `--query <jq>` - Query to select items for deletion
- `--schema <file>` - Validate after deletion


### Modular Design

The converter uses a plugin-based architecture with new schema and query modules:

```
lib/
├── types.ts          # Type definitions
├── registry.ts       # Plugin registry
├── chunker.ts        # Chunking logic
├── schema/           # Schema management
│   ├── generator.ts  # Schema generation
│   ├── converter.ts  # Schema format conversion
│   ├── validator.ts  # Schema validation
│   ├── evolver.ts    # Schema evolution & compatibility
│   └── migrator.ts   # Data migration between schemas
├── query/            # Query engine
│   ├── parser.ts     # jq-style query parser
│   ├── executor.ts   # Query execution engine
│   ├── filters.ts    # Query filter functions
│   └── transforms.ts # Query transformation functions
├── crud/             # CRUD operations
│   ├── create.ts     # Create operations
│   ├── read.ts       # Read operations
│   ├── update.ts     # Update operations
│   └── delete.ts     # Delete operations
├── formats/          # Format handlers
│   ├── json.ts
│   ├── yaml.ts
│   ├── xml.ts
│   ├── csv.ts
│   ├── tsv.ts
│   ├── parquet.ts
│   ├── avro.ts
│   ├── orc.ts
│   └── thrift.ts
├── compression/      # Compression handlers
│   ├── gzip.ts
│   ├── zip.ts
│   └── none.ts
└── io/              # IO handlers
    ├── file.ts
    ├── stdio.ts
    └── url.ts
```

### Schema Evolution Rules

**Compatibility Modes:**

1. **Forward Compatible**: Old code can read new data
   - Safe: Add optional fields, relax restrictions
   - Unsafe: Remove fields, add required fields

2. **Backward Compatible**: New code can read old data
   - Safe: Add optional fields with defaults
   - Unsafe: Remove required fields, tighten restrictions

3. **Full Compatible**: Both forward and backward
   - Intersection of both sets of safe changes

4. **None**: No compatibility required
   - Any changes allowed

### jq-Style Query Syntax

Supported jq operations:

**Selectors:**
- `.field` - Access field
- `.field.nested` - Nested access
- `.[index]` - Array index
- `.[]` - Array iteration
- `.[start:end]` - Array slice

**Filters:**
- `select(.field > value)` - Filter items
- `map(expression)` - Transform array items
- `group_by(.field)` - Group by field
- `sort_by(.field)` - Sort by field
- `unique_by(.field)` - Unique items by field

**Aggregations:**
- `length` - Count items
- `add` - Sum/concatenate
- `min`, `max`, `min_by(.field)`, `max_by(.field)`
- `group_by(.field) | map({key: .[0].field, count: length})`

**Transformations:**
- `{name, email}` - Object construction
- `{newName: .oldName}` - Field renaming
- `if-then-else` - Conditional logic

### Extending with Custom Handlers

See [references/extending-handlers.md](references/extending-handlers.md) for:

- Creating custom format handlers
- Adding compression algorithms
- Implementing custom IO sources
- Registering plugins
- Creating custom schema generators
- Adding query functions

## Testing

Run comprehensive test suite:

```bash
npm test
```

Test specific conversion:

```bash
tsx scripts/convert.ts \
  --input tests/fixtures/sample.json \
  --output /tmp/test.yaml \
  --from json \
  --to yaml \
  --verbose
```

## Performance Optimization

The converter is optimized for:

- **Memory efficiency**: Streaming for large files, lazy evaluation for queries
- **Speed**: Parallel processing for bulk operations, indexed access for CRUD
- **Compression**: Efficient gzip/zip handling with streaming
- **Chunking**: Smart boundaries for natural data splits
- **Schema caching**: Cache compiled schemas for validation
- **Query optimization**: Query plan optimization for complex expressions

## Limitations

- **ORC**: Read-only (use Parquet for write)
- **Thrift**: Requires custom schema implementation
- **Hierarchical data**: CSV/TSV flatten nested structures
- **Streaming**: Some formats (Parquet, Avro) require buffering
- **jq compatibility**: Subset of jq features supported (no advanced functions like `reduce`, `limit`)
- **Schema evolution**: Breaking changes require manual data migration
- **CRUD atomicity**: File-based operations not transactional


### Scripts
- **convert.ts**: [scripts/convert.ts](scripts/convert.ts) - Data format conversion
- **schema.ts**: [scripts/schema.ts](scripts/schema.ts) - Schema generation, conversion, evolution
- **query.ts**: [scripts/query.ts](scripts/query.ts) - jq-style data querying
- **crud.ts**: [scripts/crud.ts](scripts/crud.ts) - CRUD operations

### Core Modules (Reusable)
- **lib/schema/**: Schema management module (exported for use by other skills)
- **lib/query/**: Query engine module (exported for use by other skills)
- **lib/crud/**: CRUD operations module (exported for use by other skills)

These core modules can be imported by other skills (e.g., ailey-manage-plan) for shared functionality.

### Tests & Examples
- Tests: [tests/test-runner.ts](tests/test-runner.ts)
- Examples: [tests/fixtures/](tests/fixtures/)
- Extension guide: [references/extending-handlers.md](references/extending-handlers.md)
- Schema examples: [references/schema-examples/](references/schema-examples/)
- Query examples: [references/query-examples.md](references/query-examples.md)

## Integration with Other Skills

The data converter provides reusable modules that can be imported by other skills:

```typescript
// Example: Using in ailey-manage-plan
import { SchemaValidator, SchemaEvolver } from '../ailey-tools-data-converter/lib/schema';
import { QueryExecutor } from '../ailey-tools-data-converter/lib/query';
import { CRUDOperations } from '../ailey-tools-data-converter/lib/crud';

// Validate plan data
const validator = new SchemaValidator('plan.v1.schema.json');
const isValid = await validator.validate(planData);

// Query plan items
const executor = new QueryExecutor(planData);
const result = await executor.execute('.items[] | select(.status == "BACKLOG")');

// Update plan item
const crud = new CRUDOperations('PLAN.json');
await crud.update('.items[] | select(.id == "AICC-001")', { status: 'IN-PROGRESS' });
```

## Version

2.0.0

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.2
---