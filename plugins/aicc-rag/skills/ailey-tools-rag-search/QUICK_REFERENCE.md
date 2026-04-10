# RAG Search Quick Reference

## Installation

```bash
# Start ChromaDB
chroma run --path ./chromadb_data --port 8000

# Install skill
npm install
node install.cjs

# Verify
npm run diagnose
```

## CLI Commands

### List Collections

```bash
# List all
npm run list

# Verbose with details
npm run list -- --verbose

# JSON output
npm run list -- --format json
```

### Search by Tags

```bash
# Single tag
npm run tags -- --tag documentation

# Multiple tags
npm run tags -- --tags "docs,api,public"

# List all tags
npm run tags -- --list-all
```

### Single Collection Search

```bash
# Basic search
npm run search -- -c "api-docs" -q "authentication"

# With options
npm run search -- \
  --collection "user-guide" \
  --query "password reset" \
  --top-k 5 \
  --threshold 0.8

# Save results
npm run search -- \
  -c "docs" \
  -q "deployment" \
  --output results.json
```

### Multi-Collection Join

```bash
# By collection names
npm run join -- \
  --collections "api,guide,faq" \
  --query "rate limiting"

# By tags
npm run join -- \
  --tags "documentation,public" \
  --query "getting started"

# With merge strategy
npm run join -- \
  -c "docs,wiki" \
  -q "setup" \
  --strategy score
```

**Merge Strategies:**
- `interleave`: Alternate results (default)
- `score`: Rank by similarity
- `collection`: Group by source
- `round-robin`: Equal distribution

### Grounded Search (RAG + Web)

```bash
# Single collection + web
npm run grounded -- \
  --collection "tech-docs" \
  --query "latest features" \
  --web-results 3

# Multi-collection + web
npm run grounded -- \
  --tags "engineering,docs" \
  --query "best practices" \
  --web-results 5 \
  --strategy interleave

# Web-first strategy
npm run grounded -- \
  -c "knowledge-base" \
  -q "current trends" \
  --strategy web-first
```

**Combine Strategies:**
- `rag-first`: RAG then web (default)
- `web-first`: Web then RAG
- `interleave`: Alternate
- `scored`: Combined ranking

### Diagnostics

```bash
# Full diagnostics
npm run diagnose

# Check specific component
npm run diagnose -- --check-chromadb
npm run diagnose -- --check-embeddings
npm run diagnose -- --check-google
```

## TypeScript API

### Basic Setup

```typescript
import { RAGSearchClient } from './src/index';

const client = new RAGSearchClient({
  chromadb: { host: 'localhost', port: 8000 },
  embedding: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!
  }
});

await client.connect();
```

### Search Single Collection

```typescript
const results = await client.search({
  collection: 'api-docs',
  query: 'How to authenticate?',
  topK: 5,
  threshold: 0.7
});

results.forEach(r => {
  console.log(`[${r.score.toFixed(3)}] ${r.content}`);
});
```

### Multi-Collection Search

```typescript
// By collection names
const joined = await client.joinSearch({
  collections: ['docs', 'wiki', 'faq'],
  query: 'deployment steps',
  topK: 10,
  mergeStrategy: 'score'
});

// By tags
const tagged = await client.joinSearchByTags({
  tags: ['documentation', 'public'],
  query: 'tutorial',
  topK: 15
});
```

### Google Grounded Search

```typescript
// Configure Google
client.configureGoogle({
  apiKey: process.env.GOOGLE_API_KEY!,
  searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!
});

// Search with grounding
const grounded = await client.groundedSearch({
  collection: 'tech-docs',
  query: 'latest TypeScript features',
  topK: 5,
  webResults: 3,
  combineStrategy: 'interleave'
});

// Separate RAG and web
const ragResults = grounded.filter(r => r.source !== 'web');
const webResults = grounded.filter(r => r.source === 'web');
```

### Advanced Features

```typescript
// Metadata filtering
const filtered = await client.search({
  collection: 'knowledge-base',
  query: 'machine learning',
  filter: {
    category: 'ai',
    date: { $gte: '2025-01-01' }
  }
});

// Reranking
const reranked = await client.rerank(results, query, 10);

// Batch search
const batch = await client.batchSearch({
  collection: 'docs',
  queries: ['auth', 'rate-limit', 'errors'],
  topK: 5
});

// Caching
client.enableCache({ ttl: 3600, maxSize: 1000 });
```

## Configuration

### Environment Variables

```bash
# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
CHROMADB_PATH=./chromadb_data

# Embedding Provider
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Google (optional)
GOOGLE_API_KEY=AIza...
GOOGLE_SEARCH_ENGINE_ID=abc123...
# OR
SERPAPI_KEY=your-key

# Search Defaults
DEFAULT_TOP_K=10
DEFAULT_SIMILARITY_THRESHOLD=0.7
ENABLE_RERANKING=true
```

### AI-ley YAML

```yaml
skills:
  rag-search:
    type: tools
    path: .github/skills/ailey-tools-rag-search
    config:
      chromadb:
        host: localhost
        port: 8000
      embedding:
        provider: openai
        model: text-embedding-3-small
      google:
        enabled: true
        resultsCount: 5
```

## Workflows

### Documentation Q&A

```typescript
async function docQA(question: string) {
  const ragResults = await client.joinSearchByTags({
    tags: ['documentation'],
    query: question,
    topK: 5,
    threshold: 0.8
  });
  
  if (ragResults.length < 3) {
    return await client.groundedSearch({
      tags: ['documentation'],
      query: question,
      webResults: 2
    });
  }
  
  return ragResults;
}
```

### Hybrid Search

```typescript
async function hybridSearch(query: string, tags: string[]) {
  // Stage 1: Get RAG results
  const ragResults = await client.joinSearchByTags({
    tags,
    query,
    topK: 20
  });
  
  // Stage 2: Rerank
  const reranked = await client.rerank(ragResults, query, 10);
  
  // Stage 3: Add web grounding
  const webResults = await client.webSearch({ query, count: 3 });
  
  return [...reranked.slice(0, 7), ...webResults];
}
```

## Embedding Providers

### OpenAI (Recommended)

```bash
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Cost:** $0.00002/1K tokens

### Cohere

```bash
EMBEDDING_PROVIDER=cohere
COHERE_API_KEY=...
COHERE_EMBEDDING_MODEL=embed-english-v3.0
```

### HuggingFace

```bash
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=...
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## Similarity Thresholds

| Threshold | Use Case |
|-----------|----------|
| 0.9-1.0 | Exact matches only |
| 0.8-0.9 | High precision |
| 0.7-0.8 | Balanced (recommended) |
| 0.6-0.7 | Broader results |
| 0.5-0.6 | Exploratory |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ChromaDB connection failed | `chroma run --path ./chromadb_data` |
| Empty results | Check collection names with `npm run list` |
| Low scores | Use same embedding model as tag-n-rag |
| Google quota exceeded | Upgrade plan or use SerpAPI |
| Slow searches | Enable caching, reduce top-k |

## Resources

- ChromaDB: https://docs.trychroma.com/
- OpenAI: https://platform.openai.com/
- Google CSE: https://programmablesearchengine.google.com/
- SerpAPI: https://serpapi.com/
