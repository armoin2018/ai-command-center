# Mailchimp Email Marketing Manager

Comprehensive Mailchimp integration with automatic account tier detection and complete email marketing capabilities.

## Features

- ✅ **Account Tier Detection** - Automatic detection of Free/Standard/Pro/Premium
- ✅ **Campaign Management** - Create, send, and track email campaigns
- ✅ **Subscriber Management** - Add, update, and segment subscribers
- ✅ **Automation Workflows** - Build automated email sequences
- ✅ **Analytics & Reporting** - Track opens, clicks, and engagement
- ✅ **List Management** - Organize and manage mailing lists
- ✅ **API-First Design** - Full REST API integration

## Quick Start

### 1. Installation

```bash
cd .github/skills/ailey-com-mailchimp
npm install
```

### 2. Setup

```bash
# View comprehensive setup instructions
npm run setup

# This will guide you through:
# - Getting your API key
# - Extracting server prefix
# - Configuring environment
# - Verifying connection
```

### 3. Get API Key

1. Go to [mailchimp.com/account/](https://mailchimp.com/account/)
2. Click **Extras** → **API Keys**
3. Click **Create A Key** or copy existing
4. Format: `key-us1` (includes server prefix)

### 4. Configure Environment

```bash
cp .env.example .env

# Edit .env with your credentials:
MAILCHIMP_API_KEY=your_key_here
MAILCHIMP_SERVER_PREFIX=us1  # Extract from key suffix
```

### 5. Verify Setup

```bash
# Detect account tier
npm run detect

# Test connection
npm run auth -- test

# Run diagnostics
npm run diagnose
```

## Account Tiers

### Free (500 Contacts)
- ✅ Email campaigns
- ✅ Basic segmentation
- ✅ Automation workflows
- ✅ Basic analytics
- ❌ Advanced features

### Standard (10,000+ Contacts)
- ✅ All Free features
- ✅ Advanced segmentation
- ✅ A/B testing
- ✅ Enhanced analytics
- ✅ Custom branding

### Pro (250,000+ Contacts)
- ✅ All Standard features
- ✅ Predictive analytics
- ✅ SMS marketing
- ✅ Advanced automation
- ✅ Priority support

### Premium (1M+ Contacts)
- ✅ All Pro features
- ✅ Dedicated support
- ✅ Custom integrations
- ✅ Advanced compliance

## Basic Usage

### List Management

```bash
# List all mailing lists
npm run list -- all

# Create new list
npm run list -- create \
  --name "Newsletter" \
  --from-name "John Doe" \
  --from-email "john@example.com"

# Get list details
npm run list -- get --list-id LIST_ID
```

### Subscriber Management

```bash
# Add subscriber
npm run subscriber -- add \
  --list-id LIST_ID \
  --email user@example.com \
  --first-name John

# Get subscriber info
npm run subscriber -- get \
  --list-id LIST_ID \
  --email user@example.com

# Update subscriber
npm run subscriber -- update \
  --list-id LIST_ID \
  --email user@example.com \
  --first-name Jane
```

### Campaign Management

```bash
# Create campaign
npm run campaign -- create \
  --list-id LIST_ID \
  --title "Newsletter" \
  --subject "Monthly Update" \
  --from-name "John Doe" \
  --from-email "john@example.com"

# Send campaign
npm run campaign -- send --campaign-id CAMPAIGN_ID

# Get stats
npm run campaign -- stats --campaign-id CAMPAIGN_ID
```

## AI-ley Integration

Add to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  mailchimp:
    enabled: true
    apiKey: ${MAILCHIMP_API_KEY}
    serverPrefix: ${MAILCHIMP_SERVER_PREFIX}
    accountTier: auto
    features:
      - campaigns
      - automation
      - subscribers
      - analytics
```

## TypeScript Usage

```typescript
import { createMailchimpClient } from '@ailey/com-mailchimp';

const client = createMailchimpClient();

// Detect account
const account = await client.detectAccountTier();
console.log(`Tier: ${account.tier}`);

// Create campaign
const campaign = await client.createCampaign({
  type: 'regular',
  listId: 'YOUR_LIST_ID',
  title: 'Welcome',
  subject: 'Welcome!',
  fromName: 'John',
  fromEmail: 'john@example.com'
});

await client.sendCampaign(campaign.id);
```

## Documentation

- [SKILL.md](SKILL.md) - Complete documentation
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [SUMMARY.md](SUMMARY.md) - Project overview

## Resources

- **Account Settings:** [mailchimp.com/account/](https://mailchimp.com/account/)
- **API Reference:** [mailchimp.com/developer/marketing/api/](https://mailchimp.com/developer/marketing/api/)
- **Pricing:** [mailchimp.com/pricing/](https://mailchimp.com/pricing/)
- **Help Center:** [mailchimp.com/help/](https://mailchimp.com/help/)

## Support

For issues:
1. Run `npm run diagnose`
2. Check [Mailchimp Help Center](https://mailchimp.com/help/)
3. Review [API Documentation](https://mailchimp.com/developer/marketing/api/)

---

**Version**: 1.0.0  
**Updated**: 2026-02-01  
**License**: MIT
