---
name: ailey-tools-rag-search
description: Search RAG collections created by ailey-tools-tag-n-rag with semantic search, tag-based filtering, multi-RAG joining, and optional Google grounding. Query ChromaDB collections with natural language, combine multiple knowledge bases, and enhance results with web search. Use when retrieving information from indexed RAG sets or building AI-powered search applications.
keywords: [rag, search, chromadb, semantic-search, vector-search, google-grounding, retrieval, multi-rag, tagging, embeddings]
tools: [execute, read]
---

# AI-ley RAG Search

Intelligent search across RAG collections with semantic search, multi-RAG joining, and Google grounding capabilities.

## Overview

The RAG Search skill enables powerful semantic search across RAG collections created by the `ailey-tools-tag-n-rag` skill. Search single collections, join multiple RAGs based on tags, and optionally ground results with real-time Google web search.

### Key Features

1. **Semantic Search**: Natural language queries with embedding-based similarity
2. **Multi-RAG Joining**: Combine multiple collections for comprehensive search
3. **Tag-Based Filtering**: Filter collections and results by metadata tags
4. **Google Grounding**: Supplement RAG results with web search
5. **Relevance Ranking**: Score and rank results by similarity
6. **Flexible Providers**: OpenAI, Cohere, or HuggingFace embeddings
7. **Result Reranking**: Optional cross-encoder reranking for precision
8. **Dual Interface**: CLI and TypeScript API

## When to Use

- **Knowledge Retrieval**: Search indexed documentation and knowledge bases
- **Multi-Source Search**: Query across multiple RAG collections simultaneously
- **Fact Verification**: Ground RAG results with current web information
- **AI-Powered Q&A**: Build question-answering systems with RAG + web
- **Document Discovery**: Find relevant content across tagged collections
- **Research Assistance**: Combine internal knowledge with external sources

## Installation

```bash
cd .github/skills/ailey-tools-rag-search
npm install

# macOS / Linux
./install.sh

# Windows (PowerShell) — run the setup script via bash or manually:
bash install.sh
# Or if Git Bash / WSL is unavailable, run: npm run setup
```

## Configuration

### Environment Variables

```bash
# ChromaDB connection
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
CHROMADB_PATH=./chromadb_data

# Embedding provider (openai, cohere, huggingface)
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# Google grounding (optional)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
# OR use SerpAPI
SERPAPI_KEY=your-serpapi-key

# Search settings
DEFAULT_TOP_K=10
DEFAULT_SIMILARITY_THRESHOLD=0.7
ENABLE_GOOGLE_GROUNDING=true
GOOGLE_RESULTS_COUNT=5
```

### AI-ley Configuration

Add to `.github/aicc/aicc.yaml`:

```yaml
skills:
  rag-search:
    type: tools
    path: .github/skills/ailey-tools-rag-search
    config:
      chromadb:
        host: localhost
        port: 8000
        path: ./chromadb_data
      embedding:
        provider: openai
        model: text-embedding-3-small
      google:
        enabled: true
        apiKey: ${GOOGLE_API_KEY}
        searchEngineId: ${GOOGLE_SEARCH_ENGINE_ID}
      search:
        topK: 10
        threshold: 0.7
        reranking: true
```

## Quick Start

### 1. List Available RAGs

```bash
# List all ChromaDB collections
npm run list

# List collections with specific tag
npm run tags -- --tag documentation
```

### 2. Search Single RAG

```bash
# Basic search
npm run search -- \
  --collection "project-docs" \
  --query "How do I configure authentication?"

# With similarity threshold
npm run search -- \
  --collection "api-reference" \
  --query "rate limiting configuration" \
  --top-k 5 \
  --threshold 0.8
```

### 3. Search Multiple RAGs (Join)

```bash
# Join multiple collections
npm run join -- \
  --collections "api-docs,user-guide,faq" \
  --query "payment integration steps"

# Join by tags
npm run join -- \
  --tags "documentation,public" \
  --query "getting started tutorial"
```

### 4. Search with Google Grounding

```bash
# RAG + web search
npm run grounded -- \
  --collection "tech-docs" \
  --query "latest TypeScript features" \
  --web-results 3

# Multi-RAG + web
npm run grounded -- \
  --tags "internal,engineering" \
  --query "deployment best practices" \
  --combine-strategy "interleave"
```

## CLI Commands

### list

List all available RAG collections in ChromaDB.

```bash
npm run list

# With filters
npm run list -- --verbose
npm run list -- --format json
```

**Output:**
```
Available RAG Collections:

  ✓ project-docs (1,234 documents)
    Tags: documentation, internal
    Created: 2026-01-15
    
  ✓ api-reference (567 documents)
    Tags: api, public, reference
    Created: 2026-01-20
```

### tags

List collections filtered by tags.

```bash
# Find collections with specific tag
npm run tags -- --tag documentation

# Multiple tags (AND logic)
npm run tags -- --tags "documentation,public"

# List all unique tags
npm run tags -- --list-all
```

### search

Search a single RAG collection.

```bash
npm run search -- \
  --collection <name> \
  --query <query> \
  [--top-k <number>] \
  [--threshold <float>] \
  [--filter <metadata>] \
  [--output <path>]

# Example
npm run search -- \
  --collection "user-docs" \
  --query "password reset process" \
  --top-k 5 \
  --threshold 0.75
```

**Options:**
- `--collection`: Name of ChromaDB collection to search
- `--query`: Natural language search query
- `--top-k`: Number of results to return (default: 10)
- `--threshold`: Minimum similarity score 0-1 (default: 0.7)
- `--filter`: Metadata filter JSON (e.g., `'{"category":"api"}'`)
- `--output`: Save results to file

### join

Search across multiple RAG collections simultaneously.

```bash
# By collection names
npm run join -- \
  --collections "docs,wiki,faq" \
  --query <query> \
  [--top-k <number>] \
  [--merge-strategy <strategy>]

# By tags
npm run join -- \
  --tags "documentation,reference" \
  --query <query>

# Combined
npm run join -- \
  --collections "api-docs" \
  --tags "public" \
  --query "authentication flow"
```

**Merge Strategies:**
- `interleave`: Alternate results from each collection (default)
- `score`: Rank all results by similarity score
- `collection`: Group by collection, ordered by avg score
- `round-robin`: Equal distribution across collections

### grounded

Search RAG collections with Google web search grounding.

```bash
npm run grounded -- \
  --collection <name> \
  --query <query> \
  [--web-results <number>] \
  [--combine-strategy <strategy>]

# Multi-RAG grounded search
npm run grounded -- \
  --tags "engineering,docs" \
  --query "kubernetes deployment strategies" \
  --web-results 5 \
  --combine-strategy "rag-first"
```

**Combine Strategies:**
- `rag-first`: RAG results, then web results (default)
- `web-first`: Web results, then RAG results
- `interleave`: Alternate between RAG and web
- `scored`: Combined ranking by relevance score

**Google Grounding Options:**
- Uses Google Custom Search API or SerpAPI
- Requires `GOOGLE_API_KEY` or `SERPAPI_KEY`
- Supplements RAG with current web information
- Useful for time-sensitive or external knowledge queries

### diagnose

Run system diagnostics.

```bash
npm run diagnose

# Check ChromaDB connection
npm run diagnose -- --check-chromadb

# Check embedding provider
npm run diagnose -- --check-embeddings

# Check Google API
npm run diagnose -- --check-google
```

## TypeScript API

### Basic Usage

```typescript
import { RAGSearchClient } from './src/index';

const client = new RAGSearchClient({
  chromadb: {
    host: 'localhost',
    port: 8000,
    path: './chromadb_data'
  },
  embedding: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-small'
  }
});

// Initialize connection
await client.connect();
```

### Search Single Collection

```typescript
// Basic search
const results = await client.search({
  collection: 'project-docs',
  query: 'How to configure API authentication?',
  topK: 5,
  threshold: 0.7
});

// With metadata filtering
const filtered = await client.search({
  collection: 'api-reference',
  query: 'rate limiting',
  topK: 10,
  filter: {
    category: 'api',
    version: 'v2'
  }
});

// Process results
results.forEach(result => {
  console.log(`Score: ${result.score.toFixed(3)}`);
  console.log(`Content: ${result.content}`);
  console.log(`Metadata: ${JSON.stringify(result.metadata)}`);
  console.log('---');
});
```

### Multi-RAG Join Search

```typescript
// Join by collection names
const joined = await client.joinSearch({
  collections: ['api-docs', 'user-guide', 'faq'],
  query: 'payment integration steps',
  topK: 10,
  mergeStrategy: 'score'
});

// Join by tags
const tagged = await client.joinSearchByTags({
  tags: ['documentation', 'public'],
  query: 'getting started tutorial',
  topK: 15,
  mergeStrategy: 'interleave'
});

// Results include source collection
joined.forEach(result => {
  console.log(`[${result.source}] ${result.content}`);
  console.log(`Relevance: ${result.score}`);
});
```

### Google Grounded Search

```typescript
// Configure Google grounding
client.configureGoogle({
  apiKey: process.env.GOOGLE_API_KEY!,
  searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!,
  resultsCount: 5
});

// Search with grounding
const grounded = await client.groundedSearch({
  collection: 'tech-docs',
  query: 'latest TypeScript features',
  topK: 5,
  webResults: 3,
  combineStrategy: 'interleave'
});

// Separate RAG and web results
const ragResults = grounded.filter(r => r.source === 'rag');
const webResults = grounded.filter(r => r.source === 'web');

console.log(`RAG: ${ragResults.length}, Web: ${webResults.length}`);
```

### List Collections

```typescript
// Get all collections
const collections = await client.listCollections();

collections.forEach(col => {
  console.log(`${col.name}: ${col.count} documents`);
  console.log(`Tags: ${col.metadata.tags.join(', ')}`);
});

// Filter by tags
const docCollections = await client.findCollectionsByTag('documentation');
```

### Advanced Filtering

```typescript
// Complex metadata queries
const results = await client.search({
  collection: 'knowledge-base',
  query: 'machine learning algorithms',
  topK: 20,
  filter: {
    category: { $in: ['ml', 'ai'] },
    date: { $gte: '2025-01-01' },
    'metadata.public': true
  },
  threshold: 0.75
});

// Reranking for precision
const reranked = await client.searchWithReranking({
  collection: 'research-papers',
  query: 'transformer architecture innovations',
  topK: 50,  // Retrieve more candidates
  rerankTopK: 10,  // Rerank to top 10
  rerankModel: 'cross-encoder'
});
```

## Workflows

### Workflow 1: Documentation Q&A

Search internal documentation with fallback to web:

```typescript
async function documentationQA(question: string) {
  // First search internal docs
  const ragResults = await client.joinSearchByTags({
    tags: ['documentation', 'internal'],
    query: question,
    topK: 5,
    threshold: 0.8
  });
  
  // If insufficient results, add web search
  if (ragResults.length < 3 || ragResults[0].score < 0.85) {
    const grounded = await client.groundedSearch({
      tags: ['documentation'],
      query: question,
      topK: 3,
      webResults: 2,
      combineStrategy: 'rag-first'
    });
    
    return grounded;
  }
  
  return ragResults;
}

const answer = await documentationQA('How do I deploy to production?');
```

### Workflow 2: Multi-Source Research

Combine multiple knowledge bases for comprehensive research:

```typescript
async function comprehensiveResearch(topic: string) {
  // Search across all relevant collections
  const results = await client.joinSearch({
    collections: [
      'research-papers',
      'technical-docs',
      'blog-posts',
      'meeting-notes'
    ],
    query: topic,
    topK: 20,
    mergeStrategy: 'score'
  });
  
  // Group by source
  const bySource = results.reduce((acc, result) => {
    acc[result.source] = acc[result.source] || [];
    acc[result.source].push(result);
    return acc;
  }, {} as Record<string, typeof results>);
  
  // Generate research summary
  return {
    query: topic,
    totalResults: results.length,
    sources: Object.keys(bySource).length,
    topResult: results[0],
    bySource
  };
}
```

### Workflow 3: Fact Verification

Verify RAG results against current web information:

```typescript
async function verifyFacts(claim: string) {
  // Get RAG results
  const ragResults = await client.search({
    collection: 'knowledge-base',
    query: claim,
    topK: 3
  });
  
  // Get current web results
  const webResults = await client.webSearch({
    query: claim,
    count: 5
  });
  
  // Compare and analyze
  return {
    claim,
    ragEvidence: ragResults,
    webEvidence: webResults,
    consistency: analyzeConsistency(ragResults, webResults),
    needsUpdate: ragResults[0]?.score < 0.9
  };
}
```

### Workflow 4: Tag-Based Knowledge Discovery

Discover related content across tagged collections:

```typescript
async function discoverRelated(concept: string, domain: string) {
  // Find collections in domain
  const collections = await client.findCollectionsByTag(domain);
  
  // Search each collection
  const allResults = await Promise.all(
    collections.map(col => 
      client.search({
        collection: col.name,
        query: concept,
        topK: 5
      })
    )
  );
  
  // Merge and deduplicate
  const merged = allResults
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  
  return {
    concept,
    domain,
    collectionsSearched: collections.length,
    results: merged
  };
}
```

### Workflow 5: Hybrid Search Pipeline

Combine semantic search, metadata filtering, and web grounding:

```typescript
async function hybridSearch(params: {
  query: string;
  tags: string[];
  metadata?: Record<string, any>;
  includeWeb?: boolean;
  rerankTop?: number;
}) {
  // Stage 1: Tag-based collection selection
  const collections = await client.findCollectionsByTags(params.tags);
  
  // Stage 2: Semantic search with metadata filtering
  const ragResults = await client.joinSearch({
    collections: collections.map(c => c.name),
    query: params.query,
    topK: params.rerankTop || 20,
    filter: params.metadata
  });
  
  // Stage 3: Optional reranking
  const reranked = params.rerankTop
    ? await client.rerank(ragResults, params.query, params.rerankTop)
    : ragResults;
  
  // Stage 4: Optional web grounding
  if (params.includeWeb) {
    const webResults = await client.webSearch({
      query: params.query,
      count: 3
    });
    
    return [...reranked.slice(0, 7), ...webResults];
  }
  
  return reranked;
}
```

## Embedding Providers

### OpenAI (Recommended)

```bash
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Models:**
- `text-embedding-3-small`: 1536 dimensions, $0.00002/1K tokens
- `text-embedding-3-large`: 3072 dimensions, $0.00013/1K tokens
- `text-embedding-ada-002`: 1536 dimensions (legacy)

### Cohere

```bash
EMBEDDING_PROVIDER=cohere
COHERE_API_KEY=...
COHERE_EMBEDDING_MODEL=embed-english-v3.0
```

**Models:**
- `embed-english-v3.0`: Optimized for English
- `embed-multilingual-v3.0`: 100+ languages
- `embed-english-light-v3.0`: Faster, smaller

### HuggingFace

```bash
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=...
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

**Models:**
- `all-MiniLM-L6-v2`: Fast, 384 dimensions
- `all-mpnet-base-v2`: Higher quality, 768 dimensions
- `multi-qa-mpnet-base-dot-v1`: Optimized for Q&A

## Google Grounding Setup

### Option 1: Google Custom Search API

1. Create project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Custom Search API
3. Create API key
4. Create Custom Search Engine at [programmablesearchengine.google.com](https://programmablesearchengine.google.com/)
5. Get Search Engine ID

```bash
GOOGLE_API_KEY=AIza...
GOOGLE_SEARCH_ENGINE_ID=abc123...
```

**Pricing:** 100 searches/day free, then $5/1000 queries

### Option 2: SerpAPI

1. Sign up at [serpapi.com](https://serpapi.com/)
2. Get API key from dashboard

```bash
SERPAPI_KEY=your-serpapi-key
```

**Pricing:** 100 searches/month free, then $50/month for 5,000 searches

## Search Configuration

### Similarity Thresholds

| Threshold | Use Case |
|-----------|----------|
| 0.9-1.0 | Exact or near-exact matches only |
| 0.8-0.9 | High precision, strict relevance |
| 0.7-0.8 | Balanced precision/recall (recommended) |
| 0.6-0.7 | Broader results, more recall |
| 0.5-0.6 | Very broad, exploratory search |

### Top-K Selection

| Top-K | Use Case |
|-------|----------|
| 1-3 | Single best answer |
| 5-10 | Standard search results (recommended) |
| 10-20 | Research, comprehensive coverage |
| 20-50 | Analysis, pattern discovery |
| 50+ | Batch processing, training data |

### Merge Strategies

**interleave** (default):
- Alternate results from each collection
- Ensures diversity across sources
- Good for multi-perspective answers

**score**:
- Rank all results by similarity score
- Best overall matches first
- Good for finding single best answer

**collection**:
- Group results by source collection
- Ordered by average collection score
- Good for source-aware presentation

**round-robin**:
- Equal distribution across collections
- Ensures representation from all sources
- Good for balanced multi-source coverage

## Performance Optimization

### Caching

Enable result caching for repeated queries:

```typescript
client.enableCache({
  ttl: 3600,  // 1 hour
  maxSize: 1000  // Max cached queries
});
```

### Batch Search

Process multiple queries efficiently:

```typescript
const queries = [
  'authentication setup',
  'rate limiting config',
  'error handling'
];

const results = await client.batchSearch({
  collection: 'api-docs',
  queries,
  topK: 5
});
```

### Embedding Reuse

Reuse query embeddings across collections:

```typescript
const queryEmbedding = await client.embed('deployment strategies');

const results = await Promise.all(
  collections.map(col =>
    client.searchWithEmbedding({
      collection: col,
      embedding: queryEmbedding,
      topK: 5
    })
  )
);
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ChromaDB connection failed | Service not running | Start ChromaDB: `chroma run --path ./chromadb_data` |
| Empty results | No matching collections | Check collection names with `npm run list` |
| Low similarity scores | Embedding mismatch | Use same embedding model as tag-n-rag |
| Google API quota | Exceeded free tier | Upgrade plan or use SerpAPI |
| Slow searches | Large collections | Enable caching, reduce top-k |
| Memory issues | Too many results | Use pagination, reduce batch size |

## Integration with Tag-n-RAG

The RAG Search skill is designed to work seamlessly with collections created by `ailey-tools-tag-n-rag`:

### 1. Create RAG Collection

```bash
cd .github/skills/ailey-tools-tag-n-rag
npm run tag-n-rag -- \
  --source docs/ \
  --tags "documentation,api" \
  --collection api-docs
```

### 2. Search RAG Collection

```bash
cd .github/skills/ailey-tools-rag-search
npm run search -- \
  --collection api-docs \
  --query "authentication flow"
```

### 3. Join Multiple Tagged RAGs

```bash
# Create multiple tagged collections
cd .github/skills/ailey-tools-tag-n-rag
npm run tag-n-rag -- --source api/ --tags "api,reference"
npm run tag-n-rag -- --source guides/ --tags "guide,tutorial"
npm run tag-n-rag -- --source faq/ --tags "faq,support"

# Search across all with specific tag
cd .github/skills/ailey-tools-rag-search
npm run join -- \
  --tags "reference,tutorial" \
  --query "getting started"
```

## API Reference

### RAGSearchClient

```typescript
class RAGSearchClient {
  constructor(config: RAGSearchConfig)
  
  // Connection
  connect(): Promise<void>
  disconnect(): Promise<void>
  
  // Collection Management
  listCollections(): Promise<Collection[]>
  getCollection(name: string): Promise<Collection>
  findCollectionsByTag(tag: string): Promise<Collection[]>
  findCollectionsByTags(tags: string[]): Promise<Collection[]>
  
  // Single Collection Search
  search(options: SearchOptions): Promise<SearchResult[]>
  searchWithEmbedding(options: EmbeddingSearchOptions): Promise<SearchResult[]>
  
  // Multi-Collection Search
  joinSearch(options: JoinSearchOptions): Promise<SearchResult[]>
  joinSearchByTags(options: TagSearchOptions): Promise<SearchResult[]>
  
  // Google Grounding
  configureGoogle(config: GoogleConfig): void
  groundedSearch(options: GroundedSearchOptions): Promise<SearchResult[]>
  webSearch(options: WebSearchOptions): Promise<SearchResult[]>
  
  // Advanced
  rerank(results: SearchResult[], query: string, topK: number): Promise<SearchResult[]>
  batchSearch(options: BatchSearchOptions): Promise<SearchResult[][]>
  
  // Utilities
  embed(text: string): Promise<number[]>
  enableCache(config: CacheConfig): void
  clearCache(): void
}
```

### Types

```typescript
interface SearchOptions {
  collection: string;
  query: string;
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

interface JoinSearchOptions {
  collections: string[];
  query: string;
  topK?: number;
  mergeStrategy?: 'interleave' | 'score' | 'collection' | 'round-robin';
}

interface TagSearchOptions {
  tags: string[];
  query: string;
  topK?: number;
  mergeStrategy?: 'interleave' | 'score' | 'collection' | 'round-robin';
}

interface GroundedSearchOptions {
  collection?: string;
  tags?: string[];
  query: string;
  topK?: number;
  webResults?: number;
  combineStrategy?: 'rag-first' | 'web-first' | 'interleave' | 'scored';
}

interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  source: string;  // collection name or 'web'
  distance: number;
}
```

## Resources

- **ChromaDB**: [docs.trychroma.com](https://docs.trychroma.com/)
- **OpenAI Embeddings**: [platform.openai.com/docs/guides/embeddings](https://platform.openai.com/docs/guides/embeddings)
- **Google Custom Search**: [developers.google.com/custom-search](https://developers.google.com/custom-search)
- **SerpAPI**: [serpapi.com/search-api](https://serpapi.com/search-api)
- **Tag-n-RAG Skill**: [.github/skills/ailey-tools-tag-n-rag](../ailey-tools-tag-n-rag)

---
version: 1.1.0
updated: 2026-03-03
reviewed: 2026-03-03
score: 4.6
---
