import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { AmazonClient } from './index';

dotenv.config();

const program = new Command();

// Initialize AmazonClient
const client = new AmazonClient({
  clientId: process.env.AMAZON_CLIENT_ID || '',
  clientSecret: process.env.AMAZON_CLIENT_SECRET || '',
  refreshToken: process.env.AMAZON_REFRESH_TOKEN || '',
  accessKeyId: process.env.AMAZON_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY || '',
  sellerId: process.env.AMAZON_SELLER_ID || '',
  marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER'
});

const setupInstructions = `
${chalk.green('Step 1: Create Amazon Seller Account')}
${chalk.blue('Personal/Individual Plan:')}
- Sign up at https://sell.amazon.com/
- Choose Individual plan ($0.99 per sale)
- Complete identity verification

${chalk.blue('Business/Professional Plan:')}
- Sign up at https://sell.amazon.com/
- Choose Professional plan ($39.99/month)
- Provide business information
- Complete identity verification

${chalk.green('Step 2: Register for Developer Access')}
- Go to https://sellercentral.amazon.com/
- Navigate to Settings → User Permissions
- Click Amazon MWS or Developer Central
- Register as developer (free)
- Create new developer application

${chalk.green('Step 3: Get API Credentials')}
${chalk.blue('LWA Credentials:')}
- Go to https://developer.amazonservices.com/
- Create OAuth application
- Copy Client ID and Client Secret
- Generate Refresh Token using OAuth flow

${chalk.blue('AWS Credentials:')}
- Seller Central → Settings → User Permissions
- Create IAM role for SP-API access
- Generate Access Key ID and Secret Access Key

${chalk.blue('Seller/Marketplace IDs:')}
- Seller Central → Settings → Account Info
- Copy Seller ID and Marketplace ID

${chalk.green('Step 4: Configure Environment')}
- Create .env file with:
  AMAZON_CLIENT_ID=your_lwa_client_id
  AMAZON_CLIENT_SECRET=your_lwa_client_secret
  AMAZON_REFRESH_TOKEN=your_refresh_token
  AMAZON_ACCESS_KEY_ID=your_aws_access_key_id
  AMAZON_SECRET_ACCESS_KEY=your_aws_secret_access_key
  AMAZON_SELLER_ID=your_seller_id
  AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER

${chalk.green('Step 5: Configure AI-ley')}
- Add to .github/aicc/aicc.yaml:
  skills:
    amazon:
      type: shop
      path: .github/skills/ailey-shop-amazon
      config:
        clientId: \${AMAZON_CLIENT_ID}
        clientSecret: \${AMAZON_CLIENT_SECRET}
        refreshToken: \${AMAZON_REFRESH_TOKEN}
        accessKeyId: \${AMAZON_ACCESS_KEY_ID}
        secretAccessKey: \${AMAZON_SECRET_ACCESS_KEY}
        sellerId: \${AMAZON_SELLER_ID}
        marketplaceId: \${AMAZON_MARKETPLACE_ID}

${chalk.blue('Resources:')}
- Seller Central: https://sellercentral.amazon.com/
- SP-API Docs: https://developer-docs.amazon.com/sp-api/
- Developer Console: https://developer.amazonservices.com/
`;

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard for Amazon SP-API')
  .action(() => {
    console.log('\n' + chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('        Amazon SP-API AI-ley Skill Setup Wizard'));
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
      console.log(chalk.yellow('\n→ Detecting Amazon account tier...\n'));
      const tier = await client.detectAccountTier();
      
      console.log(chalk.green(`✓ Account Plan: ${chalk.bold(tier.tier)}`));
      console.log(chalk.blue(`  Monthly Fee: $${tier.monthlyFee}`));
      console.log(chalk.blue(`  Per-Item Fee: $${tier.perItemFee}`));
      console.log(chalk.blue(`  API Access: ${tier.apiAccess}`));
      console.log(chalk.blue(`  Advertising: ${tier.advertising ? 'Available' : 'Not Available'}`));
      console.log(chalk.blue(`  Bulk Operations: ${tier.bulkOperations ? 'Yes' : 'No'}`));
      console.log(chalk.blue(`  Advanced Tools: ${tier.advancedTools ? 'Yes' : 'No'}`));
      console.log(chalk.blue(`  Features:`));
      tier.features.forEach(f => {
        console.log(chalk.blue(`    • ${f}`));
      });
      
      if (tier.tier === 'Individual') {
        console.log(chalk.yellow('\n  💡 Upgrade to Professional ($39.99/mo) for:'));
        console.log(chalk.yellow('     - Full API access'));
        console.log(chalk.yellow('     - Advertising campaigns'));
        console.log(chalk.yellow('     - Bulk operations'));
        console.log(chalk.yellow('     - Advanced analytics'));
      }
      
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
        const tier = await client.detectAccountTier();
        console.log(chalk.green('✓ Authentication successful'));
        console.log(chalk.blue(`  Account Plan: ${tier.tier}`));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
        console.log('Available actions: verify');
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Product command
program
  .command('product <action>')
  .option('--sku <sku>', 'Product SKU')
  .option('--title <text>', 'Product title')
  .option('--price <number>', 'Product price')
  .option('--quantity <number>', 'Product quantity')
  .option('--brand <text>', 'Product brand')
  .option('--limit <number>', 'Result limit', '20')
  .description('Manage product listings')
  .action(async (action, options) => {
    try {
      if (action === 'create') {
        if (!options.sku || !options.title || !options.price || !options.quantity) {
          console.error(chalk.red('--sku, --title, --price, and --quantity required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Creating product listing...\n'));
        const product = await client.createProduct({
          sku: options.sku,
          title: options.title,
          price: parseFloat(options.price),
          quantity: parseInt(options.quantity),
          brand: options.brand
        });
        console.log(chalk.green('✓ Product created'));
        console.log(chalk.blue(`  SKU: ${product.sku}`));
        console.log(chalk.blue(`  Title: ${product.title}`));
        console.log(chalk.blue(`  Price: $${product.price}`));
        console.log(chalk.blue(`  Quantity: ${product.quantity}`));
        console.log('');
      } else if (action === 'list') {
        console.log(chalk.yellow('\n→ Fetching products...\n'));
        const products = await client.listProducts({ limit: parseInt(options.limit) });
        console.log(chalk.green(`✓ Found ${products.length} products\n`));
        products.forEach(p => {
          console.log(chalk.blue(`  [${p.sku}] ${p.title || 'N/A'}`));
          console.log(chalk.gray(`    ASIN: ${p.asin || 'N/A'} | Status: ${p.status}`));
        });
        console.log('');
      } else if (action === 'get') {
        if (!options.sku) {
          console.error(chalk.red('--sku required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Getting product...\n'));
        const product = await client.getProduct(options.sku);
        console.log(chalk.green('✓ Product Details'));
        console.log(chalk.blue(`  SKU: ${product.sku}`));
        console.log(chalk.blue(`  ASIN: ${product.asin}`));
        console.log(chalk.blue(`  Title: ${product.title}`));
        console.log(chalk.blue(`  Status: ${product.status}`));
        console.log('');
      } else if (action === 'update') {
        if (!options.sku) {
          console.error(chalk.red('--sku required'));
          process.exit(1);
        }
        const updates: any = {};
        if (options.price) updates.price = parseFloat(options.price);
        if (options.quantity) updates.quantity = parseInt(options.quantity);
        
        console.log(chalk.yellow('\n→ Updating product...\n'));
        await client.updateProduct(options.sku, updates);
        console.log(chalk.green('✓ Product updated'));
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
  .option('--tracking-number <number>', 'Tracking number')
  .option('--carrier-code <code>', 'Carrier code (UPS, USPS, FedEx)')
  .option('--status <status>', 'Order status filter')
  .option('--limit <number>', 'Result limit', '20')
  .description('Manage orders')
  .action(async (action, options) => {
    try {
      if (action === 'list') {
        console.log(chalk.yellow('\n→ Fetching orders...\n'));
        const orders = await client.listOrders({
          limit: parseInt(options.limit),
          status: options.status
        });
        console.log(chalk.green(`✓ Found ${orders.length} orders\n`));
        orders.forEach(o => {
          console.log(chalk.blue(`  [${o.orderId}] ${o.buyerName || 'N/A'} - $${o.orderTotal}`));
          console.log(chalk.gray(`    Status: ${o.orderStatus} | Channel: ${o.fulfillmentChannel}`));
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
        console.log(chalk.blue(`  Order ID: ${order.orderId}`));
        console.log(chalk.blue(`  Status: ${order.orderStatus}`));
        console.log(chalk.blue(`  Total: $${order.orderTotal}`));
        console.log(chalk.blue(`  Items: ${order.items.length}`));
        console.log(chalk.blue(`  Fulfillment: ${order.fulfillmentChannel}`));
        console.log('');
      } else if (action === 'ship') {
        if (!options.orderId || !options.trackingNumber || !options.carrierCode) {
          console.error(chalk.red('--order-id, --tracking-number, and --carrier-code required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Confirming shipment...\n'));
        await client.confirmShipment(options.orderId, {
          trackingNumber: options.trackingNumber,
          carrierCode: options.carrierCode
        });
        console.log(chalk.green('✓ Shipment confirmed'));
        console.log(chalk.blue(`  Order: ${options.orderId}`));
        console.log(chalk.blue(`  Tracking: ${options.trackingNumber}`));
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Inventory command
program
  .command('inventory <action>')
  .option('--sku <sku>', 'Product SKU')
  .option('--quantity <number>', 'Quantity')
  .option('--limit <number>', 'Result limit', '50')
  .description('Manage inventory')
  .action(async (action, options) => {
    try {
      if (action === 'levels') {
        if (!options.sku) {
          console.error(chalk.red('--sku required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Getting inventory levels...\n'));
        const inventory = await client.getInventoryLevels(options.sku);
        console.log(chalk.green('✓ Inventory Levels'));
        console.log(chalk.blue(`  SKU: ${inventory.sku}`));
        console.log(chalk.blue(`  ASIN: ${inventory.asin}`));
        console.log(chalk.blue(`  Total Quantity: ${inventory.quantity}`));
        console.log(chalk.blue(`  Available: ${inventory.availableQuantity}`));
        console.log(chalk.blue(`  Inbound: ${inventory.inboundQuantity}`));
        console.log('');
      } else if (action === 'update') {
        if (!options.sku || !options.quantity) {
          console.error(chalk.red('--sku and --quantity required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Updating inventory...\n'));
        await client.updateInventory(options.sku, parseInt(options.quantity));
        console.log(chalk.green('✓ Inventory updated'));
        console.log(chalk.blue(`  SKU: ${options.sku}`));
        console.log(chalk.blue(`  New Quantity: ${options.quantity}`));
        console.log('');
      } else if (action === 'fba') {
        console.log(chalk.yellow('\n→ Fetching FBA inventory...\n'));
        const inventory = await client.listFBAInventory(parseInt(options.limit));
        console.log(chalk.green(`✓ Found ${inventory.length} FBA items\n`));
        inventory.forEach(i => {
          console.log(chalk.blue(`  [${i.sku}] ${i.asin}`));
          console.log(chalk.gray(`    Total: ${i.quantity} | Available: ${i.availableQuantity} | Inbound: ${i.inboundQuantity}`));
        });
        console.log('');
      } else {
        console.error(chalk.red(`Unknown action: ${action}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Advertising command (Professional only)
program
  .command('advertising <action>')
  .option('--campaign-id <id>', 'Campaign ID')
  .option('--limit <number>', 'Result limit', '20')
  .description('Manage advertising campaigns (Professional plan only)')
  .action(async (action, options) => {
    try {
      // Check tier first
      const tier = await client.detectAccountTier();
      if (!tier.advertising) {
        console.log(chalk.yellow('\n⚠ Advertising requires Professional plan ($39.99/month)'));
        console.log(chalk.yellow('  Upgrade at: https://sellercentral.amazon.com/\n'));
        return;
      }

      if (action === 'campaigns') {
        console.log(chalk.yellow('\n→ Fetching campaigns...\n'));
        const campaigns = await client.listCampaigns(parseInt(options.limit));
        console.log(chalk.green(`✓ Found ${campaigns.length} campaigns\n`));
        console.log(chalk.yellow('  Note: Full advertising API integration coming soon'));
        console.log('');
      } else if (action === 'metrics') {
        if (!options.campaignId) {
          console.error(chalk.red('--campaign-id required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Getting campaign metrics...\n'));
        const metrics = await client.getCampaignMetrics(options.campaignId);
        console.log(chalk.green('✓ Campaign Metrics'));
        console.log(chalk.blue(`  Impressions: ${metrics.impressions}`));
        console.log(chalk.blue(`  Clicks: ${metrics.clicks}`));
        console.log(chalk.blue(`  Spend: $${metrics.spend}`));
        console.log(chalk.blue(`  Sales: $${metrics.sales}`));
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
  .option('--order-id <id>', 'Order ID')
  .option('--limit <number>', 'Result limit', '50')
  .description('Manage customer reviews')
  .action(async (action, options) => {
    try {
      if (action === 'list') {
        console.log(chalk.yellow('\n→ Fetching reviews...\n'));
        const reviews = await client.listReviews({ limit: parseInt(options.limit) });
        console.log(chalk.green(`✓ Found ${reviews.length} reviews`));
        console.log(chalk.yellow('  Note: Full review API integration coming soon'));
        console.log('');
      } else if (action === 'request') {
        if (!options.orderId) {
          console.error(chalk.red('--order-id required'));
          process.exit(1);
        }
        console.log(chalk.yellow('\n→ Requesting review...\n'));
        await client.requestReview(options.orderId);
        console.log(chalk.green('✓ Review request sent'));
        console.log(chalk.blue(`  Order: ${options.orderId}`));
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
      'AMAZON_CLIENT_ID': process.env.AMAZON_CLIENT_ID,
      'AMAZON_CLIENT_SECRET': process.env.AMAZON_CLIENT_SECRET,
      'AMAZON_REFRESH_TOKEN': process.env.AMAZON_REFRESH_TOKEN,
      'AMAZON_ACCESS_KEY_ID': process.env.AMAZON_ACCESS_KEY_ID,
      'AMAZON_SECRET_ACCESS_KEY': process.env.AMAZON_SECRET_ACCESS_KEY,
      'AMAZON_SELLER_ID': process.env.AMAZON_SELLER_ID,
      'AMAZON_MARKETPLACE_ID': process.env.AMAZON_MARKETPLACE_ID
    };

    console.log(chalk.green('Environment Variables:'));
    Object.entries(checks).forEach(([key, value]) => {
      const status = value ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${key}: ${value ? 'Set' : 'Missing'}`);
    });

    console.log(chalk.green('\nSystem Information:'));
    console.log(`  Node.js: ${process.version}`);
    console.log(`  Platform: ${process.platform}`);

    console.log('');
  });

program.parse(process.argv);
