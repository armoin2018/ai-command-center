# AI-ley RAG Search

Search RAG collections created by ailey-tools-tag-n-rag with semantic search, tag filtering, multi-RAG joining, and optional Google grounding.

## Quick Start

### 1. Start ChromaDB

```bash
chroma run --path ./chromadb_data --port 8000
```

### 2. Install

```bash
cd .github/skills/ailey-tools-rag-search
npm install
./install.sh
```

### 3. Configure

```bash
# Edit .env
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# Optional: Google grounding
GOOGLE_API_KEY=AIza...
GOOGLE_SEARCH_ENGINE_ID=abc123...
```

### 4. Verify

```bash
npm run diagnose
npm run list
```

## Common Commands

```bash
# List all RAG collections
npm run list

# Find collections by tag
npm run tags -- --tag documentation

# Search single collection
npm run search -- \
  --collection "api-docs" \
  --query "authentication setup"

# Search multiple collections
npm run join -- \
  --collections "docs,wiki,faq" \
  --query "deployment process"

# Search by tags
npm run join -- \
  --tags "documentation,public" \
  --query "getting started"

# Search with Google grounding
npm run grounded -- \
  --collection "tech-docs" \
  --query "latest TypeScript features" \
  --web-results 3
```

## Features

- **Semantic Search**: Natural language queries with embedding-based similarity
- **Multi-RAG Joining**: Combine multiple collections for comprehensive search
- **Tag-Based Filtering**: Filter collections and results by metadata tags
- **Google Grounding**: Supplement RAG results with real-time web search
- **Flexible Providers**: OpenAI, Cohere, or HuggingFace embeddings
- **Result Merging**: Multiple strategies for combining results

## Integration with Tag-n-RAG

1. Create RAG with tag-n-rag:
```bash
cd .github/skills/ailey-tools-tag-n-rag
npm run tag-n-rag -- \
  --source docs/ \
  --tags "documentation,api" \
  --collection api-docs
```

2. Search the RAG:
```bash
cd .github/skills/ailey-tools-rag-search
npm run search -- \
  --collection api-docs \
  --query "rate limiting configuration"
```

## Documentation

- [SKILL.md](./SKILL.md) - Complete documentation
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Command reference
- [SUMMARY.md](./SUMMARY.md) - Project overview

## Resources

- [ChromaDB Docs](https://docs.trychroma.com/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Google Custom Search](https://developers.google.com/custom-search)
- [Tag-n-RAG Skill](../ailey-tools-tag-n-rag)
