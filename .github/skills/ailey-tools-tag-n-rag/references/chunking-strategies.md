# Chunking Strategies

## Overview

Chunking divides long documents into smaller, semantically coherent pieces for better retrieval and processing.

## Strategy 1: Paragraph-First (Recommended)

Split on paragraph boundaries, respecting target chunk size:

**Advantages:**
- Preserves semantic coherence
- Natural reading flow
- Works well for documentation

**Implementation:**
1. Split text on double newlines (`\n\n`)
2. Accumulate paragraphs until reaching target size
3. Start new chunk when threshold exceeded

## Strategy 2: Sentence-Based

Split on sentence boundaries for finer granularity:

**Advantages:**
- More precise context
- Good for Q&A systems
- Handles varied paragraph lengths

**Implementation:**
1. Split on sentence endings (`.`, `!`, `?`)
2. Group sentences to reach target size
3. Preserve sentence completeness

## Strategy 3: Sliding Window

Overlapping chunks for context continuity:

**Advantages:**
- Prevents information loss at boundaries
- Better for cross-chunk relationships
- Good for technical content

**Implementation:**
1. Create chunks of fixed size
2. Slide window by 50-75% of chunk size
3. Maintain overlap between chunks

## Strategy 4: Semantic Sections

Split based on document structure:

**Advantages:**
- Respects document hierarchy
- Preserves logical groupings
- Ideal for structured content

**Implementation:**
1. Identify headings, sections
2. Chunk by semantic boundaries
3. Include heading context in metadata

## Best Practices

### Target Sizes

- **Short chunks (100-200 words)**: Q&A, precise retrieval
- **Medium chunks (200-500 words)**: General documentation
- **Long chunks (500-1000 words)**: Technical manuals, code

### Special Content

**Code Blocks:**
- Keep intact, don't split mid-function
- Include surrounding context
- Tag with language metadata

**Tables:**
- Keep rows together
- Include column headers
- Consider converting to text descriptions

**Lists:**
- Preserve list structure
- Keep related items together
- Include list intro/context

### Context Preservation

Include contextual markers:
- Heading hierarchy
- Document section
- File path
- Timestamps

## Example

```typescript
// Paragraph-first with code preservation
const chunks = await chunkContent(text, {
  size: 300,
  preserveParagraphs: true,
  preserveCode: true
});
```

Result:
- Chunks average 300 words
- Paragraph boundaries respected
- Code blocks kept intact
- Semantic coherence maintained
