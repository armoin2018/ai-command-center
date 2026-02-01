/**
 * ChromaDB storage integration
 * Stores RAG chunks as JSON (ChromaDB JS client doesn't support embedded mode)
 * Use the provided Python script to import into ChromaDB
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export interface RAGEntry {
  content: string;
  metadata: Record<string, any>;
}

export interface StoreOptions {
  collection: string;
  outputPath: string;
}

export async function storeInChromaDB(
  entries: RAGEntry[],
  options: StoreOptions
): Promise<void> {
  // Ensure output directory exists
  await fs.mkdir(options.outputPath, { recursive: true });

  // Prepare data for storage
  const data = {
    collection: options.collection,
    entries: entries.map((entry, index) => ({
      id: `${entry.metadata.source}_${entry.metadata.chunkIndex}`,
      document: entry.content,
      metadata: entry.metadata
    }))
  };

  // Write to JSON file
  const outputFile = path.join(options.outputPath, `${options.collection}.json`);
  await fs.writeFile(outputFile, JSON.stringify(data, null, 2));

  console.log(`   Stored ${entries.length} entries to: ${outputFile}`);
  console.log(`   Use 'python scripts/import-to-chromadb.py ${outputFile}' to import into ChromaDB`);
}
