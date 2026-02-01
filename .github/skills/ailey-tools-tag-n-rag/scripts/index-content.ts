#!/usr/bin/env node
/**
 * Main RAG indexing pipeline
 * Processes content from various sources and creates tagged RAG sets in ChromaDB
 */

import { Command } from 'commander';
import { retrieveContent } from './retrieve-content';
import { convertToText } from './convert-formats';
import { scrubText } from './scrub-text';
import { chunkContent } from './chunk-content';
import { storeInChromaDB } from './chromadb-store';
import * as path from 'path';
import * as fs from 'fs/promises';

interface IndexOptions {
  source: string;
  tags: string;
  output: string;
  translate: boolean;
  chunkSize: number;
  depth: number;
  metadata?: string;
}

interface RAGMetadata {
  source: string;
  sourceType: string;
  tags: string[];
  chunkIndex: number;
  chunkSize: number;
  ingestionTimestamp: string;
  fileTimestamp?: string;
  [key: string]: any;
}

async function main() {
  const program = new Command();

  program
    .name('tag-n-rag')
    .description('Index content into tagged RAG sets with ChromaDB')
    .requiredOption('-s, --source <path>', 'Source file, folder, Git repo, or URL')
    .requiredOption('-t, --tags <tags>', 'Comma-separated tags')
    .option('-o, --output <path>', 'Output folder for RAG sets', '.rag/')
    .option('--translate', 'Translate content', false)
    .option('-c, --chunk-size <number>', 'Words per chunk', '300')
    .option('-d, --depth <number>', 'Folder recursion depth', '1')
    .option('-m, --metadata <pairs>', 'Additional metadata (key=value,key2=value2)')
    .parse(process.argv);

  const options = program.opts<IndexOptions>();

  console.log('🚀 Starting RAG indexing pipeline...\n');

  try {
    // Step 1: Retrieve content
    console.log(`📥 Retrieving content from: ${options.source}`);
    const files = await retrieveContent(options.source, {
      depth: parseInt(options.depth.toString()),
      includeGit: true,
      includeUrls: true
    });
    console.log(`   Found ${files.length} file(s)\n`);

    // Step 2: Process each file
    const tags = options.tags.split(',').map(t => t.trim());
    const customMetadata = parseMetadata(options.metadata);
    let totalChunks = 0;

    for (const file of files) {
      console.log(`📄 Processing: ${file.path}`);

      // Convert to text
      const text = await convertToText(file, {
        translate: options.translate
      });
      console.log(`   Converted to text (${text.length} chars)`);

      // Scrub text
      const scrubbed = await scrubText(text);
      console.log(`   Scrubbed text (${scrubbed.length} chars)`);

      // Chunk content
      const chunks = await chunkContent(scrubbed, {
        size: parseInt(options.chunkSize.toString()),
        preserveParagraphs: true,
        preserveCode: true
      });
      console.log(`   Created ${chunks.length} chunk(s)`);

      // Create metadata for each chunk
      const ragEntries = chunks.map((chunk: string, index: number) => ({
        content: chunk,
        metadata: {
          source: file.path,
          sourceType: file.type,
          tags,
          chunkIndex: index,
          chunkSize: chunk.split(/\s+/).length,
          ingestionTimestamp: new Date().toISOString(),
          fileTimestamp: file.timestamp,
          ...customMetadata
        } as RAGMetadata
      }));

      // Store in ChromaDB
      await storeInChromaDB(ragEntries, {
        collection: sanitizeCollectionName(tags[0] || 'default'),
        outputPath: options.output
      });

      totalChunks += chunks.length;
      console.log(`   ✓ Indexed ${chunks.length} chunk(s)\n`);
    }

    console.log('✅ RAG indexing complete!');
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Total chunks: ${totalChunks}`);
    console.log(`   Tags: ${tags.join(', ')}`);
    console.log(`   Output: ${options.output}\n`);

  } catch (error) {
    console.error('❌ Error during RAG indexing:', error);
    process.exit(1);
  }
}

function parseMetadata(metadataStr?: string): Record<string, any> {
  if (!metadataStr) return {};
  
  const metadata: Record<string, any> = {};
  const pairs = metadataStr.split(',');
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(s => s.trim());
    if (key && value) {
      metadata[key] = value;
    }
  }
  
  return metadata;
}

function sanitizeCollectionName(name: string): string {
  // ChromaDB collection names must be alphanumeric + underscores/hyphens
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
