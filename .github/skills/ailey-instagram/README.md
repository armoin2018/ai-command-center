# ailey-instagram

> Comprehensive Instagram integration for business and personal content management, engagement, analytics, and commerce.

## Quick Start

```bash
# Install
cd .github/skills/ailey-instagram
npm install

# Setup
npm run instagram setup  # View setup instructions
npm run instagram test   # Test connection

# Publish content
npm run instagram content photo publish --url "URL" --caption "Caption"
npm run instagram content reel publish --url "URL" --caption "Caption"

# Manage engagement
npm run instagram engagement comments list MEDIA_ID
npm run instagram engagement mentions list

# Analytics
npm run instagram analytics account insights --metrics "impressions,reach"
npm run instagram analytics media performance --limit 10 --output report.csv

# Hashtag research
npm run instagram hashtags research --tags "tag1,tag2,tag3" --output research.csv
```

## Features

- ✅ **Content Publishing**: Photos, videos, carousels, reels, stories
- ✅ **Media Management**: List, view, update, delete posts
- ✅ **Engagement**: Comments (reply, delete, hide), mentions tracking
- ✅ **Analytics**: Account/media/story insights, demographics
- ✅ **Hashtag Research**: Search, analysis, batch research
- ✅ **Shopping**: Product catalogs, product tagging

## Commands

### Content

```bash
# Photos
npm run instagram content photo publish --url URL --caption "Text" --location ID

# Videos
npm run instagram content video publish --url URL --caption "Text"

# Carousels (albums)
npm run instagram content carousel publish --images "url1,url2,url3" --caption "Text"

# Reels
npm run instagram content reel publish --url URL --caption "Text" --feed

# Stories
npm run instagram content story publish --url URL --type IMAGE|VIDEO

# Media management
npm run instagram content media list --limit 25
npm run instagram content media get MEDIA_ID
npm run instagram content media update MEDIA_ID --caption "New caption"
npm run instagram content media delete MEDIA_ID --confirm
```

### Engagement

```bash
# Comments
npm run instagram engagement comments list MEDIA_ID
npm run instagram engagement comments reply COMMENT_ID --message "Reply"
npm run instagram engagement comments delete COMMENT_ID --confirm
npm run instagram engagement comments hide COMMENT_ID

# Mentions
npm run instagram engagement mentions list --limit 10
```

### Analytics

```bash
# Account insights
npm run instagram analytics account insights \
  --metrics "impressions,reach,profile_views" \
  --period day|week|days_28

# Demographics
npm run instagram analytics account demographics --output file.json

# Media performance
npm run instagram analytics media insights MEDIA_ID --metrics "impressions,reach"
npm run instagram analytics media performance --limit 10 --output report.csv

# Story insights
npm run instagram analytics story insights STORY_ID

# Metrics reference
npm run instagram analytics metrics
```

### Hashtags

```bash
# Search
npm run instagram hashtags search "fitness"

# Details
npm run instagram hashtags info HASHTAG_ID

# Top/recent media
npm run instagram hashtags top HASHTAG_ID --limit 9
npm run instagram hashtags recent HASHTAG_ID --limit 20

# Batch research
npm run instagram hashtags research \
  --tags "tag1,tag2,tag3" \
  --output research.csv
```

### Shopping

```bash
# Catalog
npm run instagram shopping catalog CATALOG_ID

# Tag products
npm run instagram shopping tag MEDIA_ID \
  --products '[{"product_id":"123","x":0.5,"y":0.5}]'
```

## Configuration

Create `.env` file:

```bash
INSTAGRAM_ACCESS_TOKEN=your_access_token
INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id
INSTAGRAM_API_VERSION=v18.0  # Optional
```

## Requirements

- Instagram Business or Creator Account
- Facebook Page linked to Instagram
- Facebook App with Instagram permissions
- Access token with required permissions

## Permissions

- `instagram_basic`: Account access
- `instagram_content_publish`: Publishing
- `instagram_manage_comments`: Comment management
- `instagram_manage_insights`: Analytics
- `pages_read_engagement`: Page engagement
- `pages_show_list`: List pages

## Media Requirements

- **Photos**: JPG, min 320px, 4:5 to 1.91:1 aspect ratio
- **Videos**: MP4/MOV, max 60s (feed), max 90s (reels)
- **Stories**: Max 15s videos
- **Captions**: Max 2,200 characters
- **Hashtags**: Max 30 (10-15 recommended)

## Documentation

- [SKILL.md](SKILL.md) - Comprehensive workflows and examples
- [SETUP.md](SETUP.md) - Detailed authentication setup
- Run `npm run instagram setup` - Interactive setup guide

## Troubleshooting

**Invalid access token**: Regenerate via Graph API Explorer

**Account ID not found**: Ensure Business/Creator account linked to Facebook Page

**Media publishing failed**: Verify media URL is publicly accessible, meets format requirements

**Insights not available**: Media must be < 2 years old (stories < 24 hours)

**Rate limit exceeded**: Wait between requests (200 calls/hour limit)

## Resources

- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Insights Reference](https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

---

**License**: MIT  
**Version**: 1.0.0
