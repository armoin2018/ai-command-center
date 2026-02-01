#!/usr/bin/env node

import { Command } from 'commander';
import { InstagramClient, loadConfig } from './instagram-client.js';

const program = new Command();

program
  .name('instagram-shopping')
  .description('Instagram shopping and commerce')
  .version('1.0.0');

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

program
  .command('catalog')
  .description('Get product catalog')
  .argument('<catalog-id>', 'Product Catalog ID')
  .action(async (catalogId: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getProductCatalog(catalogId);
      
      console.log(`Found ${result.data?.length || 0} products:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// PRODUCT TAGGING
// ============================================================================

program
  .command('tag')
  .description('Tag products in media')
  .argument('<media-id>', 'Media ID')
  .option('-p, --products <json>', 'Product tags as JSON array')
  .action(async (mediaId: string, options) => {
    try {
      if (!options.products) {
        console.error('Error: --products is required');
        console.error('Format: \'[{"product_id":"123","x":0.5,"y":0.5}]\'');
        process.exit(1);
      }

      const productTags = JSON.parse(options.products);
      
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.tagProducts(mediaId, productTags);
      
      console.log('Products tagged successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
