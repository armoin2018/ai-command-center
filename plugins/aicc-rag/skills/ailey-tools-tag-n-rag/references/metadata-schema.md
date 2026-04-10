# RAG Metadata Schema

## Standard Fields

Every RAG entry includes these standard metadata fields:

```typescript
interface RAGMetadata {
  // Source identification
  source: string;           // Original file path or URL
  sourceType: string;       // 'file' | 'folder' | 'git' | 'url' | 'confluence' | 'jira'
  
  // Content organization
  tags: string[];           // User-provided tags for categorization
  chunkIndex: number;       // Position in original source (0-based)
  chunkSize: number;        // Actual word count in chunk
  
  // Timestamps
  ingestionTimestamp: string;    // ISO 8601 when indexed
  fileTimestamp?: string;        // ISO 8601 file modification time
  
  // Optional compliance
  classification?: string;   // 'public' | 'internal' | 'confidential' | 'secret'
  retention?: string;        // e.g., '1year', '7years', 'permanent'
  
  // Custom fields
  [key: string]: any;       // Additional user metadata
}
```

## Field Descriptions

### source
Path to the original file or resource:
- **Local file**: `./docs/api.md`
- **Git repo**: `https://github.com/org/repo`
- **URL**: `https://example.com/page`
- **Confluence**: `confluence://SPACE/Page+Title`
- **Jira**: `jira://PROJECT/ISSUE-123`

### sourceType
Categorizes the source origin:
- `file`: Local file
- `folder`: Part of folder batch processing
- `git`: From Git repository
- `url`: From web URL
- `confluence`: From Confluence space
- `jira`: From Jira project

### tags
Comma-separated categorization tags:
```typescript
tags: ['api', 'reference', 'authentication']
```

Common tag patterns:
- Content type: `documentation`, `code`, `meeting`, `email`
- Domain: `engineering`, `product`, `legal`, `finance`
- Project: `project-alpha`, `v2-migration`, `q1-2026`
- Status: `draft`, `published`, `archived`

### chunkIndex
Zero-based position in source document:
- `0`: First chunk
- `1`: Second chunk
- `n`: nth chunk

Use for:
- Reconstructing original document
- Understanding context sequence
- Navigation between chunks

### chunkSize
Actual word count (may vary from target):
```typescript
chunkSize: 287  // words in this chunk
```

Useful for:
- Quality assessment
- Display pagination
- Search result ranking

### ingestionTimestamp
ISO 8601 timestamp when content was indexed:
```typescript
ingestionTimestamp: "2026-01-31T14:30:00.000Z"
```

Use for:
- Freshness filtering
- Incremental updates
- Audit trails

### fileTimestamp
Original file modification timestamp:
```typescript
fileTimestamp: "2026-01-15T09:45:00.000Z"
```

Use for:
- Detecting stale content
- Update detection
- Version tracking

### classification
Security classification level:
- `public`: Publicly shareable
- `internal`: Internal use only
- `confidential`: Restricted access
- `secret`: Highly restricted

### retention
Data retention policy:
- `1year`, `3years`, `7years`: Fixed periods
- `permanent`: Keep indefinitely
- `until-2027-12-31`: Specific end date

## Custom Metadata

Add domain-specific fields:

```typescript
{
  // Meeting metadata
  meetingType: 'standup',
  attendees: ['alice', 'bob'],
  decisions: ['approved budget'],
  
  // Document metadata  
  author: 'jane.doe',
  department: 'engineering',
  version: '2.1.0',
  
  // Legal metadata
  contract_id: 'CNT-2026-001',
  parties: ['CompanyA', 'CompanyB'],
  effective_date: '2026-02-01'
}
```

## Querying by Metadata

### Exact Match
```typescript
where: { sourceType: 'confluence' }
```

### Array Contains
```typescript
where: { tags: { $contains: 'api' } }
```

### Comparison
```typescript
where: { chunkSize: { $gt: 200, $lt: 500 } }
```

### Logical Operators
```typescript
where: {
  $and: [
    { classification: 'public' },
    { retention: '1year' }
  ]
}
```

## Best Practices

1. **Consistent Naming**: Use lowercase, snake_case for custom fields
2. **Structured Tags**: Define tag taxonomy upfront
3. **Timestamps**: Always ISO 8601 format
4. **Classification**: Apply to all content
5. **Retention**: Set for compliance
6. **Searchable Fields**: Make key data searchable (not nested too deep)

## Examples

### Documentation
```typescript
{
  source: './docs/api/authentication.md',
  sourceType: 'file',
  tags: ['api', 'authentication', 'security'],
  chunkIndex: 2,
  chunkSize: 315,
  ingestionTimestamp: '2026-01-31T14:30:00Z',
  fileTimestamp: '2026-01-15T09:45:00Z',
  classification: 'public',
  author: 'engineering-team',
  version: '2.0'
}
```

### Meeting
```typescript
{
  source: 'meetings/standup-2026-01-31.mp4',
  sourceType: 'file',
  tags: ['meeting', 'standup', 'engineering'],
  chunkIndex: 0,
  chunkSize: 287,
  ingestionTimestamp: '2026-01-31T15:00:00Z',
  fileTimestamp: '2026-01-31T10:00:00Z',
  classification: 'internal',
  meetingDate: '2026-01-31',
  attendees: ['alice', 'bob', 'charlie'],
  topics: ['sprint-progress', 'blockers']
}
```

### Code
```typescript
{
  source: 'src/auth/jwt.ts',
  sourceType: 'git',
  tags: ['code', 'typescript', 'authentication'],
  chunkIndex: 1,
  chunkSize: 156,
  ingestionTimestamp: '2026-01-31T14:45:00Z',
  classification: 'internal',
  language: 'typescript',
  package: '@company/auth',
  version: '1.5.0'
}
```
