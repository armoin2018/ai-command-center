/**
 * Chunking utilities for splitting data into smaller pieces
 */

import type { ChunkingOptions } from './types.js';

export interface Chunk {
  index: number;
  data: any;
  filename: string;
  stats: {
    characters: number;
    words: number;
    lines: number;
  };
}

export class Chunker {
  constructor(private options: ChunkingOptions) {}

  chunk(data: any): Chunk[] {
    if (!this.options.enabled) {
      return [{
        index: 0,
        data,
        filename: this.generateFilename(0),
        stats: this.calculateStats(data),
      }];
    }

    // Convert data to string for text-based chunking
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    const chunks: Chunk[] = [];
    let pieces: string[] = [];

    switch (this.options.mode) {
      case 'paragraph':
        pieces = this.chunkByParagraph(text);
        break;
      case 'sentence':
        pieces = this.chunkBySentence(text);
        break;
      case 'character':
        pieces = this.chunkByCharacter(text);
        break;
      case 'word':
        pieces = this.chunkByWord(text);
        break;
      case 'line':
        pieces = this.chunkByLine(text);
        break;
    }

    // Apply overlap if specified
    if (this.options.overlap && this.options.overlap > 0) {
      pieces = this.applyOverlap(pieces);
    }

    // Create chunk objects
    for (let i = 0; i < pieces.length; i++) {
      chunks.push({
        index: i,
        data: pieces[i],
        filename: this.generateFilename(i),
        stats: this.calculateStats(pieces[i]),
      });
    }

    return chunks;
  }

  private chunkByParagraph(text: string): string[] {
    // Split by double newlines
    const paragraphs = text.split(/\n\s*\n/);
    return this.groupBySize(paragraphs, this.options.size);
  }

  private chunkBySentence(text: string): string[] {
    // Split by sentence-ending punctuation
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return this.groupBySize(sentences, this.options.size);
  }

  private chunkByCharacter(text: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += this.options.size) {
      chunks.push(text.slice(i, i + this.options.size));
    }
    return chunks;
  }

  private chunkByWord(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += this.options.size) {
      const chunk = words.slice(i, i + this.options.size).join(' ');
      chunks.push(chunk);
    }
    
    return chunks;
  }

  private chunkByLine(text: string): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    
    for (let i = 0; i < lines.length; i += this.options.size) {
      const chunk = lines.slice(i, i + this.options.size).join('\n');
      chunks.push(chunk);
    }
    
    return chunks;
  }

  private groupBySize(items: string[], size: number): string[] {
    const chunks: string[] = [];
    let current = '';
    let count = 0;

    for (const item of items) {
      if (count >= size && current.length > 0) {
        chunks.push(current.trim());
        current = '';
        count = 0;
      }
      current += (current ? '\n' : '') + item;
      count++;
    }

    if (current) {
      chunks.push(current.trim());
    }

    return chunks;
  }

  private applyOverlap(pieces: string[]): string[] {
    if (pieces.length <= 1) return pieces;

    const overlapped: string[] = [];
    const overlap = this.options.overlap || 0;

    for (let i = 0; i < pieces.length; i++) {
      let chunk = pieces[i];

      // Add overlap from previous chunk
      if (i > 0) {
        const prevWords = pieces[i - 1].split(/\s+/);
        const overlapWords = prevWords.slice(-overlap);
        chunk = overlapWords.join(' ') + ' ' + chunk;
      }

      overlapped.push(chunk);
    }

    return overlapped;
  }

  private generateFilename(index: number): string {
    const pattern = this.options.pattern || '{name}-{index}.{ext}';
    
    return pattern
      .replace('{index}', String(index).padStart(4, '0'))
      .replace('{name}', 'chunk')
      .replace('{ext}', 'txt');
  }

  private calculateStats(data: string): { characters: number; words: number; lines: number } {
    const text = String(data);
    return {
      characters: text.length,
      words: text.split(/\s+/).filter(w => w.length > 0).length,
      lines: text.split('\n').length,
    };
  }
}
