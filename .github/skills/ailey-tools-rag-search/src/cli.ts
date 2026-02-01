import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { RAGSearchClient } from './index';

dotenv.config();

const program = new Command();

// Initialize client
const client = new RAGSearchClient({
  chromadb: {
    host: process.env.CHROMADB_HOST || 'localhost',
    port: parseInt(process.env.CHROMADB_PORT || '8000'),
    path: process.env.CHROMADB_PATH
  },
  embedding: {
    provider: (process.env.EMBEDDING_PROVIDER || 'openai') as any,
    apiKey: process.env.OPENAI_API_KEY || process.env.COHERE_API_KEY || process.env.HUGGINGFACE_API_KEY || '',
    model: process.env.OPENAI_EMBEDDING_MODEL || process.env.COHERE_EMBEDDING_MODEL
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    serpApiKey: process.env.SERPAPI_KEY,
    resultsCount: parseInt(process.env.GOOGLE_RESULTS_COUNT || '5')
  },
  search: {
    topK: parseInt(process.env.DEFAULT_TOP_K || '10'),
    threshold: parseFloat(process.env.DEFAULT_SIMILARITY_THRESHOLD || '0.7'),
    reranking: process.env.ENABLE_RERANKING === 'true'
  }
});

const setupInstructions = `
${chalk.green('RAG Search Setup Guide')}

${chalk.yellow('1. ChromaDB Setup')}
   Start ChromaDB server:
   ${chalk.blue('chroma run --path ./chromadb_data --port 8000')}

${chalk.yellow('2. Configure Embedding Provider')}
   OpenAI (recommended):
   ${chalk.blue('EMBEDDING_PROVIDER=openai')}
   ${chalk.blue('OPENAI_API_KEY=sk-proj-...')}

${chalk.yellow('3. Optional: Google Grounding')}
   Google Custom Search:
   ${chalk.blue('GOOGLE_API_KEY=AIza...')}
   ${chalk.blue('GOOGLE_SEARCH_ENGINE_ID=abc123...')}
   
   OR SerpAPI:
   ${chalk.blue('SERPAPI_KEY=your-key')}

${chalk.yellow('4. Verify Setup')}
   ${chalk.blue('npm run diagnose')}

${chalk.blue('Resources:')}
- ChromaDB: https://docs.trychroma.com/
- OpenAI: https://platform.openai.com/
- Google CSE: https://programmablesearchengine.google.com/
- SerpAPI: https://serpapi.com/
`;

program
  .command('setup')
  .description('Display setup instructions')
  .action(() => {
    console.log(setupInstructions);
  });

program
  .command('list')
  .description('List all RAG collections')
  .option('-v, --verbose', 'Verbose output with details')
  .option('-f, --format <format>', 'Output format (table, json)', 'table')
  .action(async (options) => {
    try {
      await client.connect();
      console.log(chalk.yellow('\n→ Fetching RAG collections...\n'));
      
      const collections = await client.listCollections();
      
      if (collections.length === 0) {
        console.log(chalk.blue('  No RAG collections found\n'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(collections, null, 2));
        return;
      }

      console.log(chalk.green(`✓ Found ${collections.length} collections\n`));
      
      collections.forEach(col => {
        console.log(chalk.blue(`  • ${chalk.bold(col.name)} (${col.count} documents)`));
        if (options.verbose && col.metadata.tags) {
          console.log(chalk.gray(`    Tags: ${col.metadata.tags.join(', ')}`));
        }
        if (options.verbose && col.created) {
          console.log(chalk.gray(`    Created: ${col.created}`));
        }
      });
      
      console.log('');
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('tags')
  .description('List collections by tags')
  .option('-t, --tag <tag>', 'Filter by single tag')
  .option('--tags <tags>', 'Filter by multiple tags (comma-separated)')
  .option('--list-all', 'List all unique tags')
  .action(async (options) => {
    try {
      await client.connect();
      
      if (options.listAll) {
        const collections = await client.listCollections();
        const allTags = new Set<string>();
        
        collections.forEach(col => {
          const tags = col.metadata.tags || [];
          tags.forEach((tag: string) => allTags.add(tag));
        });
        
        console.log(chalk.green('\n✓ All tags:\n'));
        Array.from(allTags).sort().forEach(tag => {
          console.log(chalk.blue(`  • ${tag}`));
        });
        console.log('');
        return;
      }

      const tags = options.tags ? options.tags.split(',') : options.tag ? [options.tag] : [];
      
      if (tags.length === 0) {
        console.error(chalk.red('Specify --tag or --tags'));
        process.exit(1);
      }

      console.log(chalk.yellow(`\n→ Finding collections with tags: ${tags.join(', ')}\n`));
      
      const collections = await client.findCollectionsByTags(tags);
      
      if (collections.length === 0) {
        console.log(chalk.blue('  No collections found with these tags\n'));
        return;
      }

      console.log(chalk.green(`✓ Found ${collections.length} collections\n`));
      collections.forEach(col => {
        console.log(chalk.blue(`  • ${col.name} (${col.count} documents)`));
      });
      console.log('');
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Search a single RAG collection')
  .option('-c, --collection <name>', 'Collection name')
  .option('-q, --query <text>', 'Search query')
  .option('-k, --top-k <number>', 'Number of results', '10')
  .option('-t, --threshold <float>', 'Similarity threshold', '0.7')
  .option('-f, --filter <json>', 'Metadata filter JSON')
  .option('-o, --output <path>', 'Save results to file')
  .action(async (options) => {
    try {
      if (!options.collection || !options.query) {
        console.error(chalk.red('--collection and --query required'));
        process.exit(1);
      }

      await client.connect();
      
      console.log(chalk.yellow('\n→ Searching RAG collection...\n'));
      console.log(chalk.blue(`  Collection: ${options.collection}`));
      console.log(chalk.blue(`  Query: ${options.query}`));
      console.log(chalk.blue(`  Top-K: ${options.topK}`));
      
      const filter = options.filter ? JSON.parse(options.filter) : undefined;
      
      const results = await client.search({
        collection: options.collection,
        query: options.query,
        topK: parseInt(options.topK),
        threshold: parseFloat(options.threshold),
        filter
      });

      console.log(chalk.green(`\n✓ Found ${results.length} results\n`));
      
      results.forEach((result, i) => {
        console.log(chalk.blue(`${i + 1}. [Score: ${result.score.toFixed(3)}]`));
        console.log(chalk.white(`   ${result.content.substring(0, 150)}...`));
        if (Object.keys(result.metadata).length > 0) {
          console.log(chalk.gray(`   Metadata: ${JSON.stringify(result.metadata)}`));
        }
        console.log('');
      });

      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.green(`✓ Results saved to ${options.output}\n`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('join')
  .description('Search multiple RAG collections')
  .option('-c, --collections <names>', 'Collection names (comma-separated)')
  .option('-t, --tags <tags>', 'Tags to filter collections (comma-separated)')
  .option('-q, --query <text>', 'Search query')
  .option('-k, --top-k <number>', 'Number of results', '10')
  .option('-s, --strategy <strategy>', 'Merge strategy (interleave, score, collection, round-robin)', 'interleave')
  .option('-o, --output <path>', 'Save results to file')
  .action(async (options) => {
    try {
      if (!options.query) {
        console.error(chalk.red('--query required'));
        process.exit(1);
      }

      if (!options.collections && !options.tags) {
        console.error(chalk.red('Specify --collections or --tags'));
        process.exit(1);
      }

      await client.connect();
      
      console.log(chalk.yellow('\n→ Searching multiple RAG collections...\n'));
      console.log(chalk.blue(`  Query: ${options.query}`));
      console.log(chalk.blue(`  Strategy: ${options.strategy}`));
      
      let results;
      
      if (options.tags) {
        const tags = options.tags.split(',');
        console.log(chalk.blue(`  Tags: ${tags.join(', ')}`));
        
        results = await client.joinSearchByTags({
          tags,
          query: options.query,
          topK: parseInt(options.topK),
          mergeStrategy: options.strategy
        });
      } else {
        const collections = options.collections.split(',');
        console.log(chalk.blue(`  Collections: ${collections.join(', ')}`));
        
        results = await client.joinSearch({
          collections,
          query: options.query,
          topK: parseInt(options.topK),
          mergeStrategy: options.strategy
        });
      }

      console.log(chalk.green(`\n✓ Found ${results.length} results\n`));
      
      results.forEach((result, i) => {
        console.log(chalk.blue(`${i + 1}. [${result.source}] [Score: ${result.score.toFixed(3)}]`));
        console.log(chalk.white(`   ${result.content.substring(0, 150)}...`));
        console.log('');
      });

      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.green(`✓ Results saved to ${options.output}\n`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('grounded')
  .description('Search with Google grounding')
  .option('-c, --collection <name>', 'Collection name')
  .option('--collections <names>', 'Collection names (comma-separated)')
  .option('-t, --tags <tags>', 'Tags (comma-separated)')
  .option('-q, --query <text>', 'Search query')
  .option('-k, --top-k <number>', 'RAG results', '10')
  .option('-w, --web-results <number>', 'Web results', '5')
  .option('-s, --strategy <strategy>', 'Combine strategy (rag-first, web-first, interleave, scored)', 'rag-first')
  .option('-o, --output <path>', 'Save results to file')
  .action(async (options) => {
    try {
      if (!options.query) {
        console.error(chalk.red('--query required'));
        process.exit(1);
      }

      if (!options.collection && !options.collections && !options.tags) {
        console.error(chalk.red('Specify --collection, --collections, or --tags'));
        process.exit(1);
      }

      await client.connect();
      
      console.log(chalk.yellow('\n→ Performing grounded search (RAG + Web)...\n'));
      console.log(chalk.blue(`  Query: ${options.query}`));
      console.log(chalk.blue(`  Strategy: ${options.strategy}`));
      
      const groundedOptions: any = {
        query: options.query,
        topK: parseInt(options.topK),
        webResults: parseInt(options.webResults),
        combineStrategy: options.strategy
      };

      if (options.collection) {
        groundedOptions.collection = options.collection;
      } else if (options.collections) {
        groundedOptions.collections = options.collections.split(',');
      } else if (options.tags) {
        groundedOptions.tags = options.tags.split(',');
      }

      const results = await client.groundedSearch(groundedOptions);

      const ragCount = results.filter(r => r.source !== 'web').length;
      const webCount = results.filter(r => r.source === 'web').length;

      console.log(chalk.green(`\n✓ Found ${results.length} results (${ragCount} RAG, ${webCount} Web)\n`));
      
      results.forEach((result, i) => {
        const sourceLabel = result.source === 'web' ? chalk.yellow('[WEB]') : chalk.cyan(`[${result.source}]`);
        console.log(chalk.blue(`${i + 1}. ${sourceLabel} [Score: ${result.score.toFixed(3)}]`));
        
        if (result.metadata.title) {
          console.log(chalk.white(`   ${result.metadata.title}`));
        }
        
        console.log(chalk.gray(`   ${result.content.substring(0, 150)}...`));
        
        if (result.metadata.url) {
          console.log(chalk.blue(`   ${result.metadata.url}`));
        }
        
        console.log('');
      });

      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.green(`✓ Results saved to ${options.output}\n`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('diagnose')
  .description('Run system diagnostics')
  .option('--check-chromadb', 'Check ChromaDB connection')
  .option('--check-embeddings', 'Check embedding provider')
  .option('--check-google', 'Check Google API')
  .action(async (options) => {
    console.log(chalk.yellow('\n→ Running diagnostics...\n'));
    
    // Environment variables
    console.log(chalk.green('Environment Configuration:'));
    const envVars = {
      'CHROMADB_HOST': process.env.CHROMADB_HOST || 'localhost',
      'CHROMADB_PORT': process.env.CHROMADB_PORT || '8000',
      'EMBEDDING_PROVIDER': process.env.EMBEDDING_PROVIDER,
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY ? 'Set' : 'Missing',
      'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY ? 'Set' : 'Missing',
      'SERPAPI_KEY': process.env.SERPAPI_KEY ? 'Set' : 'Missing'
    };

    Object.entries(envVars).forEach(([key, value]) => {
      const status = value && value !== 'Missing' ? chalk.green('✓') : chalk.yellow('○');
      console.log(`  ${status} ${key}: ${value}`);
    });

    // ChromaDB connection
    if (!options.checkEmbeddings && !options.checkGoogle) {
      console.log(chalk.green('\nChromaDB Connection:'));
      try {
        await client.connect();
        console.log(chalk.green('  ✓ Connected to ChromaDB'));
        
        const collections = await client.listCollections();
        console.log(chalk.green(`  ✓ Found ${collections.length} collections`));
      } catch (error) {
        console.log(chalk.red(`  ✗ Connection failed: ${error}`));
      }
    }

    // Embedding provider
    if (options.checkEmbeddings || (!options.checkChromadb && !options.checkGoogle)) {
      console.log(chalk.green('\nEmbedding Provider:'));
      try {
        const testText = 'test embedding';
        const embedding = await client.embed(testText);
        console.log(chalk.green(`  ✓ Embedding generated (${embedding.length} dimensions)`));
      } catch (error) {
        console.log(chalk.red(`  ✗ Embedding failed: ${error}`));
      }
    }

    // Google API
    if (options.checkGoogle || (!options.checkChromadb && !options.checkEmbeddings)) {
      console.log(chalk.green('\nGoogle API:'));
      if (process.env.GOOGLE_API_KEY || process.env.SERPAPI_KEY) {
        try {
          const webResults = await client.webSearch({ query: 'test', count: 1 });
          console.log(chalk.green(`  ✓ Google search working (${webResults.length} results)`));
        } catch (error) {
          console.log(chalk.red(`  ✗ Google search failed: ${error}`));
        }
      } else {
        console.log(chalk.yellow('  ○ Google API not configured'));
      }
    }

    console.log('');
  });

program.parse(process.argv);
