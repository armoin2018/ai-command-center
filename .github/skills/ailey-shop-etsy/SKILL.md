---
id: ailey-shop-etsy
name: Etsy Integration
description: Comprehensive Etsy API integration for shop management, product listing, order fulfillment, and analytics.
keywords:
  - etsy
  - ecommerce
  - shop
  - listing
  - order
  - analytics
  - handmade
---

# Etsy Integration Skill

Comprehensive Etsy API integration for shop management, product listing, order fulfillment, and analytics.

## Overview

The Etsy skill provides seamless integration with Etsy's API for managing online shops, products, orders, customer interactions, and business analytics. Manage listings, track inventory, fulfill orders, respond to reviews, and access detailed shop performance metrics.

## Key Features

✅ Shop management (settings, policies, profile)
✅ Product listing management (create, update, delete, organize)
✅ Order management (fulfillment, tracking, customer communication)
✅ Analytics and reporting (sales, traffic, revenue)
✅ Reviews and feedback management
✅ Favorites and recommendations
✅ Inventory tracking and management
✅ Shop policies and configurations
✅ Customer communication
✅ Automatic account tier detection

## Account Tiers

Etsy provides different seller account types with varying capabilities and limitations.

### Personal Account

- **Cost**: Free
- **Monthly Listing Limit**: 10 active listings
- **Shop Features**: Basic shop setup, limited customization
- **Order Features**: Accept orders, basic fulfillment
- **Analytics**: Limited (views, favorites, sales)
- **Support**: Community forums only
- **API Access**: Limited API tier
- **Payment Processing**: Yes (Etsy Payments)
- **Shipping**: Manual label generation only
- **Taxes**: Basic tax rate support

**Use Case**: Hobbyist sellers or testing

### Business Account

- **Cost**: Free
upgrade from Personal
- **Monthly Listing Limit**: 50 active listings
- **Shop Features**: Advanced customization, branding, sections
- **Order Features**: Advanced order management, bulk processing
- **Analytics**: Standard analytics (detailed metrics)
- **Support**: Email support (Mon-Fri)
- **API Access**: Full API access
- **Payment Processing**: Yes with analytics
- **Shipping**: Shipping templates, label management
- **Taxes**: Advanced tax management

**Use Case**: Active sellers, small businesses

### Plus Account

- **Cost**: $15.95/month (auto-renewing)
- **Monthly Listing Limit**: 300 active listings
- **Shop Features**: All Business features
- **Order Features**: Priority order processing
- **Analytics**: Premium analytics with custom reports
- **Support**: Priority email and phone support
- **API Access**: Premium API tier with higher rate limits
- **Payment Processing**: Enhanced payment options
- **Shipping**: Advanced shipping discounts (up to 20%)
- **Advertising**: $5/month advertising credit
- **Taxes**: Full tax compliance tools

**Use Case**: Professional sellers, high-volume shops

## Account Tier Feature Matrix

| Feature | Personal | Business | Plus |
|---------|----------|----------|------|
| Active Listings | 10 | 50 | 300 |
| Shop Customization | ✅ Basic | ✅ Advanced | ✅ Advanced |
| Order Management | ✅ Basic | ✅ Advanced | ✅ Priority |
| Analytics | ⚠️ Limited | ✅ Standard | ✅ Premium |
| API Access | ⚠️ Limited | ✅ Full | ✅ Premium |
| Email Support | ❌ | ✅ | ✅ Priority |
| Phone Support | ❌ | ❌ | ✅ |
| Shipping Discounts | ❌ | ❌ | ✅ (20%) |
| Advertising Credit | ❌ | ❌ | ✅ ($5/mo) |
| Tax Tools | ⚠️ Basic | ✅ Full | ✅ Full |
| Bulk Operations | ❌ | ✅ | ✅ |
| Custom Reports | ❌ | ⚠️ Limited | ✅ |

## Getting Started

### Step 1: Create Etsy Account

- Sign up at https://www.etsy.com/
- Set up shop profile and initial settings
- Complete identity verification

### Step 2: Get API Access

- Go to https://www.etsy.com/developers to request API access
- Create a developer application at https://www.etsy.com/developers/documentation
- Request keystring (API key) and authenticate
- Generate OAuth tokens for your shop
- Copy: API Key, API Secret, Access Token, Shop ID

### Step 3: Configure Environment

Create `.env` file with credentials:
```bash
ETSY_API_KEY=your_api_key
ETSY_API_SECRET=your_api_secret
ETSY_ACCESS_TOKEN=your_access_token
ETSY_SHOP_ID=your_shop_id
ETSY_ACCOUNT_TYPE=business
```

### Step 4: Configure AI-ley

Add to `.github/aicc/aicc.yaml`:
```yaml
skills:
  etsy:
    type: shop
    path: .github/skills/ailey-shop-etsy
    enabled: true
    config:
      apiKey: ${ETSY_API_KEY}
      apiSecret: ${ETSY_API_SECRET}
      accessToken: ${ETSY_ACCESS_TOKEN}
      shopId: ${ETSY_SHOP_ID}
      timeout: 30000
    features:
      shop: true
      listings: true
      orders: true
      reviews: true
      analytics: true
```

## Common Usage Examples

### Detect Account Tier

```bash
npm run detect
```

### Manage Shop

```bash
# Get shop information
npm run shop -- info

# Update shop policies
npm run shop -- update-policy --policy shipping --content "Ships within 2 days"

# List shop policies
npm run shop -- list-policies
```

### Manage Listings

```bash
# Create listing
npm run product -- create \
  --title "Handmade Ceramic Mug" \
  --description "Beautiful handcrafted ceramic mug" \
  --price 35.00 \
  --quantity 50

# Update listing
npm run product -- update --listing-id 123456 --price 40.00

# List products
npm run product -- list --limit 50 --sort created

# Delete listing
npm run product -- delete --listing-id 123456
```

### Manage Orders

```bash
# List orders
npm run order -- list --limit 20 --sort created

# Get order details
npm run order -- get --order-id abc123

# Fulfill order
npm run order -- fulfill \
  --order-id abc123 \
  --tracking-code 1234567890 \
  --carrier USPS

# Send message to buyer
npm run order -- message --order-id abc123 --message "Thank you for purchase!"
```

### Analytics

```bash
# Get shop stats
npm run analytics -- stats

# Get listings performance
npm run analytics -- listings --days 30

# Get sales report
npm run analytics -- sales --start-date 2025-01-01
```

### Manage Reviews

```bash
# List reviews
npm run review -- list --limit 50

# Respond to review
npm run review -- respond --review-id rev123 --response "Thank you for the feedback!"

# Get review summary
npm run review -- summary
```

## TypeScript Integration

```typescript
import { EtsyClient } from './src/index';

const client = new EtsyClient({
  apiKey: process.env.ETSY_API_KEY,
  apiSecret: process.env.ETSY_API_SECRET,
  accessToken: process.env.ETSY_ACCESS_TOKEN,
  shopId: process.env.ETSY_SHOP_ID
});

// Detect tier
const tier = await client.detectAccountTier();
console.log(`Tier: ${tier.tier}, Listings: ${tier.maxListings}`);

// Create listing
const listing = await client.createListing({
  title: 'Handmade Mug',
  description: 'Beautiful ceramic mug',
  price: 35.00,
  quantity: 50
});

// Get orders
const orders = await client.listOrders({ limit: 20 });

// Fulfill order
await client.fulfillOrder(order.id, {
  tracking: '1234567890',
  carrier: 'USPS'
});

// Get analytics
const stats = await client.getShopStats();
console.log(`Total Sales: $${stats.totalSales}`);
```

## API Reference

### Shop Operations

- `detectAccountTier()` - Detect seller account tier
- `getShopInfo()` - Get shop information and settings
- `updateShopPolicy()` - Update shop policies
- `listShopPolicies()` - List all shop policies
- `getShopStats()` - Get shop statistics
- `updateShopSettings()` - Update shop settings

### Listing Operations

- `createListing()` - Create new product listing
- `updateListing()` - Update product listing
- `deleteListing()` - Delete product listing
- `getListing()` - Get listing details
- `listListings()` - List shop listings
- `bulkUpdateListings()` - Update multiple listings

### Order Operations

- `listOrders()` - List shop orders
- `getOrder()` - Get order details
- `fulfillOrder()` - Mark order as shipped
- `cancelOrder()` - Cancel order
- `sendOrderMessage()` - Send message to buyer
- `downloadLabel()` - Download shipping label

### Analytics

- `getShopStats()` - Get shop statistics
- `getListingsPerformance()` - Get listings analytics
- `getSalesReport()` - Get sales data by date range
- `getTrafficReport()` - Get visitor traffic data
- `getRevenueSummary()` - Get revenue summary

### Reviews

- `listReviews()` - List shop reviews
- `getReview()` - Get review details
- `respondToReview()` - Respond to customer review
- `getReviewSummary()` - Get review statistics
- `getReviewsByListing()` - Get reviews for specific listing

### Favorites

- `addToFavorites()` - Add listing to favorites
- `removeFavorites()` - Remove from favorites
- `listFavorites()` - List favorite listings
- `getFavoritesCount()` - Get number of favorites

## Common Workflows

### Workflow 1: Create and Publish New Product

1. Create listing with product details
2. Set appropriate pricing and quantity
3. Configure shipping and tax settings
4. Publish listing (goes live immediately)
5. Monitor performance with analytics

### Workflow 2: Process and Fulfill Orders

1. List new orders from shop
2. Review order details and shipping address
3. Prepare package for shipment
4. Generate and print shipping label
5. Record tracking number
6. Mark order as fulfilled
7. Send tracking notification to buyer
8. Get positive review response

### Workflow 3: Inventory Management

1. List all active listings
2. Check current stock levels
3. Update quantities based on inventory
4. Archive/delete out-of-stock items
5. Reactivate seasonal listings
6. Monitor inventory trends

### Workflow 4: Shop Analytics Review

1. Get shop statistics (sales, visitors, revenue)
2. Analyze listing performance metrics
3. Identify top-selling products
4. Analyze traffic sources
5. Review customer feedback and ratings
6. Plan inventory based on trends

### Workflow 5: Customer Communication

1. List recent orders
2. Review customer messages
3. Respond to buyer questions
4. Send order updates
5. Request reviews for shipped orders
6. Build customer relationships

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication failed | Verify API credentials at https://www.etsy.com/developers |
| Listing not found | Check listing ID and shop permissions |
| Order fulfillment error | Verify tracking number format for carrier |
| Rate limit exceeded | Wait before retrying, upgrade to Plus tier for higher limits |
| Shop not connected | Ensure OAuth token is current and shop ID matches |
| Analytics data missing | Wait 24 hours for data to populate |
| Permission denied error | Check developer app has required scopes |
| Invalid shop ID | Get correct shop ID from shop settings |

## Resources

- **Official Site**: https://www.etsy.com/
- **Developer Portal**: https://www.etsy.com/developers
- **API Documentation**: https://developers.etsy.com/documentation
- **Help & Support**: https://help.etsy.com/
- **Community Forum**: https://www.etsy.com/forums/
- **Seller Handbook**: https://www.etsy.com/seller-handbook/

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
