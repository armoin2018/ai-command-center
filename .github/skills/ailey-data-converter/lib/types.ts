/**
 * Type definitions for ailey-data-converter
 */

export type DataFormat =
  | 'json'
  | 'yaml'
  | 'xml'
  | 'csv'
  | 'tsv'
  | 'parquet'
  | 'avro'
  | 'orc'
  | 'thrift';

export type CompressionFormat = 'gzip' | 'zip' | 'none';

export type IOSource = 'file' | 'stdio' | 'url';

export type AuthType = 'none' | 'basic' | 'bearer' | 'apikey';

export interface AuthOptions {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

export interface ChunkingOptions {
  enabled: boolean;
  mode: 'paragraph' | 'sentence' | 'character' | 'word' | 'line';
  size: number;
  pattern?: string; // Pattern for naming chunks, e.g., "{name}-{index}.{ext}"
  overlap?: number; // Overlap between chunks in units
}

export interface ConversionOptions {
  inputFormat?: DataFormat;
  outputFormat: DataFormat;
  inputCompression?: CompressionFormat;
  outputCompression?: CompressionFormat;
  inputSource: IOSource;
  outputSource: IOSource;
  inputPath?: string;
  outputPath?: string;
  inputURL?: string;
  authOptions?: AuthOptions;
  chunking?: ChunkingOptions;
  append?: boolean;
  detectFormat?: boolean;
  verbose?: boolean;
}

export interface FormatHandler {
  name: DataFormat;
  extensions: string[];
  canRead: boolean;
  canWrite: boolean;
  supportsHierarchical: boolean;
  
  /**
   * Parse input data into a normalized object
   */
  parse(data: Buffer | string): Promise<any>;
  
  /**
   * Serialize object into output format
   */
  serialize(data: any): Promise<Buffer | string>;
  
  /**
   * Detect if buffer is this format
   */
  detect?(data: Buffer): boolean;
}

export interface CompressionHandler {
  name: CompressionFormat;
  extensions: string[];
  
  /**
   * Decompress data
   */
  decompress(data: Buffer): Promise<Buffer>;
  
  /**
   * Compress data
   */
  compress(data: Buffer): Promise<Buffer>;
  
  /**
   * Create decompression stream
   */
  createDecompressStream(): NodeJS.ReadWriteStream;
  
  /**
   * Create compression stream
   */
  createCompressStream(): NodeJS.ReadWriteStream;
}

export interface IOHandler {
  name: IOSource;
  
  /**
   * Read data from source
   */
  read(options: ConversionOptions): Promise<Buffer>;
  
  /**
   * Write data to destination
   */
  write(data: Buffer | string, options: ConversionOptions): Promise<void>;
  
  /**
   * Create read stream
   */
  createReadStream?(options: ConversionOptions): NodeJS.ReadableStream;
  
  /**
   * Create write stream
   */
  createWriteStream?(options: ConversionOptions): NodeJS.WritableStream;
}

export interface ConversionResult {
  success: boolean;
  inputFormat: DataFormat;
  outputFormat: DataFormat;
  inputSize: number;
  outputSize: number;
  chunks?: number;
  duration: number;
  error?: string;
}

export interface PluginRegistry {
  formatHandlers: Map<DataFormat, FormatHandler>;
  compressionHandlers: Map<CompressionFormat, CompressionHandler>;
  ioHandlers: Map<IOSource, IOHandler>;
}
