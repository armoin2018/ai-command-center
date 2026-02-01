#!/usr/bin/env node

import { Command } from 'commander';
import { InstagramClient, loadConfig } from './instagram-client.js';
import fs from 'fs';

const program = new Command();

program
  .name('instagram-analytics')
  .description('Instagram analytics and insights')
  .version('1.0.0');

// ============================================================================
// ACCOUNT INSIGHTS
// ============================================================================

const account = program
  .command('account')
  .description('Account-level insights');

account
  .command('insights')
  .description('Get account insights')
  .option('-m, --metrics <metrics>', 'Comma-separated metrics', 'impressions,reach,profile_views')
  .option('-p, --period <period>', 'Time period: day, week, days_28', 'day')
  .option('-o, --output <file>', 'Export to JSON file')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const metrics = options.metrics.split(',');
      const result = await client.getAccountInsights(metrics, options.period);
      
      console.log('Account Insights:');
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

account
  .command('demographics')
  .description('Get audience demographics')
  .option('-o, --output <file>', 'Export to JSON file')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getAudienceDemographics();
      
      console.log('Audience Demographics:');
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

account
  .command('info')
  .description('Get account information')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getAccount();
      
      console.log('Account Information:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// MEDIA INSIGHTS
// ============================================================================

const media = program
  .command('media')
  .description('Media-level insights');

media
  .command('insights')
  .description('Get media insights')
  .argument('<media-id>', 'Media ID')
  .option('-m, --metrics <metrics>', 'Comma-separated metrics', 'impressions,reach,engagement,saved,likes,comments')
  .action(async (mediaId: string, options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const metrics = options.metrics.split(',');
      const result = await client.getMediaInsights(mediaId, metrics);
      
      console.log('Media Insights:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

media
  .command('performance')
  .description('Get performance for recent media')
  .option('-l, --limit <number>', 'Number of media to analyze', '10')
  .option('-o, --output <file>', 'Export to CSV file')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const mediaList = await client.getAccountMedia(parseInt(options.limit));
      
      console.log(`Analyzing ${mediaList.data?.length || 0} media items...`);
      
      const performance = [];
      for (const item of mediaList.data || []) {
        const metrics = item.media_type === 'VIDEO' 
          ? ['impressions', 'reach', 'engagement', 'saved', 'video_views']
          : ['impressions', 'reach', 'engagement', 'saved'];
        
        try {
          const insights = await client.getMediaInsights(item.id, metrics);
          performance.push({
            id: item.id,
            type: item.media_type,
            caption: (item.caption || '').substring(0, 50),
            timestamp: item.timestamp,
            likes: item.like_count,
            comments: item.comments_count,
            insights: insights.data
          });
        } catch (error) {
          console.log(`Skipping insights for ${item.id} (may be too old)`);
        }
      }
      
      console.log('\nPerformance Summary:');
      console.log(JSON.stringify(performance, null, 2));
      
      if (options.output) {
        // Convert to CSV
        const headers = ['Media ID', 'Type', 'Caption', 'Timestamp', 'Likes', 'Comments', 'Impressions', 'Reach', 'Engagement'];
        const csvRows = [headers.join(',')];
        
        for (const item of performance) {
          const impressions = item.insights.find((i: any) => i.name === 'impressions')?.values[0]?.value || 0;
          const reach = item.insights.find((i: any) => i.name === 'reach')?.values[0]?.value || 0;
          const engagement = item.insights.find((i: any) => i.name === 'engagement')?.values[0]?.value || 0;
          
          const row = [
            item.id,
            item.type,
            `"${item.caption.replace(/"/g, '""')}"`,
            item.timestamp,
            item.likes,
            item.comments,
            impressions,
            reach,
            engagement
          ];
          csvRows.push(row.join(','));
        }
        
        fs.writeFileSync(options.output, csvRows.join('\n'));
        console.log(`\nExported to ${options.output}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// STORY INSIGHTS
// ============================================================================

const story = program
  .command('story')
  .description('Story insights');

story
  .command('insights')
  .description('Get story insights')
  .argument('<story-id>', 'Story ID')
  .action(async (storyId: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getStoryInsights(storyId);
      
      console.log('Story Insights:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// METRICS REFERENCE
// ============================================================================

program
  .command('metrics')
  .description('Show available metrics reference')
  .action(() => {
    console.log(`
📊 Instagram Analytics Metrics Reference

ACCOUNT METRICS (Period: day, week, days_28, lifetime):
- impressions: Total impressions
- reach: Unique accounts reached
- profile_views: Profile views
- website_clicks: Website link clicks
- email_contacts: Email button clicks
- phone_call_clicks: Call button clicks
- text_message_clicks: Text button clicks
- get_directions_clicks: Directions button clicks
- follower_count: Total followers
- online_followers: Online followers (hourly)

MEDIA METRICS (Photo/Video):
- impressions: Total impressions
- reach: Unique accounts reached
- engagement: Total engagement (likes + comments + saves + shares)
- saved: Number of saves
- likes: Like count
- comments: Comment count
- shares: Share count
- video_views: Video views (video only)
- plays: Video plays (video/reel only)

STORY METRICS:
- impressions: Total impressions
- reach: Unique accounts reached
- exits: Times viewers swiped away
- replies: Number of replies
- taps_forward: Taps to next story
- taps_back: Taps to previous story

REEL METRICS:
- plays: Total plays
- reach: Unique accounts reached
- likes: Like count
- comments: Comment count
- saved: Number of saves
- shares: Share count

AUDIENCE DEMOGRAPHICS (Period: lifetime):
- audience_gender_age: Gender and age distribution
- audience_locale: Language and country codes
- audience_country: Top countries
- audience_city: Top cities

ENGAGEMENT RATE CALCULATION:
engagement_rate = (likes + comments + saves + shares) / reach * 100

BEST PRACTICES:
- Account insights: Use days_28 or lifetime for trends
- Media insights: Only available for posts from last 2 years
- Story insights: Only available for 24 hours after posting
- Compare metrics across different time periods
- Track follower growth and engagement trends
    `);
  });

program.parse();
