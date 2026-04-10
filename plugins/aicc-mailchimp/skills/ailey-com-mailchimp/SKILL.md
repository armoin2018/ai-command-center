---
id: ailey-com-mailchimp
name: Mailchimp Email Marketing Manager
description: Comprehensive Mailchimp integration for email marketing campaigns, subscriber management, automation workflows, and analytics. Includes automatic account tier detection (Free/Standard/Pro/Premium), setup instructions, and AI-ley configuration guidance. Use when managing email campaigns, subscriber lists, marketing automation, or analyzing email performance.
keywords: [mailchimp, email marketing, campaigns, subscribers, automation, analytics, newsletter, segmentation, email lists]
tools: [mailchimp-client, campaign-management, subscriber-management, automation, analytics, list-management]
---

# Mailchimp Email Marketing Manager

Comprehensive Mailchimp integration with intelligent account tier detection and multi-tier feature support. Automatically detects plan level and provides upgrade guidance.

## Overview

Mailchimp's platform operates on a tier system with different feature sets and contact limits. This skill:

- **Automatically detects** your account plan tier (Free/Standard/Pro/Premium)
- **Adapts features** based on available tier capabilities
- **Provides upgrade paths** for advanced features
- **Works immediately** with Free tier (500 contacts)
- **Scales up** with paid plan tiers
- **Monitors** contact usage and limits

## When to Use

- Creating and sending email campaigns
- Managing subscriber lists and segmentation
- Building automated email workflows
- Analyzing campaign performance metrics
- Growing email marketing audiences
- Personalizing email content
- A/B testing email campaigns
- Tracking engagement and conversions

## Installation

```bash
cd .github/skills/ailey-com-mailchimp
npm install
```

## Configuration

### 1. Create Mailchimp Account

Visit [mailchimp.com](https://mailchimp.com) and sign up for an account (Free tier available).

### 2. Generate API Key

1. Log in to Mailchimp
2. Go to **Account** → **Extras** → **API Keys**
3. Click **Create A Key**
4. Copy your API key (format: `key-us1`)
5. Note the server prefix (e.g., `us1` from `key-us1`)

### 3. Environment Setup

Create `.env` file:

```env
MAILCHIMP_API_KEY=your_api_key_here
MAILCHIMP_SERVER_PREFIX=us1  # Extract from API key suffix
MAILCHIMP_LIST_ID=your_default_list_id  # Optional
MAILCHIMP_TIMEOUT=10000
MAILCHIMP_RATE_LIMIT=10
```

### 4. Add to AI-ley Configuration

Edit `.github/aicc/aicc.yaml`:

```yaml
integrations:
  mailchimp:
    enabled: true
    apiKey: ${MAILCHIMP_API_KEY}
    serverPrefix: ${MAILCHIMP_SERVER_PREFIX}
    accountTier: auto  # Automatically detected
    defaultListId: ${MAILCHIMP_LIST_ID}
    quotaMonitoring: true
    features:
      - campaigns
      - automation
      - subscribers
      - analytics
```

## Account Tiers & Features

### Free Tier (500 Contacts)

**What you get:**
- Up to 500 contacts
- 1,000 email sends per month  
- Basic email templates
- Marketing CRM
- Website builder
- Basic reporting

**Limitations:**
- No advanced segmentation
- No A/B testing
- No multivariate testing
- Limited automation
- Mailchimp branding on emails

**API Access:** ✅ Full REST API access

**Cost:** Free

---

### Standard Tier (10,000+ Contacts)

**What you get:**
- Up to 10,000 contacts (can upgrade to 50K+)
- 12x email sends per month (based on contact count)
- All Free features PLUS:
- Advanced segmentation
- A/B testing
- Custom branding
- Enhanced analytics
- Landing pages
- Behavioral targeting
- Send time optimization

**Limitations:**
- No predictive analytics
- No advanced automation
- No SMS marketing
- Limited support

**API Access:** ✅ Full REST API access with priority

**Cost:** Starting at $20/month

**Upgrade:** [mailchimp.com/pricing/](https://mailchimp.com/pricing/)

---

### Pro Tier (250,000+ Contacts)

**What you get:**
- Up to 250,000 contacts
- Unlimited email sends
- All Standard features PLUS:
- Predictive analytics
- Advanced automation
- Multivariate testing
- SMS marketing (add-on)
- Priority support
- Comparative reporting
- Dynamic content

**Limitations:**
- No dedicated support
- No custom contracts

**API Access:** ✅ Full REST API with priority support

**Cost:** Starting at $350/month

**Upgrade:** [mailchimp.com/pricing/](https://mailchimp.com/pricing/)

---

### Premium Tier (1M+ Contacts)

**What you get:**
- 1,000,000+ contacts (custom limits)
- Unlimited email sends
- All Pro features PLUS:
- Dedicated account manager
- Custom integrations
- White-label options
- Advanced compliance tools
- 24/7 phone support
- Onboarding assistance

**API Access:** ✅ Full REST API with dedicated support

**Cost:** Custom pricing (contact sales)

**Upgrade:** [mailchimp.com/contact/](https://mailchimp.com/contact/)

---

## Quick Start

### 1. Verify Setup

```bash
npm run detect
```

This will show your account tier and available features.

### 2. Authenticate

```bash
npm run auth -- verify
```

### 3. Create Your First List

```bash
npm run list -- create \
  --name "Newsletter" \
  --from-name "Your Name" \
  --from-email "you@example.com"
```

### 4. Add Subscribers

```bash
npm run subscriber -- add \
  --list-id YOUR_LIST_ID \
  --email subscriber@example.com \
  --first-name John
```

### 5. Create Campaign

```bash
npm run campaign -- create \
  --list-id YOUR_LIST_ID \
  --title "Welcome Email" \
  --subject "Welcome to our newsletter" \
  --from-name "Your Name" \
  --from-email "you@example.com"
```

## API Commands

### Account Management

```bash
# Detect account tier
npm run detect

# Get account info
npm run auth -- info

# Verify API key
npm run auth -- verify

# Test connection
npm run auth -- test

# Run diagnostics
npm run diagnose
```

### List Management

```bash
# List all mailing lists
npm run list -- all

# Get list details
npm run list -- get --list-id LIST_ID

# Create new list
npm run list -- create \
  --name "My Newsletter" \
  --from-name "John Doe" \
  --from-email "john@example.com"

# Get list stats
npm run list -- stats --list-id LIST_ID

# Get list members
npm run list -- members --list-id LIST_ID --status subscribed --limit 100
```

### Subscriber Management

```bash
# Add subscriber
npm run subscriber -- add \
  --list-id LIST_ID \
  --email user@example.com \
  --first-name John \
  --last-name Doe \
  --status subscribed

# Get subscriber info
npm run subscriber -- get --list-id LIST_ID --email user@example.com

# Update subscriber
npm run subscriber -- update \
  --list-id LIST_ID \
  --email user@example.com \
  --first-name Jane \
  --status unsubscribed

# Remove subscriber
npm run subscriber -- remove --list-id LIST_ID --email user@example.com
```

### Campaign Management

```bash
# List campaigns
npm run campaign -- list --status sent --limit 20

# Create campaign
npm run campaign -- create \
  --list-id LIST_ID \
  --title "Monthly Newsletter" \
  --subject "Your Monthly Update" \
  --from-name "John Doe" \
  --from-email "john@example.com"

# Get campaign details
npm run campaign -- get --campaign-id CAMPAIGN_ID

# Send campaign
npm run campaign -- send --campaign-id CAMPAIGN_ID

# Get campaign stats
npm run campaign -- stats --campaign-id CAMPAIGN_ID
```

### Automation

```bash
# List automations
npm run automation -- list

# Get automation details
npm run automation -- get --automation-id AUTO_ID

# Start automation
npm run automation -- start --automation-id AUTO_ID

# Pause automation
npm run automation -- pause --automation-id AUTO_ID
```

### Analytics

```bash
# Get account statistics
npm run analytics -- account

# Get list analytics
npm run analytics -- list --list-id LIST_ID

# Get campaign analytics
npm run analytics -- campaign --campaign-id CAMPAIGN_ID
```

## Usage in AI-ley Skills

### TypeScript Integration

```typescript
import { createMailchimpClient } from '@ailey/com-mailchimp';

const client = createMailchimpClient();

// Detect account tier
const account = await client.detectAccountTier();
console.log(`Account: ${account.tier} (${account.contactLimit} contacts)`);

// Create mailing list
const list = await client.createList({
  name: 'Newsletter',
  permissionReminder: 'You signed up for our newsletter',
  contact: {
    company: 'My Company',
    address1: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'US'
  },
  campaignDefaults: {
    fromName: 'John Doe',
    fromEmail: 'john@example.com',
    subject: 'Newsletter Update',
    language: 'en'
  }
});

// Add subscriber
await client.addSubscriber(list.id, {
  email: 'subscriber@example.com',
  status: 'subscribed',
  mergeFields: {
    FNAME: 'Jane',
    LNAME: 'Smith'
  }
});

// Create and send campaign
const campaign = await client.createCampaign({
  type: 'regular',
  listId: list.id,
  title: 'Welcome Campaign',
  subject: 'Welcome to our newsletter!',
  fromName: 'John Doe',
  fromEmail: 'john@example.com'
});

await client.sendCampaign(campaign.id);

// Get campaign stats
const stats = await client.getCampaignStats(campaign.id);
console.log(`Opens: ${stats.opens}, Clicks: ${stats.clicks}`);
```

## Workflows

### Workflow 1: Newsletter Setup

Create and configure a newsletter list:

```bash
# 1. Create list
npm run list -- create \
  --name "Monthly Newsletter" \
  --from-name "Marketing Team" \
  --from-email "newsletter@example.com"

# 2. Note the List ID from output

# 3. Add initial subscribers
npm run subscriber -- add --list-id LIST_ID --email user1@example.com --first-name Alice
npm run subscriber -- add --list-id LIST_ID --email user2@example.com --first-name Bob

# 4. Verify subscribers
npm run list -- members --list-id LIST_ID
```

### Workflow 2: Send Campaign

Create and send an email campaign:

```bash
# 1. Create campaign
npm run campaign -- create \
  --list-id LIST_ID \
  --title "September Newsletter" \
  --subject "Your September Update" \
  --from-name "John Doe" \
  --from-email "john@example.com"

# 2. Note Campaign ID from output

# 3. Send campaign
npm run campaign -- send --campaign-id CAMPAIGN_ID

# 4. Check stats (wait a few hours for data)
npm run campaign -- stats --campaign-id CAMPAIGN_ID
```

### Workflow 3: Automation Setup

Create automated welcome series:

```bash
# 1. List existing automations
npm run automation -- list

# 2. Create automation (via Mailchimp web UI)
# Go to: mailchimp.com → Automations → Create

# 3. Start automation
npm run automation -- start --automation-id AUTO_ID

# 4. Monitor performance
npm run automation -- get --automation-id AUTO_ID
```

### Workflow 4: Subscriber Management

Manage your subscriber list:

```bash
# 1. Import subscribers
for email in user1@example.com user2@example.com user3@example.com; do
  npm run subscriber -- add --list-id LIST_ID --email "$email"
done

# 2. View all subscribers
npm run list -- members --list-id LIST_ID --status subscribed

# 3. Update a subscriber
npm run subscriber -- update \
  --list-id LIST_ID \
  --email user1@example.com \
  --first-name "Alice"

# 4. Remove unsubscribed
npm run subscriber -- remove --list-id LIST_ID --email user3@example.com
```

## Setup Instructions

### Getting Your API Key

1. **Login to Mailchimp**
   - Visit [mailchimp.com](https://mailchimp.com)
   - Sign in to your account

2. **Navigate to API Keys**
   - Click your profile icon (top right)
   - Select **Account**
   - Click **Extras** → **API Keys**

3. **Create API Key**
   - Click **Create A Key**
   - Copy the generated key (format: `key-us1`)
   - **Important:** Save this key securely - it won't be shown again

4. **Extract Server Prefix**
   - Your API key format: `YOUR_KEY-us1`
   - Server prefix: `us1` (the part after the dash)
   - Common prefixes: `us1`, `us2`, `us3`, `us19`, `eu1`, `ca1`

### Missing API Access

If you don't see API Keys in your account:

1. **Verify Account Status**
   - Ensure your account is fully activated
   - Complete email verification
   - Add payment method (if on paid plan)

2. **Check Plan Requirements**
   - API access available on all tiers (including Free)
   - If unavailable, contact Mailchimp support

3. **Contact Support**
   - Visit: [mailchimp.com/contact/](https://mailchimp.com/contact/)
   - Select: Technical Support
   - Request: API access enablement

### Configuring AI-ley

Add Mailchimp integration to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  mailchimp:
    # Enable integration
    enabled: true
    
    # Authentication (from .env)
    apiKey: ${MAILCHIMP_API_KEY}
    serverPrefix: ${MAILCHIMP_SERVER_PREFIX}
    
    # Account settings
    accountTier: auto  # Auto-detect: free, standard, pro, premium
    
    # Default list (optional)
    defaultListId: ${MAILCHIMP_LIST_ID}
    
    # Features to enable
    features:
      - campaigns      # Email campaigns
      - automation     # Automated workflows
      - subscribers    # Subscriber management
      - analytics      # Performance analytics
      - segmentation   # Audience segmentation (Standard+)
      - testing        # A/B testing (Standard+)
    
    # API settings
    timeout: 10000          # Request timeout (ms)
    rateLimit: 10           # Requests per minute
    retryAttempts: 3        # Retry failed requests
    
    # Quota monitoring
    quotaMonitoring: true
    quotaWarningThreshold: 80  # Warn at 80% contact limit
```

## Troubleshooting

### Invalid API Key

**Error:** `Authentication failed`

**Solution:**
1. Verify API key format: `key-us1` (must include server prefix)
2. Check server prefix matches key suffix
3. Regenerate API key if needed
4. Ensure no extra spaces in `.env` file

### List Not Found

**Error:** `Resource not found`

**Solution:**
1. Verify list ID: `npm run list -- all`
2. Check list wasn't deleted
3. Ensure list belongs to your account

### Rate Limit Exceeded

**Error:** `Rate limit exceeded`

**Solution:**
1. Reduce request frequency
2. Increase `MAILCHIMP_RATE_LIMIT` in `.env`
3. Upgrade to higher tier for increased limits

### Contact Limit Reached

**Error:** `Contact limit exceeded`

**Solution:**
1. Check current usage: `npm run analytics -- account`
2. Remove inactive subscribers
3. Upgrade plan tier for higher limits
4. Archive old campaigns to reduce contacts

## Feature Availability Matrix

| Feature | Free | Standard | Pro | Premium |
|---------|------|----------|-----|---------|
| **Contacts** | 500 | 10K+ | 250K+ | 1M+ |
| **Email Sends/Month** | 1,000 | 12x contacts | Unlimited | Unlimited |
| **API Access** | ✅ | ✅ | ✅ | ✅ |
| **Campaign Creation** | ✅ | ✅ | ✅ | ✅ |
| **Basic Automation** | ✅ | ✅ | ✅ | ✅ |
| **Basic Segmentation** | ✅ | ✅ | ✅ | ✅ |
| **Advanced Segmentation** | ❌ | ✅ | ✅ | ✅ |
| **A/B Testing** | ❌ | ✅ | ✅ | ✅ |
| **Multivariate Testing** | ❌ | ❌ | ✅ | ✅ |
| **Predictive Analytics** | ❌ | ❌ | ✅ | ✅ |
| **SMS Marketing** | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **Dedicated Support** | ❌ | ❌ | ❌ | ✅ |

## Resources

- **Account Settings:** [mailchimp.com/account/](https://mailchimp.com/account/)
- **API Keys:** [mailchimp.com/account/](https://mailchimp.com/account/) → Extras → API Keys
- **API Documentation:** [mailchimp.com/developer/marketing/api/](https://mailchimp.com/developer/marketing/api/)
- **Pricing:** [mailchimp.com/pricing/](https://mailchimp.com/pricing/)
- **Help Center:** [mailchimp.com/help/](https://mailchimp.com/help/)
- **Contact Support:** [mailchimp.com/contact/](https://mailchimp.com/contact/)
- **Status Page:** [status.mailchimp.com/](https://status.mailchimp.com/)

## Support

For issues or questions:

1. Run diagnostics: `npm run diagnose`
2. Check [Mailchimp Help Center](https://mailchimp.com/help/)
3. Review [API Reference](https://mailchimp.com/developer/marketing/api/)
4. Contact [Mailchimp Support](https://mailchimp.com/contact/)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
---
