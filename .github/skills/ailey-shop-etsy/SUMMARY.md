# Etsy Skill Summary

Etsy integration for AI-ley providing comprehensive shop management and e-commerce capabilities.

## Project Information

- **Version**: 1.0.0
- **Status**: Production Ready
- **Type**: E-Commerce Shop Integration
- **Language**: TypeScript 5.3.3
- **License**: MIT

## Overview

The Etsy skill provides seamless integration with Etsy's API for managing online shops, product listings, order fulfillment, customer interactions, and business analytics. Manage inventory, track sales, respond to customers, and access detailed performance metrics.

## Key Capabilities

### Shop Management
- Get shop information and settings
- Update shop policies (shipping, return, privacy)
- List and manage shop policies
- Track shop statistics and performance

### Product Listing Management
- Create, update, delete product listings
- Organize products by categories and tags
- Track inventory and quantities
- Bulk product operations (Business+ tiers)
- Monitor listing performance

### Order Management
- List and view orders
- Fulfill orders with tracking information
- Send messages to customers
- Track order status
- Download shipping labels

### Analytics & Reporting
- Shop statistics (sales, visitors, revenue)
- Listings performance (views, favorites, sales)
- Sales reports by date range
- Revenue summaries
- Traffic analysis

### Customer Engagement
- List and respond to customer reviews
- Maintain shop ratings
- Send customer messages
- Request feedback
- Build customer relationships

### Inventory Management
- Track stock levels
- Update quantities
- Archive/reactivate listings
- Monitor inventory trends

## Technology Stack

- **Language**: TypeScript 5.3.3
- **Framework**: Node.js 18+
- **HTTP Client**: axios ^1.6.0
- **CLI**: commander.js ^11.0.0
- **Terminal Styling**: chalk ^5.3.0
- **Environment**: dotenv ^16.3.1
- **Build**: TypeScript Compiler (tsc)

## Account Tiers

### Personal Tier
- Cost: Free
- Active Listings: 10
- API Access: Limited
- Analytics: Limited (basic views/sales only)
- Support: Community forums
- Use Case: Hobbyist sellers, testing

### Business Tier
- Cost: Free
- Active Listings: 50
- API Access: Full
- Analytics: Standard (detailed metrics)
- Support: Email support (Mon-Fri)
- Bulk operations: Available
- Use Case: Active sellers, small businesses

### Plus Tier ($15.95/month)
- Active Listings: 300
- API Access: Premium (higher rate limits)
- Analytics: Premium (custom reports)
- Support: Priority email & phone
- Shipping Discounts: Up to 20% off labels
- Advertising Credit: $5/month
- Use Case: Professional sellers, high-volume shops

## File Structure

```
ailey-shop-etsy/
├── package.json              # npm scripts and dependencies
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── SKILL.md                 # Comprehensive documentation
├── README.md                # Quick start guide
├── QUICK_REFERENCE.md       # Command reference
├── SUMMARY.md               # This file
├── src/
│   ├── index.ts             # EtsyClient class (600+ lines)
│   └── cli.ts               # CLI commands (450+ lines)
├── dist/                    # Compiled JavaScript (generated)
└── install.sh               # Installation script
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Etsy account (https://www.etsy.com/)
- Developer API access (https://www.etsy.com/developers)

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

## Core Methods

**Account Tier Detection**
```typescript
const tier = await client.detectAccountTier();
// Returns: AccountTier with tier, maxListings, apiAccess, etc.
```

**Shop Operations**
```typescript
await client.getShopInfo();              // Get shop details
await client.updateShopSettings(data);   // Update settings
await client.listShopPolicies();         // List policies
await client.updateShopPolicy(type, content); // Update policy
await client.getShopStats();             // Get statistics
```

**Product Operations**
```typescript
await client.createListing(data);        // Create listing
await client.updateListing(id, updates); // Update product
await client.deleteListing(id);          // Delete product
await client.getListing(id);             // Get details
await client.listListings(filters);      // List products
```

**Order Operations**
```typescript
await client.listOrders(filters);        // List orders
await client.getOrder(id);               // Get order details
await client.fulfillOrder(id, tracking); // Fulfill order
await client.sendOrderMessage(id, msg);  // Send message
```

**Review Operations**
```typescript
await client.listReviews(filters);       // List reviews
await client.respondToReview(id, text);  // Respond to review
await client.getReviewSummary();         // Get summary
```

**Analytics**
```typescript
await client.getShopStats();             // Shop statistics
await client.getListingsPerformance(days); // Listings analytics
await client.getSalesReport(start, end); // Sales report
```

## CLI Commands

### Authentication
- `npm run auth -- verify` - Test API credentials
- `npm run auth -- info` - Get account information

### Detection
- `npm run detect` - Show account tier and capabilities

### Shop Management
- `npm run shop -- info` - Get shop information
- `npm run shop -- list-policies` - List shop policies
- `npm run shop -- update-policy --policy <type> --content <text>` - Update policy
- `npm run shop -- stats` - Get shop statistics

### Product Management
- `npm run product -- create --title "..." --price 50 --quantity 10` - Create listing
- `npm run product -- list --limit 20` - List products
- `npm run product -- get --listing-id <ID>` - Get product details
- `npm run product -- delete --listing-id <ID>` - Delete product

### Order Management
- `npm run order -- list --limit 20` - List orders
- `npm run order -- get --order-id <ID>` - Get order details
- `npm run order -- fulfill --order-id <ID> --tracking-code <CODE> --carrier USPS` - Fulfill order
- `npm run order -- message --order-id <ID> --message "..."` - Send message

### Review Management
- `npm run review -- list --limit 50` - List reviews
- `npm run review -- respond --review-id <ID> --response "..."` - Respond to review
- `npm run review -- summary` - Get review summary

### Analytics
- `npm run analytics -- stats` - Shop statistics
- `npm run analytics -- listings --days 30` - Listings performance
- `npm run analytics -- sales --start-date 2025-01-01 --end-date 2025-01-31` - Sales report

### Utilities
- `npm run diagnose` - System diagnostics
- `npm run setup` - Interactive setup wizard

## Common Workflows

### Create and Publish Product
1. Create listing with product details
2. Set pricing and inventory
3. Add tags and category
4. Publish (goes live immediately)
5. Monitor with analytics

### Process and Fulfill Orders
1. List new orders
2. Review order details and shipping address
3. Prepare package for shipment
4. Generate and print shipping label
5. Record tracking number
6. Mark order as fulfilled
7. Send tracking notification to buyer

### Inventory Management
1. List all active products
2. Check current stock levels
3. Update quantities based on actual inventory
4. Archive out-of-stock items
5. Reactivate seasonal listings

### Customer Engagement
1. List recent customer reviews
2. Respond to feedback
3. Send order updates and tracking
4. Request reviews for shipped orders
5. Build positive customer relationships

### Sales Analysis
1. Get shop statistics
2. Analyze listing performance metrics
3. Identify top-selling products
4. Review traffic sources
5. Plan inventory based on trends

## Integration with AI-ley

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

// List orders
const orders = await client.listOrders({ limit: 20 });

// Fulfill order
await client.fulfillOrder(order.id, {
  tracking: '1234567890',
  carrier: 'USPS'
});

// Get analytics
const stats = await client.getShopStats();
console.log(`Total Sales: $${stats.totalRevenue}`);
```

## Security & Performance

- **API Credentials**: Store securely in .env, never commit
- **Rate Limiting**: Respect Etsy API rate limits (higher with Plus tier)
- **Batch Operations**: Business+ tiers support bulk product operations
- **Data Caching**: Implement caching for frequently accessed data
- **Error Handling**: Comprehensive error handling with descriptive messages
- **Tracking**: Validate tracking number format before fulfillment

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| Authentication error | Verify credentials at https://www.etsy.com/developers |
| Listing not found | Check listing ID with `npm run product -- list` |
| Fulfillment failed | Verify tracking number format is valid |
| Rate limit exceeded | Wait before retrying or upgrade to Plus tier |
| Shop not connected | Ensure OAuth token is valid and current |
| Analytics missing | Wait 24 hours for data to populate |
| Permission denied | Check developer app scopes and permissions |
| Invalid shop ID | Verify shop ID from shop settings |

## Resources

- **Official Site**: https://www.etsy.com/
- **Developer Portal**: https://www.etsy.com/developers
- **API Documentation**: https://developers.etsy.com/documentation
- **Help Center**: https://help.etsy.com/
- **Seller Handbook**: https://www.etsy.com/seller-handbook/
- **Community Forum**: https://www.etsy.com/forums/

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
