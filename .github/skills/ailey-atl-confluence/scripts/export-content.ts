#!/usr/bin/env node
/**
 * Export content from Confluence to various formats
 * Supports: Markdown, JSON, HTML
 */

import { Command } from 'commander';
import { getConfluenceClient } from './confluence-client';
import { storageToMarkdown, storageToHtml } from './format-converters';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

const program = new Command();

program
  .name('confluence-export')
  .description('Export content from Confluence to various formats')
  .version('1.0.0');

program
  .command('page')
  .description('Export a single page')
  .requiredOption('-i, --id <id>', 'Page ID')
  .requiredOption('-o, --output <path>', 'Output file path')
  .option('-f, --format <type>', 'Output format (markdown, html, json)', 'markdown')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      const page = await client.getContent(options.id);
      
      let output: string;
      
      switch (options.format.toLowerCase()) {
        case 'markdown':
        case 'md':
          output = storageToMarkdown(page.body.storage.value);
          break;
        case 'html':
          output = storageToHtml(page.body.storage.value);
          break;
        case 'json':
          output = JSON.stringify(page, null, 2);
          break;
        default:
          console.error(`❌ Unsupported format: ${options.format}`);
          process.exit(1);
      }
      
      // Ensure output directory exists
      await mkdir(dirname(options.output), { recursive: true });
      await writeFile(options.output, output, 'utf-8');
      
      console.log(`✅ Exported page: ${page.title}`);
      console.log(`   Format: ${options.format}`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Size: ${output.length} bytes`);
    } catch (error) {
      console.error('❌ Export failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('space')
  .description('Export all pages from a space')
  .requiredOption('-s, --space <key>', 'Space key')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-f, --format <type>', 'Output format (markdown, html, json)', 'markdown')
  .option('-l, --limit <number>', 'Maximum pages to export', '100')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      const cql = `space = "${options.space}" AND type = page`;
      const results = await client.search(cql, parseInt(options.limit));
      
      console.log(`📚 Exporting ${results.size} page(s) from space ${options.space}\n`);
      
      // Ensure output directory exists
      await mkdir(options.output, { recursive: true });
      
      const exported = { success: 0, failed: 0 };
      const extension = options.format === 'markdown' || options.format === 'md' ? 'md' :
                        options.format === 'html' ? 'html' : 'json';
      
      for (const pageInfo of results.results) {
        try {
          const page = await client.getContent(pageInfo.id);
          let output: string;
          
          switch (options.format.toLowerCase()) {
            case 'markdown':
            case 'md':
              output = storageToMarkdown(page.body.storage.value);
              break;
            case 'html':
              output = storageToHtml(page.body.storage.value);
              break;
            case 'json':
              output = JSON.stringify(page, null, 2);
              break;
            default:
              throw new Error(`Unsupported format: ${options.format}`);
          }
          
          // Sanitize filename
          const filename = page.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase();
          const filepath = join(options.output, `${filename}.${extension}`);
          
          await writeFile(filepath, output, 'utf-8');
          console.log(`✅ ${page.title} -> ${filename}.${extension}`);
          exported.success++;
        } catch (error) {
          console.error(`❌ ${pageInfo.title}: ${(error as Error).message}`);
          exported.failed++;
        }
      }
      
      console.log(`\n📊 Summary: ${exported.success} succeeded, ${exported.failed} failed`);
    } catch (error) {
      console.error('❌ Space export failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Export pages matching a CQL query')
  .requiredOption('-q, --query <cql>', 'CQL query')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-f, --format <type>', 'Output format (markdown, html, json)', 'markdown')
  .option('-l, --limit <number>', 'Maximum results', '100')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      const results = await client.search(options.query, parseInt(options.limit));
      
      console.log(`🔍 Found ${results.size} page(s) matching query\n`);
      
      // Ensure output directory exists
      await mkdir(options.output, { recursive: true });
      
      const exported = { success: 0, failed: 0 };
      const extension = options.format === 'markdown' || options.format === 'md' ? 'md' :
                        options.format === 'html' ? 'html' : 'json';
      
      for (const pageInfo of results.results) {
        try {
          const page = await client.getContent(pageInfo.id);
          let output: string;
          
          switch (options.format.toLowerCase()) {
            case 'markdown':
            case 'md':
              output = storageToMarkdown(page.body.storage.value);
              break;
            case 'html':
              output = storageToHtml(page.body.storage.value);
              break;
            case 'json':
              output = JSON.stringify(page, null, 2);
              break;
            default:
              throw new Error(`Unsupported format: ${options.format}`);
          }
          
          // Sanitize filename
          const filename = page.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase();
          const filepath = join(options.output, `${filename}.${extension}`);
          
          await writeFile(filepath, output, 'utf-8');
          console.log(`✅ ${page.title} -> ${filename}.${extension}`);
          exported.success++;
        } catch (error) {
          console.error(`❌ ${pageInfo.title}: ${(error as Error).message}`);
          exported.failed++;
        }
      }
      
      console.log(`\n📊 Summary: ${exported.success} succeeded, ${exported.failed} failed`);
    } catch (error) {
      console.error('❌ Search export failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('attachments')
  .description('Export attachments from a page')
  .requiredOption('-i, --id <id>', 'Page ID')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      const attachments = await client.getAttachments(options.id);
      
      console.log(`📎 Found ${attachments.size} attachment(s)\n`);
      
      // Ensure output directory exists
      await mkdir(options.output, { recursive: true });
      
      // Note: Actual download requires additional API call
      // This is a placeholder for listing attachments
      for (const attachment of attachments.results) {
        console.log(`   - ${attachment.title} (${attachment.extensions.fileSize} bytes)`);
        console.log(`     Download: ${attachment._links.download}`);
      }
      
      console.log(`\n⚠️  Attachment download not yet implemented`);
      console.log(`   Use download URLs above to manually download`);
    } catch (error) {
      console.error('❌ Attachment export failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
