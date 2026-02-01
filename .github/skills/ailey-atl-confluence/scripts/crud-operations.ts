#!/usr/bin/env node
/**
 * CRUD operations for Confluence pages
 * Create, Read, Update, Delete Confluence pages via CLI
 */

import { Command } from 'commander';
import { getConfluenceClient } from './confluence-client';

const program = new Command();

program
  .name('confluence-crud')
  .description('CRUD operations for Confluence pages')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new Confluence page')
  .requiredOption('-s, --space <key>', 'Space key')
  .requiredOption('-t, --title <text>', 'Page title')
  .requiredOption('-c, --content <text>', 'Page content (HTML or storage format)')
  .option('-p, --parent <id>', 'Parent page ID')
  .option('-f, --file <path>', 'Read content from file instead of --content')
  .option('--labels <labels>', 'Comma-separated labels')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      
      let content = options.content || '';
      if (options.file) {
        const fs = await import('fs/promises');
        content = await fs.readFile(options.file, 'utf-8');
      }

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
      console.error('❌ Failed to create page:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('get')
  .description('Get a Confluence page by ID or title')
  .option('-i, --id <id>', 'Page ID')
  .option('-s, --space <key>', 'Space key (required with --title)')
  .option('-t, --title <text>', 'Page title (required with --space)')
  .option('--content', 'Show page content')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      let page;

      if (options.id) {
        page = await client.getContent(options.id);
      } else if (options.space && options.title) {
        page = await client.getContentByTitle(options.space, options.title);
        if (!page) {
          console.error(`❌ Page not found: "${options.title}" in space ${options.space}`);
          process.exit(1);
        }
      } else {
        console.error('❌ Specify either --id or both --space and --title');
        process.exit(1);
      }

      console.log(`\n📄 ${page.title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   Space: ${page.space.key} (${page.space.name})`);
      console.log(`   Version: ${page.version.number}`);
      console.log(`   Created: ${new Date(page.version.when).toLocaleDateString()}`);
      console.log(`   URL: ${page._links.base}${page._links.webui}`);

      if (options.content && page.body?.storage) {
        console.log(`\n   Content:\n${page.body.storage.value}\n`);
      }
    } catch (error) {
      console.error('❌ Failed to get page:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update a Confluence page')
  .requiredOption('-i, --id <id>', 'Page ID')
  .option('-t, --title <text>', 'New title')
  .option('-c, --content <text>', 'New content')
  .option('-f, --file <path>', 'Read content from file')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      
      // Get current page to get version number
      const currentPage = await client.getContent(options.id);
      
      const title = options.title || currentPage.title;
      let content = currentPage.body.storage.value;
      
      if (options.content) {
        content = options.content;
      } else if (options.file) {
        const fs = await import('fs/promises');
        content = await fs.readFile(options.file, 'utf-8');
      }

      const page = await client.updatePage(
        options.id,
        title,
        content,
        currentPage.version.number
      );

      console.log(`✅ Updated page: ${page.title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   New version: ${page.version.number}`);
      console.log(`   URL: ${page._links.base}${page._links.webui}`);
    } catch (error) {
      console.error('❌ Failed to update page:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete a Confluence page')
  .requiredOption('-i, --id <id>', 'Page ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options: any) => {
    try {
      if (!options.force) {
        console.log(`⚠️  This will permanently delete page ${options.id}`);
        console.log('   Use --force to confirm deletion');
        process.exit(1);
      }

      const client = await getConfluenceClient();
      await client.deletePage(options.id);
      console.log(`✅ Deleted page: ${options.id}`);
    } catch (error) {
      console.error('❌ Failed to delete page:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List pages in a space')
  .requiredOption('-s, --space <key>', 'Space key')
  .option('-l, --limit <number>', 'Maximum results', '25')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      const cql = `space = "${options.space}" AND type = page`;
      const results = await client.search(cql, parseInt(options.limit));

      console.log(`\n📚 Found ${results.totalSize} page(s) in space ${options.space} (showing ${results.size}):\n`);
      
      results.results.forEach((page: any) => {
        console.log(`   ${page.title}`);
        console.log(`   ID: ${page.id} | Version: ${page.version.number}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to list pages:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
