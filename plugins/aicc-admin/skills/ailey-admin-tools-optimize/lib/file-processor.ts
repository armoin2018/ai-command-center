/**
 * File processor for AI-ley kit resources
 */

import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { FileContent, ResourceType } from './types.js';

export class FileProcessor {
  /**
   * Read and parse file with frontmatter
   */
  async readFile(filePath: string): Promise<FileContent> {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Remove duplicate footers before parsing
    // Match full footer blocks (with or without leading ---)
    const footerPattern = /(---\s+)?version:[^\n]+\nupdated:[^\n]+\nreviewed:[^\n]+\nscore:[^\n]+\n(---)?/g;
    const footers = content.match(footerPattern) || [];
    let duplicateFootersRemoved = 0;
    
    if (footers.length > 1) {
      duplicateFootersRemoved = footers.length - 1;
      // Keep only the last footer
      const lastFooter = footers[footers.length - 1];
      // Remove all footers
      for (const footer of footers) {
        content = content.replace(footer, '');
      }
      // Add back the last footer at the end (properly formatted)
      content = content.trim() + '\n\n---\n\n' + lastFooter.replace(/^---\s+/, '').replace(/\n---$/, '') + '\n---';
    }
    
    const parsed = matter(content);
    
    // Extract footer from body
    const footerMatch = content.match(/---\nversion:.*?\n---\s*$/s);
    const footer = footerMatch ? this.parseFooter(footerMatch[0]) : this.getDefaultFooter();
    
    // Remove footer from body
    const body = footerMatch 
      ? parsed.content.replace(footerMatch[0], '').trim()
      : parsed.content.trim();
    
    return {
      frontmatter: parsed.data as any,
      body,
      footer,
      metadata: duplicateFootersRemoved > 0 ? { duplicateFootersRemoved } : undefined
    };
  }

  /**
   * Write file with frontmatter, body, and footer
   */
  async writeFile(filePath: string, content: FileContent): Promise<void> {
    const frontmatterStr = this.stringifyFrontmatter(content.frontmatter);
    const footerStr = this.stringifyFooter(content.footer);
    
    const fullContent = `${frontmatterStr}\n${content.body}\n\n${footerStr}`;
    await fs.writeFile(filePath, fullContent, 'utf-8');
  }

  /**
   * Parse footer YAML
   */
  private parseFooter(footerStr: string): any {
    const lines = footerStr.split('\n').filter(l => l.trim() && l !== '---');
    const footer: any = {};
    
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        footer[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return footer;
  }

  /**
   * Get default footer
   */
  private getDefaultFooter() {
    const today = new Date().toISOString().split('T')[0];
    return {
      version: '1.0.0',
      updated: today,
      reviewed: today,
      score: 3.0
    };
  }

  /**
   * Stringify frontmatter
   */
  private stringifyFrontmatter(data: any): string {
    const lines = ['---'];
    
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    
    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Stringify footer
   */
  private stringifyFooter(footer: any): string {
    return `---
version: ${footer.version}
updated: ${footer.updated}
reviewed: ${footer.reviewed}
score: ${footer.score}
---`;
  }

  /**
   * Detect resource type from file path
   */
  detectResourceType(filePath: string): ResourceType {
    if (filePath.includes('instructions/') && filePath.endsWith('.instructions.md')) {
      return 'instruction';
    }
    if (filePath.includes('personas/') && (filePath.endsWith('.persona.md') || filePath.endsWith('.md'))) {
      return 'persona';
    }
    if (filePath.includes('agents/') && filePath.endsWith('.agent.md')) {
      return 'agent';
    }
    if (filePath.includes('skills/') && filePath.endsWith('SKILL.md')) {
      return 'skill';
    }
    if (filePath.includes('prompts/') && filePath.endsWith('.prompt.md')) {
      return 'prompt';
    }
    throw new Error(`Unknown resource type for file: ${filePath}`);
  }

  /**
   * Get base filename without extension
   */
  getBaseFileName(filePath: string): string {
    const basename = path.basename(filePath);
    // Handle both .persona.md and .md extensions for personas
    if (basename.endsWith('.persona.md')) {
      return basename.replace(/\.persona\.md$/, '');
    }
    return basename.replace(/\.(instructions|persona|agent|prompt)\.md$/, '').replace(/SKILL\.md$/, '').replace(/\.md$/, '');
  }

  /**
   * Count lines in content
   */
  countLines(content: string): number {
    return content.split('\n').length;
  }

  /**
   * Extract code blocks from content
   */
  extractCodeBlocks(content: string): { lang: string; code: string }[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: { lang: string; code: string }[] = [];
    
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        lang: match[1] || 'text',
        code: match[2].trim()
      });
    }
    
    return blocks;
  }

  /**
   * Extract example sections from content
   */
  extractExamples(content: string): string[] {
    const exampleRegex = /##\s+Example.*?\n([\s\S]*?)(?=\n##|\n---|\Z)/gi;
    const examples: string[] = [];
    
    let match;
    while ((match = exampleRegex.exec(content)) !== null) {
      examples.push(match[0].trim());
    }
    
    return examples;
  }

  /**
   * Remove code blocks from content and return reference
   */
  removeCodeBlocks(content: string, baseFileName: string): string {
    return content.replace(/```(\w+)?\n[\s\S]*?```/g, (match, lang) => {
      return `See [scripts/${baseFileName}/](scripts/${baseFileName}/) for ${lang || 'code'} implementation.`;
    });
  }

  /**
   * Remove examples from content and return reference
   */
  removeExamples(content: string, baseFileName: string): string {
    return content.replace(/##\s+Example.*?\n[\s\S]*?(?=\n##|\n---|\Z)/gi, () => {
      return `See [examples/${baseFileName}/](examples/${baseFileName}/) for usage examples.`;
    });
  }
}
