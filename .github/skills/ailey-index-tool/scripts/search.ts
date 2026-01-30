#!/usr/bin/env node
/**
 * AI-ley Index Tool - Search and query index files
 * 
 * Search AI-ley index JSON files with various filters and output formats.
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import yaml from 'js-yaml';
import * as xmljs from 'xml-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface Resource {
  name: string;
  path: string;
  description: string;
  keywords: string[];
  version: string | null;
  score: number | null;
  updated: string | null;
}

interface IndexData {
  type: string;
  lastUpdated: string;
  totalCount: number;
  resources: Resource[];
}

interface SearchOptions {
  name?: string;
  keywords?: string[];
  string?: string;
  regex?: string;
  type?: string[];
  format?: string;
  output?: string;
  jq?: string;
  jqFile?: string;
  jqOutput?: string;
  jqOutputFile?: string;
  namesOnly?: boolean;
}

// Index file paths
const INDEXES_DIR = join(__dirname, '../../../ai-ley/indexes');
const INDEX_FILES = [
  'agents.index.json',
  'skills.index.json',
  'personas.index.json',
  'instructions.index.json',
  'flows.index.json',
  'prompts.index.json'
];

/**
 * Load all index files or specific types
 */
async function loadIndexes(types?: string[]): Promise<IndexData[]> {
  const filesToLoad = types && types.length > 0
    ? types.map((t) => `${t}.index.json`)
    : INDEX_FILES;

  const indexes: IndexData[] = [];
  
  for (const file of filesToLoad) {
    try {
      const content = await readFile(join(INDEXES_DIR, file), 'utf-8');
      const data = JSON.parse(content) as IndexData;
      indexes.push(data);
    } catch (error) {
      console.warn(`Warning: Could not load ${file}:`, (error as Error).message);
    }
  }
  
  return indexes;
}

/**
 * Search resources based on criteria
 */
function searchResources(indexes: IndexData[], options: SearchOptions): Resource[] {
  let results: Resource[] = [];
  
  // Flatten all resources from all indexes
  for (const index of indexes) {
    results.push(...index.resources);
  }
  
  // Apply name filter
  if (options.name) {
    const namePattern = new RegExp(options.name, 'i');
    results = results.filter((r) => namePattern.test(r.name));
  }
  
  // Apply keyword filter
  if (options.keywords && options.keywords.length > 0) {
    results = results.filter((r) => 
      options.keywords!.some((kw) => 
        r.keywords.some((rk) => rk.toLowerCase().includes(kw.toLowerCase()))
      )
    );
  }
  
  // Apply string search (searches name, description, keywords)
  if (options.string) {
    const searchStr = options.string.toLowerCase();
    results = results.filter((r) =>
      r.name.toLowerCase().includes(searchStr) ||
      r.description.toLowerCase().includes(searchStr) ||
      r.keywords.some((k) => k.toLowerCase().includes(searchStr))
    );
  }
  
  // Apply regex filter
  if (options.regex) {
    const pattern = new RegExp(options.regex, 'i');
    results = results.filter((r) =>
      pattern.test(r.name) ||
      pattern.test(r.description) ||
      r.keywords.some((k) => pattern.test(k))
    );
  }
  
  return results;
}

/**
 * Format results based on output format
 */
function formatResults(results: Resource[], format: string, namesOnly: boolean): string {
  if (namesOnly) {
    return results.map((r) => r.name).join('\n');
  }
  
  switch (format) {
    case 'json':
      return JSON.stringify(results, null, 2);
    
    case 'json-array':
      return JSON.stringify(results);
    
    case 'yaml':
      return yaml.dump(results);
    
    case 'xml':
      return xmljs.js2xml({ resources: { resource: results } }, { 
        compact: true, 
        spaces: 2 
      });
    
    case 'txt':
      return results.map((r) => 
        `${r.name}\n  Path: ${r.path}\n  Description: ${r.description}\n  Keywords: ${r.keywords.join(', ')}\n`
      ).join('\n');
    
    case 'csv':
      const header = 'name,path,description,keywords,version,score,updated\n';
      const rows = results.map((r) =>
        `"${r.name}","${r.path}","${r.description}","${r.keywords.join(';')}","${r.version || ''}","${r.score || ''}","${r.updated || ''}"`
      ).join('\n');
      return header + rows;
    
    case 'markdown':
      let md = '# Search Results\n\n';
      md += `Total: ${results.length} resources\n\n`;
      md += '| Name | Description | Keywords | Score |\n';
      md += '|------|-------------|----------|-------|\n';
      results.forEach((r) => {
        md += `| ${r.name} | ${r.description.substring(0, 100)}... | ${r.keywords.slice(0, 3).join(', ')} | ${r.score || 'N/A'} |\n`;
      });
      return md;
    
    case 'html':
      let html = '<!DOCTYPE html>\n<html>\n<head>\n';
      html += '<meta charset="utf-8">\n';
      html += '<title>AI-ley Index Search Results</title>\n';
      html += '<style>\n';
      html += 'body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }\n';
      html += 'h1 { color: #333; }\n';
      html += '.resource { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }\n';
      html += '.resource h2 { margin-top: 0; color: #0066cc; }\n';
      html += '.path { color: #666; font-family: monospace; font-size: 0.9em; }\n';
      html += '.keywords { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }\n';
      html += '.keyword { background: #e3f2fd; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85em; }\n';
      html += '</style>\n</head>\n<body>\n';
      html += `<h1>Search Results</h1>\n<p>Total: ${results.length} resources</p>\n`;
      results.forEach((r) => {
        html += '<div class="resource">\n';
        html += `  <h2>${r.name}</h2>\n`;
        html += `  <p class="path">${r.path}</p>\n`;
        html += `  <p>${r.description}</p>\n`;
        html += '  <div class="keywords">\n';
        r.keywords.forEach((kw) => {
          html += `    <span class="keyword">${kw}</span>\n`;
        });
        html += '  </div>\n';
        if (r.score) {
          html += `  <p><strong>Score:</strong> ${r.score}/5</p>\n`;
        }
        html += '</div>\n';
      });
      html += '</body>\n</html>';
      return html;
    
    case 'prompt':
      let prompt = '# AI-ley Resources\n\n';
      prompt += 'The following resources are available:\n\n';
      results.forEach((r) => {
        prompt += `## ${r.name}\n\n`;
        prompt += `**Path**: \`${r.path}\`\n\n`;
        prompt += `${r.description}\n\n`;
        if (r.keywords.length > 0) {
          prompt += `**Keywords**: ${r.keywords.join(', ')}\n\n`;
        }
      });
      return prompt;
    
    default:
      return JSON.stringify(results, null, 2);
  }
}

/**
 * Apply jq query to results
 */
async function applyJq(data: string, query: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`echo '${data.replace(/'/g, "'\\''")}' | jq '${query}'`);
    return stdout.trim();
  } catch (error) {
    throw new Error(`jq error: ${(error as Error).message}`);
  }
}

/**
 * Main search function
 */
async function search(options: SearchOptions): Promise<void> {
  try {
    // Load indexes
    const indexes = await loadIndexes(options.type);
    
    if (indexes.length === 0) {
      console.error('No indexes loaded');
      process.exit(1);
    }
    
    // Search resources
    let results = searchResources(indexes, options);
    
    // Apply jq query if provided
    let output = '';
    if (options.jq || options.jqFile) {
      let query = options.jq || '';
      if (options.jqFile) {
        query = await readFile(options.jqFile, 'utf-8');
      }
      const jsonData = JSON.stringify(results);
      output = await applyJq(jsonData, query.trim());
      
      // Apply jq output transform if provided
      if (options.jqOutput || options.jqOutputFile) {
        let outputQuery = options.jqOutput || '';
        if (options.jqOutputFile) {
          outputQuery = await readFile(options.jqOutputFile, 'utf-8');
        }
        output = await applyJq(output, outputQuery.trim());
      }
    } else {
      // Format results
      output = formatResults(results, options.format || 'json', options.namesOnly || false);
    }
    
    // Output results
    if (options.output) {
      await writeFile(options.output, output, 'utf-8');
      console.log(`Results written to ${options.output}`);
    } else {
      console.log(output);
    }
    
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

// CLI
const program = new Command();

program
  .name('ailey-index-tool')
  .description('Search and query AI-ley index files')
  .version('1.0.0');

program
  .option('-n, --name <pattern>', 'Filter by name (supports regex)')
  .option('-k, --keywords <keywords...>', 'Filter by keywords (comma-separated)')
  .option('-s, --string <text>', 'Search string in name, description, keywords')
  .option('-r, --regex <pattern>', 'Search using regex pattern')
  .option('-t, --type <types...>', 'Index types to search (agents, skills, personas, instructions, flows, prompts)')
  .option('-f, --format <format>', 'Output format (json|json-array|yaml|xml|txt|csv|markdown|html|prompt)', 'json')
  .option('-o, --output <file>', 'Write output to file')
  .option('--jq <query>', 'Apply jq query to results')
  .option('--jq-file <file>', 'Apply jq query from file')
  .option('--jq-output <query>', 'Apply jq output transformation')
  .option('--jq-output-file <file>', 'Apply jq output transformation from file')
  .option('--names-only', 'Return only resource names')
  .action(async (options) => {
    await search(options);
  });

program.parse();

export { search, searchResources, formatResults, loadIndexes };
