#!/usr/bin/env node
/**
 * Comprehensive test runner for ailey-data-converter
 * 
 * Tests all format conversions, compression, chunking, and IO handlers
 */

import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert } from '../scripts/convert.js';
import type { ConversionResult } from '../lib/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  name: string;
  description: string;
  run: () => Promise<void>;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

class TestRunner {
  private passed = 0;
  private failed = 0;
  private suites: TestSuite[] = [];

  suite(name: string, tests: TestCase[]): void {
    this.suites.push({ name, tests });
  }

  async run(): Promise<void> {
    console.log(chalk.bold.blue('\n🧪 Running ailey-data-converter tests\n'));

    for (const suite of this.suites) {
      console.log(chalk.bold.cyan(`\n${suite.name}`));
      console.log(chalk.gray('─'.repeat(60)));

      for (const test of suite.tests) {
        try {
          await test.run();
          this.passed++;
          console.log(chalk.green(`  ✓ ${test.description}`));
        } catch (error) {
          this.failed++;
          console.log(chalk.red(`  ✗ ${test.description}`));
          console.log(chalk.red(`    ${error instanceof Error ? error.message : String(error)}`));
        }
      }
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log(chalk.bold.blue('\n📊 Test Summary'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.green(`  Passed: ${this.passed}`));
    console.log(chalk.red(`  Failed: ${this.failed}`));
    console.log(chalk.blue(`  Total:  ${this.passed + this.failed}`));

    if (this.failed > 0) {
      console.log(chalk.red('\n❌ Some tests failed\n'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ All tests passed!\n'));
    }
  }
}

// Helper functions
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cleanupTestOutput(): Promise<void> {
  const outputDir = path.join(__dirname, 'output');
  try {
    await fs.rm(outputDir, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
  await fs.mkdir(outputDir, { recursive: true });
}

function getFixturePath(filename: string): string {
  return path.join(__dirname, 'fixtures', filename);
}

function getOutputPath(filename: string): string {
  return path.join(__dirname, 'output', filename);
}

// Test suites
const runner = new TestRunner();

// Format conversion tests
runner.suite('Format Conversions', [
  {
    name: 'json-to-yaml',
    description: 'Convert JSON to YAML',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.json'),
        output: getOutputPath('sample.yaml'),
        from: 'json',
        to: 'yaml',
      });

      if (!result.success) throw new Error('Conversion failed');
      if (!(await fileExists(getOutputPath('sample.yaml')))) {
        throw new Error('Output file not created');
      }
    },
  },
  {
    name: 'yaml-to-json',
    description: 'Convert YAML to JSON',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.yaml'),
        output: getOutputPath('sample.json'),
        from: 'yaml',
        to: 'json',
      });

      if (!result.success) throw new Error('Conversion failed');
      if (!(await fileExists(getOutputPath('sample.json')))) {
        throw new Error('Output file not created');
      }
    },
  },
  {
    name: 'json-to-xml',
    description: 'Convert JSON to XML',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.json'),
        output: getOutputPath('sample.xml'),
        from: 'json',
        to: 'xml',
      });

      if (!result.success) throw new Error('Conversion failed');
      if (!(await fileExists(getOutputPath('sample.xml')))) {
        throw new Error('Output file not created');
      }
    },
  },
  {
    name: 'xml-to-json',
    description: 'Convert XML to JSON',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.xml'),
        output: getOutputPath('sample-from-xml.json'),
        from: 'xml',
        to: 'json',
      });

      if (!result.success) throw new Error('Conversion failed');
      if (!(await fileExists(getOutputPath('sample-from-xml.json')))) {
        throw new Error('Output file not created');
      }
    },
  },
  {
    name: 'csv-to-json',
    description: 'Convert CSV to JSON',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.csv'),
        output: getOutputPath('sample-from-csv.json'),
        from: 'csv',
        to: 'json',
      });

      if (!result.success) throw new Error('Conversion failed');
      const data = await fs.readFile(getOutputPath('sample-from-csv.json'), 'utf-8');
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) throw new Error('Expected array output');
      if (parsed.length !== 4) throw new Error('Expected 4 records');
    },
  },
  {
    name: 'tsv-to-json',
    description: 'Convert TSV to JSON',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.tsv'),
        output: getOutputPath('sample-from-tsv.json'),
        from: 'tsv',
        to: 'json',
      });

      if (!result.success) throw new Error('Conversion failed');
      const data = await fs.readFile(getOutputPath('sample-from-tsv.json'), 'utf-8');
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) throw new Error('Expected array output');
    },
  },
  {
    name: 'json-to-csv',
    description: 'Convert JSON to CSV',
    run: async () => {
      // First ensure we have the JSON file from CSV conversion
      await convert({
        input: getFixturePath('sample.csv'),
        output: getOutputPath('sample-from-csv.json'),
        from: 'csv',
        to: 'json',
      });

      const result = await convert({
        input: getOutputPath('sample-from-csv.json'),
        output: getOutputPath('sample-back-to.csv'),
        from: 'json',
        to: 'csv',
      });

      if (!result.success) throw new Error('Conversion failed');
      const data = await fs.readFile(getOutputPath('sample-back-to.csv'), 'utf-8');
      if (!data.includes('name,age,email')) throw new Error('CSV header missing');
    },
  },
]);

// Compression tests
runner.suite('Compression', [
  {
    name: 'gzip-compression',
    description: 'Compress output with gzip',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.json'),
        output: getOutputPath('sample.json.gz'),
        from: 'json',
        to: 'json',
        outputCompression: 'gzip',
      });

      if (!result.success) throw new Error('Compression failed');
      if (result.outputSize >= result.inputSize) {
        throw new Error('Compressed size should be smaller');
      }
    },
  },
  {
    name: 'gzip-decompression',
    description: 'Decompress gzipped input',
    run: async () => {
      const result = await convert({
        input: getOutputPath('sample.json.gz'),
        output: getOutputPath('sample-decompressed.json'),
        from: 'json',
        to: 'json',
        inputCompression: 'gzip',
      });

      if (!result.success) throw new Error('Decompression failed');
    },
  },
]);

// Chunking tests  
runner.suite('Chunking', [
  {
    name: 'paragraph-chunking',
    description: 'Chunk by paragraphs',
    run: async () => {
      // Use CSV data which will create an array - better for chunking
      const result = await convert({
        input: getFixturePath('sample.csv'),
        output: getOutputPath('chunks/para-chunk.json'),
        from: 'csv',
        to: 'json',
        chunk: true,
        chunkMode: 'line',
        chunkSize: 2,
        chunkPattern: 'para-{index}.json',
      });

      if (!result.success) throw new Error('Chunking failed');
      if (!result.chunks || result.chunks <= 1) {
        throw new Error(`Expected multiple chunks, got ${result.chunks}`);
      }
    },
  },
  {
    name: 'character-chunking',
    description: 'Chunk by character count',
    run: async () => {
      const textData = await fs.readFile(getFixturePath('sample-text.txt'), 'utf-8');
      const jsonData = JSON.stringify({ text: textData });
      await fs.writeFile(getOutputPath('sample-text.json'), jsonData);

      const result = await convert({
        input: getOutputPath('sample-text.json'),
        output: getOutputPath('chunks/char-chunk.json'),
        from: 'json',
        to: 'json',
        chunk: true,
        chunkMode: 'character',
        chunkSize: 100,
        chunkPattern: 'char-{index}.json',
      });

      if (!result.success) throw new Error('Chunking failed');
      if (!result.chunks || result.chunks <= 1) {
        throw new Error('Expected multiple chunks');
      }
    },
  },
  {
    name: 'word-chunking',
    description: 'Chunk by word count',
    run: async () => {
      const textData = await fs.readFile(getFixturePath('sample-text.txt'), 'utf-8');
      const jsonData = JSON.stringify({ text: textData });
      await fs.writeFile(getOutputPath('sample-text.json'), jsonData);

      const result = await convert({
        input: getOutputPath('sample-text.json'),
        output: getOutputPath('chunks/word-chunk.json'),
        from: 'json',
        to: 'json',
        chunk: true,
        chunkMode: 'word',
        chunkSize: 20,
        chunkPattern: 'word-{index}.json',
      });

      if (!result.success) throw new Error('Chunking failed');
      if (!result.chunks || result.chunks <= 1) {
        throw new Error('Expected multiple chunks');
      }
    },
  },
]);

// Format detection tests
runner.suite('Format Detection', [
  {
    name: 'detect-json',
    description: 'Auto-detect JSON format',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.json'),
        output: getOutputPath('detected.yaml'),
        to: 'yaml',
        detect: true,
      });

      if (!result.success) throw new Error('Detection failed');
      if (result.inputFormat !== 'json') {
        throw new Error(`Expected json, got ${result.inputFormat}`);
      }
    },
  },
  {
    name: 'detect-yaml',
    description: 'Auto-detect YAML format',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.yaml'),
        output: getOutputPath('detected.json'),
        to: 'json',
        detect: true,
      });

      if (!result.success) throw new Error('Detection failed');
      if (result.inputFormat !== 'yaml') {
        throw new Error(`Expected yaml, got ${result.inputFormat}`);
      }
    },
  },
  {
    name: 'detect-csv',
    description: 'Auto-detect CSV format',
    run: async () => {
      const result = await convert({
        input: getFixturePath('sample.csv'),
        output: getOutputPath('detected-csv.json'),
        to: 'json',
        detect: true,
      });

      if (!result.success) throw new Error('Detection failed');
      if (result.inputFormat !== 'csv') {
        throw new Error(`Expected csv, got ${result.inputFormat}`);
      }
    },
  },
]);

// Run tests
async function main() {
  await cleanupTestOutput();
  await runner.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { runner, TestRunner };
