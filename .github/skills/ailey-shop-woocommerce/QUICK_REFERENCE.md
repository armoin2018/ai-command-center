# WooCommerce Skill Quick Reference

Complete command reference for WooCommerce integration.

## Setup & Configuration

```bash
npm run setup              # Interactive setup wizard
npm run build             # Compile TypeScript
npm run dev              # Watch mode
```

## Authentication

```bash
npm run auth verify       # Verify API credentials
npm run auth info         # Get store information
npm run detect            # Detect account tier and features
```

## Product Management

### Create Product
```bash
npm run product -- create \
  --name "Product Name" \
  --price 99.99 \
  --sku "SKU123" \
  --description "Product description" \
  --stock 50
```

### List Products
```bash
npm run product -- list --limit 20 --status publish
```

### Get Product Details
```bash
npm run product -- get --id 123
```

### Update Product
```bash
npm run product -- update \
  --id 123 \
  --name "New Name" \
  --price 149.99 \
  --stock 100
```

### Delete Product
```bash
npm run product -- delete --id 123
```

## Order Management

### List Orders
```bash
npm run order -- list --limit 20 --status processing
```

### Get Order Details
```bash
npm run order -- get --id 456
```

### Update Order Status
```bash
npm run order -- update-status --id 456 --status completed
```

Valid statuses: `pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`

## Customer Management

### List Customers
```bash
npm run customer -- list --limit 20
```

### Get Customer Details
```bash
npm run customer -- get --id 789
```

### Create Customer
```bash
npm run customer -- create \
  --email customer@example.com \
  --first-name John \
  --last-name Doe
```

## Payment Management

### Process Refund
```bash
npm run payment -- refund \
  --order-id 456 \
  --amount 50.00 \
  --reason "Customer request"
```

## Shipping Management

### List Shipping Zones
```bash
npm run shipping -- list-zones
```

### List Shipping Methods
```bash
npm run shipping -- list-methods --zone-id 1
```

## Reports & Analytics

### Sales Report
```bash
npm run report -- sales \
  --start-date 2025-01-01 \
  --end-date 2025-12-31
```

## Diagnostics

```bash
npm run diagnose          # Run system checks
```

## Environment Variables

```bash
# Self-Hosted
WOOCOMMERCE_STORE_URL=https://your-store.com
WOOCOMMERCE_API_KEY=ck_live_xxxxxxxxxxxxx
WOOCOMMERCE_API_SECRET=cs_live_xxxxxxxxxxxxx
WOOCOMMERCE_STORE_TYPE=self-hosted

# WooCommerce.com
WOOCOMMERCE_COM_EMAIL=your-email@example.com
WOOCOMMERCE_COM_PASSWORD=your-password
WOOCOMMERCE_STORE_TYPE=woocommerce-com

# Optional
WOOCOMMERCE_API_VERSION=wc/v3
WOOCOMMERCE_TIMEOUT=30000
WOOCOMMERCE_VERBOSE_LOG=false
```

## Account Tier Feature Matrix

| Feature | Starter | Professional | Business | WC Free | WC Starter | WC Business | WC Commerce |
|---------|---------|--------------|----------|---------|-----------|-------------|-------------|
| Products CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Variations | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Payments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shipping | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Reports | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Bulk Ops | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ✅ | ✅ |
| Integrations | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

## Common Workflows

### Workflow 1: Launch New Product
```bash
# Create product
npm run product -- create \
  --name "New Widget" \
  --price 49.99 \
  --sku "NW-001" \
  --stock 100

# Verify creation
npm run product -- list --limit 5

# Get details
npm run product -- get --id <PRODUCT_ID>
```

### Workflow 2: Process Orders
```bash
# List pending orders
npm run order -- list --status processing

# Get details
npm run order -- get --id <ORDER_ID>

# Mark as completed
npm run order -- update-status \
  --id <ORDER_ID> \
  --status completed

# Generate report
npm run report -- sales \
  --start-date 2025-01-01 \
  --end-date 2025-12-31
```

### Workflow 3: Customer Onboarding
```bash
# Create new customer
npm run customer -- create \
  --email newcustomer@example.com \
  --first-name Jane \
  --last-name Smith

# Verify creation
npm run customer -- list --limit 10

# Get customer details
npm run customer -- get --id <CUSTOMER_ID>
```

### Workflow 4: Handle Refund
```bash
# Get order details
npm run order -- get --id <ORDER_ID>

# Process refund
npm run payment -- refund \
  --order-id <ORDER_ID> \
  --amount 99.99 \
  --reason "Customer requested return"

# Verify refund
npm run order -- get --id <ORDER_ID>
```

### Workflow 5: Store Setup
```bash
# Run setup wizard
npm run setup

# Configure environment
# (edit .env with your credentials)

# Verify credentials
npm run auth -- verify

# Check account tier
npm run detect

# Run diagnostics
npm run diagnose
```

## Tips & Best Practices

- **Before first use**: Always run `npm run auth -- verify` to test credentials
- **Check tier**: Use `npm run detect` to see available features for your account
- **Batch operations**: Consider using API rate limits when doing bulk updates
- **Error handling**: Check logs with `npm run diagnose` for troubleshooting
- **Sensitive data**: Never commit `.env` file with real credentials to version control
- **API limits**: Self-hosted has 120 calls/min, WooCommerce.com varies by tier

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication failed | Verify API key/secret in .env and Settings → Advanced → REST API |
| Connection timeout | Check store URL accessibility and network connectivity |
| Rate limit exceeded | Wait before retrying or upgrade to higher tier |
| Product not found | Verify product ID and check product status is 'publish' |
| Refund failed | Ensure refund amount doesn't exceed order total |
| Shipping zones empty | Configure zones in store dashboard → Settings → Shipping |

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
