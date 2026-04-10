# WhatsApp Business Integration - Quick Reference

Complete command reference for the WhatsApp Business API CLI.

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

## Send Messages

### Text Message

```bash
npm run send -- text \
  --phone "15551234567" \
  --message "Hello from WhatsApp!"
```

### Media Message (Image, Video, Audio, Document)

```bash
# Send image
npm run send -- media \
  --phone "15551234567" \
  --type "image" \
  --url "https://example.com/image.jpg" \
  --caption "Check this out!"

# Send document
npm run send -- media \
  --phone "15551234567" \
  --type "document" \
  --url "https://example.com/invoice.pdf" \
  --caption "Your invoice"
```

## Template Messages

```bash
# Send template message
npm run message -- template \
  --phone "15551234567" \
  --template "order_confirmation" \
  --language "en_US" \
  --parameters '["Order123", "Jane Doe"]'

# List available templates
npm run message -- list
```

## Contact Management

```bash
# Add contact
npm run contact -- add \
  --phone "15551234567" \
  --first-name "John" \
  --last-name "Doe"

# Get contact info
npm run contact -- get --phone "15551234567"
```

## Business Profile

```bash
# Set business profile
npm run business -- profile \
  --name "My Store" \
  --description "Welcome to my store!" \
  --category "ECOMMERCE"
```

## Environment Variables

### Required

```bash
WHATSAPP_API_TOKEN=your_bearer_token              # From Cloud Dashboard
WHATSAPP_PHONE_NUMBER_ID=your_phone_id            # From Phone Numbers section
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id         # From Settings section
```

### Optional

```bash
WHATSAPP_DEFAULT_RECIPIENT=15551234567            # Default test number
WHATSAPP_WEBHOOK_TOKEN=your_webhook_token         # For webhook verification
WHATSAPP_WEBHOOK_URL=https://your-domain.com/webhook
WHATSAPP_TIMEOUT=30000                            # Request timeout (ms)
WHATSAPP_RATE_LIMIT=60                            # Messages per minute
WHATSAPP_ENVIRONMENT=cloud                        # cloud or on-premises
```

## Common Workflows

### Send Order Confirmation

```bash
# 1. Send template message
npm run message -- template \
  --phone "15551234567" \
  --template "order_confirmation" \
  --language "en_US" \
  --parameters '["ORDER123", "Jane Doe"]'

# 2. Send invoice as document
npm run send -- media \
  --phone "15551234567" \
  --type "document" \
  --url "https://example.com/invoices/ORDER123.pdf" \
  --caption "Your invoice"
```

### Send Marketing Campaign

```bash
# 1. Add contacts
npm run contact -- add --phone "15551111111" --first-name "Alice"
npm run contact -- add --phone "15552222222" --first-name "Bob"

# 2. Send promotional template
npm run message -- template \
  --phone "15551111111" \
  --template "weekly_promo" \
  --language "en_US" \
  --parameters '["50% OFF"]'
```

### Customer Support Response

```bash
# Acknowledge inquiry
npm run send -- text \
  --phone "15551234567" \
  --message "Thanks for contacting us. We'll respond within 2 hours."

# Send FAQ document
npm run send -- media \
  --phone "15551234567" \
  --type "document" \
  --url "https://help.example.com/faq.pdf" \
  --caption "Frequently Asked Questions"
```

## Account Tiers

| Feature | Standard | Business | Enterprise |
|---------|----------|----------|------------|
| Text Messaging | ✅ | ✅ | ✅ |
| Media Messages | ✅ | ✅ | ✅ |
| Message Templates | Limited | Unlimited | Unlimited |
| Team Collaboration | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ |
| On-Premises | ❌ | ❌ | ✅ |
| Message Rate | 1/sec | 60/sec | Unlimited |

## Troubleshooting

### Invalid API Token

```bash
# Regenerate token:
# 1. Go to: https://developers.facebook.com/
# 2. Dashboard → Your App → Settings
# 3. Create new System User and token
# 4. Update .env with new token
```

### Phone Not Verified

```bash
# Complete verification:
# 1. Dashboard → Phone Numbers
# 2. Select your number
# 3. Complete SMS or phone verification
# 4. Copy Phone Number ID
```

### Rate Limit Exceeded

```bash
# Increase rate limit in .env:
# Standard: 1 message/second
# Business: 60 messages/second
# Enterprise: Unlimited
# Solution: Upgrade tier or implement queue
```

### Template Not Found

```bash
# List available templates:
npm run message -- list

# Create template:
# 1. Dashboard → Message Templates
# 2. Create template
# 3. Wait for approval
# 4. Use template name in commands
```

## Resources

- **Dashboard:** [developers.facebook.com](https://developers.facebook.com/)
- **API Docs:** [Cloud API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- **Getting Started:** [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- **Templates:** [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-messaging-api/message-templates)
- **Webhooks:** [Webhook Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/subscribe-to-webhook-events)
- **Pricing:** [WhatsApp Pricing](https://www.whatsapp.com/business/pricing/)
