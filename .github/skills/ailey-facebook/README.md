# AI-ley Facebook Integration - Quick Reference

Comprehensive Facebook and Instagram integration via Graph API.

## Quick Setup

1. **Install dependencies:**
   ```bash
   cd .github/skills/ailey-facebook
   npm install
   ```

2. **Get access token:**
   - Go to https://developers.facebook.com/tools/explorer/
   - Select your app
   - Generate token with required permissions

3. **Configure environment:**
   ```bash
   echo "FACEBOOK_ACCESS_TOKEN=your_token_here" > .env
   ```

4. **Test connection:**
   ```bash
   npm run facebook test
   ```

## Common Commands

### Personal Features

```bash
# Profile
npm run facebook personal profile show

# Posts
npm run facebook personal posts create --message "Hello!"
npm run facebook personal posts create --message "Check this out" --link "https://example.com"

# Photos
npm run facebook personal photos upload photo.jpg --message "Caption"

# Friends & Groups
npm run facebook personal friends list
npm run facebook personal groups list
npm run facebook personal groups post GROUP_ID --message "Update"

# Events
npm run facebook personal events list
npm run facebook personal events create --name "Meeting" --start-time "2026-02-15T14:00:00Z"
```

### Business Features

```bash
# Pages
npm run facebook business pages list
npm run facebook business pages publish PAGE_ID --message "Business update"
npm run facebook business pages posts PAGE_ID

# Leads
npm run facebook business leads forms PAGE_ID
npm run facebook business leads get FORM_ID --output leads.csv

# Instagram
npm run facebook business instagram account PAGE_ID
npm run facebook business instagram publish IG_ACCOUNT_ID --image-url "URL" --caption "Post"
npm run facebook business instagram insights IG_ACCOUNT_ID

# Messenger
npm run facebook business messenger send RECIPIENT_ID --message "Hello"
npm run facebook business messenger conversations PAGE_ID
```

### Advertising

```bash
# Ad Accounts & Campaigns
npm run facebook ads accounts list
npm run facebook ads campaigns list AD_ACCOUNT_ID
npm run facebook ads campaigns create AD_ACCOUNT_ID --name "Campaign" --objective "OUTCOME_TRAFFIC"
npm run facebook ads campaigns insights CAMPAIGN_ID
```

### Analytics

```bash
# Page Insights
npm run facebook analytics page insights PAGE_ID --metrics "page_impressions,page_engaged_users"
npm run facebook analytics page summary PAGE_ID --days 30

# Post Performance
npm run facebook analytics post performance PAGE_ID --output report.csv

# Metrics Reference
npm run facebook analytics metrics
```

## TypeScript API

```typescript
import { FacebookClient, loadConfig } from './scripts/facebook-client.js';

const config = loadConfig();
const client = new FacebookClient(config);

// Personal
await client.createPost({ message: "Hello!" });
await client.uploadPhoto('photo.jpg', 'Caption');
await client.getFriends('me', 100);

// Business
await client.publishToPage('page-id', { message: "Update" });
await client.getLeads('form-id');
await client.publishToInstagram('ig-account-id', 'image-url', 'caption');

// Ads
await client.createCampaign('ad-account-id', {
  name: 'Campaign',
  objective: 'OUTCOME_TRAFFIC',
  status: 'PAUSED'
});

// Analytics
await client.getPageInsights('page-id', {
  metric: ['page_impressions', 'page_engaged_users'],
  period: 'day'
});
```

## Environment Variables

```bash
# Required
FACEBOOK_ACCESS_TOKEN=your_token

# Optional
FACEBOOK_API_VERSION=v18.0
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_USER_ID=me
FACEBOOK_AD_ACCOUNT_ID=act_account_id
```

## Token Types

**Short-Lived (1 hour):** Graph API Explorer  
**Long-Lived (60 days):** `npm run facebook auth exchange`  
**Never-Expiring (Page):** `npm run facebook auth page-token`

## For More Information

See [SKILL.md](./SKILL.md) for detailed workflows and examples.
