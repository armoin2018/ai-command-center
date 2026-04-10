#!/usr/bin/env node

import { Command } from 'commander';
import { WebCrawler, CrawlerConfig } from './index';
import * as dotenv from 'dotenv';
import * as path from 'path';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('ailey-web-crawl')
  .description('Advanced web crawler with depth control, filtering, and parallelization')
  .version('1.0.0');

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log(chalk.blue.bold('\n🕷️  AI-ley Web Crawler Setup\n'));
    console.log('Create a .env file with your configuration:');
    console.log(chalk.gray('\nExample .env:'));
    console.log(chalk.gray('START_URL=https://example.com'));
    console.log(chalk.gray('OUTPUT_DIR=./crawled'));
    console.log(chalk.gray('MAX_DEPTH=3'));
    console.log(chalk.gray('MAX_CONCURRENT=5\n'));
    console.log(chalk.green('✓ Setup complete! Edit .env and run: npm run crawl'));
  });

// Crawl command
program
  .command('crawl')
  .description('Crawl website with full configuration')
  .option('-u, --url <url>', 'Starting URL')
  .option('-o, --output <dir>', 'Output directory', './crawled')
  .option('-d, --depth <number>', 'Max crawl depth', '3')
  .option('--max-pages <number>', 'Max pages to crawl', '1000')
  .option('--max-duration <minutes>', 'Max crawl duration', '60')
  .option('-c, --concurrent <number>', 'Max concurrent requests', '5')
  .option('--delay <ms>', 'Request delay in milliseconds', '1000')
  .option('--include <patterns>', 'Include URL patterns (comma-separated)')
  .option('--exclude <patterns>', 'Exclude URL patterns (comma-separated)')
  .option('--cross-site', 'Allow cross-site crawling', false)
  .option('--allowed-domains <domains>', 'Allowed domains (comma-separated)')
  .option('--types <types>', 'Allowed file types (comma-separated)', 'html,htm')
  .option('--binaries', 'Download binary files', false)
  .option('--auth-type <type>', 'Authentication type (none, basic, bearer, form, cookie)', 'none')
  .option('--auth-user <username>', 'Authentication username')
  .option('--auth-pass <password>', 'Authentication password')
  .option('--auth-token <token>', 'Bearer token')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Show browser UI')
  .option('--user-agent <agent>', 'Custom user agent')
  .option('--no-js', 'Disable JavaScript')
  .option('--screenshots', 'Save screenshots', false)
  .option('--compress', 'Compress output files', false)
  .option('--no-robots', 'Ignore robots.txt')
  .option('-v, --verbose', 'Verbose logging', false)
  .action(async (options) => {
    try {
      const startUrl = options.url || process.env.START_URL;
      if (!startUrl) {
        console.error(chalk.red('Error: --url or START_URL environment variable required'));
        process.exit(1);
      }

      console.log(chalk.blue.bold('\n🕷️  Starting Web Crawl\n'));
      console.log(chalk.gray(`URL: ${startUrl}`));
      console.log(chalk.gray(`Output: ${options.output}`));
      console.log(chalk.gray(`Depth: ${options.depth}`));
      console.log(chalk.gray(`Concurrent: ${options.concurrent}\n`));

      const config: CrawlerConfig = {
        startUrl,
        outputDir: options.output,
        maxDepth: parseInt(options.depth),
        maxPages: parseInt(options.maxPages),
        maxDuration: parseInt(options.maxDuration),
        maxConcurrent: parseInt(options.concurrent),
        requestDelay: parseInt(options.delay),
        allowCrossSite: options.crossSite,
        allowedDomains: options.allowedDomains ? options.allowedDomains.split(',') : [],
        includePatterns: options.include ? options.include.split(',') : [],
        excludePatterns: options.exclude ? options.exclude.split(',') : [],
        allowedFileTypes: options.types.split(','),
        downloadBinaries: options.binaries,
        browser: {
          headless: options.headless,
          userAgent: options.userAgent,
          javascriptEnabled: !options.noJs,
        },
        authentication: {
          type: options.authType,
          username: options.authUser,
          password: options.authPass,
          token: options.authToken,
        },
        saveScreenshots: options.screenshots,
        compressOutput: options.compress,
        respectRobotsTxt: !options.noRobots,
        verbose: options.verbose,
        logLevel: options.verbose ? 'debug' : 'info',
      };

      const crawler = new WebCrawler(config);

      // Progress monitoring
      let lastUpdate = Date.now();
      crawler.on('page-crawled', (url: string, depth: number) => {
        if (Date.now() - lastUpdate > 5000) {
          const stats = crawler.getStats();
          console.log(chalk.gray(`Progress: ${stats.pagesVisited} pages (${stats.pagesPerMinute.toFixed(1)}/min)`));
          lastUpdate = Date.now();
        }
      });

      crawler.on('error', (error: Error, url: string) => {
        if (options.verbose) {
          console.error(chalk.red(`Error: ${url} - ${error.message}`));
        }
      });

      const stats = await crawler.start();

      console.log(chalk.green.bold('\n✓ Crawl Complete\n'));
      console.log(chalk.gray(`Pages Visited: ${stats.pagesVisited}`));
      console.log(chalk.gray(`Files Downloaded: ${stats.filesDownloaded}`));
      console.log(chalk.gray(`Total Size: ${stats.totalSizeMB.toFixed(2)} MB`));
      console.log(chalk.gray(`Duration: ${stats.elapsedMinutes.toFixed(2)} minutes`));
      console.log(chalk.gray(`Speed: ${stats.pagesPerMinute.toFixed(1)} pages/min`));
      console.log(chalk.gray(`Errors: ${stats.errors}\n`));
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Crawl failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Sitemap command
program
  .command('sitemap')
  .description('Generate sitemap from crawled URLs')
  .option('-u, --url <url>', 'Starting URL')
  .option('-o, --output <file>', 'Output sitemap file', 'sitemap.xml')
  .option('-d, --depth <number>', 'Max crawl depth', '5')
  .action(async (options) => {
    try {
      const startUrl = options.url || process.env.START_URL;
      if (!startUrl) {
        console.error(chalk.red('Error: --url or START_URL required'));
        process.exit(1);
      }

      console.log(chalk.blue.bold('\n🗺️  Generating Sitemap\n'));

      const crawler = new WebCrawler({
        startUrl,
        maxDepth: parseInt(options.depth),
        maxConcurrent: 10,
        saveHtml: false,
        saveMetadata: false,
      });

      await crawler.start();
      await crawler.generateSitemap(options.output);

      const stats = crawler.getStats();
      console.log(chalk.green.bold('\n✓ Sitemap Generated\n'));
      console.log(chalk.gray(`File: ${options.output}`));
      console.log(chalk.gray(`URLs: ${stats.pagesVisited}\n`));
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Download command
program
  .command('download')
  .description('Download specific file types')
  .option('-u, --url <url>', 'Starting URL')
  .option('-t, --types <types>', 'File types to download (comma-separated)', 'pdf,doc,docx')
  .option('-o, --output <dir>', 'Output directory', './downloads')
  .option('--max-size <mb>', 'Max file size in MB', '100')
  .option('--max-files <number>', 'Max files to download', '1000')
  .option('-d, --depth <number>', 'Max crawl depth', '3')
  .action(async (options) => {
    try {
      const startUrl = options.url || process.env.START_URL;
      if (!startUrl) {
        console.error(chalk.red('Error: --url or START_URL required'));
        process.exit(1);
      }

      console.log(chalk.blue.bold('\n📥 Downloading Files\n'));
      console.log(chalk.gray(`Types: ${options.types}`));
      console.log(chalk.gray(`Max Size: ${options.maxSize} MB\n`));

      const crawler = new WebCrawler({
        startUrl,
        outputDir: options.output,
        maxDepth: parseInt(options.depth),
        maxPages: parseInt(options.maxFiles),
        maxFileSize: parseInt(options.maxSize),
        allowedFileTypes: options.types.split(','),
        downloadBinaries: true,
        binaryExtensions: options.types.split(','),
        saveHtml: false,
        saveMetadata: true,
      });

      crawler.on('file-downloaded', (url: string, path: string, size: number) => {
        console.log(chalk.green(`✓ ${path} (${size.toFixed(2)} MB)`));
      });

      const stats = await crawler.start();

      console.log(chalk.green.bold('\n✓ Download Complete\n'));
      console.log(chalk.gray(`Files: ${stats.filesDownloaded}`));
      console.log(chalk.gray(`Total Size: ${stats.totalSizeMB.toFixed(2)} MB\n`));
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Spider command
program
  .command('spider')
  .description('Fast link discovery without downloads')
  .option('-u, --url <url>', 'Starting URL')
  .option('-o, --output <file>', 'Output JSON file', 'links.json')
  .option('-d, --depth <number>', 'Max crawl depth', '5')
  .option('-c, --concurrent <number>', 'Max concurrent requests', '20')
  .action(async (options) => {
    try {
      const startUrl = options.url || process.env.START_URL;
      if (!startUrl) {
        console.error(chalk.red('Error: --url or START_URL required'));
        process.exit(1);
      }

      console.log(chalk.blue.bold('\n🕸️  Spidering Website\n'));

      const crawler = new WebCrawler({
        startUrl,
        maxDepth: parseInt(options.depth),
        maxConcurrent: parseInt(options.concurrent),
        saveHtml: false,
        saveMetadata: false,
        downloadBinaries: false,
        browser: {
          javascriptEnabled: false, // Faster
        },
      });

      await crawler.start();
      await crawler.exportLinks(options.output);

      const stats = crawler.getStats();
      console.log(chalk.green.bold('\n✓ Spidering Complete\n'));
      console.log(chalk.gray(`Links: ${stats.pagesVisited}`));
      console.log(chalk.gray(`File: ${options.output}\n`));
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Run system diagnostics')
  .option('--check-proxy', 'Test proxy connection')
  .option('--check-auth', 'Test authentication')
  .option('--check-robots', 'Check robots.txt')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🔍 System Diagnostics\n'));

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(chalk.gray(`Node.js: ${nodeVersion}`));

    // Check dependencies
    try {
      require('puppeteer');
      console.log(chalk.green('✓ Puppeteer installed'));
    } catch {
      console.log(chalk.red('✗ Puppeteer not installed'));
    }

    try {
      require('cheerio');
      console.log(chalk.green('✓ Cheerio installed'));
    } catch {
      console.log(chalk.red('✗ Cheerio not installed'));
    }

    // Check environment
    if (process.env.START_URL) {
      console.log(chalk.green(`✓ START_URL configured: ${process.env.START_URL}`));
    } else {
      console.log(chalk.yellow('! START_URL not configured'));
    }

    console.log(chalk.green.bold('\n✓ Diagnostics Complete\n'));
  });

program.parse();
