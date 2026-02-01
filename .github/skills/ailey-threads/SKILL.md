---
id: ailey-threads
name: Threads Content Manager
description: Comprehensive Threads integration with account type detection, OAuth authentication, post publishing (text/images/videos/carousels), analytics, engagement management, and automatic API tier detection. Adapts features based on account type (Personal, Creator, Business). Use when managing Threads content, automating posts, analyzing performance, or engaging with audiences.
keywords: [threads, social media, meta, instagram, posting, analytics, engagement, oauth, content management, creator tools, business tools]
tools: [threads-client, content-posting, analytics, engagement, account-detection]
---

# Threads Content Manager

Comprehensive Threads integration with intelligent account type detection and feature adaptation. Automatically detects account capabilities and provides guidance for upgrades.

## Overview

Threads by Meta has different features based on account type. This skill:

- **Automatically detects** account type (Personal, Creator, Business)
- **Adapts features** based on account capabilities
- **Provides upgrade paths** for enhanced features
- **Works immediately** with Personal accounts
- **Scales up** with Creator and Business accounts

## When to Use

- Managing Threads content and posts
- Automating Threads publishing
- Analyzing post performance
- Engaging with audience through replies
- Checking account capabilities
- Multi-platform content distribution
- Creator and business workflows
- Building social media tools

## Installation

```bash
cd .github/skills/ailey-threads
npm install
```

## Configuration

### 1. Prerequisites

**Required:**
- Instagram account (Threads uses Instagram Graph API)
- Facebook Page linked to your Instagram account
- Facebook Developer Account
- Meta App with Threads permissions

**Note:** Threads API is built on Instagram's infrastructure, so you need an Instagram Business/Creator account.

### 2. Create Meta App

1. Visit [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Choose **Business** or **Consumer** type
4. Fill in app details
5. Copy App ID and App Secret

### 3. Add Threads Product

1. In app dashboard → **Add Products**
2. Find **Instagram** → Click **Set Up**
3. Under Instagram settings, enable **Threads**
4. Configure OAuth redirect: `https://localhost:3000/auth/callback`

### 4. Configure Permissions

Request these permissions:
- `threads_basic` - Basic profile access
- `threads_content_publish` - Post content
- `threads_manage_insights` - Analytics
- `threads_manage_replies` - Reply management
- `threads_read_replies` - Read replies

### 5. Environment Setup

Create `.env` file:

```env
THREADS_APP_ID=your_app_id_here
THREADS_APP_SECRET=your_app_secret_here
THREADS_ACCESS_TOKEN=your_access_token_here
THREADS_USER_ID=your_threads_user_id_here
THREADS_INSTAGRAM_ACCOUNT_ID=your_ig_account_id_here
```

### 6. Add to AI-ley Configuration

Edit `.github/aicc/aicc.yaml`:

```yaml
integrations:
  threads:
    enabled: true
    appId: ${THREADS_APP_ID}
    appSecret: ${THREADS_APP_SECRET}
    accessToken: ${THREADS_ACCESS_TOKEN}
    userId: ${THREADS_USER_ID}
    instagramAccountId: ${THREADS_INSTAGRAM_ACCOUNT_ID}
    accountType: auto-detect  # or: personal, creator, business
```

## Account Types

### Personal Account (Default)

**What you get:**
- ✅ Basic profile information
- ✅ Post text, images, videos
- ✅ Reply to conversations
- ✅ Basic post insights
- ✅ Up to 500 posts per day

**No approval required** - available immediately.

**Features:**
- Text posts (up to 500 characters)
- Image posts (single/multiple)
- Video posts (up to 5 minutes)
- Link sharing
- Reply to your posts
- Basic analytics

### Creator Account

**Additional features:**
- ✅ Enhanced analytics
- ✅ Reply management tools
- ✅ Conversation insights
- ✅ Audience demographics
- ✅ Creator tools and badges

**How to upgrade:**
1. Convert Instagram to Creator account
2. Enable Threads in Instagram settings
3. Reconnect API with creator permissions

**Additional insights:**
- Follower growth tracking
- Engagement rate analysis
- Top-performing posts
- Audience activity times
- Reply analytics

### Business Account

**Additional features:**
- ✅ Full business analytics
- ✅ Ad integration (future)
- ✅ Advanced moderation tools
- ✅ Team management
- ✅ Business inbox

**How to upgrade:**
1. Convert Instagram to Business account
2. Link Facebook Business Page
3. Enable Threads for business
4. Reconnect API with business permissions

**Business features:**
- Comprehensive analytics
- Multi-user access
- Advanced reporting
- CRM integration
- Business verification badge

## Quick Start

### Detect Your Account Type

```bash
npm run threads detect
```

This will show:
- Your account type (Personal/Creator/Business)
- Available features
- Upgrade recommendations
- API permissions granted

Output example:
```
🎯 Threads Account Status

Account Type: Creator
User ID: 12345678
Username: @yourhandle

✅ Available Features:
  📝 Text & media posting
  📊 Enhanced analytics
  💬 Reply management
  👥 Audience insights
  
📈 Next Level: Business Account
  Unlock: Advanced analytics, team tools, ad integration
  
How to upgrade:
  1. Switch Instagram to Business account
  2. Link Facebook Business Page
  3. Reconnect Threads API
```

### Setup Help

```bash
npm run threads setup
```

Displays comprehensive setup instructions including:
- Meta app creation
- Instagram account linking
- Threads API enablement
- OAuth configuration
- AI-ley integration

### Test Connection

```bash
npm run threads test
```

Verifies API connection and shows your profile information.

---

## Workflows

### Workflow 1: Check Account Capabilities (All Accounts)

**Use when:** Starting work, checking account status, verifying permissions.

```bash
# Detect account type and features
npm run threads detect

# Expected output (Creator Account):
# 🎯 Account Type: CREATOR
# ✅ Enhanced analytics
# ✅ Reply management
# ✅ Audience insights
# ✅ Creator badges
# 💡 Upgrade to Business for team tools
```

**What it does:**
1. Tests API connection
2. Retrieves account information
3. Detects account type
4. Lists available features
5. Suggests upgrade path if applicable

**Account-specific guidance:**
- **Personal:** Shows how to upgrade to Creator
- **Creator:** Shows how to upgrade to Business
- **Business:** All features available

### Workflow 2: OAuth Authentication

**Use when:** First setup, token expired, re-authorizing account.

```bash
# Start OAuth flow
npm run threads auth start

# Visit URL, authorize, get code
npm run threads auth token <CODE>

# Test authentication
npm run threads test
```

**OAuth Flow:**
1. Generate authorization URL with required scopes
2. User visits URL and logs into Instagram
3. User grants Threads permissions
4. Meta redirects with authorization code
5. Exchange code for access token
6. Store token in `.env`

**Required scopes:**
- **Personal:** `threads_basic`, `threads_content_publish`
- **Creator:** + `threads_manage_insights`, `threads_manage_replies`
- **Business:** + `threads_read_replies`, advanced permissions

### Workflow 3: Post to Threads

**Use when:** Publishing content, automating posts, cross-posting.

```bash
# Text post
npm run threads post "Just shipped a new feature! 🚀"

# Post with hashtags and mentions
npm run threads post "Excited to share this with @username #developer #tech"

# Image post
npm run threads post "Check out this view!" \
  --image photo.jpg

# Video post
npm run threads post "Quick tutorial" \
  --video tutorial.mp4

# Multiple images (carousel)
npm run threads post "Behind the scenes 📸" \
  --images "photo1.jpg,photo2.jpg,photo3.jpg"

# Post with link
npm run threads post "New blog post is live!" \
  --link "https://example.com/post"

# Schedule post (requires Business account)
npm run threads post "Scheduled announcement" \
  --schedule "2026-02-05T10:00:00Z"
```

**Post Options:**
- `--image PATH` - Single image
- `--images PATHS` - Multiple images (comma-separated, max 10)
- `--video PATH` - Video file (max 5 minutes)
- `--link URL` - Attach link
- `--schedule TIME` - Schedule post (Business only)
- `--alt-text TEXT` - Image alt text for accessibility

**Post Limits:**
- Text: 500 characters
- Images: Max 10 per post
- Video: Max 5 minutes
- Daily posts: 500 (personal), 1000 (business)

**Upload Process:**
1. Skill validates post content
2. Uploads media if included
3. Creates post with metadata
4. Returns post ID and URL
5. Tracks post in analytics

### Workflow 4: View Analytics (Creator/Business Required)

**Use when:** Tracking performance, analyzing engagement, optimizing content.

```bash
# Post analytics
npm run threads analytics post POST_ID

# Expected output:
# 📊 Post Analytics
# Likes: 1,234
# Replies: 89
# Reposts: 45
# Quotes: 23
# Views: 15,678
# Reach: 12,345
# Engagement rate: 8.7%

# Account analytics
npm run threads analytics account --days 30

# Expected output:
# 📈 Account Analytics (Last 30 Days)
# Total posts: 45
# Total likes: 12,345
# Total replies: 567
# Total followers: 8,901
# Follower growth: +234 (2.7%)
# Avg engagement rate: 6.2%

# Audience insights (Creator/Business)
npm run threads analytics audience

# Top posts
npm run threads analytics top --days 7 --metric likes
```

**Available Metrics:**

**Post Level:**
- Likes, replies, reposts, quotes
- Views, reach, impressions
- Engagement rate
- Click-through rate (if link)
- Save count

**Account Level:**
- Follower count and growth
- Post frequency
- Total engagement
- Average engagement rate
- Top-performing content

**Audience Insights (Creator/Business):**
- Demographics (age, gender, location)
- Active hours
- Follower sources
- Interest categories

**If Personal Account:**
```
❌ Enhanced analytics require Creator or Business account

To unlock:
1. Switch to Creator or Business account in Instagram
2. Reconnect Threads API
3. Grant insights permissions
```

### Workflow 5: Manage Replies (Creator/Business Recommended)

**Use when:** Engaging with audience, moderating conversations, customer service.

```bash
# List replies to your post
npm run threads replies list POST_ID

# Reply to a conversation
npm run threads replies create POST_ID \
  --text "Thanks for the feedback! 🙏"

# View conversation thread
npm run threads replies thread REPLY_ID

# Hide reply
npm run threads replies hide REPLY_ID

# Unhide reply
npm run threads replies unhide REPLY_ID

# Delete your reply
npm run threads replies delete REPLY_ID

# Bulk reply moderation
npm run threads replies moderate POST_ID \
  --filter spam \
  --action hide
```

**Reply Management:**
- **Personal:** Basic reply capabilities
- **Creator:** Enhanced moderation tools
- **Business:** Advanced filtering and automation

**Moderation Options:**
- Hide/unhide replies
- Filter by keywords
- Bulk operations
- Auto-moderation rules (Business)

### Workflow 6: Search & Discovery

**Use when:** Finding conversations, researching topics, monitoring brand mentions.

```bash
# Search your posts
npm run threads search "keyword" --mine

# Search by hashtag
npm run threads search "#developer"

# Search mentions of you
npm run threads search "@yourhandle"

# Recent posts
npm run threads posts list --limit 50

# Trending topics (if available)
npm run threads trending
```

### Workflow 7: User Profile Management

**Use when:** Updating profile, checking stats, managing account settings.

```bash
# Get profile information
npm run threads profile

# Update profile (limited fields)
npm run threads profile update \
  --bio "New bio text" \
  --link "https://example.com"

# Get follower count
npm run threads followers count

# Get following count
npm run threads following count
```

### Workflow 8: Batch Operations

**Use when:** Bulk posting, scheduled campaigns, content automation.

```bash
# Batch post from CSV
npm run threads batch-post posts.csv

# CSV format:
# text,image,scheduled_time
# "Post 1 text",image1.jpg,2026-02-05T10:00:00Z
# "Post 2 text",image2.jpg,2026-02-05T14:00:00Z

# Batch analytics export
npm run threads batch-analytics post_ids.txt \
  --output analytics.csv

# Scheduled post queue
npm run threads queue list
npm run threads queue cancel POST_ID
```

---

## API Rate Limits

### Rate Limit Tiers

**Personal Account:**
- 200 requests per hour
- 500 posts per day
- 1,000 replies per day

**Creator Account:**
- 500 requests per hour
- 1,000 posts per day
- 5,000 replies per day

**Business Account:**
- 1,000 requests per hour
- Unlimited posts (within reason)
- Unlimited replies

### Rate Limit Handling

The skill automatically:
- Tracks request count
- Waits when limits approached
- Retries with exponential backoff
- Warns when nearing limits

```bash
# Check current rate limit status
npm run threads rate-limit

# Output:
# 📊 Rate Limit Status
# Tier: Creator
# Requests used: 245/500 per hour
# Resets at: 2026-02-01T15:00:00Z
# Posts today: 12/1000
# Replies today: 34/5000
```

---

## Content Guidelines

### Text Posts

**Best practices:**
- Keep under 500 characters
- Use line breaks for readability
- Include relevant hashtags (max 5)
- Tag relevant accounts with @
- Add emoji for personality
- Ask questions to drive engagement

**Example:**
```
Just shipped a major update! 🚀

New features:
• Dark mode
• Better performance
• Bug fixes

What feature do you want next? 👇

#developer #coding
```

### Image Posts

**Requirements:**
- Format: JPG, PNG, WebP
- Max size: 8MB per image
- Aspect ratio: 4:5 to 1.91:1
- Resolution: 1080px width minimum
- Max 10 images per post

**Best practices:**
- Use high-quality images
- Optimize for mobile viewing
- Add alt text for accessibility
- First image is preview thumbnail
- Consider carousel for stories

### Video Posts

**Requirements:**
- Format: MP4, MOV
- Max duration: 5 minutes
- Max size: 500MB
- Aspect ratio: 4:5 to 16:9
- Frame rate: 30fps or 60fps
- Audio: AAC, 128kbps+

**Best practices:**
- First 3 seconds grab attention
- Include captions/subtitles
- Optimize for sound-off viewing
- Keep under 1 minute for engagement
- Use vertical or square format

---

## Error Handling

### Common Errors

**Invalid Access Token:**
```
Error: OAuthException
Message: Invalid OAuth access token.

Solution:
- Run: npm run threads auth start
- Ensure token hasn't expired
- Check .env configuration
```

**Insufficient Permissions:**
```
Error: PermissionsError
Message: Requires threads_manage_insights permission.

Solution:
- Upgrade to Creator/Business account
- Re-authenticate with required scopes
- Run: npm run threads auth start
```

**Rate Limit Exceeded:**
```
Error: RateLimitError
Message: Application request limit reached.

Solution:
- Wait until rate limit resets
- Upgrade account tier for higher limits
- Implement request batching
```

**Post Too Long:**
```
Error: ValidationError
Message: Text exceeds 500 characters.

Solution:
- Reduce text to 500 characters
- Split into multiple posts
- Use thread feature (if available)
```

### Automatic Retry

The skill automatically retries:
- Rate limit errors (with backoff)
- Temporary network errors (3 attempts)
- Server errors (exponential backoff)

---

## Advanced Features

### Cross-Posting

```bash
# Post to Threads and other platforms
npm run threads cross-post "My announcement!" \
  --platforms "instagram,twitter,facebook"
```

### Content Templates

```bash
# Save template
npm run threads template save daily-update \
  --text "Daily Update - {{date}}: {{content}}"

# Use template
npm run threads template post daily-update \
  --vars "content=Shipped new features"
```

### Hashtag Research

```bash
# Analyze hashtag performance
npm run threads hashtags analyze "#developer"

# Get trending hashtags
npm run threads hashtags trending --category tech

# Track hashtag over time
npm run threads hashtags track "#coding" --days 30
```

### Audience Targeting

```bash
# Analyze when your audience is active
npm run threads audience activity

# Best time to post
npm run threads audience best-time

# Follower demographics
npm run threads audience demographics
```

### Automated Workflows

```bash
# Auto-reply to mentions
npm run threads auto-reply \
  --trigger "mention" \
  --template "Thanks for the mention! 🙏"

# Auto-hide spam
npm run threads auto-moderate \
  --filter spam \
  --action hide

# Auto-post from RSS
npm run threads rss-feed "https://blog.example.com/feed" \
  --interval 1h \
  --template "New post: {{title}} {{link}}"
```

---

## Integration with AI-ley

### Workflow Automation

**Auto-post workflow:**
```yaml
# .github/aicc/workflows/threads-auto-post.yaml
name: Threads Auto Post
trigger:
  type: file_created
  pattern: ./content/threads/*.txt

actions:
  - name: Post to Threads
    skill: ailey-threads
    command: post
    args:
      text: ${file.content}
      image: ${file.path.replace('.txt', '.jpg')}
```

**Analytics monitoring:**
```yaml
# .github/aicc/workflows/threads-analytics.yaml
name: Threads Analytics Monitor
trigger:
  type: schedule
  cron: "0 9 * * *"

actions:
  - name: Get daily analytics
    skill: ailey-threads
    command: analytics
    args:
      type: account
      days: 1
      
  - name: Alert on growth
    conditions:
      - ${threads.follower_growth} > 100
    actions:
      - notify: slack
        message: "🎉 Gained ${threads.follower_growth} followers!"
```

### Custom Agents

```markdown
# .github/agents/threads-manager.agent.md
# Threads Manager Agent

**Role:** Specialized Threads content and engagement agent

**Capabilities:**
- Post optimization and scheduling
- Audience engagement management
- Analytics and performance tracking
- Content strategy recommendations

**Skills:**
- ailey-threads (primary)
- ailey-tools-image (for media)
- ailey-seo-report (for hashtags)
```

---

## Best Practices

### Content Strategy

1. **Post consistently** - Daily or several times per week
2. **Engage authentically** - Reply to comments and mentions
3. **Use multimedia** - Images and videos get more engagement
4. **Optimal timing** - Post when your audience is active
5. **Hashtag wisely** - 3-5 relevant hashtags per post
6. **Ask questions** - Drive conversations
7. **Be conversational** - Threads is about dialogue

### Growth Tactics

1. **Reply to others** - Engage in your niche
2. **Share insights** - Provide value
3. **Be timely** - Comment on trending topics
4. **Cross-promote** - Link from Instagram/other platforms
5. **Collaborate** - Engage with other creators
6. **Track analytics** - Learn what resonates
7. **Iterate quickly** - Test different content types

### Analytics Optimization

1. **Track engagement rate** - More important than follower count
2. **Identify top content** - Replicate what works
3. **Monitor reply rate** - Indicates conversation quality
4. **Analyze timing** - Post when audience is active
5. **A/B test** - Try different formats and styles
6. **Follow trends** - But stay authentic
7. **Review weekly** - Adjust strategy based on data

---

## Troubleshooting

### Setup Issues

**Problem: Can't find Threads in Meta App**
```
Solution:
1. Ensure Instagram product is added first
2. Look for Threads under Instagram settings
3. May need to request access if not visible
```

**Problem: Instagram account not linking**
```
Solution:
1. Convert Instagram to Business/Creator account
2. Link Facebook Page to Instagram
3. Ensure Page has Instagram access
4. Reconnect in Meta App settings
```

### Connection Issues

```bash
# Run diagnostics
npm run threads diagnose

# Checks:
# - Environment variables set
# - Access token valid
# - Account permissions
# - API connectivity
# - Rate limit status
```

### Missing Features

```bash
# Verify account type
npm run threads detect

# If features missing:
# 1. Check account type (Personal/Creator/Business)
# 2. Verify permissions granted
# 3. Re-authenticate if needed
```

---

## Examples

### Example 1: Daily Posting Schedule

```bash
#!/bin/bash
# daily-post.sh

MORNING="Good morning! ☀️ Starting the day with coffee and code."
EVENING="Wrapping up for the day. What did you ship today? 🚀"

# Morning post (9 AM)
if [ $(date +%H) -eq 9 ]; then
  npm run threads post "$MORNING"
fi

# Evening post (6 PM)
if [ $(date +%H) -eq 18 ]; then
  npm run threads post "$EVENING"
fi
```

### Example 2: Content Series

```bash
#!/bin/bash
# tutorial-series.sh

SERIES_HASHTAG="#30DayChallenge"

for day in {1..30}; do
  TEXT="Day $day/$30: $(cat day-$day.txt) $SERIES_HASHTAG"
  IMAGE="tutorials/day-$day.jpg"
  
  npm run threads post "$TEXT" --image "$IMAGE"
  
  # Wait 24 hours
  sleep 86400
done
```

### Example 3: Engagement Bot

```bash
#!/bin/bash
# engagement-bot.sh

# Get recent replies
REPLIES=$(npm run threads replies list --recent)

# Auto-respond to questions
echo "$REPLIES" | grep "?" | while read REPLY_ID; do
  npm run threads replies create $REPLY_ID \
    --text "Great question! Let me think about that and get back to you. 🤔"
done
```

### Example 4: Analytics Dashboard

```bash
#!/bin/bash
# weekly-report.sh

WEEK_START=$(date -v-mon -v-7d +%Y-%m-%d)
WEEK_END=$(date -v-mon -v-1d +%Y-%m-%d)

# Generate report
npm run threads analytics report \
  --start "$WEEK_START" \
  --end "$WEEK_END" \
  --output "reports/week-$(date +%Y%U).html"

# Email to team
mail -s "Weekly Threads Report" team@example.com < "reports/week-$(date +%Y%U).html"
```

---

## API Reference

### Authentication
- `auth.start()` - Begin OAuth flow
- `auth.token(code)` - Exchange code for token
- `auth.refresh()` - Refresh access token

### Posts
- `posts.create(text, options)` - Create post
- `posts.get(postId)` - Get post details
- `posts.list(options)` - List posts
- `posts.delete(postId)` - Delete post

### Analytics (Creator/Business)
- `analytics.post(postId)` - Post metrics
- `analytics.account(days)` - Account metrics
- `analytics.audience()` - Audience insights
- `analytics.top(metric, days)` - Top posts

### Replies
- `replies.list(postId)` - List replies
- `replies.create(postId, text)` - Reply to post
- `replies.hide(replyId)` - Hide reply
- `replies.delete(replyId)` - Delete reply

### Profile
- `profile.get()` - Get profile info
- `profile.update(data)` - Update profile
- `profile.stats()` - Profile statistics

### Account
- `account.detect()` - Detect account type
- `account.limits()` - Get rate limits
- `account.permissions()` - List permissions

---

## Support

### Getting Help

**Setup Issues:**
```bash
npm run threads setup
```

**Diagnostics:**
```bash
npm run threads diagnose
```

**Documentation:**
- [Threads API Docs](https://developers.facebook.com/docs/threads)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Meta for Developers](https://developers.facebook.com/)

**Community:**
- [Meta Developers Forum](https://developers.facebook.com/community/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/threads-api)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.7
---
