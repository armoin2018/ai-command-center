#!/usr/bin/env node
/**
 * Import content to Confluence from various formats
 * Supports: Markdown, DOCX, PDF, HTML
 */

import { Command } from 'commander';
import { getConfluenceClient } from './confluence-client';
import { fileToStorage, detectFormat } from './format-converters';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';

const program = new Command();

program
  .name('confluence-import')
  .description('Import content to Confluence from various formats')
  .version('1.0.0');

program
  .command('file')
  .description('Import a single file to Confluence')
  .requiredOption('-f, --file <path>', 'File to import')
  .requiredOption('-s, --space <key>', 'Target space key')
  .option('-t, --title <text>', 'Page title (defaults to filename)')
  .option('-p, --parent <id>', 'Parent page ID')
  .option('--labels <labels>', 'Comma-separated labels')
  .option('--dry-run', 'Preview conversion without creating page')
  .action(async (options: any) => {
    try {
      const format = detectFormat(options.file);
      if (format === 'unknown') {
        console.error('❌ Unsupported file format');
        process.exit(1);
      }

      console.log(`📄 Importing ${format} file: ${options.file}`);
      
      // Convert file to Confluence Storage Format
      const content = await fileToStorage(options.file);
      
      if (options.dryRun) {
        console.log('\n📋 Preview (Storage Format):');
        console.log(content.substring(0, 500) + '...\n');
        return;
      }

      const client = await getConfluenceClient();
      const title = options.title || basename(options.file).replace(/\.[^.]+$/, '');
      
      // Create page
      const page = await client.createPage(
        options.space,
        title,
        content,
        options.parent
      );

      console.log(`✅ Created page: ${page.title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   URL: ${page._links.base}${page._links.webui}`);

      // Add labels if specified
      if (options.labels) {
        const labels = options.labels.split(',').map((l: string) => l.trim());
        for (const label of labels) {
          await client.addLabel(page.id, label);
        }
        console.log(`   Labels: ${labels.join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Import failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('directory')
  .description('Import all files from a directory')
  .requiredOption('-d, --dir <path>', 'Directory to import')
  .requiredOption('-s, --space <key>', 'Target space key')
  .option('-p, --parent <id>', 'Parent page ID (all pages will be children)')
  .option('--pattern <glob>', 'File pattern (e.g., "*.md")', '**/*')
  .option('--labels <labels>', 'Comma-separated labels (applied to all)')
  .option('--dry-run', 'Preview without creating pages')
  .action(async (options: any) => {
    try {
      const files = await readdir(options.dir, { recursive: true, withFileTypes: true });
      const importFiles = files
        .filter(f => f.isFile())
        .map(f => join(f.path, f.name))
        .filter(f => {
          const format = detectFormat(f);
          return format !== 'unknown';
        });

      console.log(`📚 Found ${importFiles.length} file(s) to import\n`);

      if (options.dryRun) {
        importFiles.forEach(f => {
          console.log(`   - ${basename(f)} (${detectFormat(f)})`);
        });
        return;
      }

      const client = await getConfluenceClient();
      const results = { success: 0, failed: 0 };
      const labels = options.labels ? options.labels.split(',').map((l: string) => l.trim()) : [];

      for (const file of importFiles) {
        try {
          const content = await fileToStorage(file);
          const title = basename(file).replace(/\.[^.]+$/, '');
          
          const page = await client.createPage(
            options.space,
            title,
            content,
            options.parent
          );

          // Add labels
          for (const label of labels) {
            await client.addLabel(page.id, label);
          }

          console.log(`✅ ${title} (ID: ${page.id})`);
          results.success++;
        } catch (error) {
          console.error(`❌ ${basename(file)}: ${(error as Error).message}`);
          results.failed++;
        }
      }

      console.log(`\n📊 Summary: ${results.success} succeeded, ${results.failed} failed`);
    } catch (error) {
      console.error('❌ Directory import failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('markdown')
  .description('Import Markdown content directly')
  .requiredOption('-s, --space <key>', 'Target space key')
  .requiredOption('-t, --title <text>', 'Page title')
  .option('-c, --content <markdown>', 'Markdown content')
  .option('-f, --file <path>', 'Read Markdown from file')
  .option('-p, --parent <id>', 'Parent page ID')
  .option('--labels <labels>', 'Comma-separated labels')
  .action(async (options: any) => {
    try {
      let markdown = options.content || '';
      if (options.file) {
        markdown = await readFile(options.file, 'utf-8');
      }

      if (!markdown) {
        console.error('❌ Specify either --content or --file');
        process.exit(1);
      }

      const { markdownToStorage } = await import('./format-converters');
      const content = await markdownToStorage(markdown);
      
      const client = await getConfluenceClient();
      const page = await client.createPage(
        options.space,
        options.title,
        content,
        options.parent
      );

      console.log(`✅ Created page: ${page.title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   URL: ${page._links.base}${page._links.webui}`);

      // Add labels if specified
      if (options.labels) {
        const labels = options.labels.split(',').map((l: string) => l.trim());
        for (const label of labels) {
          await client.addLabel(page.id, label);
        }
        console.log(`   Labels: ${labels.join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Markdown import failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
