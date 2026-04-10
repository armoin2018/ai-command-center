---
id: ailey-shop-amazon
name: Amazon Selling Partner API Integration
description: Comprehensive Amazon SP-API integration for product listing, order management, inventory tracking, advertising, and customer engagement. Supports both personal seller and professional business use cases.
keywords:
  - amazon
  - sp-api
  - ecommerce
  - product
  - order
  - inventory
  - advertising
  - fba
---

# Amazon Selling Partner API Integration Skill

Comprehensive Amazon SP-API integration for product listing, order management, inventory tracking, advertising, and customer engagement. Supports both personal seller and professional business use cases.

## Overview

The Amazon skill provides seamless integration with Amazon's Selling Partner API (SP-API) for managing seller accounts, product catalogs, orders, inventory, advertising campaigns, and customer reviews. Manage FBA and FBM fulfillment, track performance metrics, and automate seller operations.

## Key Features

✅ Product catalog management (create, update, delete, organize)
✅ Order management (FBA & FBM fulfillment, tracking)
✅ Inventory tracking and management (FBA & seller-fulfilled)
✅ Pricing and competitive analysis
✅ Advertising campaigns (Sponsored Products, Brands, Display)
✅ Customer reviews and feedback management
✅ Performance metrics and analytics
✅ Multi-marketplace support (US, CA, MX, UK, EU, JP, AU)
✅ Automatic account tier detection
✅ Support for Individual and Professional seller accounts

## Account Tiers

Amazon provides different seller account types with varying capabilities and fees.

### Individual Seller Plan

- **Cost**: $0.99 per item sold (no monthly fee)
- **Monthly Sales**: Best for <40 items/month
- **Product Categories**: Most categories (some restricted)
- **Fulfillment**: FBA & FBM available
- **API Access**: Limited (read-only for most operations)
- **Advertising**: ❌ Not available
- **Bulk Operations**: ❌ Limited
- **Advanced Tools**: ❌ Not available
- **Reports**: Basic sales reports only
- **Support**: Email support (slower response)

**Use Case**: Personal sellers, hobbyists, occasional sales

### Professional Seller Plan

- **Cost**: $39.99/month (unlimited sales)
- **Monthly Sales**: Best for 40+ items/month
- **Product Categories**: All categories (with approval)
- **Fulfillment**: Full FBA & FBM capabilities
- **API Access**: Full SP-API access (read/write)
- **Advertising**: ✅ Full access (Sponsored Products, Brands, Display)
- **Bulk Operations**: ✅ Available
- **Advanced Tools**: ✅ Inventory management, pricing automation
- **Reports**: Advanced analytics and custom reports
- **Support**: Priority email and phone support

**Use Case**: Active sellers, businesses, high-volume sales

### Vendor Central (Invitation Only)

- **Cost**: No subscription fee (wholesale model)
- **Access**: By Amazon invitation only
- **Relationship**: Wholesale supplier to Amazon
- **Fulfillment**: Amazon manages all fulfillment
- **API Access**: Vendor Central API (separate from SP-API)
- **Pricing**: Amazon sets retail prices
- **Inventory**: Amazon purchases inventory
- **Marketing**: Amazon Vine, A+ Content available

**Use Case**: Manufacturers, distributors, brand owners

## Account Tier Feature Matrix

| Feature | Individual | Professional | Vendor |
|---------|------------|--------------|--------|
| Monthly Fee | $0.99/sale | $39.99/mo | None |
| API Access | ⚠️ Limited | ✅ Full | ✅ Vendor API |
| Product Listings | Unlimited | Unlimited | Managed by Amazon |
| Bulk Upload | ❌ | ✅ | ✅ |
| Advertising | ❌ | ✅ | ✅ |
| Advanced Reports | ❌ | ✅ | ✅ |
| Custom Pricing Rules | ❌ | ✅ | ❌ |
| Multi-Channel | ❌ | ✅ | N/A |
| FBA Inventory | ✅ | ✅ | N/A |
| Gift Wrap/Messages | ❌ | ✅ | ✅ |
| Order Management | Manual | API + Bulk | Amazon Managed |
| Priority Support | ❌ | ✅ | ✅ |

## Getting Started

### Step 1: Create Amazon Seller Account

**Personal/Individual:**
- Sign up at https://sell.amazon.com/
- Choose Individual plan ($0.99 per sale)
- Complete identity verification
- Set up bank account and tax info

**Business/Professional:**
- Sign up at https://sell.amazon.com/
- Choose Professional plan ($39.99/month)
- Provide business information
- Complete identity verification
- Set up bank account and tax info

### Step 2: Register for Developer Access

- Go to https://sellercentral.amazon.com/
- Navigate to **Settings** → **User Permissions**
- Click **Amazon MWS** or **Developer Central**
- Register as a developer (free)
- Create a new developer application
- Note your **Developer ID**

### Step 3: Get API Credentials

**Login with Amazon (LWA) Credentials:**
- Go to Developer Console: https://developer.amazonservices.com/
- Create OAuth application
- Copy **Client ID** and **Client Secret**
- Generate **Refresh Token** using OAuth flow

**AWS Credentials (for signing requests):**
- Go to Seller Central → Settings → User Permissions
- Create IAM role for SP-API access
- Generate **Access Key ID** and **Secret Access Key**

**Seller/Marketplace IDs:**
- Found in Seller Central → Settings → Account Info
- **Seller ID**: Your unique merchant identifier
- **Marketplace ID**: Target marketplace (e.g., ATVPDKIKX0DER for US)

### Step 4: Configure Environment

Create `.env` file with credentials:
```bash
AMAZON_CLIENT_ID=your_lwa_client_id
AMAZON_CLIENT_SECRET=your_lwa_client_secret
AMAZON_REFRESH_TOKEN=your_refresh_token
AMAZON_ACCESS_KEY_ID=your_aws_access_key_id
AMAZON_SECRET_ACCESS_KEY=your_aws_secret_access_key
AMAZON_SELLER_ID=your_seller_id
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
AMAZON_ACCOUNT_TYPE=professional
```

### Step 5: Configure AI-ley

Add to `.github/aicc/aicc.yaml`:
```yaml
skills:
  amazon:
    type: shop
    path: .github/skills/ailey-shop-amazon
    enabled: true
    config:
      clientId: ${AMAZON_CLIENT_ID}
      clientSecret: ${AMAZON_CLIENT_SECRET}
      refreshToken: ${AMAZON_REFRESH_TOKEN}
      accessKeyId: ${AMAZON_ACCESS_KEY_ID}
      secretAccessKey: ${AMAZON_SECRET_ACCESS_KEY}
      sellerId: ${AMAZON_SELLER_ID}
      marketplaceId: ${AMAZON_MARKETPLACE_ID}
      region: us-east-1
      timeout: 30000
    features:
      products: true
      orders: true
      inventory: true
      advertising: true
      reviews: true
```

## Common Usage Examples

### Detect Account Tier

```bash
npm run detect
```

### Manage Products

```bash
# Create product listing
npm run product -- create \
  --sku "MY-PRODUCT-001" \
  --title "Premium Wireless Headphones" \
  --price 79.99 \
  --quantity 100

# Update product
npm run product -- update --sku "MY-PRODUCT-001" --price 74.99

# List products
npm run product -- list --limit 50

# Get product details
npm run product -- get --sku "MY-PRODUCT-001"
```

### Manage Orders

```bash
# List orders
npm run order -- list --limit 20 --status Unshipped

# Get order details
npm run order -- get --order-id 123-4567890-1234567

# Confirm shipment
npm run order -- ship \
  --order-id 123-4567890-1234567 \
  --tracking-number 1Z999AA10123456784 \
  --carrier-code UPS
```

### Manage Inventory

```bash
# Get inventory levels
npm run inventory -- levels --sku "MY-PRODUCT-001"

# Update inventory
npm run inventory -- update --sku "MY-PRODUCT-001" --quantity 150

# List FBA inventory
npm run inventory -- fba --limit 50
```

### Advertising (Professional Only)

```bash
# List campaigns
npm run advertising -- campaigns --limit 20

# Create campaign
npm run advertising -- create-campaign \
  --name "Summer Sale 2026" \
  --budget 500 \
  --type sponsoredProducts

# Get campaign metrics
npm run advertising -- metrics --campaign-id 123456
```

### Customer Reviews

```bash
# List reviews
npm run review -- list --limit 50

# Get review details
npm run review -- get --review-id review123

# Request review
npm run review -- request --order-id 123-4567890-1234567
```

## TypeScript Integration

```typescript
import { AmazonClient } from './src/index';

const client = new AmazonClient({
  clientId: process.env.AMAZON_CLIENT_ID,
  clientSecret: process.env.AMAZON_CLIENT_SECRET,
  refreshToken: process.env.AMAZON_REFRESH_TOKEN,
  accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
  secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
  sellerId: process.env.AMAZON_SELLER_ID,
  marketplaceId: process.env.AMAZON_MARKETPLACE_ID
});

// Detect tier
const tier = await client.detectAccountTier();
console.log(`Plan: ${tier.tier}, Monthly Fee: $${tier.monthlyFee}`);

// Create product listing
const product = await client.createProduct({
  sku: 'MY-PRODUCT-001',
  title: 'Premium Wireless Headphones',
  price: 79.99,
  quantity: 100
});

// Get orders
const orders = await client.listOrders({ limit: 20 });

// Update inventory
await client.updateInventory('MY-PRODUCT-001', 150);

// Get advertising metrics (Professional only)
if (tier.tier === 'Professional') {
  const metrics = await client.getAdvertisingMetrics('campaign-id');
}
```

## API Reference

### Account Operations

- `detectAccountTier()` - Detect seller account plan type
- `getAccountInfo()` - Get seller account information
- `getMarketplaceParticipations()` - List active marketplaces

### Product Operations

- `createProduct()` - Create new product listing
- `updateProduct()` - Update product information
- `deleteProduct()` - Delete product listing
- `getProduct()` - Get product details by SKU
- `listProducts()` - List product catalog
- `searchProducts()` - Search products by keyword

### Order Operations

- `listOrders()` - List orders by status/date
- `getOrder()` - Get order details
- `confirmShipment()` - Confirm order shipment with tracking
- `cancelOrder()` - Cancel order (if eligible)
- `getOrderMetrics()` - Get order performance metrics

### Inventory Operations

- `getInventoryLevels()` - Get inventory by SKU
- `updateInventory()` - Update inventory quantity
- `listFBAInventory()` - List FBA inventory levels
- `getInventoryHealth()` - Get inventory health metrics

### Advertising Operations (Professional Only)

- `listCampaigns()` - List advertising campaigns
- `createCampaign()` - Create new campaign
- `updateCampaign()` - Update campaign settings
- `getCampaignMetrics()` - Get campaign performance
- `manageKeywords()` - Manage campaign keywords

### Review Operations

- `listReviews()` - List product reviews
- `getReview()` - Get review details
- `requestReview()` - Request customer review
- `getReviewMetrics()` - Get review statistics

## Common Workflows

### Workflow 1: Launch New Product (Personal)

1. Create product listing with SKU, title, price
2. Upload product images and description
3. Set inventory quantity (FBM)
4. Activate listing
5. Monitor orders and reviews

### Workflow 2: Launch New Product (Professional)

1. Create product listing with full details
2. Set up automated pricing rules
3. Create FBA shipment plan
4. Launch advertising campaign
5. Monitor performance metrics
6. Optimize based on analytics

### Workflow 3: Fulfill Orders (FBM)

1. List unshipped orders
2. Review order details and items
3. Pack and prepare shipment
4. Generate shipping label
5. Confirm shipment with tracking
6. Request customer review

### Workflow 4: Manage FBA Inventory

1. Check FBA inventory levels
2. Create replenishment shipment
3. Print FBA labels
4. Ship to Amazon fulfillment center
5. Track inbound shipment
6. Monitor inventory health

### Workflow 5: Optimize Advertising (Professional)

1. Review campaign performance
2. Analyze keyword metrics
3. Adjust bids and budgets
4. Add/remove keywords
5. A/B test ad copy
6. Scale winning campaigns

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication failed | Verify LWA credentials and refresh token at https://developer.amazonservices.com/ |
| Access denied error | Check IAM role permissions and AWS credentials |
| Product not found | Verify SKU matches exactly (case-sensitive) |
| Order cannot be shipped | Check order status is "Unshipped" and fulfillment channel |
| Inventory update failed | Ensure sufficient permissions and valid SKU |
| Advertising unavailable | Upgrade to Professional plan ($39.99/month) |
| Rate limit exceeded | Implement throttling, SP-API has rate limits per endpoint |
| Marketplace mismatch | Verify marketplace ID matches your target region |

## Marketplace IDs

- **North America**:
  - US: `ATVPDKIKX0DER`
  - Canada: `A2EUQ1WTGCTBG2`
  - Mexico: `A1AM78C64UM0Y8`

- **Europe**:
  - UK: `A1F83G8C2ARO7P`
  - Germany: `A1PA6795UKMFR9`
  - France: `A13V1IB3VIYZZH`
  - Italy: `APJ6JRA9NG5V4`
  - Spain: `A1RKKUPIHCS9HS`

- **Asia Pacific**:
  - Japan: `A1VC38T7YXB528`
  - Australia: `A39IBJ37TRP1C6`

## Resources

- **Seller Central**: https://sellercentral.amazon.com/
- **SP-API Documentation**: https://developer-docs.amazon.com/sp-api/
- **Developer Console**: https://developer.amazonservices.com/
- **Help & Support**: https://sellercentral.amazon.com/help/
- **API Reference**: https://developer-docs.amazon.com/sp-api/docs
- **Forums**: https://sellercentral.amazon.com/forums/

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
