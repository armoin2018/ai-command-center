/**
 * SVG Template Processor
 * Replace {{Variable}} placeholders in SVG files
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface TemplateVariables {
  [key: string]: string | number;
}

export interface BulkTemplateItem {
  variables: TemplateVariables;
  outputPath: string;
}

export class SvgTemplate {
  /**
   * Replace variables in SVG template
   */
  async process(
    templatePath: string,
    outputPath: string,
    variables: TemplateVariables
  ): Promise<void> {
    let content = await fs.readFile(templatePath, 'utf-8');
    
    // Replace all {{Variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(pattern, String(value));
    }
    
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Process template with variables from string
   */
  async processString(
    templateContent: string,
    variables: TemplateVariables
  ): Promise<string> {
    let content = templateContent;
    
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(pattern, String(value));
    }
    
    return content;
  }

  /**
   * Bulk process template with multiple variable sets
   */
  async processBulk(
    templatePath: string,
    items: BulkTemplateItem[]
  ): Promise<string[]> {
    const results: string[] = [];
    
    for (const item of items) {
      await this.process(templatePath, item.outputPath, item.variables);
      results.push(item.outputPath);
    }
    
    return results;
  }

  /**
   * Bulk process with JSON data
   */
  async processBulkFromJson(
    templatePath: string,
    jsonPath: string,
    outputDir: string,
    filenameTemplate: string = 'output_{{index}}.svg'
  ): Promise<string[]> {
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of objects');
    }
    
    await fs.mkdir(outputDir, { recursive: true });
    
    const results: string[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const variables = { ...data[i], index: i + 1 };
      const filename = await this.processString(filenameTemplate, variables);
      const outputPath = path.join(outputDir, filename);
      
      await this.process(templatePath, outputPath, variables);
      results.push(outputPath);
    }
    
    return results;
  }

  /**
   * Extract variables from template
   */
  async extractVariables(templatePath: string): Promise<string[]> {
    const content = await fs.readFile(templatePath, 'utf-8');
    const pattern = /{{([^}]+)}}/g;
    const matches = content.matchAll(pattern);
    
    const variables = new Set<string>();
    for (const match of matches) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  }

  /**
   * Validate template has all required variables
   */
  async validate(
    templatePath: string,
    variables: TemplateVariables
  ): Promise<{
    valid: boolean;
    missing: string[];
    unused: string[];
  }> {
    const requiredVars = await this.extractVariables(templatePath);
    const providedVars = Object.keys(variables);
    
    const missing = requiredVars.filter(v => !providedVars.includes(v));
    const unused = providedVars.filter(v => !requiredVars.includes(v));
    
    return {
      valid: missing.length === 0,
      missing,
      unused
    };
  }
}

export const svgTemplate = new SvgTemplate();
