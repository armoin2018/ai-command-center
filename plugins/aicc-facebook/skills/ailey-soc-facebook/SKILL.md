---
id: ailey-soc-facebook
name: Facebook Integration Manager
description: Comprehensive Facebook integration for personal and business features via Graph API. Manage posts, photos, friends, groups, events, pages, ads, analytics, Instagram, leads, and messenger. Use when posting to Facebook, managing business pages, running ad campaigns, analyzing social media performance, or integrating Facebook/Instagram into workflows.
keywords: [facebook, graph-api, social-media, instagram, whatsapp, advertising, marketing, analytics, messenger, business-pages, lead-generation]
tools: [axios, commander, handlebars, form-data, csv-parse]
agent: AI-ley Orchestrator
skills: []
---

# AI-ley Facebook Integration Manager

Comprehensive Facebook and Instagram integration supporting both personal and business features through the Facebook Graph API.

## When to Use This Skill

- Publishing content to Facebook and Instagram
- Managing Facebook business pages and engagement
- Creating and managing ad campaigns
- Analyzing page and ad performance
- Generating and retrieving leads from lead ads
- Cross-posting to Instagram Business accounts
- Managing Messenger conversations
- Automating social media workflows
- Exporting analytics and insights

## Installation

```bash
cd .github/skills/ailey-soc-facebook
npm install
```

## Setup

See [SETUP.md](./SETUP.md) for detailed setup instructions including:
- Creating a Facebook App
- OAuth 2.0 authentication
- Required permissions for personal vs business features
- Getting access tokens (short-lived, long-lived, never-expiring page tokens)
- Environment configuration

Quick setup:

```bash
npm run facebook setup
```

## Features

### Personal Features
- **Profile**: View and manage user profile
- **Posts**: Create, schedule posts on timeline
- **Photos**: Upload photos to timeline or albums
- **Friends**: List and manage friends
- **Groups**: List groups, post to groups
- **Events**: List events, create events, RSVP

### Business Features
- **Pages**: List managed pages, publish content, schedule posts
- **Lead Generation**: List lead forms, retrieve leads, export to CSV
- **Instagram Business**: Link accounts, publish posts, get insights
- **Messenger**: Send messages, list conversations, automate responses
- **Analytics**: Page insights, post performance, audience demographics

### Advertising Features
- **Ad Accounts**: List and manage ad accounts
- **Campaigns**: Create campaigns, set budgets, manage status
- **Performance**: Get campaign insights, track ROI, export reports

## Workflows

### Workflow 1: Personal Content Publishing

Publish content to your personal Facebook timeline.

**Use Cases:**
- Share updates, links, photos to personal timeline
- Schedule posts for future publication
- Upload photo albums with captions
- Post to groups you belong to

**CLI Usage:**

```bash
# View your profile
npm run facebook personal profile show

# Create a post
npm run facebook personal posts create \\
  --message "Just launched my new project!"

# Create post with link
npm run facebook personal posts create \\
  --message "Check out my latest article" \\
  --link "https://example.com/article"

# Schedule a post
npm run facebook personal posts create \\
  --message "Happy New Year!" \\
  --schedule "2026-01-01T00:00:00Z"

# Upload a photo
npm run facebook personal photos upload path/to/photo.jpg \\
  --message "Beautiful sunset today"

# Post to a group
npm run facebook personal groups post GROUP_ID \\
  --message "Great news to share!" \\
  --link "https://example.com"

# List your friends
npm run facebook personal friends list --limit 50

# List your groups
npm run facebook personal groups list

# List events
npm run facebook personal events list

# Create an event
npm run facebook personal events create \\
  --name "Team Meeting" \\
  --start-time "2026-02-15T14:00:00Z" \\
  --description "Monthly team sync" \\
  --location "Conference Room A"
```

**TypeScript API:**

```typescript
import { FacebookClient, loadConfig } from './scripts/facebook-client.js';

const config = loadConfig();
const client = new FacebookClient(config);

// Create a post
const post = await client.createPost({
  message: "Hello from TypeScript!",
  link: "https://example.com",
  published: true
});

// Upload photo
const photo = await client.uploadPhoto(
  'path/to/photo.jpg',
  'Check this out!'
);

// Post to group
const groupPost = await client.postToGroup(
  'group-id',
  'Exciting news!',
  'https://example.com/news'
);

// Get friends
const friends = await client.getFriends('me', 100);

// Get groups
const groups = await client.getGroups('me');

// Create event
const event = await client.createEvent(
  'Team Meeting',
  new Date('2026-02-15T14:00:00Z'),
  'Monthly sync meeting',
  'Conference Room A'
);
```

---

### Workflow 2: Business Page Management

Manage Facebook business pages, publish content, and engage with audience.

**Use Cases:**
- Publish updates to business pages
- Schedule content calendar
- Monitor page engagement
- Respond to customer messages
- Track page performance

**CLI Usage:**

```bash
# List pages you manage
npm run facebook business pages list

# Publish to page
npm run facebook business pages publish PAGE_ID \\
  --message "New product launch!" \\
  --link "https://example.com/products/new"

# Schedule page post
npm run facebook business pages publish PAGE_ID \\
  --message "Flash sale starts tomorrow!" \\
  --schedule "2026-02-01T09:00:00Z"

# Get page posts with engagement
npm run facebook business pages posts PAGE_ID --limit 25

# List lead gen forms
npm run facebook business leads forms PAGE_ID

# Get leads from form
npm run facebook business leads get FORM_ID \\
  --output leads-export.csv

# Send message via Messenger
npm run facebook business messenger send RECIPIENT_ID \\
  --message "Thanks for your inquiry!"

# List conversations
npm run facebook business messenger conversations PAGE_ID

# Link Instagram account
npm run facebook business instagram account PAGE_ID

# Publish to Instagram
npm run facebook business instagram publish INSTAGRAM_ACCOUNT_ID \\
  --image-url "https://example.com/image.jpg" \\
  --caption "New product available now! #launch"

# Get Instagram insights
npm run facebook business instagram insights INSTAGRAM_ACCOUNT_ID \\
  --metrics "impressions,reach,profile_views"
```

**TypeScript API:**

```typescript
import { FacebookClient, loadConfig } from './scripts/facebook-client.js';

const config = loadConfig();
const client = new FacebookClient(config);

// Get managed pages
const pages = await client.getPages();

// Publish to page
const pagePost = await client.publishToPage('page-id', {
  message: "Check out our new product!",
  link: "https://example.com/products",
  published: true
});

// Schedule post
const scheduledPost = await client.publishToPage('page-id', {
  message: "Tomorrow's announcement",
  scheduled: new Date('2026-02-01T10:00:00Z')
});

// Get page posts
const posts = await client.getPagePosts('page-id', 25);

// Get lead forms
const leadForms = await client.getLeadForms('page-id');

// Get leads
const leads = await client.getLeads('form-id');

// Instagram integration
const igAccount = await client.getInstagramAccount('page-id');
const igPost = await client.publishToInstagram(
  'instagram-account-id',
  'https://example.com/image.jpg',
  'New product launch! #launch'
);

// Messenger
const message = await client.sendMessage(
  'recipient-id',
  'Thanks for reaching out!'
);

const conversations = await client.getConversations('page-id');
```

---

### Workflow 3: Advertising and Campaign Management

Create and manage Facebook ad campaigns, track performance, optimize ROI.

**Use Cases:**
- Launch advertising campaigns
- Manage campaign budgets and scheduling
- Track ad performance and ROI
- A/B test ad creatives
- Export campaign data for analysis

**CLI Usage:**

```bash
# List ad accounts
npm run facebook ads accounts list

# List campaigns
npm run facebook ads campaigns list AD_ACCOUNT_ID --limit 50

# Create campaign
npm run facebook ads campaigns create AD_ACCOUNT_ID \\
  --name "Q1 2026 Product Launch" \\
  --objective "OUTCOME_TRAFFIC" \\
  --status "PAUSED" \\
  --daily-budget 5000 \\
  --bid-strategy "LOWEST_COST_WITHOUT_CAP"

# Get campaign insights
npm run facebook ads campaigns insights CAMPAIGN_ID \\
  --fields "impressions,clicks,spend,reach,ctr,cpc,conversions"

# Common campaign objectives:
# - OUTCOME_TRAFFIC: Drive traffic to website
# - OUTCOME_ENGAGEMENT: Increase engagement
# - OUTCOME_LEADS: Generate leads
# - OUTCOME_SALES: Drive conversions
# - OUTCOME_AWARENESS: Brand awareness
# - OUTCOME_APP_PROMOTION: App installs
```

**TypeScript API:**

```typescript
import { FacebookClient, loadConfig } from './scripts/facebook-client.js';

const config = loadConfig();
const client = new FacebookClient(config);

// Get ad accounts
const adAccounts = await client.getAdAccounts();

// Create campaign
const campaign = await client.createCampaign('ad-account-id', {
  name: 'Q1 2026 Product Launch',
  objective: 'OUTCOME_TRAFFIC',
  status: 'PAUSED',
  dailyBudget: 5000, // in cents ($50.00)
  bidStrategy: 'LOWEST_COST_WITHOUT_CAP'
});

// Get campaigns
const campaigns = await client.getCampaigns('ad-account-id', 50);

// Get campaign performance
const insights = await client.getCampaignInsights('campaign-id', [
  'impressions',
  'clicks',
  'spend',
  'reach',
  'ctr',
  'cpc',
  'cpp',
  'conversions',
  'cost_per_conversion'
]);
```

---

### Workflow 4: Analytics and Insights

Analyze page performance, audience engagement, and campaign effectiveness.

**Use Cases:**
- Track page growth and engagement
- Analyze post performance
- Export analytics reports
- Monitor audience demographics
- Measure campaign ROI

**CLI Usage:**

```bash
# Get page insights
npm run facebook analytics page insights PAGE_ID \\
  --metrics "page_impressions,page_engaged_users,page_post_engagements" \\
  --period "day" \\
  --since "2026-01-01" \\
  --until "2026-01-31" \\
  --output january-insights.json

# Get page summary
npm run facebook analytics page summary PAGE_ID --days 30

# Analyze post performance
npm run facebook analytics post performance PAGE_ID \\
  --limit 20 \\
  --output post-performance.csv

# View available metrics
npm run facebook analytics metrics
```

**TypeScript API:**

```typescript
import { FacebookClient, loadConfig } from './scripts/facebook-client.js';

const config = loadConfig();
const client = new FacebookClient(config);

// Get page insights
const insights = await client.getPageInsights('page-id', {
  metric: [
    'page_impressions',
    'page_impressions_unique',
    'page_engaged_users',
    'page_post_engagements',
    'page_fans'
  ],
  period: 'day',
  since: '2026-01-01',
  until: '2026-01-31'
});

// Get page posts with engagement
const posts = await client.getPagePosts('page-id', 50);

// Instagram insights
const igInsights = await client.getInstagramInsights(
  'instagram-account-id',
  ['impressions', 'reach', 'profile_views', 'engagement']
);
```

---

## Environment Configuration

Create `.env` file in the skill directory or `~/.vscode/.env`:

```bash
# Required
FACEBOOK_ACCESS_TOKEN=your_access_token_here

# Optional
FACEBOOK_API_VERSION=v18.0
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_USER_ID=me
FACEBOOK_AD_ACCOUNT_ID=act_your_ad_account_id
```

## Authentication

### Short-Lived Token (Testing - 1 hour)
Use Graph API Explorer at https://developers.facebook.com/tools/explorer/

### Long-Lived Token (Production - 60 days)
```bash
npm run facebook auth exchange \\
  --app-id YOUR_APP_ID \\
  --app-secret YOUR_APP_SECRET \\
  --token SHORT_LIVED_TOKEN
```

### Never-Expiring Page Token (Business Features)
```bash
npm run facebook auth page-token --page-id YOUR_PAGE_ID
```

## Testing

```bash
# Test API connection
npm run facebook test

# Verify setup
npm run facebook setup
```

## Permissions Reference

### Personal Features
- `email`: User email address
- `public_profile`: Basic profile
- `user_posts`: Read/publish posts
- `user_photos`: Manage photos
- `user_friends`: Friends list
- `user_events`: Manage events
- `publish_to_groups`: Post to groups

### Business Features - Pages
- `pages_show_list`: List managed pages
- `pages_read_engagement`: Page insights
- `pages_manage_posts`: Publish to pages
- `pages_manage_engagement`: Comments/messages
- `pages_read_user_content`: User content

### Business Features - Advertising
- `ads_read`: Read ad data
- `ads_management`: Create/manage ads
- `business_management`: Business assets

### Business Features - Instagram
- `instagram_basic`: Access account
- `instagram_content_publish`: Publish posts
- `pages_read_engagement`: Instagram insights

### Business Features - Leads
- `leads_retrieval`: Retrieve leads
- `pages_manage_metadata`: Manage forms

## Available Metrics

### Page Metrics
- `page_impressions`: Total impressions
- `page_impressions_unique`: Unique reach
- `page_engaged_users`: Engagement
- `page_post_engagements`: Post interactions
- `page_fans`: Total likes
- `page_video_views`: Video views

### Ad Metrics
- `impressions`: Ad impressions
- `clicks`: Ad clicks
- `spend`: Total spend
- `reach`: Unique reach
- `ctr`: Click-through rate
- `cpc`: Cost per click
- `conversions`: Total conversions
- `cost_per_conversion`: Cost per conversion

### Instagram Metrics
- `impressions`: Total impressions
- `reach`: Unique reach
- `profile_views`: Profile views
- `engagement`: Total engagement

## Troubleshooting

**Invalid OAuth access token**
- Check token hasn't expired
- Verify in Graph API Explorer
- Exchange for long-lived token

**Permissions error**
- Review required permissions
- Regenerate token with correct scopes
- Submit for app review if needed

**Rate limit exceeded**
- Wait before retrying
- Implement exponential backoff
- Spread requests over time

## Resources

- [Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Marketing API Documentation](https://developers.facebook.com/docs/marketing-apis)
- [Instagram API Documentation](https://developers.facebook.com/docs/instagram-api)
- [App Dashboard](https://developers.facebook.com/apps/)

---

version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.7
---
