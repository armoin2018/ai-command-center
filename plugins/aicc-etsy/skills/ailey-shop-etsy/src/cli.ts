import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { EtsyClient } from './index';

dotenv.config();

const program = new Command();

// Initialize EtsyClient
const client = new EtsyClient({
  apiKey: process.env.ETSY_API_KEY || '',
  apiSecret: process.env.ETSY_API_SECRET || '',
  accessToken: process.env.ETSY_ACCESS_TOKEN || '',
  shopId: process.env.ETSY_SHOP_ID || ''
});

const setupInstructions = `
${chalk.green('Step 1: Create Etsy Account')}
- Sign up at https://www.etsy.com/
- Set up your shop profile
- Complete identity verification

${chalk.green('Step 2: Get API Access')}
- Go to https://www.etsy.com/developers
- Create a developer application
- Request API access and keystring
- Generate OAuth tokens for your shop
- Copy API Key, Secret, Access Token, Shop ID

${chalk.green('Step 3: Configure Environment')}
- Create .env file with credentials:
  ETSY_API_KEY=your_api_key
  ETSY_API_SECRET=your_api_secret
  ETSY_ACCESS_TOKEN=your_access_token
  ETSY_SHOP_ID=your_shop_id
  ETSY_ACCOUNT_TYPE=business

${chalk.green('Step 4: Configure AI-ley')}
- Add to .github/aicc/aicc.yaml:
  skills:
    etsy:
      type: shop
      path: .github/skills/ailey-shop-etsy
      config:
        apiKey: \${ETSY_API_KEY}
        apiSecret: \${ETSY_API_SECRET}
        accessToken: \${ETSY_ACCESS_TOKEN}
        shopId: \${ETSY_SHOP_ID}

${chalk.blue('Resources:')}
- Developer Portal: https://www.etsy.com/developers
- API Docs: https://developers.etsy.com/documentation
- Help: https://help.etsy.com/
`;

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard for Etsy API')
  .action(() => {
    console.log('\n' + chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('          Etsy AI-ley Skill Setup Wizard'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
    console.log(setupInstructions);
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
  });

// Detect command
program
  .command('detect')
  .description('Detect account tier and capabilities')
  .action(async () => {
    try {
      console.log(chalk.yellow('\n→ Detecting Etsy account tier...\n'));
      const tier = await client.detectAccountTier();
      
      console.log(chalk.green(`✓ Account Tier: ${chalk.bold(tier.tier)}`));
      console.log(chalk.blue(`  Max Listings: ${tier.maxListings}`));
      console.log(chalk.blue(`  Monthly Fee: $${tier.monthlyFee}`));
      console.log(chalk.blue(`  API Access: ${tier.apiAccess}`));
      console.log(chalk.blue(`  Analytics: ${tier.analytics}`));
      console.log(chalk.blue(`  Support: ${tier.support}`));
      console.log(chalk.blue(`  Features:`));
      tier.features.forEach(f => {
        console.log(chalk.blue(`    • ${f}`));
      });
      console.log('');
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Auth command
program
  .command('auth <action>')
  .description('Manage authentication')
  .action(async (action) => {
    try {
      if (action === 'verify') {
        console.log(chalk.yellow('\n→ Verifying credentials...\n'));
        const shop = await client.getShopInfo();
        console.log(chalk.green('✓ Authentication successful'));
        console.log(chalk.blue(`  Shop: ${shop.name}`));
        console.log(chalk.blue(`  URL: ${shop.shopUrl}`));
        console.log(chalk.blue(`  Currency: ${shop.currencyCode}`));
        console.log('');
      } else if (action === 'info') {
        console.log(chalk.yellow('\n→ Getting account information...\n'));
        const shop = await client.getShopInfo();
        console.log(chalk.green('✓ Shop Information'));
        console.log(chalk.blue(`  Shop ID: ${shop.id}`));
        console.log(chalk.blue(`  Name: ${shop.name}`));
        console.log(chalk.blue(`  Description: ${shop.description}`));
        console.log(chalk.blue(`  URL: ${shop.shopUrl}`));
        console.log(chalk.blue(`  Language: ${shop.language}`));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
        console.log('Available actions: verify, info');
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Shop command
program
  .command('shop <action>')
  .option('--policy <type>', 'Policy type')
  .option('--content <text>', 'Policy content')
  .description('Manage shop settings and policies')
  .action(async (action, options) => {
    try {
      if (action === 'info') {
        console.log(chalk.yellow('\n→ Getting shop information...\n'));
        const shop = await client.getShopInfo();
        console.log(chalk.green('✓ Shop Details'));
        console.log(chalk.blue(`  Name: ${shop.name}`));
        console.log(chalk.blue(`  ID: ${shop.id}`));
        console.log(chalk.blue(`  URL: ${shop.shopUrl}`));
        console.log('');
      } else if (action === 'list-policies') {
        console.log(chalk.yellow('\n→ Fetching shop policies...\n'));
        const policies = await client.listShopPolicies();
        if (policies.length === 0) {
          console.log(chalk.yellow('No policies found'));
        } else {
          console.log(chalk.green(`✓ Found ${policies.length} policies\n`));
          policies.forEach(p => {
            console.log(chalk.blue(`  ${p.policyType}:`));
            console.log(chalk.gray(`    ${p.content.substring(0, 100)}...`));
          });
        }
        console.log('');
      } else if (action === 'update-policy') {
        if (!options.policy || !options.content) {
          console.error(chalk.red('--policy and --content required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Updating shop policy...\n'));
        const policy = await client.updateShopPolicy(options.policy, options.content);
        console.log(chalk.green('✓ Policy updated'));
        console.log(chalk.blue(`  Type: ${policy.policyType}`));
        console.log(chalk.blue(`  Content: ${policy.content.substring(0, 100)}...`));
        console.log('');
      } else if (action === 'stats') {
        console.log(chalk.yellow('\n→ Getting shop statistics...\n'));
        const stats = await client.getShopStats();
        console.log(chalk.green('✓ Shop Statistics'));
        console.log(chalk.blue(`  Total Listings: ${stats.totalListings}`));
        console.log(chalk.blue(`  Total Sales: ${stats.totalSales}`));
        console.log(chalk.blue(`  Total Revenue: $${stats.totalRevenue}`));
        console.log(chalk.blue(`  Total Visitors: ${stats.totalVisitors}`));
        console.log(chalk.blue(`  Active Orders: ${stats.activeOrders}`));
        console.log(chalk.blue(`  Average Rating: ${stats.averageRating}`));
        console.log(chalk.blue(`  Total Reviews: ${stats.totalReviews}`));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Product command
program
  .command('product <action>')
  .option('--title <text>', 'Listing title')
  .option('--description <text>', 'Listing description')
  .option('--price <number>', 'Listing price')
  .option('--quantity <number>', 'Listing quantity')
  .option('--listing-id <id>', 'Listing ID')
  .option('--limit <number>', 'Result limit', '20')
  .option('--sort <field>', 'Sort field', 'created')
  .description('Manage product listings')
  .action(async (action, options) => {
    try {
      if (action === 'create') {
        if (!options.title || !options.price || !options.quantity) {
          console.error(chalk.red('--title, --price, and --quantity required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Creating listing...\n'));
        const listing = await client.createListing({
          title: options.title,
          description: options.description || '',
          price: parseFloat(options.price),
          quantity: parseInt(options.quantity)
        });
        console.log(chalk.green('✓ Listing created'));
        console.log(chalk.blue(`  ID: ${listing.id}`));
        console.log(chalk.blue(`  Title: ${listing.title}`));
        console.log(chalk.blue(`  Price: $${listing.price}`));
        console.log(chalk.blue(`  Quantity: ${listing.quantity}`));
        console.log('');
      } else if (action === 'list') {
        console.log(chalk.yellow('\n→ Fetching listings...\n'));
        const listings = await client.listListings({
          limit: parseInt(options.limit),
          sort: options.sort
        });
        console.log(chalk.green(`✓ Found ${listings.length} listings\n`));
        listings.forEach(l => {
          console.log(chalk.blue(`  [${l.id}] ${l.title}`));
          console.log(chalk.gray(`    Price: $${l.price} | Qty: ${l.quantity}`));
        });
        console.log('');
      } else if (action === 'get') {
        if (!options.listingId) {
          console.error(chalk.red('--listing-id required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Getting listing...\n'));
        const listing = await client.getListing(options.listingId);
        console.log(chalk.green('✓ Listing Details'));
        console.log(chalk.blue(`  ID: ${listing.id}`));
        console.log(chalk.blue(`  Title: ${listing.title}`));
        console.log(chalk.blue(`  Description: ${listing.description}`));
        console.log(chalk.blue(`  Price: $${listing.price}`));
        console.log(chalk.blue(`  Quantity: ${listing.quantity}`));
        console.log('');
      } else if (action === 'delete') {
        if (!options.listingId) {
          console.error(chalk.red('--listing-id required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Deleting listing...\n'));
        await client.deleteListing(options.listingId);
        console.log(chalk.green('✓ Listing deleted'));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Order command
program
  .command('order <action>')
  .option('--order-id <id>', 'Order ID')
  .option('--tracking-code <code>', 'Tracking code')
  .option('--carrier <name>', 'Carrier name')
  .option('--message <text>', 'Message text')
  .option('--limit <number>', 'Result limit', '20')
  .description('Manage orders')
  .action(async (action, options) => {
    try {
      if (action === 'list') {
        console.log(chalk.yellow('\n→ Fetching orders...\n'));
        const orders = await client.listOrders({ limit: parseInt(options.limit) });
        console.log(chalk.green(`✓ Found ${orders.length} orders\n`));
        orders.forEach(o => {
          console.log(chalk.blue(`  [${o.id}] ${o.buyerName} - $${o.totalPrice}`));
          console.log(chalk.gray(`    Items: ${o.items.length} | Status: ${o.status}`));
        });
        console.log('');
      } else if (action === 'get') {
        if (!options.orderId) {
          console.error(chalk.red('--order-id required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Getting order...\n'));
        const order = await client.getOrder(options.orderId);
        console.log(chalk.green('✓ Order Details'));
        console.log(chalk.blue(`  ID: ${order.id}`));
        console.log(chalk.blue(`  Buyer: ${order.buyerName}`));
        console.log(chalk.blue(`  Total: $${order.totalPrice}`));
        console.log(chalk.blue(`  Status: ${order.status}`));
        console.log(chalk.blue(`  Items: ${order.items.length}`));
        console.log('');
      } else if (action === 'fulfill') {
        if (!options.orderId || !options.trackingCode || !options.carrier) {
          console.error(chalk.red('--order-id, --tracking-code, and --carrier required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Fulfilling order...\n'));
        const order = await client.fulfillOrder(options.orderId, {
          tracking: options.trackingCode,
          carrier: options.carrier
        });
        console.log(chalk.green('✓ Order fulfilled'));
        console.log(chalk.blue(`  ID: ${order.id}`));
        console.log(chalk.blue(`  Status: ${order.status}`));
        console.log('');
      } else if (action === 'message') {
        if (!options.orderId || !options.message) {
          console.error(chalk.red('--order-id and --message required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Sending message...\n'));
        await client.sendOrderMessage(options.orderId, options.message);
        console.log(chalk.green('✓ Message sent to buyer'));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Review command
program
  .command('review <action>')
  .option('--review-id <id>', 'Review ID')
  .option('--response <text>', 'Response text')
  .option('--limit <number>', 'Result limit', '20')
  .description('Manage customer reviews')
  .action(async (action, options) => {
    try {
      if (action === 'list') {
        console.log(chalk.yellow('\n→ Fetching reviews...\n'));
        const reviews = await client.listReviews({ limit: parseInt(options.limit) });
        console.log(chalk.green(`✓ Found ${reviews.length} reviews\n`));
        reviews.forEach(r => {
          const responded = r.response ? ' (Responded)' : '';
          console.log(chalk.blue(`  [${r.id}] ${r.buyerName} - ${r.rating}★${responded}`));
          console.log(chalk.gray(`    ${r.comment.substring(0, 60)}...`));
        });
        console.log('');
      } else if (action === 'respond') {
        if (!options.reviewId || !options.response) {
          console.error(chalk.red('--review-id and --response required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Responding to review...\n'));
        const review = await client.respondToReview(options.reviewId, options.response);
        console.log(chalk.green('✓ Response posted'));
        console.log(chalk.blue(`  Review: ${review.comment}`));
        console.log(chalk.blue(`  Your Response: ${review.response}`));
        console.log('');
      } else if (action === 'summary') {
        console.log(chalk.yellow('\n→ Getting review summary...\n'));
        const summary = await client.getReviewSummary();
        console.log(chalk.green('✓ Review Summary'));
        console.log(chalk.blue(`  Total Reviews: ${summary.totalReviews}`));
        console.log(chalk.blue(`  Average Rating: ${summary.averageRating}★`));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Analytics command
program
  .command('analytics <action>')
  .option('--days <number>', 'Number of days', '30')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .description('View shop analytics')
  .action(async (action, options) => {
    try {
      if (action === 'stats') {
        console.log(chalk.yellow('\n→ Getting shop statistics...\n'));
        const stats = await client.getShopStats();
        console.log(chalk.green('✓ Shop Stats'));
        console.log(chalk.blue(`  Listings: ${stats.totalListings}`));
        console.log(chalk.blue(`  Sales: ${stats.totalSales}`));
        console.log(chalk.blue(`  Revenue: $${stats.totalRevenue}`));
        console.log(chalk.blue(`  Visitors: ${stats.totalVisitors}`));
        console.log('');
      } else if (action === 'listings') {
        console.log(chalk.yellow('\n→ Getting listings performance...\n'));
        const perf = await client.getListingsPerformance(parseInt(options.days));
        console.log(chalk.green(`✓ Listings Performance (${options.days} days)\n`));
        perf.forEach(p => {
          console.log(chalk.blue(`  ${p.title}`));
          console.log(chalk.gray(`    Views: ${p.views} | Favorites: ${p.favorites} | Sales: ${p.sales}`));
        });
        console.log('');
      } else if (action === 'sales') {
        if (!options.startDate || !options.endDate) {
          console.error(chalk.red('--start-date and --end-date required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Getting sales report...\n'));
        const report = await client.getSalesReport(options.startDate, options.endDate);
        console.log(chalk.green('✓ Sales Report'));
        console.log(chalk.blue(`  Period: ${report.startDate} to ${report.endDate}`));
        console.log(chalk.blue(`  Total Sales: ${report.totalSales}`));
        console.log(chalk.blue(`  Revenue: $${report.totalRevenue}`));
        console.log(chalk.blue(`  Average Order: $${report.averageOrderValue}`));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Run system diagnostics')
  .action(() => {
    console.log(chalk.yellow('\n→ Running diagnostics...\n'));
    
    const checks = {
      'ETSY_API_KEY': process.env.ETSY_API_KEY,
      'ETSY_API_SECRET': process.env.ETSY_API_SECRET,
      'ETSY_ACCESS_TOKEN': process.env.ETSY_ACCESS_TOKEN,
      'ETSY_SHOP_ID': process.env.ETSY_SHOP_ID
    };

    console.log(chalk.green('Environment Variables:'));
    Object.entries(checks).forEach(([key, value]) => {
      const status = value ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${key}: ${value ? 'Set' : 'Missing'}`);
    });

    const nodeVersion = process.version;
    console.log(chalk.green('\nSystem Information:'));
    console.log(`  Node.js: ${nodeVersion}`);
    console.log(`  Platform: ${process.platform}`);

    console.log('');
  });

program.parse(process.argv);
