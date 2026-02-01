---
id: ailey-instagram
name: Instagram Integration Manager
description: Comprehensive Instagram integration for business and personal content management, engagement, analytics, hashtag research, and shopping via Graph API. Publish photos/videos/carousels/reels/stories, manage comments/mentions, track insights/demographics, research hashtags, and manage product catalogs. Use when publishing to Instagram, managing content, analyzing performance, researching hashtags, or integrating Instagram commerce.
keywords: [instagram, social media, graph api, content publishing, analytics, hashtags, shopping, engagement, insights, reels, stories]
tools: [instagram-client, content management, engagement tools, analytics, hashtag research, shopping tools]
---

# Instagram Integration Manager

Comprehensive Instagram integration for Business and Creator accounts with content publishing, engagement management, analytics, hashtag research, and shopping features via Facebook Graph API.

## Overview

The Instagram Integration Manager provides complete access to Instagram Business/Creator account features:

- **Content Publishing**: Photos, videos, carousels (albums), reels, stories
- **Content Management**: List, view, update captions, delete media
- **Engagement**: Comments (reply, delete, hide/unhide), mentions tracking
- **Analytics**: Account insights, media insights, story insights, demographics
- **Hashtag Research**: Search, analysis, top/recent media, batch research
- **Shopping**: Product catalogs, product tagging with coordinates

## When to Use

- Publishing content to Instagram (photos, videos, reels, stories)
- Managing Instagram engagement (comments, mentions)
- Tracking Instagram performance and analytics
- Researching hashtags for content optimization
- Managing Instagram Shopping and product catalogs
- Automating Instagram workflows
- Building social media management tools
- Analyzing audience demographics
- Batch processing Instagram operations

## Installation

```bash
cd .github/skills/ailey-instagram
npm install
```

## Authentication Setup

1. **Prerequisites**:
   - Instagram Business or Creator Account
   - Facebook Page linked to Instagram
   - Facebook Developer Account
   - Facebook App with Instagram permissions

2. **Get Access Token**:
   ```bash
   # View detailed setup instructions
   npm run instagram setup
   
   # Get Instagram Account ID from Page
   npm run instagram auth get-account-id --page-id YOUR_PAGE_ID
   ```

3. **Configure Environment**:
   ```bash
   # Create .env file
   INSTAGRAM_ACCESS_TOKEN=your_access_token
   INSTAGRAM_ACCOUNT_ID=your_instagram_account_id
   INSTAGRAM_API_VERSION=v18.0  # Optional
   ```

4. **Test Connection**:
   ```bash
   npm run instagram test
   ```

---

## Workflows

### Workflow 1: Content Publishing

Publish various content types to Instagram.

#### Photo Publishing

```bash
# Basic photo post
npm run instagram content photo publish \
  --url "https://example.com/image.jpg" \
  --caption "Beautiful sunset! 🌅 #photography"

# Photo with location
npm run instagram content photo publish \
  --url "https://example.com/image.jpg" \
  --caption "Visiting the Golden Gate Bridge" \
  --location "106028876109907"  # Golden Gate Bridge location ID
```

#### Video Publishing

```bash
# Standard video post
npm run instagram content video publish \
  --url "https://example.com/video.mp4" \
  --caption "Check out this amazing view! #travel"

# Video with location
npm run instagram content video publish \
  --url "https://example.com/video.mp4" \
  --caption "Live from Tokyo!" \
  --location "106050196090947"
```

#### Carousel Publishing (Multi-Image/Video Albums)

```bash
# Image carousel
npm run instagram content carousel publish \
  --images "https://example.com/img1.jpg,https://example.com/img2.jpg,https://example.com/img3.jpg" \
  --caption "Swipe to see the full series! #photoalbum"

# Mixed media carousel (images + videos)
npm run instagram content carousel publish \
  --images "https://example.com/img1.jpg,https://example.com/img2.jpg" \
  --videos "https://example.com/video1.mp4" \
  --caption "Behind the scenes content! #BTS"
```

#### Reel Publishing

```bash
# Basic reel
npm run instagram content reel publish \
  --url "https://example.com/reel.mp4" \
  --caption "Quick tutorial! #howto #tutorial"

# Reel with cover image and feed sharing
npm run instagram content reel publish \
  --url "https://example.com/reel.mp4" \
  --caption "New reel! Check it out! #reels" \
  --cover "https://example.com/cover.jpg" \
  --feed  # Also share to main feed
```

#### Story Publishing (24-Hour Content)

```bash
# Image story
npm run instagram content story publish \
  --url "https://example.com/story.jpg" \
  --type IMAGE

# Video story
npm run instagram content story publish \
  --url "https://example.com/story.mp4" \
  --type VIDEO
```

**Media Requirements**:
- **Photos**: JPG format, minimum 320px, aspect ratio 4:5 to 1.91:1
- **Videos**: MP4/MOV, max 60 seconds (feed), max 90 seconds (reels), max 15 seconds (stories)
- **Carousels**: 2-10 items, mixed photos/videos allowed
- **Media URLs**: Must be publicly accessible (HTTPS)

---

### Workflow 2: Content Management

List, view, update, and delete published media.

#### List Media

```bash
# List recent 25 posts
npm run instagram content media list --limit 25

# Export to JSON file
npm run instagram content media list --limit 100 --output media.json
```

#### Get Media Details

```bash
# Get specific post details
npm run instagram content media get 17912345678901234

# Output includes:
# - Media ID, type (IMAGE, VIDEO, CAROUSEL_ALBUM)
# - Caption, permalink
# - Timestamp, like count, comment count
# - Media URL (for images/videos)
```

#### Update Caption

```bash
# Update existing post caption
npm run instagram content media update 17912345678901234 \
  --caption "Updated caption with new hashtags! #updated #instagram"
```

#### Delete Media

```bash
# Delete post (requires confirmation)
npm run instagram content media delete 17912345678901234 --confirm
```

---

### Workflow 3: Engagement Management

Manage comments, mentions, and interactions.

#### Comment Management

```bash
# List comments on a post
npm run instagram engagement comments list 17912345678901234

# Reply to a comment
npm run instagram engagement comments reply 17998765432109876 \
  --message "Thanks for your feedback! 😊"

# Delete inappropriate comment
npm run instagram engagement comments delete 17998765432109876 --confirm

# Hide comment (from public view)
npm run instagram engagement comments hide 17998765432109876

# Unhide comment
npm run instagram engagement comments unhide 17998765432109876
```

#### Mention Tracking

```bash
# List recent mentions (tagged in posts/stories)
npm run instagram engagement mentions list --limit 20

# Output includes:
# - Media ID where mentioned
# - Caption, timestamp
# - Media type, permalink
```

**Moderation Tips**:
- Hide spam/inappropriate comments instead of deleting to preserve context
- Reply to positive comments to boost engagement
- Monitor mentions to engage with user-generated content
- Set up automated workflows for common comment responses

---

### Workflow 4: Analytics & Insights

Track performance metrics, audience demographics, and content insights.

#### Account Insights

```bash
# View key account metrics
npm run instagram analytics account insights \
  --metrics "impressions,reach,profile_views,follower_count" \
  --period day

# Extended period (7 days)
npm run instagram analytics account insights \
  --metrics "impressions,reach,website_clicks,email_contacts" \
  --period week

# Export to JSON
npm run instagram analytics account insights \
  --metrics "impressions,reach,profile_views" \
  --period days_28 \
  --output account_insights.json
```

**Available Account Metrics**:
- `impressions`: Total impressions
- `reach`: Total accounts reached
- `profile_views`: Profile views
- `website_clicks`: Website link clicks
- `email_contacts`: Email button taps
- `phone_call_clicks`: Call button taps
- `text_message_clicks`: Text button taps
- `get_directions_clicks`: Directions button taps
- `follower_count`: Total followers
- `online_followers`: Followers online

**Available Periods**: `day`, `week`, `days_28`

#### Media Insights

```bash
# Get single post insights
npm run instagram analytics media insights 17912345678901234 \
  --metrics "impressions,reach,engagement,saves"

# Batch analyze recent posts with CSV export
npm run instagram analytics media performance \
  --limit 10 \
  --output media_report.csv
```

**Media Metrics**:
- `impressions`: Total impressions
- `reach`: Accounts reached
- `engagement`: Likes + comments + saves + shares
- `saved`: Number of saves
- `video_views`: Video views (video posts only)
- `likes`: Like count
- `comments`: Comment count
- `shares`: Share count

**CSV Export Columns**: Media ID, Type, Caption (truncated), Impressions, Reach, Engagement, Saves, Likes, Comments, Published

#### Story Insights

```bash
# Get story-specific metrics (available for 24 hours)
npm run instagram analytics story insights 18912345678901234

# Story-specific metrics:
# - impressions, reach
# - exits: Times viewers exited story
# - taps_forward: Times viewers tapped to next story
# - taps_back: Times viewers tapped to previous story
# - replies: Number of replies
```

#### Audience Demographics

```bash
# Get audience breakdown
npm run instagram analytics account demographics --output demographics.json

# Includes:
# - Gender distribution (male/female/other)
# - Age groups (13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+)
# - Top locations (cities)
# - Top countries
# - Locale distribution
```

#### Metrics Reference

```bash
# Show comprehensive metrics guide
npm run instagram analytics metrics

# Displays all available metrics with descriptions
```

**Insights Best Practices**:
- Track `days_28` metrics for long-term trends
- Monitor `reach` vs `impressions` for content distribution
- Analyze `saves` as indicator of valuable content
- Use demographics to tailor content for audience
- Export CSV reports for external analysis
- Compare story metrics to identify engaging vs skippable content

---

### Workflow 5: Hashtag Research

Research hashtags, analyze performance, and identify trending topics.

#### Hashtag Search

```bash
# Search for hashtags
npm run instagram hashtags search "fitness"

# Returns:
# - Hashtag ID
# - Hashtag name
# - Media count (total posts with this hashtag)
```

#### Hashtag Details

```bash
# Get detailed hashtag information
npm run instagram hashtags info 17843691881264114

# Shows:
# - Hashtag ID, name
# - Total media count
```

#### Top Media for Hashtag

```bash
# Get top-performing posts for hashtag
npm run instagram hashtags top 17843691881264114 --limit 9

# Export to JSON
npm run instagram hashtags top 17843691881264114 \
  --limit 50 \
  --output fitness_top.json
```

#### Recent Media for Hashtag

```bash
# Get recent posts with hashtag
npm run instagram hashtags recent 17843691881264114 --limit 20

# Export to file
npm run instagram hashtags recent 17843691881264114 \
  --limit 100 \
  --output fitness_recent.json
```

#### Batch Hashtag Research

```bash
# Research multiple hashtags at once
npm run instagram hashtags research \
  --tags "fitness,health,wellness,workout,nutrition" \
  --output hashtag_research.csv

# CSV includes:
# - Hashtag name
# - Media count
# - Top posts summary
# - Recent activity indicators
```

**Hashtag Strategy**:
- Mix high-volume (1M+ posts) and niche (10K-100K) hashtags
- Use batch research to identify optimal hashtag combinations
- Analyze top posts to understand what content performs well
- Monitor recent posts to assess hashtag relevance
- Track seasonal/trending hashtags for timely content
- Limit to 30 hashtags per post (Instagram best practice)

**Recommended Hashtag Mix**:
- 3-5 high-volume hashtags (brand awareness)
- 5-10 medium-volume hashtags (target audience)
- 10-15 niche hashtags (engaged community)
- 2-5 branded/campaign hashtags

---

### Workflow 6: Shopping & Commerce

Manage product catalogs and tag products in posts.

#### Product Catalog

```bash
# View product catalog
npm run instagram shopping catalog 123456789012345

# Shows:
# - Catalog ID, name
# - Product count
# - Products list with IDs, names, descriptions
```

#### Product Tagging

```bash
# Tag products in a post
npm run instagram shopping tag 17912345678901234 \
  --products '[
    {"product_id": "987654321", "x": 0.5, "y": 0.3},
    {"product_id": "876543210", "x": 0.7, "y": 0.6}
  ]'

# Coordinate system:
# - x: 0.0 (left) to 1.0 (right)
# - y: 0.0 (top) to 1.0 (bottom)
# - Center of image: x=0.5, y=0.5
```

**Shopping Setup Requirements**:
1. Instagram Business Account
2. Facebook Shop or catalog connected
3. Products approved for Instagram Shopping
4. Commerce account in good standing
5. Eligible country/region

**Product Tagging Best Practices**:
- Tag 1-5 products per post
- Place tags at natural positions on products
- Use clear, well-lit product photos
- Include product descriptions in captions
- Link to shop in bio for easy access
- Monitor product catalog sync status

---

## Integration Examples

### Example 1: Automated Content Calendar

```bash
#!/bin/bash
# Publish scheduled posts from content calendar

# Monday: Motivational quote
npm run instagram content photo publish \
  --url "https://cdn.example.com/monday-motivation.jpg" \
  --caption "Start your week strong! 💪 #MondayMotivation #Fitness"

# Wednesday: Product feature
npm run instagram content carousel publish \
  --images "https://cdn.example.com/product1.jpg,https://cdn.example.com/product2.jpg,https://cdn.example.com/product3.jpg" \
  --caption "New arrivals! Swipe to shop 🛍️ #NewCollection #Fashion"

# Tag products in post
MEDIA_ID=$(# Get media ID from publish response)
npm run instagram shopping tag $MEDIA_ID \
  --products '[{"product_id":"123","x":0.5,"y":0.5}]'

# Friday: Reel content
npm run instagram content reel publish \
  --url "https://cdn.example.com/friday-reel.mp4" \
  --caption "Behind the scenes! #BTS #FridayVibes" \
  --feed
```

### Example 2: Engagement Monitoring & Response

```bash
#!/bin/bash
# Monitor and respond to engagement

# Check recent mentions
npm run instagram engagement mentions list --limit 10 > mentions.json

# List comments on recent posts
for post_id in $(cat recent_posts.txt); do
  npm run instagram engagement comments list $post_id >> all_comments.json
done

# Auto-reply to common questions
# (Process comments JSON and reply as needed)
npm run instagram engagement comments reply COMMENT_ID \
  --message "Thanks for your question! Check our bio link for more info 😊"
```

### Example 3: Weekly Performance Report

```bash
#!/bin/bash
# Generate weekly analytics report

# Account insights
npm run instagram analytics account insights \
  --metrics "impressions,reach,profile_views,follower_count" \
  --period week \
  --output weekly_account.json

# Media performance
npm run instagram analytics media performance \
  --limit 20 \
  --output weekly_media.csv

# Audience demographics
npm run instagram analytics account demographics \
  --output weekly_demographics.json

# Hashtag research
npm run instagram hashtags research \
  --tags "brand,product,industry,trending" \
  --output weekly_hashtags.csv

echo "Weekly report generated! Check JSON/CSV files."
```

### Example 4: Hashtag Optimization

```bash
#!/bin/bash
# Research and optimize hashtag strategy

# Test different hashtag sets
declare -a HASHTAG_SETS=(
  "fitness,health,wellness,gym,workout"
  "fitnessmotivation,healthylifestyle,workoutathome,fitfam,getfit"
  "crossfit,weightlifting,bodybuilding,strength,muscle"
)

# Research each set
for i in "${!HASHTAG_SETS[@]}"; do
  npm run instagram hashtags research \
    --tags "${HASHTAG_SETS[$i]}" \
    --output "hashtag_set_$i.csv"
done

# Analyze results to identify optimal mix
# (Process CSV files to find best performing hashtags)
```

---

## Advanced Features

### Template-Based Publishing

Create reusable content templates with variables:

```handlebars
{{!-- templates/product-launch.hbs --}}
🎉 NEW LAUNCH! 🎉

Introducing {{productName}}! {{description}}

✨ Features:
{{#each features}}
• {{this}}
{{/each}}

🛍️ Shop now! Link in bio.

{{hashtags}}
```

Use template:
```javascript
// From TypeScript/JavaScript
import { InstagramClient } from './instagram-client.js';
import Handlebars from 'handlebars';
import fs from 'fs';

const template = Handlebars.compile(
  fs.readFileSync('templates/product-launch.hbs', 'utf8')
);

const caption = template({
  productName: 'Ultimate Fitness Tracker',
  description: 'Track your workouts, monitor progress, achieve goals!',
  features: ['Heart rate monitoring', 'GPS tracking', 'Sleep analysis'],
  hashtags: '#fitness #wearable #health #newproduct'
});

const client = new InstagramClient(config);
await client.publishPhoto({
  image_url: 'https://cdn.example.com/product.jpg',
  caption: caption
});
```

### Batch Operations

Process multiple items efficiently:

```javascript
// Batch publish carousel posts
const posts = [
  { images: ['url1.jpg', 'url2.jpg'], caption: 'Day 1' },
  { images: ['url3.jpg', 'url4.jpg'], caption: 'Day 2' },
  { images: ['url5.jpg', 'url6.jpg'], caption: 'Day 3' }
];

for (const post of posts) {
  await client.publishCarousel({
    children: post.images.map(url => ({ image_url: url })),
    caption: post.caption
  });
  
  // Wait between posts to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
}
```

### Error Handling & Retries

Handle API errors gracefully:

```javascript
async function publishWithRetry(publishFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await publishFn();
    } catch (error) {
      if (error.code === 'ETIMEDOUT' && i < maxRetries - 1) {
        console.log(`Retry ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      throw error;
    }
  }
}

// Usage
await publishWithRetry(() => 
  client.publishPhoto({
    image_url: 'https://example.com/photo.jpg',
    caption: 'My post'
  })
);
```

---

## API Reference

### InstagramClient Class

```typescript
class InstagramClient {
  // Account
  getAccount(fields: string[]): Promise<any>
  getAccountFromPage(pageId: string): Promise<any>
  
  // Publishing
  publishPhoto(options: MediaOptions): Promise<any>
  publishVideo(options: MediaOptions): Promise<any>
  publishCarousel(options: MediaOptions): Promise<any>
  publishReel(options: MediaOptions): Promise<any>
  publishStory(options: StoryOptions): Promise<any>
  
  // Media Management
  getMedia(mediaId: string, fields: string[]): Promise<any>
  getAccountMedia(fields: string[], limit: number): Promise<any>
  updateCaption(mediaId: string, caption: string): Promise<any>
  deleteMedia(mediaId: string): Promise<any>
  
  // Engagement
  getComments(mediaId: string, fields: string[]): Promise<any>
  replyToComment(commentId: string, message: string): Promise<any>
  deleteComment(commentId: string): Promise<any>
  hideComment(commentId: string, hide: boolean): Promise<any>
  getMentions(fields: string[], limit: number): Promise<any>
  
  // Analytics
  getAccountInsights(options: InsightsOptions): Promise<any>
  getMediaInsights(mediaId: string, metrics: string[]): Promise<any>
  getStoryInsights(storyId: string): Promise<any>
  getAudienceDemographics(): Promise<any>
  
  // Hashtags
  searchHashtags(query: string): Promise<any>
  getHashtag(hashtagId: string, fields: string[]): Promise<any>
  getHashtagTopMedia(hashtagId: string, fields: string[], limit: number): Promise<any>
  getHashtagRecentMedia(hashtagId: string, fields: string[], limit: number): Promise<any>
  
  // Shopping
  getProductCatalog(catalogId: string): Promise<any>
  tagProducts(mediaId: string, productTags: Array<{product_id: string, x: number, y: number}>): Promise<any>
  
  // Utilities
  testConnection(): Promise<any>
  handleError(error: any): never
  loadConfig(): InstagramConfig
}
```

### Configuration

```typescript
interface InstagramConfig {
  accessToken: string;      // Instagram/Page access token
  accountId: string;        // Instagram Business Account ID
  apiVersion?: string;      // Graph API version (default: v18.0)
}
```

### Media Options

```typescript
interface MediaOptions {
  image_url?: string;       // Image URL
  video_url?: string;       // Video URL
  caption?: string;         // Post caption (max 2,200 characters)
  location_id?: string;     // Location/Place ID
  user_tags?: Array<{       // User tags (photos only)
    username: string;
    x: number;              // 0.0 to 1.0
    y: number;              // 0.0 to 1.0
  }>;
  children?: Array<{        // Carousel items
    image_url?: string;
    video_url?: string;
    is_carousel_item: true;
  }>;
  cover_url?: string;       // Reel cover image
  share_to_feed?: boolean;  // Share reel to feed
}
```

---

## Troubleshooting

### Common Issues

**"Invalid OAuth access token"**
- Token expired (max 60 days for long-lived tokens)
- Solution: Regenerate token via Graph API Explorer or OAuth flow
- Prevention: Implement token refresh mechanism

**"Instagram Account ID not found"**
- Instagram account not linked to Facebook Page
- Account is Personal, not Business/Creator
- Solution: Convert to Business account, link to Page

**"Media cannot be published"**
- Media URL not publicly accessible (check HTTPS, CORS)
- Media doesn't meet format requirements
- Solution: Verify URL accessibility, check format/size/aspect ratio

**"Insights not available for this media"**
- Media older than 2 years (account insights only available for 2 years)
- Story older than 24 hours (story insights expire)
- Solution: Request insights immediately after publishing

**"Rate limit exceeded"**
- Too many API requests in short time
- Solution: Implement delays between requests, respect rate limits
- Instagram limits: 200 calls per hour per user

**"Media publishing failed silently"**
- Publishing is container-based (create container, then publish)
- Container creation succeeded but publish failed
- Solution: Check container status, verify all requirements met

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment variable
export DEBUG=instagram:*

npm run instagram content photo publish --url "..." --caption "..."
```

View raw API responses:

```javascript
const client = new InstagramClient(config);
client.debug = true;  // Enable debug output
```

---

## Best Practices

### Rate Limits
- Instagram: 200 API calls per hour per user
- Space out publish requests (wait 1-2 minutes between posts)
- Implement exponential backoff for retries
- Cache insights data to reduce API calls

### Content Guidelines
- Photos: JPG, min 320px, aspect ratio 4:5 to 1.91:1
- Videos: MP4/MOV, max 60s (feed), max 90s (reels)
- Captions: Max 2,200 characters
- Hashtags: Max 30 per post (10-15 recommended)
- User tags: Max 20 per photo

### Security
- Store access tokens securely (environment variables, secrets management)
- Never commit tokens to version control
- Use long-lived page access tokens for automation
- Implement token refresh logic
- Monitor token expiration dates

### Performance
- Use batch operations for multiple posts
- Export insights to CSV for offline analysis
- Cache hashtag research results
- Implement retry logic for transient failures
- Monitor API response times

### Engagement
- Reply to comments within 24 hours for best reach
- Use mentions list to identify user-generated content
- Hide spam comments instead of deleting
- Track engagement metrics to identify best posting times
- Analyze demographics to tailor content

---

## Resources

- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing Guide](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Insights Reference](https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Instagram Business Tools](https://www.facebook.com/business/instagram)

---

version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.7
---
