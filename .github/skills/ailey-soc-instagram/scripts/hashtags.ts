#!/usr/bin/env node

import { Command } from 'commander';
import { InstagramClient, loadConfig } from './instagram-client.js';
import fs from 'fs';

const program = new Command();

program
  .name('instagram-hashtags')
  .description('Instagram hashtag tools and research')
  .version('1.0.0');

// ============================================================================
// HASHTAG SEARCH
// ============================================================================

program
  .command('search')
  .description('Search for hashtags')
  .argument('<query>', 'Search query')
  .action(async (query: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.searchHashtags(query);
      
      console.log(`Found ${result.data?.length || 0} hashtags:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// HASHTAG INFO
// ============================================================================

program
  .command('info')
  .description('Get hashtag information')
  .argument('<hashtag-id>', 'Hashtag ID')
  .action(async (hashtagId: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getHashtag(hashtagId);
      
      console.log('Hashtag Information:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// TOP MEDIA FOR HASHTAG
// ============================================================================

program
  .command('top')
  .description('Get top media for hashtag')
  .argument('<hashtag-id>', 'Hashtag ID')
  .option('-l, --limit <number>', 'Limit results', '25')
  .option('-o, --output <file>', 'Export to JSON file')
  .action(async (hashtagId: string, options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getHashtagTopMedia(hashtagId, parseInt(options.limit));
      
      console.log(`Found ${result.data?.length || 0} top posts:`);
      console.log(JSON.stringify(result, null, 2));
      
      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(`\nExported to ${options.output}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// RECENT MEDIA FOR HASHTAG
// ============================================================================

program
  .command('recent')
  .description('Get recent media for hashtag')
  .argument('<hashtag-id>', 'Hashtag ID')
  .option('-l, --limit <number>', 'Limit results', '25')
  .option('-o, --output <file>', 'Export to JSON file')
  .action(async (hashtagId: string, options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getHashtagRecentMedia(hashtagId, parseInt(options.limit));
      
      console.log(`Found ${result.data?.length || 0} recent posts:`);
      console.log(JSON.stringify(result, null, 2));
      
      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(`\nExported to ${options.output}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// HASHTAG RESEARCH
// ============================================================================

program
  .command('research')
  .description('Research multiple hashtags at once')
  .option('-t, --tags <tags>', 'Comma-separated hashtags (without #)')
  .option('-o, --output <file>', 'Export to CSV file')
  .action(async (options) => {
    try {
      if (!options.tags) {
        console.error('Error: --tags is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const tags = options.tags.split(',').map((t: string) => t.trim());
      const results = [];
      
      console.log(`Researching ${tags.length} hashtags...\n`);
      
      for (const tag of tags) {
        try {
          const searchResult = await client.searchHashtags(tag);
          if (searchResult.data && searchResult.data.length > 0) {
            const hashtagId = searchResult.data[0].id;
            const info = await client.getHashtag(hashtagId);
            
            results.push({
              hashtag: `#${tag}`,
              id: hashtagId,
              name: info.name
            });
            
            console.log(`✓ #${tag}`);
          } else {
            console.log(`✗ #${tag} (not found)`);
          }
        } catch (error) {
          console.log(`✗ #${tag} (error)`);
        }
      }
      
      console.log(`\nResearch complete! Found ${results.length}/${tags.length} hashtags.\n`);
      console.log(JSON.stringify(results, null, 2));
      
      if (options.output) {
        const headers = ['Hashtag', 'ID', 'Name'];
        const csvRows = [headers.join(',')];
        
        for (const item of results) {
          const row = [
            `"${item.hashtag}"`,
            item.id,
            `"${item.name}"`
          ];
          csvRows.push(row.join(','));
        }
        
        fs.writeFileSync(options.output, csvRows.join('\n'));
        console.log(`Exported to ${options.output}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
