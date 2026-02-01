/**
 * Intelligent content chunking
 * Uses paragraph and sentence boundaries
 */

export interface ChunkOptions {
  size: number;
  preserveParagraphs?: boolean;
  preserveCode?: boolean;
}

export async function chunkContent(
  text: string,
  options: ChunkOptions
): Promise<string[]> {
  const { size, preserveParagraphs = true, preserveCode = true } = options;

  // Split into paragraphs first
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWords = 0;

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).length;

    // Check if this is a code block
    const isCode = preserveCode && /```/.test(para);

    if (isCode) {
      // Keep code blocks intact
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));
        currentChunk = [];
        currentWords = 0;
      }
      chunks.push(para);
      continue;
    }

    // If adding this paragraph exceeds size, start new chunk
    if (currentWords + paraWords > size && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [para];
      currentWords = paraWords;
    } else {
      currentChunk.push(para);
      currentWords += paraWords;
    }
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  // Further split chunks that are still too large (by sentences)
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    const words = chunk.split(/\s+/).length;
    if (words > size * 1.5) {
      finalChunks.push(...splitBySentences(chunk, size));
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks.filter(c => c.trim().length > 0);
}

function splitBySentences(text: string, targetSize: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  let words = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

    if (words + sentenceWords > targetSize && current.length > 0) {
      chunks.push(current.join(' '));
      current = [sentence];
      words = sentenceWords;
    } else {
      current.push(sentence);
      words += sentenceWords;
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(' '));
  }

  return chunks;
}
