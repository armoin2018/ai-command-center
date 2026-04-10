#!/usr/bin/env node
/**
 * Query Confluence using CQL (Confluence Query Language)
 * Search for pages, blogs, attachments, and more
 */

import { Command } from 'commander';
import { getConfluenceClient } from './confluence-client';

const program = new Command();

program
  .name('confluence-query')
  .description('Query Confluence using CQL (Confluence Query Language)')
  .version('1.0.0');

program
  .command('search')
  .description('Search using CQL query')
  .requiredOption('-q, --query <cql>', 'CQL query string')
  .option('-l, --limit <number>', 'Maximum results', '25')
  .option('--json', 'Output as JSON')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      const results = await client.search(options.query, parseInt(options.limit));
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      console.log(`\n🔍 Found ${results.totalSize} result(s) (showing ${results.size}):\n`);
      
      results.results.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   Type: ${item.type} | ID: ${item.id}`);
        if (item.space) {
          console.log(`   Space: ${item.space.name} (${item.space.key})`);
        }
        if (item.version) {
          console.log(`   Version: ${item.version.number} | Modified: ${new Date(item.version.when).toLocaleDateString()}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('❌ Search failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('pages')
  .description('Search for pages in a space')
  .requiredOption('-s, --space <key>', 'Space key')
  .option('-t, --title <text>', 'Filter by title (contains)')
  .option('-l, --limit <number>', 'Maximum results', '25')
  .option('--json', 'Output as JSON')
  .action(async (options: any) => {
    try {
      let cql = `space = "${options.space}" AND type = page`;
      
      if (options.title) {
        cql += ` AND title ~ "${options.title}"`;
      }
      
      const client = await getConfluenceClient();
      const results = await client.search(cql, parseInt(options.limit));
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      console.log(`\n📄 Found ${results.totalSize} page(s) in ${options.space} (showing ${results.size}):\n`);
      
      results.results.forEach((page: any, index: number) => {
        console.log(`${index + 1}. ${page.title}`);
        console.log(`   ID: ${page.id} | Version: ${page.version.number}`);
        console.log(`   Modified: ${new Date(page.version.when).toLocaleDateString()}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Page search failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('recent')
  .description('Get recently updated content')
  .option('-s, --space <key>', 'Filter by space')
  .option('-l, --limit <number>', 'Maximum results', '25')
  .option('--json', 'Output as JSON')
  .action(async (options: any) => {
    try {
      let cql = 'type = page ORDER BY lastModified DESC';
      
      if (options.space) {
        cql = `space = "${options.space}" AND ` + cql;
      }
      
      const client = await getConfluenceClient();
      const results = await client.search(cql, parseInt(options.limit));
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      console.log(`\n🕐 Recently updated (showing ${results.size}):\n`);
      
      results.results.forEach((page: any, index: number) => {
        console.log(`${index + 1}. ${page.title}`);
        console.log(`   Space: ${page.space.name} (${page.space.key})`);
        console.log(`   Modified: ${new Date(page.version.when).toLocaleString()}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Recent content failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('labels')
  .description('Search by label')
  .requiredOption('-l, --label <name>', 'Label name')
  .option('-s, --space <key>', 'Filter by space')
  .option('--limit <number>', 'Maximum results', '25')
  .option('--json', 'Output as JSON')
  .action(async (options: any) => {
    try {
      let cql = `label = "${options.label}"`;
      
      if (options.space) {
        cql += ` AND space = "${options.space}"`;
      }
      
      const client = await getConfluenceClient();
      const results = await client.search(cql, parseInt(options.limit));
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }
      
      console.log(`\n🏷️  Content with label "${options.label}" (showing ${results.size}):\n`);
      
      results.results.forEach((item: any, index: number) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   Type: ${item.type} | Space: ${item.space.name}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Label search failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('spaces')
  .description('List available spaces')
  .option('-l, --limit <number>', 'Maximum results', '25')
  .option('--json', 'Output as JSON')
  .action(async (options: any) => {
    try {
      const client = await getConfluenceClient();
      const spaces = await client.getSpaces(parseInt(options.limit));
      
      if (options.json) {
        console.log(JSON.stringify(spaces, null, 2));
        return;
      }
      
      console.log(`\n📚 Available spaces (showing ${spaces.size}):\n`);
      
      spaces.results.forEach((space: any, index: number) => {
        console.log(`${index + 1}. ${space.name} (${space.key})`);
        console.log(`   Type: ${space.type}`);
        if (space.description?.plain?.value) {
          console.log(`   Description: ${space.description.plain.value.substring(0, 100)}...`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('❌ Spaces list failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('examples')
  .description('Show CQL query examples')
  .action(() => {
    console.log(`
📘 CQL Query Examples:

Basic Searches:
  title = "My Page"                      # Exact title match
  title ~ "documentation"                # Title contains "documentation"
  text ~ "api"                          # Body text contains "api"

Space Filters:
  space = "DEV"                         # Pages in DEV space
  space in ("DEV", "QA", "PROD")        # Multiple spaces

Type Filters:
  type = page                           # Only pages
  type = blogpost                       # Only blog posts
  type = attachment                     # Only attachments

Date Filters:
  created >= "2024-01-01"               # Created after date
  lastModified >= now("-7d")            # Modified in last 7 days
  created >= startOfWeek()              # Created this week

Label Filters:
  label = "api"                         # Has "api" label
  label in ("api", "documentation")     # Has any of these labels

Creator Filters:
  creator = currentUser()               # Created by you
  creator = "john.doe"                  # Created by specific user

Sorting:
  ORDER BY created DESC                 # Newest first
  ORDER BY lastModified DESC            # Recently modified first
  ORDER BY title ASC                    # Alphabetical

Complex Queries:
  space = "DEV" AND type = page AND label = "api" AND lastModified >= now("-30d")
  (space = "DEV" OR space = "QA") AND text ~ "deployment" ORDER BY created DESC
  type = page AND creator = currentUser() AND created >= startOfWeek()

Functions:
  currentUser()                         # Current logged-in user
  now()                                # Current date/time
  now("-7d")                           # 7 days ago
  startOfWeek()                        # Start of current week
  startOfMonth()                       # Start of current month
  endOfWeek()                          # End of current week

Operators:
  =, !=                                # Equality
  >, >=, <, <=                         # Comparison
  ~, !~                                # Contains, not contains
  IN, NOT IN                           # Set membership
  AND, OR, NOT                         # Logical operators
`);
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
