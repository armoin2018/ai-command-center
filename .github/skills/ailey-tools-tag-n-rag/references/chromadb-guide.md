# ChromaDB Guide

## Overview

ChromaDB is an open-source embedding database designed for AI applications. It automatically generates and stores embeddings for your documents, making them searchable via semantic similarity.

## Local Setup

ChromaDB runs embedded with no external dependencies or server:

```bash
npm install chromadb
```

Data is stored locally in `.rag/chromadb/` - no Docker or server required!

## Collections

Collections organize related documents:

```typescript
const collection = await client.getOrCreateCollection({
  name: 'my-docs',
  metadata: { description: 'My documentation' }
});
```

Collection names must be:
- 3-63 characters
- Start and end with alphanumeric
- Contain only alphanumeric, underscores, hyphens

## Adding Documents

```typescript
await collection.add({
  ids: ['doc1', 'doc2'],
  documents: ['First document text', 'Second document text'],
  metadatas: [
    { source: 'file1.md', tags: ['api', 'reference'] },
    { source: 'file2.md', tags: ['tutorial'] }
  ]
});
```

## Querying

Query by semantic similarity:

```typescript
const results = await collection.query({
  queryTexts: ['how to authenticate'],
  nResults: 10,
  where: { tags: { $contains: 'api' } }
});
```

## Metadata Filtering

Filter results by metadata:

```typescript
// Exact match
where: { classification: 'public' }

// Contains (for arrays)
where: { tags: { $contains: 'api' } }

// Comparison
where: { chunkSize: { $gt: 200 } }

// Logical operators
where: {
  $and: [
    { classification: 'public' },
    { tags: { $contains: 'tutorial' } }
  ]
}
```

## Best Practices

1. **Collection Organization**: Use separate collections for different content types or sources
2. **Metadata Design**: Include searchable metadata (tags, source, timestamps)
3. **ID Strategy**: Use meaningful IDs like `{source}_{chunkIndex}`
4. **Chunk Size**: 200-500 words per chunk works well for most content
5. **Regular Cleanup**: Delete outdated content to maintain accuracy

## Limitations

- In-memory storage (persisted to disk)
- Single-node only (no distributed setup)
- Automatic embedding generation (can't customize model easily)

## References

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Python Client](https://docs.trychroma.com/getting-started)
- [JavaScript Client](https://www.npmjs.com/package/chromadb)
