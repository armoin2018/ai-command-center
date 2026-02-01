# RAG Search Skill - Project Summary

**ID:** `ailey-tools-rag-search`  
**Type:** Tools Skill  
**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2026-02-01

## Overview

Intelligent search across RAG collections created by ailey-tools-tag-n-rag with semantic search, multi-RAG joining, tag-based filtering, and optional Google grounding capabilities.

### Key Capabilities

- **Semantic Search**: Natural language queries with embedding-based similarity
- **Multi-RAG Joining**: Search across multiple collections simultaneously
- **Tag-Based Filtering**: Find and search collections by metadata tags
- **Google Grounding**: Supplement RAG results with real-time web search
- **Flexible Providers**: OpenAI, Cohere, or HuggingFace embeddings
- **Result Merging**: Multiple strategies for combining results
- **Dual Interface**: CLI commands and TypeScript API

## Technology Stack

- **TypeScript**: 5.3.3
- **ChromaDB**: ^1.8.1 (vector database)
- **OpenAI**: ^4.20.0 (embeddings)
- **axios**: ^1.6.0 (HTTP client)
- **commander**: ^11.0.0 (CLI framework)
- **chalk**: ^5.3.0 (terminal styling)
- **google-search-results-nodejs**: ^2.1.0 (web search)

## File Structure

```
ailey-tools-rag-search/
├── package.json           # NPM configuration
├── tsconfig.json          # TypeScript config
├── .env.example           # Environment template
├── .gitignore             # Git exclusions
├── SKILL.md               # Complete documentation
├── README.md              # Quick start guide
├── QUICK_REFERENCE.md     # Command reference
├── SUMMARY.md             # This file
├── install.sh             # Installation script
└── src/
    ├── index.ts           # RAGSearchClient class
    └── cli.ts             # CLI commands
```

## Prerequisites

- Node.js 18+
- npm 9+
- ChromaDB server running
- Embedding provider API key (OpenAI/Cohere/HuggingFace)
- Optional: Google API for grounding

## Quick Start

### 1. Start ChromaDB

```bash
chroma run --path ./chromadb_data --port 8000
```

### 2. Install

```bash
npm install
./install.sh
```

### 3. Configure

```bash
# .env
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# Optional Google grounding
GOOGLE_API_KEY=AIza...
GOOGLE_SEARCH_ENGINE_ID=abc123...
```

### 4. Use

```bash
# List collections
npm run list

# Search
npm run search -- -c "api-docs" -q "authentication"

# Multi-RAG search
npm run join -- --tags "docs,api" -q "rate limiting"

# With Google grounding
npm run grounded -- -c "tech-docs" -q "latest features" -w 3
```

## Core Methods

```typescript
class RAGSearchClient {
  // Connection
  connect(): Promise<void>
  disconnect(): Promise<void>
  
  // Collection Management
  listCollections(): Promise<CollectionInfo[]>
  getCollection(name: string): Promise<Collection>
  findCollectionsByTag(tag: string): Promise<CollectionInfo[]>
  findCollectionsByTags(tags: string[]): Promise<CollectionInfo[]>
  
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
  embed(text: string): Promise<number[]>
  
  // Utilities
  enableCache(config: CacheConfig): void
  clearCache(): void
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `setup` | Display setup instructions |
| `list` | List all RAG collections |
| `tags` | Find collections by tags |
| `search` | Search single collection |
| `join` | Search multiple collections |
| `grounded` | Search with Google grounding |
| `diagnose` | Run system diagnostics |

## Workflows

### Documentation Q&A

```typescript
const results = await client.joinSearchByTags({
  tags: ['documentation'],
  query: 'How do I deploy?',
  topK: 5
});
```

### Multi-Source Research

```typescript
const comprehensive = await client.joinSearch({
  collections: ['papers', 'docs', 'blogs', 'notes'],
  query: 'machine learning',
  topK: 20,
  mergeStrategy: 'score'
});
```

### Fact Verification with Web

```typescript
const grounded = await client.groundedSearch({
  collection: 'knowledge-base',
  query: 'latest AI developments',
  topK: 5,
  webResults: 3,
  combineStrategy: 'interleave'
});
```

## Integration with Tag-n-RAG

### 1. Create RAG Collections

```bash
cd .github/skills/ailey-tools-tag-n-rag

# Create API docs RAG
npm run tag-n-rag -- \
  --source api/ \
  --tags "api,reference" \
  --collection api-docs

# Create user guide RAG
npm run tag-n-rag -- \
  --source guides/ \
  --tags "guide,tutorial" \
  --collection user-guide
```

### 2. Search RAG Collections

```bash
cd .github/skills/ailey-tools-rag-search

# Search by tag
npm run join -- \
  --tags "reference,tutorial" \
  --query "getting started"

# Grounded search
npm run grounded -- \
  --tags "api,guide" \
  --query "best practices" \
  --web-results 3
```

## Embedding Providers

### OpenAI (Recommended)

- Model: `text-embedding-3-small` (1536 dims)
- Cost: $0.00002/1K tokens
- Best balance of quality and cost

### Cohere

- Model: `embed-english-v3.0`
- Optimized for English semantic search
- Multilingual model available

### HuggingFace

- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Free with API key
- 384 dimensions, fast

## Google Grounding Setup

### Option 1: Google Custom Search API

1. Create project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Custom Search API
3. Create API key
4. Create Search Engine at [programmablesearchengine.google.com](https://programmablesearchengine.google.com/)

**Cost:** 100 free/day, then $5/1000

### Option 2: SerpAPI

1. Sign up at [serpapi.com](https://serpapi.com/)
2. Get API key

**Cost:** 100 free/month, then $50/5000

## Search Configuration

### Similarity Thresholds

- **0.9-1.0**: Exact matches only
- **0.8-0.9**: High precision
- **0.7-0.8**: Balanced (recommended)
- **0.6-0.7**: Broader results
- **0.5-0.6**: Exploratory

### Merge Strategies

- **interleave**: Alternate results from each collection
- **score**: Rank all by similarity score
- **collection**: Group by source collection
- **round-robin**: Equal distribution

### Combine Strategies (Grounded Search)

- **rag-first**: RAG results, then web (default)
- **web-first**: Web results, then RAG
- **interleave**: Alternate RAG and web
- **scored**: Combined ranking by relevance

## Performance

### Caching

```typescript
client.enableCache({
  ttl: 3600,      // 1 hour
  maxSize: 1000   // Max queries
});
```

### Batch Processing

```typescript
const results = await client.batchSearch({
  collection: 'docs',
  queries: ['auth', 'rate-limit', 'errors'],
  topK: 5
});
```

### Embedding Reuse

```typescript
const embedding = await client.embed('deployment');

await Promise.all(
  collections.map(col =>
    client.searchWithEmbedding({
      collection: col,
      embedding,
      topK: 5
    })
  )
);
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| ChromaDB connection failed | Service not running | `chroma run --path ./chromadb_data` |
| Empty results | No collections | Check `npm run list` |
| Low similarity scores | Embedding mismatch | Use same model as tag-n-rag |
| Google API quota | Exceeded limit | Upgrade or use SerpAPI |
| Slow searches | Large collections | Enable caching |
| Memory issues | Too many results | Reduce top-k, use pagination |

## API Reference

### Search Options

```typescript
interface SearchOptions {
  collection: string;
  query: string;
  topK?: number;          // Default: 10
  threshold?: number;     // Default: 0.7
  filter?: Record<string, any>;
}
```

### Join Options

```typescript
interface JoinSearchOptions {
  collections: string[];
  query: string;
  topK?: number;
  mergeStrategy?: 'interleave' | 'score' | 'collection' | 'round-robin';
}
```

### Grounded Options

```typescript
interface GroundedSearchOptions {
  collection?: string;
  collections?: string[];
  tags?: string[];
  query: string;
  topK?: number;
  webResults?: number;
  combineStrategy?: 'rag-first' | 'web-first' | 'interleave' | 'scored';
}
```

### Search Result

```typescript
interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;          // 0-1 similarity
  distance: number;       // Vector distance
  source: string;         // Collection name or 'web'
}
```

## Resources

- **ChromaDB**: [docs.trychroma.com](https://docs.trychroma.com/)
- **OpenAI Embeddings**: [platform.openai.com/docs/guides/embeddings](https://platform.openai.com/docs/guides/embeddings)
- **Google Custom Search**: [developers.google.com/custom-search](https://developers.google.com/custom-search)
- **SerpAPI**: [serpapi.com](https://serpapi.com/)
- **Tag-n-RAG**: [.github/skills/ailey-tools-tag-n-rag](../ailey-tools-tag-n-rag)

## Changelog

### Version 1.0.0 (2026-02-01)

**Initial Release**

- ✅ Semantic search with ChromaDB
- ✅ Multi-RAG joining with 4 merge strategies
- ✅ Tag-based collection filtering
- ✅ Google grounding with 4 combine strategies
- ✅ OpenAI, Cohere, HuggingFace embeddings
- ✅ Result caching and batch processing
- ✅ CLI interface with 7 commands
- ✅ TypeScript API with full type safety
- ✅ Comprehensive documentation

## License

MIT License

---

**Project**: AI-ley Kit  
**Skill**: RAG Search  
**Maintained by**: AI Command Center Team  
**Last Updated**: 2026-02-01
