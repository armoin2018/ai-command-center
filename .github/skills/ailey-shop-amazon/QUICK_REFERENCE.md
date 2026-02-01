# Amazon SP-API Quick Reference

## CLI Commands

### Setup & Authentication

```bash
# Interactive setup wizard
npm run setup

# Detect account tier
npm run detect

# Verify authentication
npm run auth verify

# Run diagnostics
npm run diagnose
```

### Product Management

```bash
# Create product listing
npm run product create -- \
  --sku "SKU-001" \
  --title "Product Name" \
  --price 29.99 \
  --quantity 100 \
  --brand "MyBrand"

# List products
npm run product list
npm run product list -- --limit 50

# Get product details
npm run product get -- --sku "SKU-001"

# Update product
npm run product update -- --sku "SKU-001" --price 24.99
npm run product update -- --sku "SKU-001" --quantity 50
```

### Order Management

```bash
# List all orders
npm run order list
npm run order list -- --limit 50

# Filter by status
npm run order list -- --status "Unshipped"

# Get order details
npm run order get -- --order-id "123-4567890-1234567"

# Confirm FBM shipment
npm run order ship -- \
  --order-id "123-4567890-1234567" \
  --tracking-number "1Z999AA10123456784" \
  --carrier-code "UPS"
```

### Inventory Management

```bash
# Get inventory levels
npm run inventory levels -- --sku "SKU-001"

# Update inventory quantity
npm run inventory update -- --sku "SKU-001" --quantity 100

# List FBA inventory
npm run inventory fba
npm run inventory fba -- --limit 100
```

### Advertising (Professional Plan Only)

```bash
# List campaigns
npm run advertising campaigns
npm run advertising campaigns -- --limit 50

# Get campaign metrics
npm run advertising metrics -- --campaign-id "123456789"
```

### Review Management

```bash
# List reviews
npm run review list
npm run review list -- --limit 100

# Request review for order
npm run review request -- --order-id "123-4567890-1234567"
```

## Account Tiers Feature Matrix

| Feature | Individual | Professional | Vendor |
|---------|-----------|--------------|--------|
| Monthly Fee | $0 | $39.99 | Custom |
| Per-Sale Fee | $0.99 | $0 | N/A |
| API Access | Limited | Full | Full |
| Product Listings | ✅ | ✅ | ✅ |
| Order Management | ✅ | ✅ | ✅ |
| FBA & FBM | ✅ | ✅ | ✅ |
| Inventory Tracking | ✅ | ✅ | ✅ |
| Advertising | ❌ | ✅ | ✅ |
| Bulk Operations | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ |
| API Rate Limits | Lower | Higher | Highest |
| Multi-Marketplace | ⚠️ | ✅ | ✅ |
| Brand Registry | ❌ | ✅ | ✅ |
| Enhanced Content | ❌ | ✅ | ✅ |
| Volume Discounts | ❌ | ✅ | ✅ |

## Common Workflows

### Workflow 1: Launch New Product (Personal - FBM)

For Individual sellers using Fulfillment by Merchant:

```bash
# 1. Create product listing
npm run product create -- \
  --sku "PERSONAL-SKU-001" \
  --title "Handmade Widget" \
  --price 24.99 \
  --quantity 10

# 2. Monitor for orders
npm run order list -- --status "Unshipped"

# 3. When order arrives, fulfill and ship
npm run order ship -- \
  --order-id "123-4567890-1234567" \
  --tracking-number "9400111899223344556677" \
  --carrier-code "USPS"

# 4. Monitor inventory
npm run inventory levels -- --sku "PERSONAL-SKU-001"

# 5. Restock when low
npm run inventory update -- --sku "PERSONAL-SKU-001" --quantity 10
```

### Workflow 2: Launch New Product (Professional - FBA)

For Professional sellers using Fulfillment by Amazon:

```bash
# 1. Create product listing
npm run product create -- \
  --sku "PRO-SKU-001" \
  --title "Professional Widget" \
  --price 49.99 \
  --quantity 1000

# 2. Create inbound shipment to FBA (via Seller Central web)

# 3. Monitor FBA inventory
npm run inventory fba

# 4. Create advertising campaign (via Seller Central web)

# 5. Monitor campaign performance
npm run advertising campaigns
npm run advertising metrics -- --campaign-id "123456789"

# 6. Adjust pricing based on performance
npm run product update -- --sku "PRO-SKU-001" --price 44.99

# 7. Monitor orders (automatically fulfilled by Amazon)
npm run order list
```

### Workflow 3: Fulfill FBM Orders (Both Plans)

For Merchant-Fulfilled orders:

```bash
# 1. Check for new orders
npm run order list -- --status "Unshipped"

# 2. Get order details
npm run order get -- --order-id "123-4567890-1234567"

# 3. Pack and ship order

# 4. Confirm shipment
npm run order ship -- \
  --order-id "123-4567890-1234567" \
  --tracking-number "1Z999AA10123456784" \
  --carrier-code "UPS"

# 5. Update inventory
npm run inventory update -- --sku "SKU-001" --quantity 45
```

### Workflow 4: Manage FBA Inventory (Professional)

For Professional sellers with FBA:

```bash
# 1. Check FBA inventory levels
npm run inventory fba

# 2. Identify low-stock items
# (Look for items with low availableQuantity)

# 3. Create inbound shipment (via Seller Central)

# 4. Monitor inbound shipment
npm run inventory fba
# (Check inboundQuantity)

# 5. Verify inventory received
npm run inventory levels -- --sku "SKU-001"
```

### Workflow 5: Optimize Advertising (Professional Only)

For Professional sellers with ad campaigns:

```bash
# 1. List all campaigns
npm run advertising campaigns

# 2. Check campaign performance
npm run advertising metrics -- --campaign-id "123456789"

# 3. Analyze metrics:
#    - CTR (Click-Through Rate): clicks/impressions
#    - ACOS (Advertising Cost of Sales): spend/sales
#    - ROAS (Return on Ad Spend): sales/spend

# 4. Adjust bids/budgets (via Seller Central)

# 5. Monitor daily
npm run advertising metrics -- --campaign-id "123456789"

# 6. Adjust product pricing if needed
npm run product update -- --sku "SKU-001" --price 39.99
```

## Environment Variables

Required variables in `.env`:

```bash
# LWA OAuth Credentials
AMAZON_CLIENT_ID=amzn1.application-oa2-client...
AMAZON_CLIENT_SECRET=abc123...
AMAZON_REFRESH_TOKEN=Atzr|IwEBIA...

# AWS IAM Credentials
AMAZON_ACCESS_KEY_ID=AKIA...
AMAZON_SECRET_ACCESS_KEY=abc123...

# Seller Information
AMAZON_SELLER_ID=A1B2C3D4E5F6G
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER

# Regional Settings (optional)
AMAZON_REGION=us-east-1
AMAZON_ENDPOINT=sellingpartnerapi-na.amazon.com
```

## Marketplace IDs

| Region | Marketplace | ID |
|--------|------------|-----|
| 🇺🇸 United States | Amazon.com | `ATVPDKIKX0DER` |
| 🇨🇦 Canada | Amazon.ca | `A2EUQ1WTGCTBG2` |
| 🇲🇽 Mexico | Amazon.com.mx | `A1AM78C64UM0Y8` |
| 🇬🇧 United Kingdom | Amazon.co.uk | `A1F83G8C2ARO7P` |
| 🇩🇪 Germany | Amazon.de | `A1PA6795UKMFR9` |
| 🇫🇷 France | Amazon.fr | `A13V1IB3VIYZZH` |
| 🇮🇹 Italy | Amazon.it | `APJ6JRA9NG5V4` |
| 🇪🇸 Spain | Amazon.es | `A1RKKUPIHCS9HS` |
| 🇯🇵 Japan | Amazon.co.jp | `A1VC38T7YXB528` |
| 🇦🇺 Australia | Amazon.com.au | `A39IBJ37TRP1C6` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Run `npm run diagnose`, verify all env vars set |
| "Tier detection failed" | Check SELLER_ID correct, verify account active |
| "Advertising unavailable" | Upgrade to Professional plan ($39.99/month) |
| "Rate limit exceeded" | Implement exponential backoff, reduce request frequency |
| "Product not found" | Verify SKU correct, check product created successfully |
| "Order not found" | Verify order ID format, check marketplace ID matches |
| "Inventory update failed" | Check SKU exists, verify quantity valid |
| "Shipment confirmation failed" | Verify order eligible for confirmation, check tracking number |

## Resources

- **Seller Central**: https://sellercentral.amazon.com/
- **SP-API Documentation**: https://developer-docs.amazon.com/sp-api/
- **Developer Console**: https://developer.amazonservices.com/
- **Full Skill Documentation**: See [SKILL.md](SKILL.md)
