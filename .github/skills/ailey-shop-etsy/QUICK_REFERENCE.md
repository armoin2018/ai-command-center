# Etsy Skill Quick Reference

## Setup & Configuration

```bash
npm run setup              # Interactive setup
npm run build             # Compile TypeScript
npm run dev              # Watch mode
```

## Authentication

```bash
npm run auth -- verify    # Verify credentials
npm run auth -- info      # Get account info
npm run detect            # Detect tier and features
```

## Shop Management

### Get Shop Information
```bash
npm run shop -- info
```

### List Shop Policies
```bash
npm run shop -- list-policies
```

### Update Shop Policy
```bash
npm run shop -- update-policy \
  --policy shipping \
  --content "Ships within 2 days"
```

### Get Shop Statistics
```bash
npm run shop -- stats
```

## Product Management

### Create Listing
```bash
npm run product -- create \
  --title "Handmade Ceramic Mug" \
  --description "Beautiful handcrafted ceramic" \
  --price 35.00 \
  --quantity 50
```

### List Products
```bash
npm run product -- list --limit 50 --sort created
```

### Get Product Details
```bash
npm run product -- get --listing-id abc123def456
```

### Update Product
```bash
npm run product -- update --listing-id abc123 --price 40.00
```

### Delete Product
```bash
npm run product -- delete --listing-id abc123def456
```

## Order Management

### List Orders
```bash
npm run order -- list --limit 20
```

### Get Order Details
```bash
npm run order -- get --order-id abc123
```

### Fulfill Order
```bash
npm run order -- fulfill \
  --order-id abc123 \
  --tracking-code 1234567890 \
  --carrier USPS
```

### Send Message to Buyer
```bash
npm run order -- message \
  --order-id abc123 \
  --message "Thank you for your purchase!"
```

## Review Management

### List Reviews
```bash
npm run review -- list --limit 50
```

### Respond to Review
```bash
npm run review -- respond \
  --review-id rev123 \
  --response "Thank you for the positive feedback!"
```

### Get Review Summary
```bash
npm run review -- summary
```

## Analytics

### Get Shop Statistics
```bash
npm run analytics -- stats
```

### Get Listings Performance
```bash
npm run analytics -- listings --days 30
```

### Get Sales Report
```bash
npm run analytics -- sales \
  --start-date 2025-01-01 \
  --end-date 2025-01-31
```

## Environment Variables

```bash
ETSY_API_KEY=your_api_key
ETSY_API_SECRET=your_api_secret
ETSY_ACCESS_TOKEN=your_access_token
ETSY_SHOP_ID=your_shop_id
ETSY_ACCOUNT_TYPE=business
ETSY_API_VERSION=v3
ETSY_API_TIMEOUT=30000
```

## Account Tier Features

| Feature | Personal | Business | Plus |
|---------|----------|----------|------|
| Active Listings | 10 | 50 | 300 |
| Monthly Fee | Free | Free | $15.95 |
| API Access | Limited | Full | Premium |
| Analytics | Limited | Standard | Premium |
| Support | Community | Email | Priority |
| Bulk Operations | ❌ | ✅ | ✅ |
| Shipping Discounts | ❌ | ❌ | ✅ (20%) |
| Advertising Credit | ❌ | ❌ | ✅ ($5/mo) |

## Common Workflows

### Workflow 1: Create and Publish Product
```bash
# Create listing
npm run product -- create \
  --title "Handmade Item" \
  --price 50.00 \
  --quantity 10

# Get shop info
npm run shop -- info

# List all products
npm run product -- list

# Get analytics
npm run analytics -- stats
```

### Workflow 2: Process Order
```bash
# List new orders
npm run order -- list --limit 5

# Get order details
npm run order -- get --order-id <ORDER_ID>

# Send message to buyer
npm run order -- message \
  --order-id <ORDER_ID> \
  --message "Your order is being prepared"

# Fulfill order with tracking
npm run order -- fulfill \
  --order-id <ORDER_ID> \
  --tracking-code <TRACKING> \
  --carrier USPS
```

### Workflow 3: Inventory Management
```bash
# List all products
npm run product -- list --limit 100

# Get product details
npm run product -- get --listing-id <ID>

# Update product quantity
npm run product -- update \
  --listing-id <ID> \
  --quantity 25

# Delete out-of-stock product
npm run product -- delete --listing-id <ID>
```

### Workflow 4: Customer Engagement
```bash
# List recent reviews
npm run review -- list --limit 20

# Get review summary
npm run review -- summary

# Respond to specific review
npm run review -- respond \
  --review-id <REVIEW_ID> \
  --response "Thank you!"

# Send follow-up messages to recent orders
npm run order -- message \
  --order-id <ORDER_ID> \
  --message "Please leave a review!"
```

### Workflow 5: Analytics and Reporting
```bash
# Get shop overview
npm run analytics -- stats

# Get listings performance
npm run analytics -- listings --days 30

# Get sales report for period
npm run analytics -- sales \
  --start-date 2025-01-01 \
  --end-date 2025-01-31

# Get shop info
npm run shop -- info
```

## Tips & Best Practices

- **Before first use**: Run `npm run auth -- verify` to test credentials
- **Check tier**: Use `npm run detect` to see account capabilities
- **Batch operations**: Business+ tiers support bulk product updates
- **Fulfill orders quickly**: Improves buyer satisfaction and ratings
- **Monitor analytics**: Track best sellers and seasonal trends
- **Respond to reviews**: Maintain high shop reputation
- **Use proper shipping**: Select correct carrier for tracking
- **Optimize listings**: Use good titles, descriptions, and tags
- **Regular inventory**: Keep stock levels accurate
- **Customer service**: Send tracking numbers and follow-ups

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication failed | Verify API credentials at https://www.etsy.com/developers |
| Listing not found | Check listing ID with `npm run product -- list` |
| Order fulfillment error | Verify tracking number format is correct |
| Rate limit exceeded | Wait or upgrade to Plus tier for higher limits |
| Shop not connected | Ensure OAuth token is current |
| Analytics empty | Wait 24 hours for data to populate |
| Permission denied | Check developer app has required API scopes |
| Invalid shop ID | Verify shop ID from shop settings |

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
