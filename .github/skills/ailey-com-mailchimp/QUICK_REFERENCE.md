# Mailchimp CLI Quick Reference

Complete command reference for the Mailchimp integration CLI.

## Setup & Configuration

```bash
npm run setup           # Interactive setup wizard
npm run detect          # Detect account tier
npm run diagnose        # Run diagnostics
```

## Authentication

```bash
npm run auth -- verify  # Verify API key
npm run auth -- info    # Show account info
npm run auth -- test    # Test connection
```

## List Management

```bash
# List all mailing lists
npm run list -- all

# Get list details
npm run list -- get --list-id <LIST_ID>

# Create new list
npm run list -- create \
  --name "Newsletter" \
  --from-name "John Doe" \
  --from-email "john@example.com"
```

## Subscriber Management

```bash
# Add subscriber
npm run subscriber -- add \
  --list-id <LIST_ID> \
  --email user@example.com \
  --first-name John \
  --last-name Doe

# Get subscriber
npm run subscriber -- get \
  --list-id <LIST_ID> \
  --email user@example.com

# Update subscriber
npm run subscriber -- update \
  --list-id <LIST_ID> \
  --email user@example.com \
  --first-name Jane

# Remove subscriber
npm run subscriber -- remove \
  --list-id <LIST_ID> \
  --email user@example.com
```

## Campaign Management

```bash
# List campaigns
npm run campaign -- list --status sent

# Create campaign
npm run campaign -- create \
  --list-id <LIST_ID> \
  --title "Monthly Newsletter" \
  --subject "September Update" \
  --from-name "John Doe" \
  --from-email "john@example.com"

# Send campaign
npm run campaign -- send --campaign-id <CAMPAIGN_ID>

# Get stats
npm run campaign -- stats --campaign-id <CAMPAIGN_ID>
```

## Automation

```bash
# List automations
npm run automation -- list
```

## Analytics

```bash
# Get account statistics
npm run analytics -- account
```

## Common Workflows

### Create Newsletter List

```bash
# 1. Create list
npm run list -- create \
  --name "Monthly Newsletter" \
  --from-name "Marketing Team" \
  --from-email "newsletter@example.com"

# 2. Add subscribers
npm run subscriber -- add --list-id LIST_ID --email user@example.com

# 3. Verify subscribers
npm run list -- members --list-id LIST_ID
```

### Send Campaign

```bash
# 1. Create campaign
npm run campaign -- create \
  --list-id LIST_ID \
  --title "Welcome Campaign" \
  --subject "Welcome!" \
  --from-name "John" \
  --from-email "john@example.com"

# 2. Send campaign
npm run campaign -- send --campaign-id CAMPAIGN_ID

# 3. Check stats
npm run campaign -- stats --campaign-id CAMPAIGN_ID
```

## Environment Variables

### Required

```bash
MAILCHIMP_API_KEY=key-us1abc123...    # API key from mailchimp.com/account/
MAILCHIMP_SERVER_PREFIX=us1            # Server prefix (us1, us2, eu1, etc.)
```

### Optional

```bash
MAILCHIMP_LIST_ID=abc123def456        # Default list ID
MAILCHIMP_TIMEOUT=10000               # Request timeout (ms)
MAILCHIMP_RATE_LIMIT=10               # Rate limit per minute
```

## Troubleshooting

### Invalid API Key

```bash
# Solution: Verify key format
npm run auth -- verify

# Regenerate at: mailchimp.com/account/ → Extras → API Keys
```

### List Not Found

```bash
# Solution: Get correct list ID
npm run list -- all
```

### Rate Limit Exceeded

```bash
# Solution: Increase rate limit in .env
MAILCHIMP_RATE_LIMIT=20
```

## Resources

- **Account:** [mailchimp.com/account/](https://mailchimp.com/account/)
- **API Docs:** [mailchimp.com/developer/marketing/api/](https://mailchimp.com/developer/marketing/api/)
- **Pricing:** [mailchimp.com/pricing/](https://mailchimp.com/pricing/)
- **Help:** [mailchimp.com/help/](https://mailchimp.com/help/)
