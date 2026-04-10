---
id: ailey-shop-woocommerce
name: WooCommerce Integration
description: Comprehensive WooCommerce integration for e-commerce store management, product catalog, order processing, customer management, payments, shipping, and analytics. Includes automatic account tier detection (Self-Hosted, WooCommerce.com), setup instructions, and AI-ley configuration guidance.
keywords: [woocommerce, ecommerce, shop, products, orders, customers, payments, shipping, inventory, analytics]
tools: [axios, commander, chalk, dotenv]
version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
---

# WooCommerce Skill for AI-ley

Comprehensive WooCommerce integration for managing e-commerce operations including products, orders, customers, inventory, payments, shipping, and store analytics.

## Overview

The WooCommerce skill provides seamless integration with both self-hosted WooCommerce stores and WooCommerce.com hosted platforms. Manage your entire e-commerce operation through a unified API with automatic account tier detection and feature availability mapping.

### Key Features

- **Self-Hosted & Hosted Support**: Works with self-hosted WooCommerce via REST API and WooCommerce.com
- **Product Management**: Create, read, update, delete products with variants, pricing, and inventory
- **Order Processing**: View orders, update status, manage fulfillment and returns
- **Customer Management**: Manage customer profiles, addresses, and purchase history
- **Payment Processing**: Track payments, refunds, and transaction history
- **Shipping Management**: Manage shipping zones, methods, rates, and carrier integration
- **Inventory Control**: Real-time stock management and low stock alerts
- **Store Analytics**: Sales reports, customer analytics, and performance metrics
- **Automatic Tier Detection**: Identifies account tier with capabilities mapping
- **REST API & OAuth**: Secure authentication with API keys or OAuth2
- **Batch Operations**: Bulk product imports, order exports, and mass updates

## Account Tiers

### Self-Hosted WooCommerce

**Starter Tier**
- Cost: Free (software cost only)
- Storage: Unlimited
- Transactions: Unlimited
- Products: Unlimited
- API Calls: 120 per minute
- Features: Basic product management, standard orders, simple reporting
- Suitable for: Personal stores, small businesses, testing

**Professional Tier**
- Cost: $300-1000/year (hosting + plugins)
- Storage: Unlimited
- Transactions: Unlimited
- Products: Unlimited
- API Calls: 300 per minute
- Features: Advanced products (variations, bundles), subscriptions, marketing automation, advanced reports
- Suitable for: Growing businesses, online stores

**Business Tier**
- Cost: $1000-5000+/year (premium hosting + enterprise plugins)
- Storage: Unlimited
- Transactions: Unlimited
- Products: Unlimited
- API Calls: Unlimited
- Features: Custom plugins, advanced integrations, priority support, advanced analytics, marketplace integration
- Suitable for: Enterprise stores, complex operations

### WooCommerce.com

**Free Tier**
- Cost: Free
- Storage: 5 GB
- Products: Up to 100
- API Calls: Limited
- Features: Basic store, standard products, manual orders
- Suitable for: Testing, small hobby shops

**Starter Tier**
- Cost: $25/month
- Storage: 50 GB
- Products: Up to 5,000
- API Calls: 600 per hour
- Features: Full product management, automated email, basic reports
- Suitable for: Small businesses

**Business Tier**
- Cost: $99/month
- Storage: 500 GB
- Products: Unlimited
- API Calls: 2,400 per hour
- Features: Advanced products, subscriptions, marketing tools, advanced reports
- Suitable for: Growing online stores

**Commerce Tier**
- Cost: $399/month
- Storage: Unlimited
- Products: Unlimited
- API Calls: Unlimited
- Features: Priority support, custom plugins, advanced integrations, exclusive tools
- Suitable for: Enterprise e-commerce

## Feature Availability Matrix

| Feature | Starter | Professional | Business | WC Free | WC Starter | WC Business | WC Commerce |
|---------|---------|--------------|----------|---------|-----------|-------------|-------------|
| Products CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Product Variations | ✅ | ✅ | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ |
| Orders Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Customer Profiles | ✅ | ✅ | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ |
| Payment Processing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shipping Management | ✅ | ✅ | ✅ | ⚠️ Basic | ✅ | ✅ | ✅ |
| Inventory Control | ✅ | ✅ | ✅ | ⚠️ Basic | ✅ | ✅ | ✅ |
| Analytics & Reports | ⚠️ Basic | ✅ | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ |
| Bulk Operations | ⚠️ Limited | ✅ | ✅ | ❌ | ⚠️ Limited | ✅ | ✅ |
| Custom Integrations | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ Limited | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

## Getting Started

### Step 1: Create WooCommerce Store

**Self-Hosted Option:**
- Download WooCommerce plugin from https://woocommerce.com/
- Install on self-hosted WordPress: https://wordpress.org/hosting/
- Configure basic store settings
- Enable REST API in WooCommerce Settings

**WooCommerce.com Option:**
- Create account at https://woocommerce.com/
- Select hosting plan
- Complete store setup wizard
- Verify domain and email

### Step 2: Get API Credentials

**Self-Hosted (REST API Keys):**
1. Go to store dashboard → Settings → Advanced → REST API
2. Click "Create an API key"
3. Enter application name (e.g., "AI-ley Integration")
4. Select read/write permissions
5. Copy Consumer Key and Consumer Secret

**WooCommerce.com:**
1. Go to https://woocommerce.com/my-account/
2. Click "Manage Extensions"
3. Find your store
4. Click "API Credentials"
5. Generate new API key

### Step 3: Configure Environment

Create `.env` file in WooCommerce skill directory:

```bash
# For Self-Hosted
WOOCOMMERCE_STORE_URL=https://your-store.com
WOOCOMMERCE_API_KEY=ck_live_xxxxxxxxxxxxx
WOOCOMMERCE_API_SECRET=cs_live_xxxxxxxxxxxxx
WOOCOMMERCE_STORE_TYPE=self-hosted

# For WooCommerce.com
WOOCOMMERCE_COM_EMAIL=your-email@example.com
WOOCOMMERCE_COM_PASSWORD=your-password
WOOCOMMERCE_STORE_TYPE=woocommerce-com
```

### Step 4: Configure AI-ley

Add to `.github/aicc/aicc.yaml`:

```yaml
skills:
  woocommerce:
    type: shop
    path: .github/skills/ailey-shop-woocommerce
    enabled: true
    config:
      storeUrl: ${WOOCOMMERCE_STORE_URL}
      apiKey: ${WOOCOMMERCE_API_KEY}
      apiSecret: ${WOOCOMMERCE_API_SECRET}
      storeType: self-hosted
      timeout: 30000
    features:
      products: true
      orders: true
      customers: true
      payments: true
      shipping: true
      reports: true
```

## Common Usage Examples

### Create Product
```bash
npm run product -- create --name "Widget Pro" --price 99.99 --sku "WIDGET-001" --description "Premium widget"
```

### List Orders
```bash
npm run order -- list --limit 50 --status processing
```

### Update Customer
```bash
npm run customer -- update --id 123 --first-name "John" --last-name "Doe" --email john@example.com
```

### Generate Sales Report
```bash
npm run report -- sales --start-date 2025-01-01 --end-date 2025-12-31 --format json
```

### Process Refund
```bash
npm run payment -- refund --order-id 456 --amount 50.00 --reason "Customer Request"
```

## API Reference

### Product Operations

#### createProduct(options)
Create new product with variants and pricing

**Parameters:**
- `name` (string, required): Product name
- `price` (number, required): Product price
- `sku` (string, required): Stock keeping unit
- `description` (string): Product description
- `categories` (string[]): Product categories
- `variations` (array): Product variations with SKU and price
- `stock` (number): Available stock quantity

**Returns:** Product object with ID and details

#### listProducts(filters)
List products with filtering and pagination

**Parameters:**
- `limit` (number): Max results (default: 10)
- `offset` (number): Pagination offset
- `category` (string): Filter by category
- `status` (string): draft, pending, private, publish
- `orderby` (string): id, name, date, modified, price

**Returns:** Array of product objects

#### updateProduct(id, updates)
Update product information

**Parameters:**
- `id` (string, required): Product ID
- `updates` (object): Fields to update (name, price, description, etc.)

**Returns:** Updated product object

#### deleteProduct(id)
Delete product

**Parameters:**
- `id` (string, required): Product ID

**Returns:** Success confirmation

### Order Operations

#### listOrders(filters)
List store orders with filtering

**Parameters:**
- `limit` (number): Max results (default: 10)
- `status` (string): pending, processing, on-hold, completed, cancelled, refunded
- `customer` (string): Filter by customer ID
- `orderby` (string): id, date, total, status

**Returns:** Array of order objects

#### getOrder(id)
Get order details

**Parameters:**
- `id` (string, required): Order ID

**Returns:** Complete order object with items, totals, status

#### updateOrderStatus(id, status)
Update order fulfillment status

**Parameters:**
- `id` (string, required): Order ID
- `status` (string, required): New status

**Returns:** Updated order object

#### getOrderItems(orderId)
List items in order

**Parameters:**
- `orderId` (string, required): Order ID

**Returns:** Array of line items

### Customer Operations

#### listCustomers(filters)
List store customers

**Parameters:**
- `limit` (number): Max results
- `search` (string): Search by name/email
- `orderby` (string): id, name, date

**Returns:** Array of customer objects

#### getCustomer(id)
Get customer profile

**Parameters:**
- `id` (string, required): Customer ID

**Returns:** Customer object with profile, addresses, orders

#### createCustomer(data)
Create new customer

**Parameters:**
- `email` (string, required): Customer email
- `firstName` (string): First name
- `lastName` (string): Last name
- `phone` (string): Phone number
- `billingAddress` (object): Billing address

**Returns:** New customer object with ID

### Payment Operations

#### listPayments(filters)
List transactions

**Parameters:**
- `limit` (number): Max results
- `status` (string): completed, pending, failed, cancelled

**Returns:** Array of payment objects

#### processRefund(orderId, amount, reason)
Issue refund for order

**Parameters:**
- `orderId` (string, required): Order ID
- `amount` (number, required): Refund amount
- `reason` (string): Refund reason

**Returns:** Refund confirmation

### Shipping Operations

#### listShippingZones()
List configured shipping zones

**Returns:** Array of zone objects with methods and rates

#### getShippingMethods(zoneId)
Get shipping methods for zone

**Parameters:**
- `zoneId` (string, required): Zone ID

**Returns:** Array of shipping method objects

#### updateShippingRate(zoneId, methodId, rate)
Update shipping rate

**Parameters:**
- `zoneId` (string, required): Zone ID
- `methodId` (string, required): Method ID
- `rate` (number, required): New rate

**Returns:** Updated rate object

### Analytics Operations

#### getSalesReport(startDate, endDate)
Generate sales report

**Parameters:**
- `startDate` (string): ISO date format
- `endDate` (string): ISO date format

**Returns:** Report with totals, by-category breakdown, by-day breakdown

#### getTopProducts(limit)
Get best-selling products

**Parameters:**
- `limit` (number): Top N products

**Returns:** Array of products sorted by sales

#### getCustomerAnalytics(customerId)
Get customer purchase history and analytics

**Parameters:**
- `customerId` (string, required): Customer ID

**Returns:** Customer analytics with order history and preferences

## Common Workflows

### Workflow 1: Launch New Product
```bash
# Create the product
npm run product -- create \
  --name "New Widget" \
  --price 49.99 \
  --sku "NW-001" \
  --description "Innovative new widget"

# Add to category
npm run product -- update --id <ID> --categories "Widgets,Featured"

# Check inventory
npm run product -- get --id <ID>

# View in dashboard
echo "Product created and ready for sale"
```

### Workflow 2: Process Order Fulfillment
```bash
# List pending orders
npm run order -- list --status processing

# Update status to shipped
npm run order -- update-status --id <ORDER_ID> --status completed

# Get shipping info
npm run shipping -- list-zones

# Generate fulfillment report
npm run report -- orders --status completed --start-date today
```

### Workflow 3: Bulk Import Products
```bash
# Create CSV with product data: name,price,sku,description

# Import via REST API
npm run product -- import --file products.csv --format csv

# Verify import
npm run product -- list --limit 100

# Check for errors
npm run diagnose
```

### Workflow 4: Customer Retention Analysis
```bash
# Get high-value customers
npm run customer -- list --limit 100

# Analyze individual customer
npm run report -- customer-analytics --id <CUSTOMER_ID>

# Generate retention report
npm run report -- retention --start-date 2025-01-01 --end-date 2025-12-31
```

### Workflow 5: Inventory Management
```bash
# Check low stock items
npm run product -- list --low-stock-only

# Update stock
npm run product -- update --id <ID> --stock 100

# Generate inventory report
npm run report -- inventory --format json > inventory.json
```

## TypeScript Integration

```typescript
import { WooCommerceClient } from './src/index';

const client = new WooCommerceClient({
  storeUrl: process.env.WOOCOMMERCE_STORE_URL,
  apiKey: process.env.WOOCOMMERCE_API_KEY,
  apiSecret: process.env.WOOCOMMERCE_API_SECRET,
  storeType: 'self-hosted'
});

// Detect account tier
const tier = await client.detectAccountTier();
console.log(`Account Tier: ${tier.tier}, Features: ${tier.features.join(', ')}`);

// Create product
const product = await client.createProduct({
  name: 'Premium Gadget',
  price: 199.99,
  sku: 'PGADGET-001',
  description: 'High-quality gadget'
});

// List orders
const orders = await client.listOrders({ limit: 20, status: 'processing' });

// Update order status
await client.updateOrderStatus(orders[0].id, 'completed');

// Generate report
const report = await client.getSalesReport('2025-01-01', '2025-12-31');
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Authentication failed | Invalid API credentials | Verify API key and secret in REST API settings |
| Connection timeout | Store not responding | Check store URL and network connectivity |
| Rate limit exceeded | Too many API calls | Implement request queuing or upgrade tier |
| Products not syncing | API permissions | Ensure API key has read/write permissions |
| Refund failed | Insufficient order amount | Verify refund doesn't exceed order total |
| Shipping zones empty | Not configured | Add shipping zones in store settings |
| Stock not updating | API disabled for inventory | Enable REST API for inventory management |

## Resources

- **Official Documentation**: https://woocommerce.com/document/
- **REST API Reference**: https://woocommerce.github.io/woocommerce-rest-api-docs/
- **Developer Portal**: https://developer.woocommerce.com/
- **Support**: https://woocommerce.com/my-account/support/
- **Community Forum**: https://wordpress.org/support/plugin/woocommerce/

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
