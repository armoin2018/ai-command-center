---
name: ailey-tag-n-rag
description: Process and index content from files, folders, Git repos, or URLs into tagged RAG (Retrieval Augmented Generation) sets with ChromaDB. Supports text, markdown, video/audio transcription, OCR, intelligent chunking, and metadata tagging. Use when preparing content for AI retrieval, building knowledge bases, or indexing documentation.
keywords: [rag, retrieval, augmented, generation, chromadb, indexing, chunking, tagging, transcription, ocr, knowledge-base]
tools: [execute, read, edit, web]
---

# AI-ley Tag-n-RAG

Process and index content from multiple sources into intelligent, tagged RAG sets for AI retrieval.

## Overview

The Tag-n-RAG skill converts various content sources into searchable, chunked RAG sets stored in ChromaDB. It handles content retrieval, format conversion, intelligent chunking, text scrubbing, and metadata tagging.

**Capabilities:**
- Retrieve from files, folders, Git repos, URLs, Confluence, Jira
- Convert video/audio to text via transcription
- Extract text from images and PDFs via OCR
- Intelligent chunking based on paragraphs and sentence boundaries
- Configurable text scrubbing and replacements
- Tag-based organization with metadata
- ChromaDB local storage

## When to Use

- Building knowledge bases from documentation
- Indexing project files for AI-assisted search
- Processing meeting recordings and transcripts
- Converting legacy documentation to RAG format
- Creating searchable content repositories
- Preparing training data for AI models

## Quick Start

```bash
# Index a single file with tags
npm run tag-n-rag -- \
  --source path/to/file.md \
  --tags "documentation,api,reference" \
  --output .rag/indexed

# Index entire folder
npm run tag-n-rag -- \
  --source docs/ \
  --tags "internal,wiki" \
  --depth 3 \
  --chunk-size 500

# Index Git repository
npm run tag-n-rag -- \
  --source https://github.com/org/repo \
  --tags "source,typescript" \
  --output .rag/repos
```

## Workflows

### Workflow 1: Index Documentation Files

Index markdown documentation with intelligent chunking:

```bash
npm run tag-n-rag -- \
  --source docs/ \
  --tags "documentation,user-guide" \
  --chunk-size 300 \
  --depth 2 \
  --metadata classification=public,retention=1year
```

**Steps:**
1. Scans `docs/` directory recursively (depth 2)
2. Processes markdown files
3. Chunks content at 300-word boundaries (paragraph-aware)
4. Creates RAG entries with tags and metadata
5. Stores in ChromaDB collection

### Workflow 2: Process Video Content

Extract and index video transcriptions:

```bash
npm run tag-n-rag -- \
  --source meetings/standup-2026-01-31.mp4 \
  --tags "meeting,standup,team" \
  --translate true \
  --metadata date=2026-01-31,team=engineering
```

**Steps:**
1. Extracts audio from video
2. Transcribes audio to text
3. Optionally translates to target language
4. Chunks transcript intelligently
5. Tags with meeting metadata

### Workflow 3: OCR Document Processing

Convert scanned documents to searchable RAG:

```bash
npm run tag-n-rag -- \
  --source scans/*.pdf \
  --tags "legacy,archive,contracts" \
  --metadata classification=confidential,retention=7years
```

**Steps:**
1. Runs OCR on PDF pages
2. Extracts text content
3. Scrubs unwanted patterns
4. Chunks by document structure
5. Indexes with retention metadata

### Workflow 4: Integrate External Sources

Pull content from Confluence or Jira:

```bash
npm run tag-n-rag -- \
  --source confluence://space/PROJECT \
  --tags "confluence,requirements" \
  --depth 1 \
  --output .rag/confluence
```

**Steps:**
1. Uses ailey-confluence skill to retrieve pages
2. Converts HTML to markdown
3. Scrubs navigation and UI elements
4. Chunks by heading structure
5. Tags with source and space metadata

## Configuration

### RAG Replacements

Define text scrubbing patterns in:
- `.github/ai-ley/config/rag-replacements.json` (global)
- `.my/ai-ley/config/rag-replacements.json` (user overrides)

**Example:**
```json
{
  "replacements": [
    { "pattern": "\\[INTERNAL ONLY\\]", "replace": "" },
    { "pattern": "(?i)confidential", "replace": "[REDACTED]" },
    { "pattern": "\\s+", "replace": " " }
  ],
  "remove": [
    "Table of Contents",
    "Copyright © 2026",
    "All rights reserved"
  ]
}
```

### Command Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--source` | string | required | File, folder, Git repo, or URL |
| `--tags` | string | required | Comma-separated tags |
| `--output` | string | `.rag/` | Output folder for RAG sets |
| `--translate` | boolean | false | Translate content |
| `--chunk-size` | number | 300 | Words per chunk |
| `--depth` | number | 1 | Folder recursion depth |
| `--metadata` | string | - | Additional metadata (key=value pairs) |

## Scripts

### Main Indexer

**scripts/index-content.ts** - Main RAG indexing pipeline

```bash
node scripts/index-content.ts \
  --source path/to/content \
  --tags "tag1,tag2" \
  --chunk-size 300
```

### Content Retrieval

**scripts/retrieve-content.ts** - Multi-source content retrieval

Supports:
- Local files and directories
- Git repositories (clone and process)
- HTTP/HTTPS URLs
- Confluence spaces (via skill integration)
- Jira projects (via skill integration)

### Format Conversion

**scripts/convert-formats.ts** - Convert various formats to text

Conversions:
- Video → Audio → Text (transcription)
- Audio → Text (transcription)
- Images → Text (OCR)
- PDF → Text (OCR)
- Markdown → Text (preserve structure)

### Text Scrubbing

**scripts/scrub-text.ts** - Clean and normalize text

Operations:
- Load replacement patterns from config
- Apply regex replacements
- Remove junk phrases
- Normalize whitespace
- Strip formatting artifacts

### Intelligent Chunking

**scripts/chunk-content.ts** - Chunk text with ailey-data-converter

Strategy:
1. Target chunk size in words
2. Split on paragraph boundaries first
3. Split on sentence boundaries if needed
4. Preserve code blocks intact
5. Maintain heading context

### ChromaDB Integration

**scripts/chromadb-store.ts** - Store chunks in ChromaDB

Features:
- Create collections per source or tag
- Store text content and embeddings
- Index metadata (tags, source, timestamps)
- Support queries by tag or metadata

## References

- [ChromaDB Documentation](references/chromadb-guide.md)
- [Chunking Strategies](references/chunking-strategies.md)
- [Metadata Schema](references/metadata-schema.md)

## Examples

### Example 1: Index Project Documentation

```bash
npm run tag-n-rag -- \
  --source ./README.md ./docs/ \
  --tags "project,documentation" \
  --chunk-size 250 \
  --depth 3 \
  --output .rag/project
```

**Result:**
- Processes README.md and all files in docs/ (3 levels deep)
- Chunks at 250 words with paragraph awareness
- Tags all chunks with "project" and "documentation"
- Stores in `.rag/project/` ChromaDB collection

### Example 2: Process Meeting Recordings

```bash
npm run tag-n-rag -- \
  --source meetings/*.mp4 \
  --tags "meeting,2026-01,engineering" \
  --translate true \
  --metadata team=engineering,type=standup
```

**Result:**
- Transcribes all MP4 files in meetings/
- Translates if non-English detected
- Chunks transcripts at default 300 words
- Tags with meeting context and team metadata

### Example 3: Archive Legacy PDFs

```bash
npm run tag-n-rag -- \
  --source archive/*.pdf \
  --tags "legacy,scanned,archive" \
  --chunk-size 500 \
  --metadata classification=confidential,retention=7years,format=scanned
```

**Result:**
- OCR processes all PDFs
- Creates 500-word chunks
- Adds compliance metadata
- Indexes for long-term retention queries

## Metadata Schema

All RAG entries include standard metadata:

```typescript
interface RAGMetadata {
  source: string;           // Original file/URL path
  sourceType: string;       // 'file' | 'folder' | 'git' | 'url' | 'confluence' | 'jira'
  tags: string[];           // User-provided tags
  chunkIndex: number;       // Position in source (0-based)
  chunkSize: number;        // Actual words in chunk
  ingestionTimestamp: string; // ISO 8601 when indexed
  fileTimestamp?: string;   // ISO 8601 file modification time
  classification?: string;  // Security classification
  retention?: string;       // Retention period
  [key: string]: any;       // Custom metadata
}
```

## Integration

### With ailey-data-converter

Uses the data converter skill for chunking:

```typescript
import { chunk } from '../ailey-data-converter/scripts/chunk.ts';

const chunks = await chunk(content, {
  size: 300,
  unit: 'words',
  strategy: 'paragraph-first',
  preserveCode: true
});
```

### With ailey-image-tool

Uses image tool for OCR:

```typescript
import { ocr } from '../ailey-image-tool/scripts/ocr.ts';

const text = await ocr(imagePath, {
  language: 'eng',
  dpi: 300
});
```

## Notes

- ChromaDB runs locally by default (no external dependencies)
- Supports incremental indexing (skip already-indexed content)
- Embeddings generated automatically via ChromaDB
- Query interface available via separate query skill
- Consider disk space for large repositories
- Audio/video transcription requires ffmpeg and whisper

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.5
---
