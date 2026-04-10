# WordPress Integration - Command Reference

Complete CLI command reference for WordPress site management.

## Table of Contents
- [Setup & Configuration](#setup--configuration)
- [Authentication](#authentication)
- [Post Management](#post-management)
- [Page Management](#page-management)
- [User Management](#user-management)
- [Comment Moderation](#comment-moderation)
- [Media Management](#media-management)
- [Plugin Management](#plugin-management)
- [Theme Management](#theme-management)
- [Common Workflows](#common-workflows)

---

## Setup & Configuration

### Setup Wizard
```bash
npm run setup
```
Interactive guide for getting credentials and configuring `.env`

### Detect Account Tier
```bash
npm run detect
```
Shows your WordPress plan, storage, and available features.

### Diagnose Setup
```bash
npm run diagnose
```
Runs all diagnostic checks to verify installation.

---

## Authentication

### Verify Credentials
```bash
npm run auth verify
```
Tests API connection with current credentials.

### Get Site Information
```bash
npm run auth info
```
Shows site name, URL, plan, and post count.

---

## Post Management

### Create Post
```bash
npm run post create --title="Post Title" --content="Post content" --status=draft
```

**Options:**
- `--title` (required): Post title
- `--content` (required): Post content (HTML or plain text)
- `--status` (optional): `draft`, `publish`, `pending`, `private` (default: draft)

**Example:**
```bash
npm run post create \
  --title="My New Article" \
  --content="This is my article content." \
  --status=publish
```

### List Posts
```bash
npm run post list --limit=10 --status=publish
```

**Options:**
- `--limit`: Number of posts to retrieve (default: 10)
- `--status`: Filter by status (`publish`, `draft`, `pending`)

**Output:**
Shows post ID, title, status, and URL for each post.

### Update Post
```bash
npm run post update --id=123 --title="New Title" --content="Updated content"
```

**Options:**
- `--id` (required): Post ID
- `--title`: New title
- `--content`: New content
- `--status`: New status

### Delete Post
```bash
npm run post delete --id=123
```

**Options:**
- `--id` (required): Post ID to delete

---

## Page Management

### Create Page
```bash
npm run page create --title="About" --content="About page content"
```

### List Pages
```bash
npm run page list
```

### Update Page
```bash
npm run page update --id=456 --content="New content"
```

---

## User Management

### List Users
```bash
npm run user list
```
Shows all site users with their roles.

### Get User Details
```bash
npm run user get --id=1
```

**Output:**
- User ID
- Username
- Display name
- Email
- Assigned roles

### Create User
```bash
npm run user create --name="John Doe" --email="john@example.com" --role=editor
```

**Options:**
- `--name`: Display name
- `--email`: User email
- `--role`: User role (subscriber, contributor, author, editor, administrator)

---

## Comment Moderation

### List Comments
```bash
npm run comment list --post-id=123 --status=hold
```

**Options:**
- `--post-id`: Filter by post
- `--status`: Filter by status (approved, hold, spam)

**Output:**
Shows comment ID, author, status, and excerpt.

### Approve Comment
```bash
npm run comment approve --id=456
```

### Mark as Spam
```bash
npm run comment spam --id=457
```

---

## Media Management

### Upload Media
```bash
npm run media upload --file=/path/to/image.jpg --title="My Image"
```

**Options:**
- `--file` (required): Path to file to upload
- `--title`: Image title
- `--description`: Image description

**Supported formats:** JPG, PNG, GIF, PDF, MP4, etc.

### List Media
```bash
npm run media list --limit=20
```

### Delete Media
```bash
npm run media delete --id=789
```

---

## Plugin Management

### List Plugins
```bash
npm run plugin list
```
Shows all installed plugins with version and status.

### Search Plugins
```bash
npm run plugin search --query=jetpack
```
Search WordPress plugin directory.

### Install Plugin
```bash
npm run plugin install --slug=jetpack
```

### Activate Plugin
```bash
npm run plugin activate --slug=jetpack
```

### Deactivate Plugin
```bash
npm run plugin deactivate --slug=jetpack
```

### Update Plugin
```bash
npm run plugin update --slug=jetpack
```

---

## Theme Management

### List Themes
```bash
npm run theme list
```
Shows available themes, marking active theme.

### Search Themes
```bash
npm run theme search --query=minimal
```

### Activate Theme
```bash
npm run theme activate --slug=twentytwentythree
```

---

## Common Workflows

### Workflow 1: Publish Blog Post

```bash
# Create post as draft
npm run post create \
  --title="My Article" \
  --content="Article content here" \
  --status=draft

# Upload featured image
npm run media upload --file=./cover.jpg

# Update post with image (ID from create output)
npm run post update --id=123 \
  --content="Updated with image"

# Publish
npm run post update --id=123 --status=publish
```

### Workflow 2: Moderate Comments

```bash
# View pending comments
npm run comment list --status=hold

# Approve good comments
npm run comment approve --id=456

# Spam bad comments
npm run comment spam --id=457
```

### Workflow 3: Setup Site

```bash
# Verify setup
npm run auth verify

# Check account tier
npm run detect

# Get site info
npm run auth info

# List users
npm run user list

# List plugins
npm run plugin list

# Activate essential plugins
npm run plugin activate --slug=jetpack
npm run plugin activate --slug=akismet
```

### Workflow 4: Bulk Import Posts

```bash
# Create multiple posts
npm run post create --title="Post 1" --content="Content 1" --status=draft
npm run post create --title="Post 2" --content="Content 2" --status=draft
npm run post create --title="Post 3" --content="Content 3" --status=draft

# Verify import
npm run post list --status=draft
```

### Workflow 5: Content Management

```bash
# List all published posts
npm run post list --status=publish --limit=50

# Update post (ID from list)
npm run post update --id=123 \
  --title="Updated Title"

# Check comments
npm run comment list --post-id=123

# Approve comments
npm run comment approve --id=456

# List draft posts for review
npm run post list --status=draft
```

---

## Environment Variables

### Required (One set)

**WordPress.com:**
```bash
WORDPRESS_COM_CLIENT_ID=your_client_id
WORDPRESS_COM_CLIENT_SECRET=your_client_secret
```

**Self-Hosted:**
```bash
WORDPRESS_SITE_URL=https://example.com
WORDPRESS_APP_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

### Optional

```bash
WORDPRESS_SITE_ID=123456              # WordPress.com site ID (auto-detected)
WORDPRESS_DEFAULT_POST_STATUS=draft   # Default for new posts
WORDPRESS_TIMEOUT=30000               # Request timeout (ms)
WORDPRESS_VERBOSE=false               # Enable verbose logging
```

---

## Account Tier Features

| Feature | Free | Personal | Premium | Business | eCommerce | Self-Hosted |
|---------|------|----------|---------|----------|-----------|-------------|
| Posts/Pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Media | Limited | 50GB | 200GB | 200GB | 200GB | ∞ |
| Users | 1 | 1 | ∞ | ∞ | ∞ | ∞ |
| Comments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Plugins | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Themes | Limited | Limited | Limited | ✅ | ✅ | ✅ |
| Custom CSS | ❌ | ❌ | Limited | ✅ | ✅ | ✅ |
| API Access | ❌ | Limited | Limited | ✅ | ✅ | ✅ |
| SEO Tools | ❌ | ❌ | ✅ | ✅ | ✅ | Limited |
| Support | Community | Email | Email | Email+Phone | Email+Phone | N/A |

---

## Exit Codes

- `0` - Success
- `1` - Command failed

---

## Tips & Best Practices

### Security
- Store credentials in `.env` (never commit)
- Use Application Passwords for self-hosted (not user password)
- Rotate credentials periodically
- Keep API access restricted to necessary scopes

### Performance
- Limit posts per request (recommended: 10-20)
- Use status filters to narrow results
- Cache results locally when possible
- Batch operations to reduce requests

### Content Management
- Keep drafts until ready to publish
- Use meaningful titles and excerpts
- Organize with categories and tags
- Monitor comments for engagement

### Troubleshooting
- Use `npm run diagnose` to check setup
- Verify credentials in `.env`
- Check site URL is accessible
- Ensure REST API is enabled (self-hosted)

---

## Resources

- **Official Documentation**: https://developer.wordpress.org/rest-api/
- **WordPress.com**: https://wordpress.com/
- **Developer Apps**: https://developer.wordpress.com/apps/
- **Support Forums**: https://wordpress.org/support/
- **WordPress Community**: https://wordpress.org/support/forums/

---

## Support

For issues or questions:
1. Run `npm run diagnose` to check setup
2. See troubleshooting section
3. Check official WordPress documentation
4. Post in WordPress support forums

---

_WordPress CLI Reference v1.0.0_
