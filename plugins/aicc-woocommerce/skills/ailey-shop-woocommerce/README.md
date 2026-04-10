# WooCommerce Integration Skill

Complete WooCommerce integration for managing e-commerce operations through AI-ley.

## Features

✅ Self-hosted and WooCommerce.com support
✅ Product management (CRUD with variants and pricing)
✅ Order processing and fulfillment
✅ Customer profiles and management
✅ Payment processing and refunds
✅ Shipping zone and rate management
✅ Inventory control and alerts
✅ Sales reports and analytics
✅ Automatic account tier detection
✅ REST API and OAuth2 authentication

## Quick Setup

### 1. Create Store

Choose your hosting option:
- **Self-hosted**: Download WooCommerce from https://woocommerce.com/
- **WooCommerce.com**: Create account at https://woocommerce.com/

### 2. Get API Credentials

**Self-hosted:**
- Dashboard → Settings → Advanced → REST API
- Create API key with read/write permissions
- Copy Consumer Key and Consumer Secret

**WooCommerce.com:**
- Go to https://woocommerce.com/my-account/
- Click "API Credentials" under your store
- Generate new API key

### 3. Configure Environment

Create `.env` file:
```bash
WOOCOMMERCE_STORE_URL=https://your-store.com
WOOCOMMERCE_API_KEY=ck_live_xxxxxxxxxxxxx
WOOCOMMERCE_API_SECRET=cs_live_xxxxxxxxxxxxx
WOOCOMMERCE_STORE_TYPE=self-hosted
```

### 4. Test Connection

```bash
npm run build
npm run verify
npm run detect
```

## Account Tiers

### Self-Hosted
- **Starter**: Free, unlimited products/transactions, 120 API calls/min
- **Professional**: $300-1000/year, advanced features, 300 API calls/min
- **Business**: $1000+/year, enterprise features, unlimited API calls

### WooCommerce.com
- **Free**: $0, 100 products, 5GB storage
- **Starter**: $25/month, 5000 products, 50GB storage
- **Business**: $99/month, unlimited products, 500GB storage
- **Commerce**: $399/month, unlimited everything, 24/7 support

## Common Commands

```bash
# Detect tier and capabilities
npm run detect

# Create product
npm run product -- create --name "Widget" --price 99.99 --sku "W001"

# List products
npm run product -- list --limit 20

# List orders
npm run order -- list --status processing

# Get customer details
npm run customer -- get --id 123

# Process refund
npm run payment -- refund --order-id 456 --amount 50.00

# Generate sales report
npm run report -- sales --start-date 2025-01-01 --end-date 2025-12-31
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

// Detect tier
const tier = await client.detectAccountTier();

// Create product
const product = await client.createProduct({
  name: 'Premium Gadget',
  price: 199.99,
  sku: 'PGADGET-001'
});

// List orders
const orders = await client.listOrders({ limit: 20, status: 'processing' });
```

## Workflows

### Launch Product
1. Create product with pricing and inventory
2. Add to categories
3. Upload product images
4. Verify inventory levels

### Process Orders
1. List pending orders
2. Update shipping address if needed
3. Mark as shipped
4. Generate fulfillment report

### Manage Customers
1. Search or browse customer list
2. View purchase history and preferences
3. Update contact information
4. Segment for targeted campaigns

## API Reference

**Product Operations**
- `createProduct()` - Create new product
- `listProducts()` - List products with filtering
- `getProduct()` - Get product details
- `updateProduct()` - Update product information
- `deleteProduct()` - Delete product

**Order Operations**
- `listOrders()` - List orders with filtering
- `getOrder()` - Get order details
- `updateOrderStatus()` - Update fulfillment status

**Customer Operations**
- `listCustomers()` - List customers
- `getCustomer()` - Get customer profile
- `createCustomer()` - Create new customer

**Payment Operations**
- `processRefund()` - Issue refund

**Shipping Operations**
- `getShippingZones()` - List shipping zones
- `getShippingMethods()` - List methods for zone

**Analytics**
- `getSalesReport()` - Generate sales report

## Resources

- [WooCommerce Documentation](https://woocommerce.com/document/)
- [REST API Reference](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Developer Portal](https://developer.woocommerce.com/)
- [Support](https://woocommerce.com/my-account/support/)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
