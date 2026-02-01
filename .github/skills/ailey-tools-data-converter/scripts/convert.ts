#!/usr/bin/env node
/**
 * Main data conversion script
 * 
 * Converts files between different data formats with support for:
 * - Multiple formats: JSON, YAML, XML, CSV, TSV, Parquet, Avro, ORC, Thrift
 * - Compression: gzip, zip
 * - IO sources: file, stdio, URL (with auth)
 * - Chunking: paragraph, sentence, character, word, line
 * - Memory-optimized streaming
 */

import { program } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { registry } from '../lib/registry.js';
import { Chunker } from '../lib/chunker.js';
import type {
  ConversionOptions,
  ConversionResult,
  DataFormat,
  CompressionFormat,
  IOSource,
} from '../lib/types.js';

interface CLIOptions {
  input?: string;
  output?: string;
  from?: DataFormat;
  to: DataFormat;
  inputCompression?: CompressionFormat;
  outputCompression?: CompressionFormat;
  stdin?: boolean;
  stdout?: boolean;
  url?: string;
  auth?: string;
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  chunk?: boolean;
  chunkMode?: 'paragraph' | 'sentence' | 'character' | 'word' | 'line';
  chunkSize?: number;
  chunkPattern?: string;
  chunkOverlap?: number;
  append?: boolean;
  detect?: boolean;
  verbose?: boolean;
  bulk?: string;
}

async function main() {
  program
    .name('convert')
    .description('Convert files between different data formats')
    .version('1.0.0')
    .option('-i, --input <file>', 'Input file path')
    .option('-o, --output <file>', 'Output file path')
    .option('-f, --from <format>', 'Input format (json, yaml, xml, csv, tsv, parquet, avro, orc)')
    .option('-t, --to <format>', 'Output format (required)', 'json')
    .option('--input-compression <type>', 'Input compression (gzip, zip, none)', 'none')
    .option('--output-compression <type>', 'Output compression (gzip, zip, none)', 'none')
    .option('--stdin', 'Read from stdin')
    .option('--stdout', 'Write to stdout')
    .option('--url <url>', 'Input URL')
    .option('--auth <type>', 'Authentication type (basic, bearer, apikey)')
    .option('--username <username>', 'Username for basic auth')
    .option('--password <password>', 'Password for basic auth')
    .option('--token <token>', 'Bearer token')
    .option('--api-key <key>', 'API key')
    .option('--api-key-header <header>', 'API key header name', 'X-API-Key')
    .option('--chunk', 'Enable chunking')
    .option('--chunk-mode <mode>', 'Chunking mode (paragraph, sentence, character, word, line)', 'paragraph')
    .option('--chunk-size <size>', 'Chunk size in units', parseInt, 1000)
    .option('--chunk-pattern <pattern>', 'Chunk filename pattern', '{name}-{index}.{ext}')
    .option('--chunk-overlap <overlap>', 'Overlap between chunks', parseInt, 0)
    .option('-a, --append', 'Append to output file')
    .option('-d, --detect', 'Auto-detect input format from extension')
    .option('-v, --verbose', 'Verbose output')
    .option('--bulk <pattern>', 'Bulk convert files matching glob pattern');

  program.parse();
  const options = program.opts<CLIOptions>();

  try {
    if (options.bulk) {
      await bulkConvert(options);
    } else {
      const result = await convert(options);
      printResult(result, options.verbose);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function convert(cliOptions: CLIOptions): Promise<ConversionResult> {
  const startTime = Date.now();

  // Determine IO source
  let inputSource: IOSource = 'file';
  if (cliOptions.stdin) inputSource = 'stdio';
  if (cliOptions.url) inputSource = 'url';

  let outputSource: IOSource = 'file';
  if (cliOptions.stdout) outputSource = 'stdio';

  // Detect input format if requested
  let inputFormat = cliOptions.from;
  if (cliOptions.detect && cliOptions.input) {
    inputFormat = registry.detectFormat(cliOptions.input);
    if (cliOptions.verbose && inputFormat) {
      console.log(chalk.blue('Detected input format:'), inputFormat);
    }
  }

  if (!inputFormat) {
    throw new Error('Input format not specified and could not be detected');
  }

  // Build conversion options
  const options: ConversionOptions = {
    inputFormat,
    outputFormat: cliOptions.to as DataFormat,
    inputCompression: cliOptions.inputCompression as CompressionFormat,
    outputCompression: cliOptions.outputCompression as CompressionFormat,
    inputSource,
    outputSource,
    inputPath: cliOptions.input,
    outputPath: cliOptions.output,
    inputURL: cliOptions.url,
    authOptions: cliOptions.auth ? {
      type: cliOptions.auth as any,
      username: cliOptions.username,
      password: cliOptions.password,
      token: cliOptions.token,
      apiKey: cliOptions.apiKey,
      apiKeyHeader: cliOptions.apiKeyHeader,
    } : undefined,
    chunking: cliOptions.chunk ? {
      enabled: true,
      mode: cliOptions.chunkMode || 'paragraph',
      size: cliOptions.chunkSize || 1000,
      pattern: cliOptions.chunkPattern,
      overlap: cliOptions.chunkOverlap,
    } : { enabled: false, mode: 'paragraph', size: 1000 },
    append: cliOptions.append,
    detectFormat: cliOptions.detect,
    verbose: cliOptions.verbose,
  };

  // Get handlers
  const inputHandler = registry.getFormat(options.inputFormat);
  const outputHandler = registry.getFormat(options.outputFormat);
  const inputCompression = registry.getCompression(options.inputCompression || 'none');
  const outputCompression = registry.getCompression(options.outputCompression || 'none');
  const ioReader = registry.getIO(inputSource);
  const ioWriter = registry.getIO(outputSource);

  if (!inputHandler) throw new Error(`Unsupported input format: ${options.inputFormat}`);
  if (!outputHandler) throw new Error(`Unsupported output format: ${options.outputFormat}`);
  if (!inputCompression) throw new Error(`Unsupported input compression: ${options.inputCompression}`);
  if (!outputCompression) throw new Error(`Unsupported output compression: ${options.outputCompression}`);
  if (!ioReader) throw new Error(`Unsupported input source: ${inputSource}`);
  if (!ioWriter) throw new Error(`Unsupported output source: ${outputSource}`);

  // Read input
  if (options.verbose) console.log(chalk.blue('Reading input...'));
  let inputData = await ioReader.read(options);
  const inputSize = inputData.length;

  // Decompress if needed
  if (options.inputCompression && options.inputCompression !== 'none') {
    if (options.verbose) console.log(chalk.blue('Decompressing...'));
    inputData = await inputCompression.decompress(inputData);
  }

  // Parse input
  if (options.verbose) console.log(chalk.blue('Parsing input...'));
  const parsedData = await inputHandler.parse(inputData);

  // Handle chunking
  let chunks = 1;
  if (options.chunking?.enabled) {
    if (options.verbose) console.log(chalk.blue('Chunking data...'));
    
    const chunker = new Chunker(options.chunking);
    const dataChunks = chunker.chunk(parsedData);
    chunks = dataChunks.length;

    if (options.verbose) {
      console.log(chalk.blue(`Created ${chunks} chunks`));
    }

    // Process each chunk
    for (const chunk of dataChunks) {
      const chunkOutput = await outputHandler.serialize(chunk.data);
      let chunkBuffer = Buffer.from(chunkOutput);

      // Compress if needed
      if (options.outputCompression && options.outputCompression !== 'none') {
        chunkBuffer = await outputCompression.compress(chunkBuffer);
      }

      // Write chunk
      const chunkFilename = options.outputPath 
        ? path.join(
            path.dirname(options.outputPath),
            chunk.filename
          )
        : chunk.filename;

      const chunkOptions = {
        ...options,
        outputPath: chunkFilename,
      };

      // Ensure output directory exists
      if (chunkFilename) {
        const dir = path.dirname(chunkFilename);
        await fs.mkdir(dir, { recursive: true });
      }

      await ioWriter.write(chunkBuffer, chunkOptions);

      if (options.verbose) {
        console.log(chalk.green(`Wrote chunk ${chunk.index}: ${chunk.filename}`));
        console.log(chalk.gray(`  Characters: ${chunk.stats.characters}, Words: ${chunk.stats.words}, Lines: ${chunk.stats.lines}`));
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: true,
      inputFormat: options.inputFormat,
      outputFormat: options.outputFormat,
      inputSize,
      outputSize: 0, // Total size across all chunks
      chunks,
      duration,
    };
  }

  // Serialize output
  if (options.verbose) console.log(chalk.blue('Serializing output...'));
  const outputData = await outputHandler.serialize(parsedData);
  let outputBuffer = Buffer.from(outputData);

  // Compress if needed
  if (options.outputCompression && options.outputCompression !== 'none') {
    if (options.verbose) console.log(chalk.blue('Compressing...'));
    outputBuffer = await outputCompression.compress(outputBuffer);
  }

  // Write output
  if (options.verbose) console.log(chalk.blue('Writing output...'));
  await ioWriter.write(outputBuffer, options);

  const duration = Date.now() - startTime;
  const outputSize = outputBuffer.length;

  return {
    success: true,
    inputFormat: options.inputFormat,
    outputFormat: options.outputFormat,
    inputSize,
    outputSize,
    chunks,
    duration,
  };
}

async function bulkConvert(options: CLIOptions): Promise<void> {
  const { glob } = await import('glob');
  const files = await glob(options.bulk!);

  console.log(chalk.blue(`Found ${files.length} files to convert`));

  const results: ConversionResult[] = [];

  for (const file of files) {
    try {
      const outputFile = file.replace(
        path.extname(file),
        `.${options.to}`
      );

      const result = await convert({
        ...options,
        input: file,
        output: outputFile,
      });

      results.push(result);

      if (!options.verbose) {
        console.log(chalk.green(`✓ ${file} → ${outputFile}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ ${file}:`), error instanceof Error ? error.message : String(error));
    }
  }

  // Print summary
  console.log(chalk.blue('\nBulk Conversion Summary:'));
  console.log(chalk.green(`  Successful: ${results.filter(r => r.success).length}`));
  console.log(chalk.red(`  Failed: ${files.length - results.filter(r => r.success).length}`));
  
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(chalk.blue(`  Total duration: ${totalDuration}ms`));
}

function printResult(result: ConversionResult, verbose?: boolean): void {
  if (!result.success) {
    console.log(chalk.red('✗ Conversion failed'));
    if (result.error) {
      console.log(chalk.red(`  Error: ${result.error}`));
    }
    return;
  }

  console.log(chalk.green('✓ Conversion successful'));
  
  if (verbose) {
    console.log(chalk.blue('  Input format:'), result.inputFormat);
    console.log(chalk.blue('  Output format:'), result.outputFormat);
    console.log(chalk.blue('  Input size:'), `${result.inputSize} bytes`);
    console.log(chalk.blue('  Output size:'), `${result.outputSize} bytes`);
    
    if (result.chunks && result.chunks > 1) {
      console.log(chalk.blue('  Chunks:'), result.chunks);
    }
    
    console.log(chalk.blue('  Duration:'), `${result.duration}ms`);
    
    const ratio = result.outputSize / result.inputSize;
    if (ratio < 1) {
      console.log(chalk.green(`  Compression: ${((1 - ratio) * 100).toFixed(1)}%`));
    } else if (ratio > 1) {
      console.log(chalk.yellow(`  Expansion: ${((ratio - 1) * 100).toFixed(1)}%`));
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { main, convert };
