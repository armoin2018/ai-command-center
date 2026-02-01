# WordPress Integration for AI-ley

**Skill ID:** ailey-web-wordpress  
**Version:** 1.0.0  
**Last Updated:** 2026-02-01  
**Status:** Production Ready

---

## Overview

The WordPress integration provides comprehensive support for managing WordPress.com and self-hosted WordPress sites. This skill includes automatic account tier detection, OAuth authentication, site and content management, media handling, plugin/theme management, user administration, and SEO/analytics capabilities.

**Key Features:**
- 🎯 Automatic account tier detection (Free, Personal, Premium, Business, eCommerce, Pro)
- 📝 Complete post and page management (CRUD operations)
- 🖼️ Media library management with image optimization
- 👥 User and role management
- 💬 Comment moderation and management
- 🔌 Plugin discovery and management
- 🎨 Theme management and customization
- 📊 Site analytics and statistics
- 🔍 SEO optimization and keyword analysis
- 🔐 OAuth2 and Application Password authentication
- 📱 Both WordPress.com and self-hosted support

---

## Account Tier Detection

WordPress has different hosting and plan options with varying capabilities:

### Tier 1: WordPress.com Free
- **Cost:** Free
- **Storage:** 3 GB
- **Bandwidth:** Unlimited
- **Features:**
  - Basic blogging
  - WordPress.com domain
  - Limited customization
  - Community support
  - ✅ Post/page management
  - ✅ Basic media
  - ❌ Plugins
  - ❌ Custom domain
  - ❌ SEO tools
  - ❌ Analytics

### Tier 2: WordPress.com Personal
- **Cost:** $36/month
- **Storage:** 50 GB
- **Bandwidth:** Unlimited
- **Features:**
  - ✅ Custom domain
  - ✅ Email support
  - ✅ Jetpack features
  - ✅ Monetization ready
  - ❌ Plugins
  - ❌ Advanced SEO
  - ❌ Full customization

### Tier 3: WordPress.com Premium
- **Cost:** $96/month
- **Storage:** 200 GB
- **Bandwidth:** Unlimited
- **Features:**
  - ✅ All Personal features
  - ✅ Advanced customization
  - ✅ Video hosting
  - ✅ SEO tools
  - ✅ Jetpack features
  - ✅ CSS editing
  - ❌ Plugins
  - ❌ eCommerce

### Tier 4: WordPress.com Business
- **Cost:** $300/month
- **Storage:** 200 GB
- **Bandwidth:** Unlimited
- **Features:**
  - ✅ All Premium features
  - ✅ Plugins & themes upload
  - ✅ Email support + phone
  - ✅ Custom CSS
  - ✅ Monetization tools
  - ✅ Full API access
  - ✅ Advanced SEO

### Tier 5: WordPress.com eCommerce
- **Cost:** $300/month
- **Storage:** 200 GB
- **Features:**
  - ✅ All Business features
  - ✅ WooCommerce integration
  - ✅ Payment gateways
  - ✅ Inventory management
  - ✅ Shipping integration
  - ✅ Tax calculation

### Tier 6: Self-Hosted WordPress
- **Cost:** Variable (hosting dependent)
- **Storage:** Depends on host
- **Features:**
  - ✅ Complete control
  - ✅ All plugins and themes
  - ✅ Full customization
  - ✅ Unlimited users
  - ✅ Unlimited content
  - ✅ API access

### Tier 7: WordPress.com Pro (Enterprise)
- **Cost:** Custom pricing
- **Features:**
  - ✅ All features
  - ✅ Dedicated support
  - ✅ Custom development
  - ✅ Advanced security
  - ✅ Performance optimization
  - ✅ Custom SLA

### Feature Comparison Matrix

| Feature | Free | Personal | Premium | Business | eCommerce | Self-Hosted | Pro |
|---------|------|----------|---------|----------|-----------|-------------|-----|
| Posts/Pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Media | Limited | 50GB | 200GB | 200GB | 200GB | ∞ | ∞ |
| Custom Domain | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Plugins | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Themes | Limited | Limited | Limited | ✅ | ✅ | ✅ | ✅ |
| CSS Editing | ❌ | ❌ | Limited | ✅ | ✅ | ✅ | ✅ |
| SEO Tools | ❌ | ❌ | ✅ | ✅ | ✅ | Limited | ✅ |
| Analytics | Basic | Basic | Advanced | Advanced | Advanced | Limited | Advanced |
| eCommerce | ❌ | ❌ | ❌ | ❌ | ✅ | Limited | ✅ |
| Jetpack | Limited | ✅ | ✅ | ✅ | ✅ | Optional | ✅ |
| API Access | ❌ | Limited | Limited | ✅ | ✅ | ✅ | ✅ |
| Support | Community | Email | Email | Email+Phone | Email+Phone | N/A | Dedicated |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- WordPress.com account (or self-hosted WordPress with REST API enabled)
- API credentials (OAuth or Application Password)

### Step 1: Choose Your WordPress Setup

#### Option A: WordPress.com
1. Visit https://wordpress.com/
2. Create account or sign in
3. Create a new site or use existing
4. Create OAuth application at https://developer.wordpress.com/apps/

#### Option B: Self-Hosted WordPress
1. Install WordPress on your server
2. Ensure REST API is enabled (WordPress 4.7+)
3. Generate Application Password:
   - Log in as admin
   - Go to Users → Your Profile
   - Scroll to "Application Passwords"
   - Create new password

### Step 2: Get Your Credentials

**For WordPress.com:**
1. Visit https://developer.wordpress.com/apps/
2. Create new application:
   - Name your app
   - Set redirect URI: `http://localhost:3000/callback`
3. Copy Client ID and Client Secret

**For Self-Hosted:**
1. Log in to WordPress admin
2. Go to Users → Your Profile
3. Scroll down to "Application Passwords"
4. Create new password
5. Copy username and password

### Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with your credentials
nano .env
```

**For WordPress.com:**
```bash
WORDPRESS_COM_CLIENT_ID=your_client_id
WORDPRESS_COM_CLIENT_SECRET=your_client_secret
WORDPRESS_COM_REDIRECT_URI=http://localhost:3000/callback
```

**For Self-Hosted:**
```bash
WORDPRESS_SITE_URL=https://example.com
WORDPRESS_APP_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

### Step 4: Install Dependencies

```bash
npm install
npm run build
```

### Step 5: Verify Setup

```bash
npm run detect
npm run auth verify
```

---

## Usage

### Detect Account Tier

```bash
npm run detect
```

Returns:
```json
{
  "tier": "Business",
  "siteType": "WordPress.com",
  "features": ["posts", "pages", "media", "plugins", "themes", "users", "comments", "seo", "analytics"],
  "storage": "200GB",
  "apiAccess": true,
  "setupInstructions": "..."
}
```

### Manage Posts

```bash
# Create post
npm run post create --title="My Post" --content="Post content" --status=draft

# Get posts
npm run post list --limit=10

# Update post
npm run post update --id=123 --title="Updated Title"

# Delete post
npm run post delete --id=123
```

### Manage Pages

```bash
npm run page create --title="About" --content="About page content"
npm run page list
npm run page update --id=456 --content="New content"
```

### Manage Media

```bash
npm run media upload --file=/path/to/image.jpg
npm run media list
npm run media delete --id=789
```

### Manage Users

```bash
npm run user list
npm run user get --id=1
npm run user create --name="New User" --email="user@example.com" --role=editor
```

### Manage Comments

```bash
npm run comment list --post-id=123
npm run comment approve --id=456
npm run comment spam --id=457
```

### Plugin Management

```bash
npm run plugin list
npm run plugin search --query=seo
npm run plugin install --slug=jetpack
npm run plugin activate --slug=jetpack
npm run plugin deactivate --slug=jetpack
```

### Theme Management

```bash
npm run theme list
npm run theme search --query=minimal
npm run theme activate --slug=twentytwentythree
```

### Analytics

```bash
npm run analytics views --days=30
npm run analytics topPosts --limit=10
npm run analytics referrers
npm run analytics summary
```

### SEO

```bash
npm run seo analyze --post-id=123
npm run seo keywords --post-id=123
npm run seo suggest --post-id=123
```

---

## AI-ley Integration

Add to your `.github/aicc/aicc.yaml`:

```yaml
skills:
  wordpress:
    provider: wordpress
    enabled: true
    config:
      siteType: "wordpress-com"  # or "self-hosted"
      siteUrl: "${WORDPRESS_SITE_URL}"
      clientId: "${WORDPRESS_COM_CLIENT_ID}"
      clientSecret: "${WORDPRESS_COM_CLIENT_SECRET}"
      appUsername: "${WORDPRESS_APP_USERNAME}"
      appPassword: "${WORDPRESS_APP_PASSWORD}"
    features:
      - content-management
      - media-management
      - user-management
      - seo
      - analytics
    accountTier: "Business"
    apiAccess: true
```

---

## TypeScript Integration

```typescript
import { WordPressClient } from './src/index';

const client = new WordPressClient({
  siteType: 'wordpress-com',
  clientId: process.env.WORDPRESS_COM_CLIENT_ID!,
  clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET!,
  siteUrl: process.env.WORDPRESS_SITE_URL
});

// Detect account tier
const account = await client.detectAccountTier();
console.log(`Tier: ${account.tier}`);

// Create post
const post = await client.createPost({
  title: 'New Post',
  content: 'Post content here',
  status: 'draft'
});
console.log(`Post ID: ${post.id}`);

// Get posts
const posts = await client.getPosts({ limit: 10 });
console.log(`Found ${posts.length} posts`);

// Upload media
const media = await client.uploadMedia({
  filePath: '/path/to/image.jpg',
  title: 'My Image'
});
console.log(`Media URL: ${media.url}`);

// List users
const users = await client.getUsers();
console.log(`Found ${users.length} users`);
```

---

## Common Workflows

### Workflow 1: Publish Blog Post with Featured Image

```typescript
// Upload featured image
const media = await client.uploadMedia({
  filePath: './featured.jpg',
  title: 'Featured Image'
});

// Create post with image
const post = await client.createPost({
  title: 'New Article',
  content: 'Article content',
  featuredImage: media.id,
  status: 'publish'
});

console.log(`Published: ${post.url}`);
```

### Workflow 2: Bulk Import Posts

```typescript
const posts = [
  { title: 'Post 1', content: 'Content 1' },
  { title: 'Post 2', content: 'Content 2' },
  { title: 'Post 3', content: 'Content 3' }
];

for (const post of posts) {
  await client.createPost({
    ...post,
    status: 'draft'
  });
  console.log(`Created: ${post.title}`);
}
```

### Workflow 3: Moderate Comments

```typescript
// Get pending comments
const comments = await client.getComments({ status: 'hold' });

for (const comment of comments) {
  if (comment.author === 'trusted-user') {
    await client.approveComment(comment.id);
  } else if (comment.content.includes('spam')) {
    await client.spamComment(comment.id);
  }
}
```

### Workflow 4: SEO Optimization

```typescript
// Get all published posts
const posts = await client.getPosts({ status: 'publish' });

for (const post of posts) {
  // Analyze SEO
  const analysis = await client.analyzeSEO(post.id);
  
  if (analysis.score < 70) {
    console.log(`SEO improvements needed for: ${post.title}`);
    const suggestions = await client.getSEOSuggestions(post.id);
    console.log(suggestions);
  }
}
```

### Workflow 5: Content Calendar Management

```typescript
// Get upcoming scheduled posts
const scheduled = await client.getPosts({
  status: 'future',
  limit: 50
});

// Group by date
const byDate = scheduled.reduce((acc, post) => {
  const date = post.date.split('T')[0];
  if (!acc[date]) acc[date] = [];
  acc[date].push(post);
  return acc;
}, {});

console.log('Content Calendar:', byDate);
```

---

## API Reference

### Core Methods

**Account & Site**
- `detectAccountTier()` - Get account tier and features
- `verifyCredentials()` - Verify API access
- `getSiteInfo()` - Get site details
- `getSiteStats()` - Get site statistics

**Posts & Pages**
- `createPost(options)` - Create new post
- `getPosts(options)` - Get posts with filters
- `getPost(id)` - Get single post
- `updatePost(id, options)` - Update post
- `deletePost(id)` - Delete post
- `createPage(options)` - Create page
- `getPages(options)` - Get pages
- `updatePage(id, options)` - Update page

**Media**
- `uploadMedia(options)` - Upload media file
- `getMedia(options)` - Get media items
- `getMediaItem(id)` - Get single media
- `deleteMedia(id)` - Delete media

**Users**
- `getUsers()` - Get all users
- `getUser(id)` - Get single user
- `createUser(options)` - Create user
- `updateUser(id, options)` - Update user
- `deleteUser(id)` - Delete user

**Comments**
- `getComments(options)` - Get comments
- `getComment(id)` - Get single comment
- `approveComment(id)` - Approve comment
- `spamComment(id)` - Mark as spam
- `trashComment(id)` - Trash comment
- `deleteComment(id)` - Permanently delete

**Plugins & Themes**
- `getPlugins()` - List installed plugins
- `searchPlugins(query)` - Search plugin directory
- `installPlugin(slug)` - Install plugin
- `activatePlugin(slug)` - Activate plugin
- `deactivatePlugin(slug)` - Deactivate plugin
- `updatePlugin(slug)` - Update plugin
- `getThemes()` - List themes
- `searchThemes(query)` - Search theme directory
- `activateTheme(slug)` - Activate theme

**Analytics & SEO**
- `getViews(period)` - Get view statistics
- `getTopPosts(limit)` - Get most viewed posts
- `getReferrers()` - Get referrer data
- `analyzeSEO(postId)` - Analyze post SEO
- `getSEOSuggestions(postId)` - Get SEO improvements
- `getKeywords(postId)` - Get keyword analysis

---

## Troubleshooting

### "Invalid credentials" error
- Verify Client ID/Secret in `.env`
- For self-hosted, ensure Application Password is correct
- Check that site URL is accessible

### "API rate limit exceeded"
- WordPress.com has rate limits (10 requests/second)
- Implement backoff/retry logic
- Use batch operations where possible

### "Site not found" error
- Verify WordPress.com site ID is correct
- For self-hosted, ensure site URL is accessible
- Check that REST API is enabled

### "Permission denied" error
- User role may lack permissions
- Create user with appropriate role
- Check token scopes

### "Media upload failed"
- Check file size limits (250 MB WordPress.com, varies for self-hosted)
- Verify file format is allowed
- Ensure disk space available

---

## Resources

- **WordPress.com:** https://wordpress.com/
- **WordPress REST API:** https://developer.wordpress.org/rest-api/
- **Developer Apps:** https://developer.wordpress.com/apps/
- **Documentation:** https://developer.wordpress.org/
- **Support:** https://support.wordpress.com/

---

## Support & Issues

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Visit WordPress support forums
4. Check GitHub issues

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6

---
