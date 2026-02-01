#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import * as chalk from 'chalk';
import { WooCommerceClient } from './index';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

const program = new Command();
program.version('1.0.0').description('WooCommerce integration CLI');

/**
 * Get configured WooCommerce client
 */
function getClient(): WooCommerceClient {
  const storeType = (process.env.WOOCOMMERCE_STORE_TYPE || 'self-hosted') as
    | 'self-hosted'
    | 'woocommerce-com';

  if (storeType === 'self-hosted') {
    return new WooCommerceClient({
      storeUrl: process.env.WOOCOMMERCE_STORE_URL,
      apiKey: process.env.WOOCOMMERCE_API_KEY,
      apiSecret: process.env.WOOCOMMERCE_API_SECRET,
      storeType: 'self-hosted',
    });
  } else {
    return new WooCommerceClient({
      email: process.env.WOOCOMMERCE_COM_EMAIL,
      password: process.env.WOOCOMMERCE_COM_PASSWORD,
      storeType: 'woocommerce-com',
    });
  }
}

/**
 * Setup command - Interactive configuration
 */
program
  .command('setup')
  .description('Setup WooCommerce integration')
  .action(async () => {
    console.log(chalk.blue('🔧 WooCommerce Integration Setup\n'));

    const setupInstructions = `
${chalk.bold('Choose your store type:')}

${chalk.green('Self-Hosted WordPress with WooCommerce')}
1. Install WooCommerce plugin on self-hosted WordPress
2. Go to WooCommerce Settings → Advanced → REST API
3. Click "Create an API key"
4. Set permissions to "Read/Write"
5. Copy Consumer Key and Consumer Secret

${chalk.green('WooCommerce.com Hosted')}
1. Create account at https://woocommerce.com/
2. Go to https://woocommerce.com/my-account/
3. Find your store and click "API Credentials"
4. Generate new API key

${chalk.yellow('Next steps:')}
1. Create .env file with your credentials
2. Run: npm run verify
3. Run: npm run detect (to check account tier)
`;

    console.log(setupInstructions);
    console.log(chalk.gray('For detailed documentation, see SKILL.md'));
  });

/**
 * Detect account tier
 */
program
  .command('detect')
  .description('Detect account tier and capabilities')
  .action(async () => {
    try {
      const client = getClient();
      const tier = await client.detectAccountTier();

      console.log(chalk.blue('\n📊 WooCommerce Account Tier Detection\n'));
      console.log(chalk.bold(`Tier: ${tier.tier}`));
      console.log(chalk.bold(`Type: ${tier.storeType}`));
      console.log(chalk.bold(`Products Limit: ${tier.productLimit}`));
      console.log(chalk.bold(`Storage: ${tier.storage}`));
      console.log(chalk.bold(`API Calls/min: ${tier.apiCallsPerMinute}`));
      console.log(chalk.bold(`Support: ${tier.supportLevel}`));
      console.log(chalk.bold('\nAvailable Features:'));
      tier.features.forEach((f) => console.log(`  ✓ ${f}`));
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Auth commands
 */
const authCmd = program.command('auth').description('Authentication commands');

authCmd
  .command('verify')
  .description('Verify API credentials')
  .action(async () => {
    try {
      const client = getClient();
      const isValid = await client.verifyCredentials();

      if (isValid) {
        console.log(chalk.green('✅ API credentials are valid'));
      } else {
        console.log(chalk.red('❌ API credentials are invalid'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Verification failed: ${error}`));
      process.exit(1);
    }
  });

authCmd
  .command('info')
  .description('Get store information')
  .action(async () => {
    try {
      const client = getClient();
      const info = await client.getStoreInfo();
      console.log(chalk.blue('\n📋 Store Information\n'));
      console.log(JSON.stringify(info, null, 2));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Product commands
 */
const productCmd = program.command('product').description('Product management');

productCmd
  .command('create')
  .description('Create a new product')
  .requiredOption('--name <name>', 'Product name')
  .requiredOption('--price <price>', 'Product price')
  .requiredOption('--sku <sku>', 'Product SKU')
  .option('--description <description>', 'Product description')
  .option('--stock <stock>', 'Stock quantity')
  .action(async (options) => {
    try {
      const client = getClient();
      const product = await client.createProduct({
        name: options.name,
        price: parseFloat(options.price),
        sku: options.sku,
        description: options.description,
        stock: options.stock ? parseInt(options.stock) : 0,
      });

      console.log(chalk.green(`✅ Product created with ID: ${product.id}`));
      console.log(`Name: ${product.name}`);
      console.log(`Price: ${product.price}`);
      console.log(`SKU: ${product.sku}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

productCmd
  .command('list')
  .description('List products')
  .option('--limit <limit>', 'Number of products to list', '10')
  .option('--status <status>', 'Product status', 'publish')
  .action(async (options) => {
    try {
      const client = getClient();
      const products = await client.listProducts({
        limit: parseInt(options.limit),
        status: options.status,
      });

      console.log(chalk.blue(`\n📦 Products (${products.length})\n`));
      products.forEach((p) => {
        console.log(`${p.id} | ${p.name} | ${p.sku} | $${p.price}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

productCmd
  .command('update')
  .description('Update product')
  .requiredOption('--id <id>', 'Product ID')
  .option('--name <name>', 'New product name')
  .option('--price <price>', 'New price')
  .option('--stock <stock>', 'New stock quantity')
  .action(async (options) => {
    try {
      const client = getClient();
      const product = await client.updateProduct(parseInt(options.id), {
        name: options.name,
        price: options.price ? parseFloat(options.price) : undefined,
        stock: options.stock ? parseInt(options.stock) : undefined,
      });

      console.log(chalk.green(`✅ Product ${product.id} updated`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

productCmd
  .command('delete')
  .description('Delete product')
  .requiredOption('--id <id>', 'Product ID')
  .action(async (options) => {
    try {
      const client = getClient();
      await client.deleteProduct(parseInt(options.id));
      console.log(chalk.green(`✅ Product ${options.id} deleted`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

productCmd
  .command('get')
  .description('Get product details')
  .requiredOption('--id <id>', 'Product ID')
  .action(async (options) => {
    try {
      const client = getClient();
      const product = await client.getProduct(parseInt(options.id));
      console.log(chalk.blue('\n📦 Product Details\n'));
      console.log(`ID: ${product.id}`);
      console.log(`Name: ${product.name}`);
      console.log(`Price: $${product.price}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Stock: ${product.stockQuantity}`);
      console.log(`Description: ${product.description}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Order commands
 */
const orderCmd = program.command('order').description('Order management');

orderCmd
  .command('list')
  .description('List orders')
  .option('--limit <limit>', 'Number of orders to list', '10')
  .option('--status <status>', 'Order status', 'any')
  .action(async (options) => {
    try {
      const client = getClient();
      const orders = await client.listOrders({
        limit: parseInt(options.limit),
        status: options.status,
      });

      console.log(chalk.blue(`\n📋 Orders (${orders.length})\n`));
      orders.forEach((o) => {
        console.log(`${o.id} | ${o.status} | $${o.total} | ${o.dateCreated}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

orderCmd
  .command('get')
  .description('Get order details')
  .requiredOption('--id <id>', 'Order ID')
  .action(async (options) => {
    try {
      const client = getClient();
      const order = await client.getOrder(parseInt(options.id));
      console.log(chalk.blue('\n📋 Order Details\n'));
      console.log(`ID: ${order.id}`);
      console.log(`Status: ${order.status}`);
      console.log(`Total: $${order.total}`);
      console.log(`Customer: ${order.customerId}`);
      console.log(`Payment Method: ${order.paymentMethodTitle}`);
      console.log(`Items: ${order.lineItems.length}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

orderCmd
  .command('update-status')
  .description('Update order status')
  .requiredOption('--id <id>', 'Order ID')
  .requiredOption('--status <status>', 'New status')
  .action(async (options) => {
    try {
      const client = getClient();
      const order = await client.updateOrderStatus(parseInt(options.id), options.status);
      console.log(chalk.green(`✅ Order ${order.id} status updated to ${order.status}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Customer commands
 */
const customerCmd = program.command('customer').description('Customer management');

customerCmd
  .command('list')
  .description('List customers')
  .option('--limit <limit>', 'Number of customers to list', '10')
  .action(async (options) => {
    try {
      const client = getClient();
      const customers = await client.listCustomers({ limit: parseInt(options.limit) });

      console.log(chalk.blue(`\n👥 Customers (${customers.length})\n`));
      customers.forEach((c) => {
        console.log(`${c.id} | ${c.name} | ${c.email}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

customerCmd
  .command('get')
  .description('Get customer details')
  .requiredOption('--id <id>', 'Customer ID')
  .action(async (options) => {
    try {
      const client = getClient();
      const customer = await client.getCustomer(parseInt(options.id));
      console.log(chalk.blue('\n👥 Customer Details\n'));
      console.log(`ID: ${customer.id}`);
      console.log(`Name: ${customer.name}`);
      console.log(`Email: ${customer.email}`);
      console.log(`Orders: ${customer.ordersCount}`);
      console.log(`Total Spent: $${customer.totalSpent}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

customerCmd
  .command('create')
  .description('Create customer')
  .requiredOption('--email <email>', 'Customer email')
  .option('--first-name <name>', 'First name')
  .option('--last-name <name>', 'Last name')
  .action(async (options) => {
    try {
      const client = getClient();
      const customer = await client.createCustomer({
        email: options.email,
        firstName: options.firstName,
        lastName: options.lastName,
      });

      console.log(chalk.green(`✅ Customer created with ID: ${customer.id}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Payment commands
 */
const paymentCmd = program.command('payment').description('Payment management');

paymentCmd
  .command('refund')
  .description('Process refund')
  .requiredOption('--order-id <id>', 'Order ID')
  .requiredOption('--amount <amount>', 'Refund amount')
  .option('--reason <reason>', 'Refund reason', 'Customer request')
  .action(async (options) => {
    try {
      const client = getClient();
      const refund = await client.processRefund(
        parseInt(options.orderId),
        parseFloat(options.amount),
        options.reason
      );

      console.log(chalk.green(`✅ Refund of $${options.amount} processed`));
      console.log(`ID: ${refund.id}`);
      console.log(`Reason: ${options.reason}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Shipping commands
 */
const shippingCmd = program.command('shipping').description('Shipping management');

shippingCmd
  .command('list-zones')
  .description('List shipping zones')
  .action(async () => {
    try {
      const client = getClient();
      const zones = await client.getShippingZones();

      console.log(chalk.blue(`\n🚚 Shipping Zones (${zones.length})\n`));
      zones.forEach((z: any) => {
        console.log(`${z.id} | ${z.name}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

shippingCmd
  .command('list-methods')
  .description('List shipping methods for zone')
  .requiredOption('--zone-id <id>', 'Zone ID')
  .action(async (options) => {
    try {
      const client = getClient();
      const methods = await client.getShippingMethods(parseInt(options.zoneId));

      console.log(chalk.blue(`\n🚚 Shipping Methods (${methods.length})\n`));
      methods.forEach((m: any) => {
        console.log(`${m.id} | ${m.title} | ${m.method_title}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Report commands
 */
const reportCmd = program.command('report').description('Reports and analytics');

reportCmd
  .command('sales')
  .description('Generate sales report')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .action(async (options) => {
    try {
      const client = getClient();
      const startDate = options.startDate || '2025-01-01';
      const endDate = options.endDate || new Date().toISOString().split('T')[0];

      const report = await client.getSalesReport(startDate, endDate);

      console.log(chalk.blue('\n💰 Sales Report\n'));
      console.log(`Period: ${report.period.start} to ${report.period.end}`);
      console.log(`Total Orders: ${report.totalOrders}`);
      console.log(`Total Revenue: $${report.totalRevenue.toFixed(2)}`);
      console.log(`Average Order Value: $${report.averageOrderValue.toFixed(2)}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Diagnostic command
 */
program
  .command('diagnose')
  .description('Run diagnostics')
  .action(async () => {
    console.log(chalk.blue('\n🔍 WooCommerce Diagnostics\n'));

    const checks = [
      { name: 'Environment Variables', check: () => !!(process.env.WOOCOMMERCE_STORE_URL ||process.env.WOOCOMMERCE_COM_EMAIL) },
      { name: 'Store Type', check: () => !!process.env.WOOCOMMERCE_STORE_TYPE },
      { name: '.env File', check: () => fs.existsSync(path.join(process.cwd(), '.env')) },
    ];

    for (const check of checks) {
      const status = check.check() ? chalk.green('✅') : chalk.red('❌');
      console.log(`${status} ${check.name}`);
    }

    console.log('\n' + chalk.gray('For detailed setup instructions, run: npm run setup'));
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
