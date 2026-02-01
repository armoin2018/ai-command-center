# Quick Setup Guide

## Prerequisites

### 1. Node.js Dependencies

```bash
cd .github/skills/ailey-tools-tag-n-rag
npm install
```

**That's it!** ChromaDB runs embedded - no server or Docker required.

### 2. Environment Variables (Optional)

Create `.env` file if you need custom paths:

```bash
# Custom output directory (default: .rag)
RAG_OUTPUT_PATH=./my-rag-data
```

## Basic Usage

### Index a Single File

```bash
npm run tag-n-rag -- \
  --source /path/to/document.md \
  --tags "documentation,api" \
  --chunk-size 300
```

### Index a Folder

```bash
npm run tag-n-rag -- \
  --source /path/to/docs/ \
  --tags "knowledge-base" \
  --depth 2 \
  --chunk-size 250
```

### With Custom Metadata

```bash
npm run tag-n-rag -- \
  --source /path/to/file.md \
  --tags "internal" \
  --metadata "classification=confidential" \
  --metadata "retention=7years"
```

## Querying ChromaDB

ChromaDB data is stored locally in the `.rag/chromadb/` directory.

### Python Example

```python
import chromadb

# Connect to embedded database
client = chromadb.PersistentClient(path='.rag/chromadb')

# Get collection
collection = client.get_collection('your_collection')

# Query by semantic similarity
results = collection.query(
    query_texts=["how to authenticate users"],
    n_results=5
)

for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
    print(f"Source: {meta['source']}")
    print(f"Tags: {meta['tags']}")
    print(f"Content: {doc[:200]}...")
    print("---")
```

### JavaScript Example

```javascript
const { ChromaClient } = require('chromadb');

// Connect to embedded database
const client = new ChromaClient({ path: '.rag/chromadb' });

async function search() {
  const collection = await client.getCollection({ name: 'your_collection' });
  
  const results = await collection.query({
    queryTexts: ['how to authenticate users'],
    nResults: 5
  });
  
  console.log(results);
}
```

## Configuration

### Text Scrubbing

Edit `.github/ai-ley/config/rag-replacements.json`:

```json
{
  "replacements": [
    { "pattern": "\\[REDACTED\\]", "replace": "" },
    { "pattern": "\\s+", "replace": " " }
  ],
  "remove": [
    "Table of Contents",
    "Copyright Notice"
  ]
}
```

User overrides: `.my/ai-ley/config/rag-replacements.json`

### Custom Chunking

```bash
npm run tag-n-rag -- \
  --source file.md \
  --chunk-size 500 \    # Larger chunks for context
  --tags "reference"
```

## Troubleshooting

### "Module not found"

**Problem**: Dependencies not installed

**Solution**:
```bash
cd .github/skills/ailey-tools-tag-n-rag
npm install
```

### "ENOENT: no such file or directory"

**Problem**: Invalid file path

**Solution**: Use absolute paths or verify file exists

### Permission Errors

**Problem**: Can't write to .rag directory

**Problem**: Dependencies not installed

**Solution**:
```bash
cd .github/skills/ailey-tools-tag-n-rag
npm install
```

## Advanced Features

### Format Support

- **Text formats**: `.txt`, `.md`, `.markdown` (supported)
- **Video**: `.mp4`, `.avi`, `.mov` (requires transcription - TODO)
- **Audio**: `.mp3`, `.wav` (requires transcription - TODO)
- **Images**: `.jpg`, `.png` (requires OCR - TODO)
- **PDFs**: Requires OCR - TODO

### External Sources

- **Git repositories**: Clone and index - TODO
- **URLs**: Fetch and index - TODO
- **Confluence**: Via ailey-atl-confluence skill - TODO
- **Jira**: Via ailey-atl-jira skill - TODO

## Next Steps

1. Index your documentation: `npm run tag-n-rag -- --source ./docs/ --tags "docs"`
2. Query via Python/JavaScript (see examples above)
3. Integrate into your RAG application
4. Configure text scrubbing rules for your domain
