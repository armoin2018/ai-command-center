# Etsy Integration Skill

Comprehensive Etsy integration for shop management, product listing, order fulfillment, and analytics.

## Features

✅ Shop management (settings, policies, information)
✅ Product listing management (create, update, delete, organize)
✅ Order management (fulfillment, tracking, customer communication)
✅ Analytics and reporting (sales, traffic, revenue, listings)
✅ Reviews and feedback management (respond to reviews, ratings)
✅ Inventory tracking and management
✅ Automatic account tier detection
✅ Support for Personal, Business, and Plus seller accounts
✅ Customer communication tools
✅ Shop policy management

## Quick Setup

### 1. Create Etsy Account

- Sign up at https://www.etsy.com/
- Set up shop profile
- Complete identity verification

### 2. Get API Access

- Go to https://www.etsy.com/developers
- Create developer application
- Request API access and keystring
- Generate OAuth tokens for your shop
- Copy: API Key, API Secret, Access Token, Shop ID

### 3. Configure Environment

Create `.env` file:
```bash
ETSY_API_KEY=your_api_key
ETSY_API_SECRET=your_api_secret
ETSY_ACCESS_TOKEN=your_access_token
ETSY_SHOP_ID=your_shop_id
ETSY_ACCOUNT_TYPE=business
```

### 4. Test Connection

```bash
npm run build
npm run auth -- verify
npm run detect
```

## Account Tiers

### Personal
- Storage: Unlimited
- Active Listings: 10
- Monthly Fee: Free
- API Access: Limited
- Analytics: Limited (basic only)
- Support: Community forums

### Business
- Active Listings: 50
- Monthly Fee: Free
- API Access: Full
- Analytics: Standard (detailed metrics)
- Support: Email support
- Bulk operations available

### Plus ($15.95/month)
- Active Listings: 300
- API Access: Premium (higher rate limits)
- Analytics: Premium (custom reports)
- Support: Priority email & phone
- Shipping discounts (up to 20%)
- $5/month advertising credit

## Common Commands

```bash
# Detect tier and capabilities
npm run detect

# Get shop information
npm run shop -- info

# List products
npm run product -- list --limit 50

# Create listing
npm run product -- create \
  --title "Handmade Mug" \
  --price 35.00 \
  --quantity 50

# List orders
npm run order -- list --limit 20

# Get order details
npm run order -- get --order-id abc123

# Fulfill order
npm run order -- fulfill \
  --order-id abc123 \
  --tracking-code 1234567890 \
  --carrier USPS

# List reviews
npm run review -- list

# Respond to review
npm run review -- respond \
  --review-id rev123 \
  --response "Thank you!"

# Get shop stats
npm run analytics -- stats
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
console.log(`Tier: ${tier.tier}, Max Listings: ${tier.maxListings}`);

// Create listing
const listing = await client.createListing({
  title: 'Handmade Ceramic Mug',
  description: 'Beautiful handcrafted ceramic',
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
```

## Workflows

### Create and Publish Product
1. Create listing with product details
2. Set pricing and quantity
3. Configure tags and category
4. Publish listing
5. Monitor sales with analytics

### Process Orders
1. List new orders
2. Review order details
3. Prepare for shipment
4. Generate shipping label
5. Record tracking number
6. Mark order fulfilled
7. Send tracking to buyer

### Inventory Management
1. List all active listings
2. Monitor stock levels
3. Update quantities
4. Archive out-of-stock items
5. Reactivate seasonal products

### Customer Engagement
1. List customer reviews
2. Respond to feedback
3. Send order messages
4. Request reviews
5. Build customer relationships

## API Reference

**Shop**: getShopInfo, updateShopSettings, listShopPolicies, updateShopPolicy, getShopStats

**Listings**: createListing, updateListing, deleteListing, getListing, listListings

**Orders**: listOrders, getOrder, fulfillOrder, sendOrderMessage

**Reviews**: listReviews, respondToReview, getReviewSummary

**Analytics**: getListingsPerformance, getSalesReport, getShopStats

## Resources

- [Official Site](https://www.etsy.com/)
- [Developer Portal](https://www.etsy.com/developers)
- [API Documentation](https://developers.etsy.com/documentation)
- [Help Center](https://help.etsy.com/)
- [Seller Handbook](https://www.etsy.com/seller-handbook/)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
