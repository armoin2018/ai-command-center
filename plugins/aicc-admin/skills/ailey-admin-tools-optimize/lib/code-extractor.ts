/**
 * Code and example extractor for AI-ley kit resources
 */

import { promises as fs } from 'fs';
import path from 'path';
import { FileProcessor } from './file-processor.js';

export class CodeExtractor {
  private processor: FileProcessor;

  constructor() {
    this.processor = new FileProcessor();
  }

  /**
   * Extract code blocks to separate directory
   */
  async extractCode(
    filePath: string,
    baseFileName: string,
    content: string
  ): Promise<{ updatedContent: string; filesCreated: string[] }> {
    const codeBlocks = this.processor.extractCodeBlocks(content);
    
    if (codeBlocks.length === 0) {
      return { updatedContent: content, filesCreated: [] };
    }

    const dir = path.dirname(filePath);
    const scriptsDir = path.join(dir, 'scripts', baseFileName);
    await fs.mkdir(scriptsDir, { recursive: true });

    const filesCreated: string[] = [];
    let updatedContent = content;

    for (let i = 0; i < codeBlocks.length; i++) {
      const block = codeBlocks[i];
      const ext = this.getExtension(block.lang);
      const fileName = `script-${i + 1}.${ext}`;
      const filePath = path.join(scriptsDir, fileName);

      await fs.writeFile(filePath, block.code, 'utf-8');
      filesCreated.push(filePath);
    }

    // Replace code blocks with references
    updatedContent = this.processor.removeCodeBlocks(updatedContent, baseFileName);

    return { updatedContent, filesCreated };
  }

  /**
   * Extract examples to separate directory
   */
  async extractExamples(
    filePath: string,
    baseFileName: string,
    content: string
  ): Promise<{ updatedContent: string; filesCreated: string[] }> {
    const examples = this.processor.extractExamples(content);
    
    if (examples.length === 0) {
      return { updatedContent: content, filesCreated: [] };
    }

    const dir = path.dirname(filePath);
    const examplesDir = path.join(dir, 'examples', baseFileName);
    await fs.mkdir(examplesDir, { recursive: true });

    const filesCreated: string[] = [];

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      const fileName = `example-${i + 1}.md`;
      const filePath = path.join(examplesDir, fileName);

      await fs.writeFile(filePath, example, 'utf-8');
      filesCreated.push(filePath);
    }

    // Replace examples with references
    const updatedContent = this.processor.removeExamples(content, baseFileName);

    return { updatedContent, filesCreated };
  }

  /**
   * Get file extension for language
   */
  private getExtension(lang: string): string {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      bash: 'sh',
      shell: 'sh',
      json: 'json',
      yaml: 'yaml',
      markdown: 'md',
      sql: 'sql'
    };

    return extensions[lang.toLowerCase()] || 'txt';
  }
}
