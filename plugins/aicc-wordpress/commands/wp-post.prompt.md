---
id: wp-post
name: wpPost
description: Create, update, list, or delete WordPress posts using the WordPress REST API integration. Supports draft, publish, and scheduled status.
keywords: [wordpress, post, content, blog, publish, draft, crud]
tools: [execute, read, edit, search]
agent: AI-ley WordPress
---

## Variables

- Folders, Files and Indexes are stored in `.github/ai-ley/ai-ley.json`

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md` — WordPress API integration

**Instructions:** `instructions/tools/wordpress.instructions.md` — WordPress coding standards

**Persona:** `personas/wordpress-developer.md` — WordPress expertise

## Task

Manage WordPress posts via the REST API. Determine the action from the user's request:

### Actions

1. **Create** — Create a new post with title, content, status (draft/publish/future), categories, tags, and featured image
2. **Update** — Update an existing post by ID with new content, status, or metadata
3. **List** — List posts with optional filters (status, category, tag, author, date range, search, per_page)
4. **Delete** — Delete a post by ID (move to trash or force delete)
5. **Get** — Retrieve a single post by ID with full details

### Workflow

1. Verify WordPress credentials are configured (check `.env` for `WORDPRESS_URL`, `WORDPRESS_USER`, `WORDPRESS_PASSWORD`)
2. If credentials missing, provide setup instructions from the skill
3. Determine the action and required parameters from the user's request
4. Execute the operation using the WordPress REST API skill
5. Report results with post URL, ID, and status

### Output

- Confirm the action taken with post details (ID, title, URL, status)
- For list operations, show results in a formatted table
- On error, provide clear diagnosis and remediation steps
