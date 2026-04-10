# WooCommerce Skill Summary

WooCommerce integration for AI-ley providing comprehensive e-commerce management.

## Project Information

- **Version**: 1.0.0
- **Status**: Production Ready
- **Type**: E-Commerce Integration
- **Language**: TypeScript 5.3.3
- **License**: MIT

## Overview

The WooCommerce skill provides seamless integration with self-hosted WooCommerce stores and WooCommerce.com hosted platforms. Manage products, orders, customers, payments, shipping, and store analytics through a unified TypeScript API.

## Key Capabilities

### Product Management
- Create, read, update, delete products
- Product variations and pricing management
- Stock inventory control
- Bulk product operations
- Category and tag management

### Order Processing
- List and retrieve orders
- Update order status and fulfillment
- View line items and totals
- Order filtering and search
- Order history and tracking

### Customer Management
- Customer profile management
- Purchase history tracking
- Address book management
- Customer segmentation
- Custom field support

### Payment Management
- Payment method tracking
- Refund processing
- Transaction history
- Multiple payment gateway support

### Shipping Management
- Shipping zone configuration
- Multiple shipping methods
- Rate calculations
- Carrier integration support
- Tracking information

### Analytics & Reporting
- Sales reports by period
- Product performance metrics
- Customer analytics
- Revenue tracking
- Inventory reports

## Technology Stack

- **Language**: TypeScript 5.3.3
- **Framework**: Node.js 18+
- **HTTP Client**: axios ^1.6.0
- **CLI**: commander.js ^11.0.0
- **Terminal Styling**: chalk ^5.3.0
- **Environment**: dotenv ^16.3.1
- **Build**: TypeScript Compiler (tsc)

## Account Tiers

### Self-Hosted WooCommerce

**Starter**
- Cost: Free (hosting costs apply)
- Products: Unlimited
- Transactions: Unlimited
- Storage: Unlimited
- API Rate: 120 calls/minute
- Features: Basic product/order management, simple reports

**Professional**
- Cost: $300-1000/year
- Products: Unlimited
- Transactions: Unlimited
- Storage: Unlimited
- API Rate: 300 calls/minute
- Features: Advanced products, subscriptions, marketing, advanced reports

**Business**
- Cost: $1000+/year
- Products: Unlimited
- Transactions: Unlimited
- Storage: Unlimited
- API Rate: Unlimited
- Features: Custom integrations, priority support, enterprise tools

### WooCommerce.com

**Free**
- Cost: $0
- Products: 100
- Storage: 5 GB
- API Rate: 20 calls/minute
- Features: Basic store setup, simple orders

**Starter**
- Cost: $25/month
- Products: 5000
- Storage: 50 GB
- API Rate: 60 calls/minute
- Features: Full product management, automated emails, basic reports

**Business**
- Cost: $99/month
- Products: Unlimited
- Storage: 500 GB
- API Rate: 240 calls/minute
- Features: Advanced products, subscriptions, marketing tools, advanced reports

**Commerce**
- Cost: $399/month
- Products: Unlimited
- Storage: Unlimited
- API Rate: 600 calls/minute
- Features: All Business features, priority support, custom plugins, enterprise integrations

## File Structure

```
ailey-shop-woocommerce/
├── package.json              # npm configuration and scripts
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── SKILL.md                 # Comprehensive documentation
├── README.md                # Quick start guide
├── QUICK_REFERENCE.md       # Command reference
├── SUMMARY.md               # This file
├── src/
│   ├── index.ts             # WooCommerceClient class (600+ lines)
│   └── cli.ts               # CLI commands (450+ lines)
├── dist/                    # Compiled JavaScript (generated)
└── install.cjs               # Installation script
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- WooCommerce store (self-hosted or WooCommerce.com)
- API credentials

### Installation

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Verify setup
npm run detect
```

### Core Methods

**Account Tier Detection**
```typescript
const tier = await client.detectAccountTier();
// Returns: AccountTier with tier name, features, and capabilities
```

**Product Operations**
```typescript
await client.createProduct(options);      // Create product
await client.listProducts(filters);       // List products
await client.getProduct(id);              // Get product details
await client.updateProduct(id, updates);  // Update product
await client.deleteProduct(id);           // Delete product
```

**Order Operations**
```typescript
await client.listOrders(filters);         // List orders
await client.getOrder(id);                // Get order details
await client.updateOrderStatus(id, status); // Update status
```

**Customer Operations**
```typescript
await client.listCustomers(filters);      // List customers
await client.getCustomer(id);             // Get customer details
await client.createCustomer(data);        // Create customer
```

**Payment Operations**
```typescript
await client.processRefund(orderId, amount, reason); // Refund order
```

**Shipping Operations**
```typescript
await client.getShippingZones();          // List zones
await client.getShippingMethods(zoneId);  // List methods for zone
```

**Analytics**
```typescript
await client.getSalesReport(startDate, endDate); // Sales report
```

## CLI Commands

### Authentication
- `npm run auth verify` - Verify API credentials
- `npm run auth info` - Get store information

### Detection
- `npm run detect` - Detect account tier and features

### Products
- `npm run product create --name "..." --price 99.99 --sku "..."`
- `npm run product list --limit 20 --status publish`
- `npm run product get --id 123`
- `npm run product update --id 123 --name "..." --price 149.99`
- `npm run product delete --id 123`

### Orders
- `npm run order list --limit 20 --status processing`
- `npm run order get --id 456`
- `npm run order update-status --id 456 --status completed`

### Customers
- `npm run customer list --limit 20`
- `npm run customer get --id 789`
- `npm run customer create --email "..." --first-name "..." --last-name "..."`

### Payments
- `npm run payment refund --order-id 456 --amount 50.00 --reason "..."`

### Shipping
- `npm run shipping list-zones`
- `npm run shipping list-methods --zone-id 1`

### Reports
- `npm run report sales --start-date 2025-01-01 --end-date 2025-12-31`

### Utilities
- `npm run diagnose` - Run system diagnostics
- `npm run setup` - Interactive setup wizard

## Common Workflows

### Launch Product
1. Create product with pricing and inventory
2. Add to categories and tags
3. Upload product images
4. Set shipping dimensions and weight
5. Verify inventory levels in dashboard

### Process Order Fulfillment
1. List pending orders by status
2. Review order contents and customer details
3. Update order status to indicate progress
4. Add tracking information
5. Generate fulfillment reports

### Analyze Customer Metrics
1. List high-value customers
2. Review purchase history and frequency
3. Identify repeat customers
4. Segment by purchase behavior
5. Generate retention reports

### Inventory Management
1. Check low-stock products
2. Adjust stock quantities
3. Set reorder points
4. Track stock history
5. Generate inventory reports

### Payment Processing
1. Review failed payment orders
2. Retry payment collection
3. Process refunds when needed
4. Track refund status
5. Generate payment reports

## Integration with AI-ley

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

## TypeScript Integration

```typescript
import { WooCommerceClient, CreateProductOptions } from './src/index';

const client = new WooCommerceClient({
  storeUrl: process.env.WOOCOMMERCE_STORE_URL,
  apiKey: process.env.WOOCOMMERCE_API_KEY,
  apiSecret: process.env.WOOCOMMERCE_API_SECRET,
  storeType: 'self-hosted'
});

// Example: Launch new product
async function launchProduct() {
  const product = await client.createProduct({
    name: 'Premium Widget',
    price: 199.99,
    sku: 'PW-001',
    description: 'High-quality premium widget',
    stock: 100,
    categories: [15, 20] // Category IDs
  });
  
  return product;
}

// Example: Process orders
async function processOrders() {
  const orders = await client.listOrders({
    limit: 50,
    status: 'processing'
  });
  
  for (const order of orders) {
    await client.updateOrderStatus(order.id, 'completed');
  }
}
```

## Security & Performance

- **Rate Limiting**: Respect API rate limits based on tier (20-600 calls/min)
- **Authentication**: Use secure API keys with minimal necessary permissions
- **Caching**: Implement request caching to reduce API calls
- **Batch Operations**: Use bulk operations for large updates
- **Error Handling**: Implement retry logic with exponential backoff
- **Logging**: Enable verbose logging for debugging (set WOOCOMMERCE_VERBOSE_LOG)

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| Authentication error | Verify API credentials in REST API settings |
| Connection timeout | Check store URL is accessible and network connectivity |
| Rate limit exceeded | Wait before retrying or upgrade to higher tier |
| Products not syncing | Ensure API key has read/write permissions |
| Refund processing failed | Verify refund amount doesn't exceed order total |
| Shipping zones not appearing | Configure zones in store Settings → Shipping |
| Stock not updating | Verify API enables inventory management |

## Resources

- **Official Docs**: https://woocommerce.com/document/
- **REST API**: https://woocommerce.github.io/woocommerce-rest-api-docs/
- **Developer Portal**: https://developer.woocommerce.com/
- **Support**: https://woocommerce.com/my-account/support/
- **Community**: https://wordpress.org/support/plugin/woocommerce/

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
