# WhatsApp Business Integration

Comprehensive WhatsApp Business API integration for AI-ley with automatic account tier detection, message management, and business communication capabilities.

## Overview

The WhatsApp Business integration enables seamless two-way communication, message automation, template management, and webhook handling through the official WhatsApp Cloud API. Supports Standard (Cloud), Business, and Enterprise deployment models with automatic tier detection and feature availability mapping.

## Installation

```bash
cd .github/skills/ailey-com-whatsapp
npm install
npm run build
```

## Account Tiers

### Standard (Cloud API)
- **Contact Limit:** Unlimited
- **Monthly Cost:** $0.005 per message (incoming), free for outgoing templates
- **Setup:** Cloud Dashboard at [Facebook Developers](https://developers.facebook.com/)
- **Best For:** Small businesses, testing, low-volume messaging
- **Features:**
  - Text messaging (incoming/outgoing)
  - Media messaging (images, documents)
  - Template messages (pre-approved)
  - Basic webhooks
  - Manual phone verification
  - Support for 1-5 business accounts

### Business (Cloud API + Business Tools)
- **Contact Limit:** Unlimited
- **Monthly Cost:** $0.01 per message (incoming), tiered template pricing
- **Setup:** Business Dashboard with advanced tools
- **Best For:** Growing businesses, marketing automation
- **Features:**
  - All Standard features
  - Advanced contact management
  - Message templates (unlimited)
  - Analytics dashboard
  - Team collaboration (multi-user)
  - Scheduled messaging
  - Support for up to 100 business accounts

### Enterprise (On-Premises or Dedicated Cloud)
- **Contact Limit:** Unlimited
- **Monthly Cost:** Custom pricing
- **Setup:** Dedicated infrastructure or on-premises deployment
- **Best For:** Large enterprises, custom requirements
- **Features:**
  - All Business features
  - Dedicated support
  - Custom integrations
  - Advanced security
  - Multi-region deployment
  - SLA guarantee
  - Unlimited business accounts
  - Custom compliance

## Quick Start

### 1. Get API Access

**For Cloud API:**
1. Visit [developers.facebook.com](https://developers.facebook.com/)
2. Create a developer account if you don't have one
3. Create an app (choose "Business" type)
4. Add "WhatsApp" product
5. Get your API token and phone number ID

**For On-Premises:**
1. Contact WhatsApp Enterprise sales
2. Follow deployment instructions
3. Configure API endpoints

### 2. Setup

```bash
# View setup instructions
npm run setup

# This will guide you through:
# - Getting API credentials
# - Configuring environment variables
# - Verifying phone number
# - Testing connection
```

### 3. Configure Environment

```bash
cp .env.example .env

# Edit .env with your credentials:
WHATSAPP_API_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id_here
```

### 4. Verify Setup

```bash
# Detect account tier
npm run detect

# Test connection
npm run auth -- verify

# Run diagnostics
npm run diagnose
```

## Features

- ✅ **Account Tier Detection** - Automatic Cloud/Business/Enterprise detection
- ✅ **Text Messaging** - Send and receive text messages
- ✅ **Media Messages** - Support for images, documents, audio, video
- ✅ **Message Templates** - Pre-approved message templates
- ✅ **Webhooks** - Receive incoming messages and status updates
- ✅ **Contact Management** - Manage and segment contacts
- ✅ **Business Profiles** - Configure business information
- ✅ **Analytics** - Track message delivery and engagement
- ✅ **Automation** - Message scheduling and workflows
- ✅ **Error Handling** - Comprehensive error detection and recovery

## API Commands

### Setup & Authentication

```bash
npm run setup                 # Interactive setup wizard
npm run detect               # Detect account tier
npm run auth -- verify       # Verify API access
npm run auth -- info         # Show account info
npm run auth -- test         # Test connection
npm run diagnose             # Run diagnostics
```

### Message Management

```bash
npm run send -- \
  --phone "1234567890" \
  --message "Hello from WhatsApp!"

npm run message -- template \
  --phone "1234567890" \
  --template "hello_world" \
  --language "en_US"
```

### Media Messages

```bash
npm run media -- send \
  --phone "1234567890" \
  --type "image" \
  --url "https://example.com/image.jpg"
```

### Contact Management

```bash
npm run contact -- add \
  --phone "1234567890" \
  --first-name "John" \
  --last-name "Doe"

npm run contact -- list
```

### Business Configuration

```bash
npm run business -- profile \
  --name "My Business" \
  --category "ECOMMERCE"

npm run business -- hours \
  --open "09:00" \
  --close "17:00"
```

## Usage Examples

### Send Text Message

```bash
npm run send -- \
  --phone "15551234567" \
  --message "Hello! This is a test message."
```

### Send Template Message

```bash
npm run message -- template \
  --phone "15551234567" \
  --template "order_confirmation" \
  --language "en_US" \
  --parameters '["John", "ORDER123"]'
```

### Send Media Message

```bash
npm run media -- send \
  --phone "15551234567" \
  --type "document" \
  --url "https://example.com/invoice.pdf" \
  --caption "Your invoice"
```

### Setup Webhook

```bash
npm run webhook -- setup \
  --url "https://your-domain.com/webhook" \
  --verify-token "your_token_here"

npm run webhook -- events \
  --enable "message_received,message_delivered,message_read"
```

## AI-ley Integration

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
    features:
      - messaging
      - templates
      - media
      - webhooks
      - contacts
      - business_profile
      - analytics
```

## TypeScript Usage

```typescript
import { createWhatsAppClient } from '@ailey/com-whatsapp';

const client = createWhatsAppClient();

// Detect account
const account = await client.detectAccountTier();
console.log(`Tier: ${account.tier}`);

// Send message
const message = await client.sendTextMessage({
  recipientPhone: '15551234567',
  body: 'Hello from WhatsApp!'
});

// Send template message
const templateMsg = await client.sendTemplateMessage({
  recipientPhone: '15551234567',
  templateName: 'order_confirmation',
  language: 'en_US',
  parameters: ['John Doe', 'ORDER123']
});
```

## Documentation

- [SKILL.md](SKILL.md) - Complete documentation
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [SUMMARY.md](SUMMARY.md) - Project overview

## Resources

- **Developers:** [developers.facebook.com/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Cloud API Docs:** [Cloud API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- **Getting Started:** [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- **Pricing:** [WhatsApp Pricing](https://www.whatsapp.com/business/pricing/)
- **Help Center:** [WhatsApp Business Help](https://www.whatsapp.com/business/help/)

## Support

For issues:
1. Run `npm run diagnose`
2. Check [WhatsApp Developers Documentation](https://developers.facebook.com/docs/whatsapp/)
3. Review [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

---

**Version**: 1.0.0  
**Updated**: 2026-02-01  
**License**: MIT
