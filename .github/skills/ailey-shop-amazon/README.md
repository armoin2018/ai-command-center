# Amazon SP-API AI-ley Skill

Amazon Selling Partner API integration for AI-ley. Manage products, orders, inventory, advertising, and reviews on Amazon Marketplace.

## Quick Start

### Personal Sellers (Individual Plan)

Perfect for hobbyists, part-time sellers, or those selling <40 items/month:

```bash
# 1. Sign up for Individual plan
# Visit: https://sell.amazon.com/
# Cost: $0.99 per sale (no monthly fee)

# 2. Setup skill
cd .github/skills/ailey-shop-amazon
npm install
npm run setup  # Follow credential instructions

# 3. Verify connection
npm run detect  # Should show "Individual" tier
```

### Business Sellers (Professional Plan)

For businesses, high-volume sellers, or those needing advertising:

```bash
# 1. Sign up for Professional plan
# Visit: https://sell.amazon.com/
# Cost: $39.99/month (no per-item fee)

# 2. Setup skill
cd .github/skills/ailey-shop-amazon
npm install
npm run setup  # Follow credential instructions

# 3. Verify connection
npm run detect  # Should show "Professional" tier
```

## Account Tiers Comparison

| Feature | Individual | Professional | Vendor |
|---------|-----------|--------------|--------|
| **Monthly Fee** | $0 | $39.99 | Custom |
| **Per-Sale Fee** | $0.99 | $0 | N/A |
| **API Access** | Limited | Full | Full |
| **Advertising** | ❌ | ✅ | ✅ |
| **Bulk Operations** | ❌ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ✅ | ✅ |
| **Best For** | <40 items/mo | 40+ items/mo | Wholesale |

## Common Commands

### Detect Account Tier
```bash
npm run detect
```

### Manage Products
```bash
# Create product listing (both plans)
npm run product create -- --sku "MY-SKU-001" --title "Product Name" --price 29.99 --quantity 100

# List products
npm run product list

# Update product
npm run product update -- --sku "MY-SKU-001" --price 24.99
```

### Fulfill Orders
```bash
# List orders (both plans)
npm run order list

# Confirm FBM shipment (Merchant-Fulfilled)
npm run order ship -- --order-id "123-4567890-1234567" --tracking-number "1Z999AA10123456784" --carrier-code "UPS"
```

### Manage Inventory
```bash
# Check inventory levels
npm run inventory levels -- --sku "MY-SKU-001"

# Update quantity
npm run inventory update -- --sku "MY-SKU-001" --quantity 50

# List FBA inventory (Professional plan)
npm run inventory fba
```

### Advertising (Professional Only)
```bash
# List campaigns
npm run advertising campaigns

# Get metrics
npm run advertising metrics -- --campaign-id "123456789"
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

// Create product
const product = await client.createProduct({
  sku: 'MY-SKU-001',
  title: 'My Product',
  price: 29.99,
  quantity: 100,
  brand: 'MyBrand'
});

// List orders
const orders = await client.listOrders({ limit: 50 });
```

## Getting Credentials

1. **Create Seller Account**: https://sell.amazon.com/
2. **Register as Developer**: Seller Central → Settings → User Permissions
3. **Get LWA Credentials**: https://developer.amazonservices.com/
4. **Get AWS Credentials**: Seller Central → User Permissions → Create IAM role
5. **Configure .env**:
   ```
   AMAZON_CLIENT_ID=amzn1.application-oa2-client...
   AMAZON_CLIENT_SECRET=abc123...
   AMAZON_REFRESH_TOKEN=Atzr|IwEBIA...
   AMAZON_ACCESS_KEY_ID=AKIA...
   AMAZON_SECRET_ACCESS_KEY=abc123...
   AMAZON_SELLER_ID=A1B2C3D4E5F6G
   AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
   ```

Run `npm run setup` for detailed instructions.

## Common Workflows

### Workflow 1: Launch Product (Personal - FBM)
```bash
# Create listing
npm run product create -- --sku "SKU-001" --title "Product" --price 19.99 --quantity 10

# Monitor orders
npm run order list

# Confirm shipment
npm run order ship -- --order-id "ORDER-ID" --tracking-number "TRACK-NUM" --carrier-code "USPS"
```

### Workflow 2: Launch Product (Business - FBA)
```bash
# Create listing
npm run product create -- --sku "SKU-001" --title "Product" --price 29.99 --quantity 1000

# Create advertising campaign (via web console)
# Monitor with:
npm run advertising campaigns
npm run advertising metrics -- --campaign-id "CAMPAIGN-ID"

# Check FBA inventory
npm run inventory fba
```

## Resources

- **Seller Central**: https://sellercentral.amazon.com/
- **SP-API Documentation**: https://developer-docs.amazon.com/sp-api/
- **Developer Console**: https://developer.amazonservices.com/
- **Full Documentation**: See [SKILL.md](SKILL.md)
- **Quick Reference**: See [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

## Support

For issues or questions:
- Check [SKILL.md](SKILL.md) troubleshooting section
- Review Amazon SP-API docs
- Contact Amazon Seller Support
