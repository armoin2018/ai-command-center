# Amazon SP-API AI-ley Skill - Summary

## Project Overview

**Name**: Amazon SP-API AI-ley Skill  
**ID**: `ailey-shop-amazon`  
**Type**: E-commerce Platform Integration  
**Status**: Production Ready  
**Version**: 1.0.0  

Comprehensive Amazon Selling Partner API integration supporting both personal (Individual plan) and business (Professional plan) sellers. Manage products, orders, inventory, advertising campaigns, and customer reviews across multiple Amazon marketplaces.

## Key Capabilities

### For Personal Sellers (Individual Plan)
- Product listing creation and management
- Order tracking and FBM fulfillment
- Inventory management
- Customer communication
- Basic analytics
- **Cost**: $0.99 per sale, no monthly fee

### For Business Sellers (Professional Plan)
- All Individual features plus:
- Sponsored Products advertising
- Bulk operations and uploads
- Advanced analytics and reports
- Multi-marketplace management
- Brand Registry integration
- Enhanced product content
- **Cost**: $39.99/month, no per-sale fee

## Account Tiers

| Tier | Monthly Fee | Per-Sale Fee | Best For |
|------|------------|--------------|----------|
| **Individual** | $0 | $0.99 | <40 items/month, hobbyists, part-time |
| **Professional** | $39.99 | $0 | 40+ items/month, businesses, full-time |
| **Vendor** | Custom | N/A | Manufacturers, wholesale (invitation only) |

## Technology Stack

### Core Dependencies
- **Runtime**: Node.js 18+, npm 9+
- **Language**: TypeScript 5.3.3
- **HTTP Client**: axios ^1.6.0
- **CLI Framework**: commander ^11.0.0
- **Styling**: chalk ^5.3.0
- **Environment**: dotenv ^16.3.1

### Amazon APIs
- **Primary**: Selling Partner API (SP-API)
- **Authentication**: 
  - Login with Amazon (LWA) OAuth 2.0
  - AWS IAM Signature Version 4
- **Endpoint**: `https://sellingpartnerapi-na.amazon.com`
- **Version**: 2021-06-30

## File Structure

```
ailey-shop-amazon/
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Environment template
├── .gitignore               # Git exclusions
├── install.cjs               # Installation script
├── README.md                # Quick start guide
├── QUICK_REFERENCE.md       # Command reference
├── SKILL.md                 # Full documentation
├── SUMMARY.md               # This file
└── src/
    ├── index.ts             # AmazonClient class
    └── cli.ts               # CLI commands
```

## Getting Started

### Installation

```bash
cd .github/skills/ailey-shop-amazon
npm install
npm run setup  # Interactive credential wizard
```

### First Command

```bash
# Detect account tier
npm run detect

# Create product listing
npm run product create -- \
  --sku "SKU-001" \
  --title "Product Name" \
  --price 29.99 \
  --quantity 100
```

## Core Methods (AmazonClient)

### Authentication & Detection
- `getAccessToken()` - Get LWA OAuth token
- `detectAccountTier()` - Detect Individual/Professional/Vendor

### Product Operations
- `createProduct(data)` - Create product listing
- `updateProduct(sku, updates)` - Update product
- `getProduct(sku)` - Get product details
- `listProducts(filters)` - List products

### Order Operations
- `listOrders(filters)` - List orders (FBA & FBM)
- `getOrder(orderId)` - Get order details
- `confirmShipment(orderId, tracking)` - Confirm FBM shipment

### Inventory Operations
- `getInventoryLevels(sku)` - Get FBA inventory
- `updateInventory(sku, quantity)` - Update quantity
- `listFBAInventory(limit)` - List all FBA inventory

### Advertising Operations (Professional Only)
- `listCampaigns(limit)` - List ad campaigns
- `getCampaignMetrics(campaignId)` - Get performance metrics

### Review Operations
- `listReviews(filters)` - List product reviews
- `requestReview(orderId)` - Request customer review

## CLI Commands

### Setup & Diagnostics
```bash
npm run setup      # Interactive wizard
npm run detect     # Detect account tier
npm run diagnose   # System diagnostics
```

### Product Management
```bash
npm run product create    # Create listing
npm run product list      # List products
npm run product get       # Get details
npm run product update    # Update product
```

### Order Management
```bash
npm run order list        # List orders
npm run order get         # Get order details
npm run order ship        # Confirm shipment
```

### Inventory Management
```bash
npm run inventory levels  # Get levels
npm run inventory update  # Update quantity
npm run inventory fba     # List FBA inventory
```

### Advertising (Professional)
```bash
npm run advertising campaigns  # List campaigns
npm run advertising metrics    # Get metrics
```

### Reviews
```bash
npm run review list       # List reviews
npm run review request    # Request review
```

## Common Workflows

### Personal Seller: Launch Product (FBM)
1. Create listing → 2. Monitor orders → 3. Ship + confirm → 4. Update inventory → 5. Request reviews

### Business Seller: Launch Product (FBA)
1. Create listing → 2. Create inbound shipment → 3. Launch advertising → 4. Monitor metrics → 5. Optimize pricing

### Both: Fulfill FBM Orders
1. Check orders → 2. Pack + ship → 3. Confirm shipment → 4. Update inventory

### Professional: Manage FBA Inventory
1. Check levels → 2. Create inbound shipment → 3. Monitor receiving → 4. Verify received

### Professional: Optimize Advertising
1. List campaigns → 2. Check metrics → 3. Analyze ACOS/ROAS → 4. Adjust bids → 5. Monitor daily

## AI-ley Integration

Add to `.github/aicc/aicc.yaml`:

```yaml
skills:
  amazon:
    type: shop
    path: .github/skills/ailey-shop-amazon
    config:
      clientId: ${AMAZON_CLIENT_ID}
      clientSecret: ${AMAZON_CLIENT_SECRET}
      refreshToken: ${AMAZON_REFRESH_TOKEN}
      accessKeyId: ${AMAZON_ACCESS_KEY_ID}
      secretAccessKey: ${AMAZON_SECRET_ACCESS_KEY}
      sellerId: ${AMAZON_SELLER_ID}
      marketplaceId: ${AMAZON_MARKETPLACE_ID}
```

## TypeScript Integration

```typescript
import { AmazonClient } from './.github/skills/ailey-shop-amazon/src';

const client = new AmazonClient({
  clientId: process.env.AMAZON_CLIENT_ID!,
  clientSecret: process.env.AMAZON_CLIENT_SECRET!,
  refreshToken: process.env.AMAZON_REFRESH_TOKEN!,
  accessKeyId: process.env.AMAZON_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY!,
  sellerId: process.env.AMAZON_SELLER_ID!,
  marketplaceId: 'ATVPDKIKX0DER'
});

const product = await client.createProduct({
  sku: 'SKU-001',
  title: 'Product Name',
  price: 29.99,
  quantity: 100
});
```

## Security

### Credentials Required
- **LWA OAuth**: Client ID, Client Secret, Refresh Token
- **AWS IAM**: Access Key ID, Secret Access Key
- **Seller Info**: Seller ID, Marketplace ID

### Best Practices
- Store credentials in `.env` (never commit)
- Use environment variables in production
- Rotate credentials periodically
- Enable MFA on Seller Central account
- Monitor API usage for anomalies

## Performance

### Rate Limits (SP-API)
- **Individual Plan**: Lower rate limits
- **Professional Plan**: Higher rate limits
- **Dynamic Throttling**: Varies by endpoint

### Optimization
- Implement exponential backoff
- Cache tier detection results
- Batch operations when possible
- Use webhooks for real-time updates (coming soon)

## Support & Resources

### Amazon Resources
- **Seller Central**: https://sellercentral.amazon.com/
- **SP-API Docs**: https://developer-docs.amazon.com/sp-api/
- **Developer Console**: https://developer.amazonservices.com/
- **Seller Forums**: https://sellercentral.amazon.com/forums

### Skill Documentation
- **Full Documentation**: [SKILL.md](SKILL.md)
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Quick Start**: [README.md](README.md)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Invalid credentials | Check `.env` file, verify LWA + AWS credentials |
| Tier detection failed | Verify SELLER_ID correct, account active |
| Advertising unavailable | Upgrade to Professional plan |
| Rate limit exceeded | Implement backoff, reduce frequency |

## Roadmap

### Current Features ✅
- Account tier detection
- Product CRUD operations
- Order management (FBA & FBM)
- Inventory tracking
- Basic advertising metrics
- Review management

### Planned Features 🚀
- Full advertising campaign creation/management
- Multi-marketplace management
- Webhook event handling
- Bulk operations support
- Advanced analytics dashboard
- Automated repricing
- FBA shipment creation
- Brand Registry integration

## License

MIT License - See LICENSE file for details

## Version History

- **1.0.0** (2026-01-30): Initial release with dual personal/business support
