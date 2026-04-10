#!/usr/bin/env node

import { Command } from 'commander';
import { FacebookClient, loadConfig } from './facebook-client.js';

const program = new Command();

program
  .name('facebook-ads')
  .description('Facebook advertising management')
  .version('1.0.0');

// ============================================================================
// AD ACCOUNT COMMANDS
// ============================================================================

const accounts = program
  .command('accounts')
  .description('Manage ad accounts');

accounts
  .command('list')
  .description('List ad accounts')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getAdAccounts();
      
      console.log(`Found ${result.data?.length || 0} ad accounts:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// CAMPAIGN COMMANDS
// ============================================================================

const campaigns = program
  .command('campaigns')
  .description('Manage ad campaigns');

campaigns
  .command('list')
  .description('List campaigns')
  .argument('<ad-account-id>', 'Ad Account ID')
  .option('-l, --limit <number>', 'Limit results', '25')
  .action(async (adAccountId: string, options: any) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getCampaigns(adAccountId, parseInt(options.limit));
      
      console.log(`Found ${result.data?.length || 0} campaigns:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

campaigns
  .command('create')
  .description('Create new campaign')
  .argument('<ad-account-id>', 'Ad Account ID')
  .option('-n, --name <name>', 'Campaign name (required)', '')
  .option('-o, --objective <objective>', 'Campaign objective (required)', '')
  .option('-s, --status <status>', 'Campaign status', 'PAUSED')
  .option('-d, --daily-budget <amount>', 'Daily budget in cents')
  .option('-l, --lifetime-budget <amount>', 'Lifetime budget in cents')
  .option('-b, --bid-strategy <strategy>', 'Bid strategy', 'LOWEST_COST_WITHOUT_CAP')
  .action(async (adAccountId: string, options: any) => {
    try {
      if (!options.name || !options.objective) {
        console.error('Error: --name and --objective are required');
        console.error('Common objectives: OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.createCampaign(adAccountId, {
        name: options.name,
        objective: options.objective,
        status: options.status,
        dailyBudget: options.dailyBudget ? parseInt(options.dailyBudget) : undefined,
        lifetimeBudget: options.lifetimeBudget ? parseInt(options.lifetimeBudget) : undefined,
        bidStrategy: options.bidStrategy
      });
      
      console.log('Campaign created successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

campaigns
  .command('insights')
  .description('Get campaign performance insights')
  .argument('<campaign-id>', 'Campaign ID')
  .option('-f, --fields <fields>', 'Comma-separated metrics', 'impressions,clicks,spend,reach,ctr,cpc,cpp')
  .action(async (campaignId: string, options: any) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const fields = options.fields.split(',');
      const result = await client.getCampaignInsights(campaignId, fields);
      
      console.log('Campaign Insights:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
