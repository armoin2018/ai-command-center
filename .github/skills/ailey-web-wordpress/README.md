# WordPress Integration - Quick Start Guide

Manage WordPress.com and self-hosted WordPress sites directly from the command line and Node.js applications.

## Features

✅ **WordPress.com & Self-Hosted Support**  
✅ **Post & Page Management**: Create, read, update, delete with full control  
✅ **Media Management**: Upload, organize, and manage media libraries  
✅ **User Management**: Manage roles and permissions  
✅ **Comment Moderation**: Approve, spam, and manage comments  
✅ **Plugin Management**: Install, activate, deactivate plugins  
✅ **Theme Management**: Browse and activate themes  
✅ **Account Tier Detection**: Auto-detect features based on plan  
✅ **OAuth & Application Passwords**: Secure authentication methods  
✅ **REST API Integration**: Full WordPress REST API support

## Quick Setup

### 1. Prerequisites

- Node.js 18+ and npm 9+
- WordPress.com account OR self-hosted WordPress installation
- REST API enabled (self-hosted WordPress 4.7+)

### 2. Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Set up environment
cp .env.example .env
```

### 3. Configure Credentials

Edit `.env` based on your setup:

**For WordPress.com:**
```bash
WORDPRESS_COM_CLIENT_ID=your_client_id
WORDPRESS_COM_CLIENT_SECRET=your_client_secret
```

**For Self-Hosted:**
```bash
WORDPRESS_SITE_URL=https://example.com
WORDPRESS_APP_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

### 4. Verify Setup

```bash
npm run detect
npm run auth verify
```

## Account Tiers

| Plan | Cost | Storage | Features |
|------|------|---------|----------|
| **Free** | $0 | 3 GB | Basic blogging |
| **Personal** | $36/mo | 50 GB | Custom domain, monetization |
| **Premium** | $96/mo | 200 GB | Advanced customization, SEO |
| **Business** | $300/mo | 200 GB | Plugins, themes, full API |
| **eCommerce** | $300/mo | 200 GB | WooCommerce, payments |
| **Self-Hosted** | Variable | ∞ | Complete control |

## Common Commands

### Manage Posts
```bash
# Create post
npm run post create --title="My Post" --content="Content here" --status=draft

# List posts
npm run post list --limit=10

# Update post
npm run post update --id=123 --title="New Title"

# Delete post
npm run post delete --id=123
```

### Manage Pages
```bash
npm run page create --title="About" --content="About content"
npm run page list
```

### Manage Users
```bash
npm run user list
npm run user get --id=1
npm run user create --name="New User" --email="user@example.com"
```

### Moderate Comments
```bash
npm run comment list --post-id=123
npm run comment approve --id=456
npm run comment spam --id=457
```

### Manage Plugins
```bash
npm run plugin list
npm run plugin search --query=jetpack
npm run plugin install --slug=jetpack
```

### Manage Themes
```bash
npm run theme list
npm run theme activate --slug=twentytwentythree
```

## TypeScript Integration

```typescript
import { WordPressClient } from './src/index';

const client = new WordPressClient({
  siteType: 'wordpress-com',
  clientId: process.env.WORDPRESS_COM_CLIENT_ID!,
  clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET!
});

// Detect account tier
const account = await client.detectAccountTier();
console.log(`Plan: ${account.tier}`);

// Create and publish post
const post = await client.createPost({
  title: 'Hello World',
  content: 'My first post!',
  status: 'publish'
});

console.log(`Published: ${post.url}`);

// List recent posts
const posts = await client.getPosts({ limit: 5 });
posts.forEach(post => {
  console.log(`- ${post.title} (${post.status})`);
});
```

## Getting WordPress Credentials

### WordPress.com

1. Visit https://developer.wordpress.com/apps/
2. Sign in with your WordPress.com account
3. Create new application:
   - Enter application name
   - Set redirect URI: `http://localhost:3000/callback`
4. Copy **Client ID** and **Client Secret**
5. Add to `.env`:
   ```
   WORDPRESS_COM_CLIENT_ID=your_id
   WORDPRESS_COM_CLIENT_SECRET=your_secret
   ```

### Self-Hosted WordPress

1. Log in to WordPress admin dashboard
2. Go to **Users → Your Profile**
3. Scroll down to **Application Passwords** section
4. Enter an app name and click **Create Application Password**
5. Copy the generated password
6. Add to `.env`:
   ```
   WORDPRESS_SITE_URL=https://example.com
   WORDPRESS_APP_USERNAME=admin
   WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
   ```

## Common Workflows

### Publish Blog Post with Featured Image

```typescript
// Upload image
const media = await client.uploadMedia({
  filePath: './cover.jpg',
  title: 'Cover Image'
});

// Create post with image
const post = await client.createPost({
  title: 'New Article',
  content: 'Article content...',
  featuredImage: media.id,
  status: 'publish'
});
```

### Bulk Import Posts

```typescript
const posts = [
  { title: 'Post 1', content: 'Content 1' },
  { title: 'Post 2', content: 'Content 2' }
];

for (const post of posts) {
  await client.createPost({
    ...post,
    status: 'draft'
  });
}
```

### Moderate Comments

```typescript
// Get pending comments
const comments = await client.getComments({ status: 'hold' });

for (const comment of comments) {
  if (isSpam(comment.content)) {
    await client.spamComment(comment.id);
  } else {
    await client.approveComment(comment.id);
  }
}
```

## API Reference

**Account & Site**
- `detectAccountTier()` - Get plan and features
- `verifyCredentials()` - Test API access
- `getSiteInfo()` - Get site details

**Content**
- `createPost()` - Create new post
- `getPosts()` - List posts
- `updatePost()` - Update post
- `deletePost()` - Delete post

**Media**
- `uploadMedia()` - Upload file
- `getMedia()` - List media

**Users**
- `getUsers()` - List users
- `getUser()` - Get user details
- `createUser()` - Create user

**Comments**
- `getComments()` - List comments
- `approveComment()` - Approve comment
- `spamComment()` - Mark as spam

**Plugins & Themes**
- `getPlugins()` - List plugins
- `getThemes()` - List themes

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for all commands.

## Troubleshooting

### "Invalid credentials"
- Verify Client ID and Secret in `.env`
- For self-hosted, ensure Application Password is correct
- Check site URL is accessible

### "API rate limit"
- WordPress.com limits to 10 requests/second
- Implement backoff/retry logic

### "REST API not enabled"
- Ensure WordPress is 4.7 or newer
- Check if REST API endpoints are accessible

## Resources

- **WordPress.com**: https://wordpress.com/
- **REST API Docs**: https://developer.wordpress.org/rest-api/
- **Developer Apps**: https://developer.wordpress.com/apps/
- **Support**: https://support.wordpress.com/

## Next Steps

1. ✅ Setup complete? Run: `npm run detect`
2. 📝 Create your first post: `npm run post create ...`
3. 📖 Read full docs: [SKILL.md](SKILL.md)
4. 🔧 Integrate into app: See TypeScript Integration
5. 🚀 Deploy to production

---

**Questions?** See [SKILL.md](SKILL.md) for full documentation or [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for all commands.
