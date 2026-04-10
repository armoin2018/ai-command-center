#!/usr/bin/env node

import { Command } from 'commander';
import { FacebookClient, loadConfig } from './facebook-client.js';
import fs from 'fs';

const program = new Command();

program
  .name('facebook-analytics')
  .description('Facebook analytics and insights')
  .version('1.0.0');

// ============================================================================
// PAGE INSIGHTS COMMANDS
// ============================================================================

const page = program
  .command('page')
  .description('Page insights and analytics');

page
  .command('insights')
  .description('Get page insights')
  .argument('<page-id>', 'Page ID')
  .option('-m, --metrics <metrics>', 'Comma-separated metrics', 'page_impressions,page_engaged_users,page_post_engagements')
  .option('-p, --period <period>', 'Time period', 'day')
  .option('-s, --since <date>', 'Start date (YYYY-MM-DD)')
  .option('-u, --until <date>', 'End date (YYYY-MM-DD)')
  .option('-o, --output <file>', 'Export to JSON file')
  .action(async (pageId: string, options: any) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getPageInsights(pageId, {
        metric: options.metrics.split(','),
        period: options.period,
        since: options.since,
        until: options.until
      });
      
      console.log('Page Insights:');
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

page
  .command('summary')
  .description('Get page summary with key metrics')
  .argument('<page-id>', 'Page ID')
  .option('-d, --days <number>', 'Number of days to analyze', '30')
  .action(async (pageId: string, options: any) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const days = parseInt(options.days);
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      // Get multiple key metrics
      const metrics = [
        'page_impressions',
        'page_impressions_unique',
        'page_engaged_users',
        'page_post_engagements',
        'page_fans',
        'page_fans_online'
      ];
      
      const result = await client.getPageInsights(pageId, {
        metric: metrics,
        period: 'day',
        since: since.toISOString().split('T')[0]
      });
      
      console.log(`Page Summary (Last ${days} days):`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// POST INSIGHTS COMMANDS
// ============================================================================

const post = program
  .command('post')
  .description('Post-level insights');

post
  .command('performance')
  .description('Get post performance')
  .argument('<page-id>', 'Page ID')
  .option('-l, --limit <number>', 'Number of posts to analyze', '10')
  .option('-o, --output <file>', 'Export to CSV file')
  .action(async (pageId: string, options: any) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getPagePosts(pageId, parseInt(options.limit));
      
      console.log(`Post Performance (${result.data?.length || 0} posts):`);
      
      if (options.output) {
        // Convert to CSV
        const posts = result.data || [];
        const headers = ['Post ID', 'Created Time', 'Message', 'Likes', 'Comments', 'Shares'];
        const csvRows = [headers.join(',')];
        
        for (const post of posts) {
          const row = [
            post.id,
            post.created_time,
            `"${(post.message || '').replace(/"/g, '""')}"`,
            post.likes?.summary?.total_count || 0,
            post.comments?.summary?.total_count || 0,
            post.shares?.count || 0
          ];
          csvRows.push(row.join(','));
        }
        
        fs.writeFileSync(options.output, csvRows.join('\n'));
        console.log(`Exported to ${options.output}`);
      }
      
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// AVAILABLE METRICS REFERENCE
// ============================================================================

program
  .command('metrics')
  .description('Show available metrics reference')
  .action(() => {
    console.log(`
📊 Facebook Analytics Metrics Reference

PAGE METRICS:
- page_impressions: Total impressions
- page_impressions_unique: Unique users reached
- page_engaged_users: Users who engaged with page
- page_post_engagements: Total post engagements
- page_fans: Total page likes
- page_fans_online: Online fans
- page_views_total: Total page views
- page_video_views: Total video views

POST METRICS:
- post_impressions: Post reach
- post_engaged_users: Users who engaged
- post_clicks: Total clicks
- post_reactions_like_total: Like reactions
- post_reactions_love_total: Love reactions
- post_video_views: Video views

AD METRICS:
- impressions: Ad impressions
- clicks: Ad clicks
- spend: Total spend
- reach: Unique reach
- ctr: Click-through rate
- cpc: Cost per click
- cpp: Cost per impression
- conversions: Total conversions
- cost_per_conversion: Cost per conversion

INSTAGRAM METRICS:
- impressions: Total impressions
- reach: Unique accounts reached
- profile_views: Profile views
- website_clicks: Website link clicks
- engagement: Total engagement (likes + comments + saves)

PERIODS:
- day: Daily breakdown
- week: Weekly breakdown
- days_28: 28-day breakdown
- month: Monthly breakdown
- lifetime: Total lifetime data
    `);
  });

program.parse();
