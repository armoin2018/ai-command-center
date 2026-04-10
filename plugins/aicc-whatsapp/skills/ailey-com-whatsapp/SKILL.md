---
id: ailey-com-whatsapp
name: WhatsApp Business Integration
description: Comprehensive WhatsApp Business API integration with account tier detection, message automation, media handling, and webhook support. Supports Cloud (Standard/Business) and on-premises (Enterprise) deployments with automatic tier detection and feature availability mapping.
keywords:
  - whatsapp
  - messaging
  - business
  - automation
  - api
  - integration
  - webhook
  - templates
  - media
tools:
  - axios
  - commander
  - dotenv
---

# WhatsApp Business Integration

## Overview

Complete WhatsApp Business API integration for AI-ley enabling two-way messaging, message automation, template management, media handling, and webhook-based event processing. Automatically detects account tier (Cloud Standard/Business or Enterprise) and maps available features accordingly.

**Setup Time:** 15-30 minutes  
**Difficulty:** Intermediate  
**API Rate:** 1 message/second (Standard), 60 messages/second (Business), unlimited (Enterprise)  
**Pricing:** $0.005-$0.01 per incoming message (Cloud), custom (Enterprise)

## Account Tier Detection

### Tier 1: Cloud Standard
**When:** Free API key with basic messaging  
**Features:**
- ✅ Text message sending/receiving
- ✅ Media messages (limited)
- ✅ Template messages (20 limit)
- ✅ Webhook events
- ✅ Basic contact management
- ✅ Manual phone verification
- ❌ Advanced templates
- ❌ Team collaboration
- ❌ Advanced analytics

**Contact Limit:** Unlimited  
**Cost:** $0.005 per incoming message, free outgoing templates  
**Setup:** [developers.facebook.com](https://developers.facebook.com/)  
**Use Case:** Testing, low-volume, MVP

### Tier 2: Cloud Business
**When:** Business API with enhanced capabilities  
**Features:**
- ✅ All Standard features
- ✅ Unlimited message templates
- ✅ Advanced contact segmentation
- ✅ Scheduled messaging
- ✅ Team collaboration (up to 10 users)
- ✅ Detailed analytics dashboard
- ✅ Message templates library
- ✅ Automated workflows
- ❌ On-premises deployment
- ❌ Dedicated infrastructure
- ❌ Custom compliance

**Contact Limit:** Unlimited  
**Cost:** $0.01 per incoming message, tiered template pricing  
**Setup:** Business Dashboard  
**Use Case:** Growing business, marketing automation

### Tier 3: Enterprise (On-Premises/Dedicated)
**When:** Custom deployment, high volume, compliance requirements  
**Features:**
- ✅ All Business features
- ✅ Dedicated infrastructure
- ✅ Custom deployment options
- ✅ Advanced security & compliance
- ✅ Multi-region support
- ✅ Dedicated support team
- ✅ Custom integrations
- ✅ SLA guarantee
- ✅ Unlimited API rate
- ✅ White-label options

**Contact Limit:** Unlimited  
**Cost:** Custom pricing  
**Setup:** Enterprise sales team  
**Use Case:** Enterprise, regulated industries, high volume

## Feature Availability Matrix

| Feature | Standard | Business | Enterprise |
|---------|----------|----------|------------|
| Text Messages | ✅ | ✅ | ✅ |
| Media Messages | ✅ | ✅ | ✅ |
| Templates | 20 limit | Unlimited | Unlimited |
| Webhooks | ✅ | ✅ | ✅ |
| Contact Management | Basic | Advanced | Advanced+ |
| Scheduling | ❌ | ✅ | ✅ |
| Team Collaboration | ❌ | ✅ | ✅ |
| Analytics | Basic | Advanced | Advanced+ |
| Rate Limit | 1 msg/sec | 60 msg/sec | Unlimited |
| On-Premises | ❌ | ❌ | ✅ |
| Dedicated Support | ❌ | ✅ | ✅ |
| Custom Compliance | ❌ | ❌ | ✅ |
| Multi-Region | ❌ | ❌ | ✅ |

## Installation

```bash
cd .github/skills/ailey-com-whatsapp
npm install
npm run build
```

## Setup Instructions

### Step 1: Get API Credentials

**For Cloud API (Standard/Business):**

1. Visit [developers.facebook.com](https://developers.facebook.com/)
2. Log in or create a developer account
3. Create a new app:
   - Click "Create App"
   - Choose "Business" type
   - Fill in app name and contact email
   - Create app
4. Add WhatsApp product:
   - Dashboard → "Add Product"
   - Search for "WhatsApp"
   - Click "Set Up"
   - Choose "Cloud API"
5. Get credentials:
   - Go to "API Setup" section
   - Copy your Phone Number ID
   - Copy your Business Account ID
   - Click "Create System User"
   - Create token and copy (keep secure!)

**For Enterprise (On-Premises):**

1. Contact WhatsApp Enterprise sales: [WhatsApp Enterprise](https://www.whatsapp.com/business/)
2. Request on-premises deployment
3. Follow enterprise setup guide
4. Configure API endpoints and credentials

### Step 2: Verify Phone Number

1. In Cloud Dashboard, go to "Phone Numbers"
2. Click "Add Phone Number"
3. Choose phone number type (business)
4. Enter your business phone number (with country code)
5. Verify via SMS or phone call
6. Confirm verification
7. Copy Phone Number ID

### Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env with your credentials:
WHATSAPP_API_TOKEN=your_bearer_token_from_dashboard
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_from_dashboard
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id_from_settings
WHATSAPP_ENVIRONMENT=cloud  # or 'on-premises' for Enterprise
```

**Finding Your Credentials:**

| Credential | Location | Format |
|-----------|----------|--------|
| API Token | Dashboard → API Setup → System User Token | Bearer token (long string) |
| Phone Number ID | Dashboard → Phone Numbers → Your Number | 15-20 digit number |
| Business Account ID | Dashboard → Settings → Business Account ID | 15-20 digit number |

### Step 4: Verify Setup

```bash
# Test connection
npm run detect

# Verify API access
npm run auth -- verify

# Run full diagnostics
npm run diagnose
```

### Step 5: Configure Webhook (Optional)

For receiving messages and status updates:

```bash
npm run webhook -- setup \
  --url "https://your-domain.com/webhook" \
  --verify-token "generate_secure_token_here"

# Subscribe to events
npm run webhook -- events \
  --enable "message_received,message_delivered,message_read,message_failed"
```

## Quick Start

### Send Text Message

```bash
npm run send -- \
  --phone "15551234567" \
  --message "Hello from WhatsApp!"
```

### Send Template Message

```bash
npm run message -- template \
  --phone "15551234567" \
  --template "hello_world" \
  --language "en_US"
```

### Send Media Message

```bash
npm run media -- send \
  --phone "15551234567" \
  --type "image" \
  --url "https://example.com/image.jpg" \
  --caption "Check this out!"
```

### Manage Contacts

```bash
# Add contact
npm run contact -- add \
  --phone "15551234567" \
  --first-name "John" \
  --last-name "Doe"

# List all contacts
npm run contact -- list
```

### Configure Business Profile

```bash
npm run business -- profile \
  --name "My Store" \
  --category "ECOMMERCE" \
  --description "Welcome to my store!"

npm run business -- hours \
  --open "09:00" \
  --close "17:00" \
  --timezone "UTC"
```

## API Reference

### Message Types

#### Text Message
```bash
npm run send -- \
  --phone "15551234567" \
  --message "Your message here"
```

#### Template Message
```bash
npm run message -- template \
  --phone "15551234567" \
  --template "template_name" \
  --language "en_US" \
  --parameters '["param1", "param2"]'
```

#### Media Message
```bash
npm run media -- send \
  --phone "15551234567" \
  --type "image|video|audio|document" \
  --url "https://..." \
  --caption "Optional caption"
```

### Contact Management

```bash
# Add contact
npm run contact -- add \
  --phone "15551234567" \
  --first-name "John" \
  --last-name "Doe"

# Get contact
npm run contact -- get --phone "15551234567"

# Update contact
npm run contact -- update \
  --phone "15551234567" \
  --first-name "Jane"

# Delete contact
npm run contact -- remove --phone "15551234567"

# List all contacts
npm run contact -- list
```

## TypeScript Integration

```typescript
import { createWhatsAppClient } from '@ailey/com-whatsapp';

const client = createWhatsAppClient();

// Detect account tier
const account = await client.detectAccountTier();
console.log(`Tier: ${account.tier}`);
console.log(`Features: ${account.features.join(', ')}`);

// Send text message
const msg = await client.sendTextMessage({
  recipientPhone: '15551234567',
  body: 'Hello!'
});

// Send template
const template = await client.sendTemplateMessage({
  recipientPhone: '15551234567',
  templateName: 'order_update',
  language: 'en_US',
  parameters: ['ORDER123', 'Shipped']
});

// Send media
const media = await client.sendMediaMessage({
  recipientPhone: '15551234567',
  type: 'image',
  url: 'https://example.com/image.jpg',
  caption: 'Check this out!'
});

// Webhook handling
client.on('message_received', (message) => {
  console.log(`New message from ${message.from}: ${message.text}`);
});

client.on('message_delivered', (status) => {
  console.log(`Message ${status.messageId} delivered`);
});
```

## Workflows

### Workflow 1: Order Confirmation with Media

```bash
# 1. Send template message
npm run message -- template \
  --phone "15551234567" \
  --template "order_confirmation" \
  --language "en_US" \
  --parameters '["ORDER123", "Jane Doe"]'

# 2. Send invoice
npm run media -- send \
  --phone "15551234567" \
  --type "document" \
  --url "https://example.com/invoice.pdf" \
  --caption "Your invoice"

# 3. Send tracking info (via webhook event)
# Triggered automatically via webhook
```

### Workflow 2: Customer Support Automation

```bash
# 1. Receive message via webhook
# 2. Process in your application
# 3. Send automated response
npm run send -- \
  --phone "15551234567" \
  --message "Thanks for contacting us. We'll respond within 2 hours."

# 4. Send knowledge base link
npm run media -- send \
  --phone "15551234567" \
  --type "document" \
  --url "https://help.example.com/faq.pdf" \
  --caption "FAQ: Common questions and answers"
```

### Workflow 3: Marketing Campaign

```bash
# 1. Add contacts to business
npm run contact -- add \
  --phone "15551111111" \
  --first-name "Alice"

npm run contact -- add \
  --phone "15552222222" \
  --first-name "Bob"

# 2. Send campaign message via template
npm run message -- template \
  --phone "15551111111" \
  --template "weekly_promo" \
  --language "en_US" \
  --parameters '["50% OFF"]'

# 3. Track delivery and engagement via webhooks
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid API Token | Expired or incorrect token | Regenerate at Dashboard → API Setup |
| Phone Not Verified | Number not confirmed | Complete verification in Dashboard |
| Rate Limit Exceeded | Too many messages sent | Wait 1 minute or upgrade tier |
| Template Not Found | Template doesn't exist | Create template in Dashboard |
| Invalid Phone Format | Wrong number format | Use +{country_code}{number} |

## Troubleshooting

### Connection Issues

```bash
# 1. Verify credentials
npm run auth -- verify

# 2. Test API connection
npm run auth -- test

# 3. Run diagnostics
npm run diagnose
```

### Message Not Sending

```bash
# 1. Check phone number format (use +{country_code}{number})
npm run send -- \
  --phone "+15551234567" \
  --message "Test"

# 2. Verify phone number is registered
npm run contact -- get --phone "+15551234567"

# 3. Check rate limits
# Standard tier: 1 message/second
# Business tier: 60 messages/second

# 4. Check template approval status
npm run message -- template --list
```

### Webhook Not Receiving

```bash
# 1. Verify webhook URL is accessible
# 2. Check webhook token configuration
npm run webhook -- setup --url "https://your-domain.com/webhook" --verify-token "token"

# 3. Ensure subscribed to events
npm run webhook -- events --enable "message_received"

# 4. Check firewall/security rules allow WhatsApp IPs
```

## AI-ley Configuration

Add to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  whatsapp:
    enabled: true
    apiToken: ${WHATSAPP_API_TOKEN}
    phoneNumberId: ${WHATSAPP_PHONE_NUMBER_ID}
    businessAccountId: ${WHATSAPP_BUSINESS_ACCOUNT_ID}
    accountTier: auto
    environment: cloud
    webhookToken: ${WHATSAPP_WEBHOOK_TOKEN}
    webhookUrl: ${WHATSAPP_WEBHOOK_URL}
    rateLimit: 60
    features:
      - text_messaging
      - media_messaging
      - template_messages
      - contact_management
      - webhook_events
      - business_profile
      - message_templates
      - automation
```

## Resources

- **Getting Started:** [developers.facebook.com/docs/whatsapp/cloud-api/get-started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- **API Reference:** [developers.facebook.com/docs/whatsapp/cloud-api/reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- **Webhook Reference:** [Webhook Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/subscribe-to-webhook-events)
- **Message Templates:** [Template Guidelines](https://developers.facebook.com/docs/whatsapp/business-messaging-api/message-templates)
- **Pricing:** [WhatsApp Pricing](https://www.whatsapp.com/business/pricing/)
- **Help Center:** [WhatsApp Business Help](https://www.whatsapp.com/business/help/)

## Support

For issues:
1. Run `npm run diagnose` for diagnostics
2. Check [WhatsApp Developers Documentation](https://developers.facebook.com/docs/whatsapp/)
3. Review [API Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/error-codes)
4. Contact WhatsApp Support through your dashboard

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.8

---
