---
id: wp-media
name: wpMedia
description: Upload, list, update, or delete media files in the WordPress media library. Supports images, videos, documents, and featured image assignment.
keywords: [wordpress, media, upload, image, gallery, attachment]
tools: [execute, read, edit, search]
agent: AI-ley WordPress
---

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md`

**Persona:** `personas/wordpress-developer.md`

## Task

Manage WordPress media library:

### Actions

1. **Upload** — Upload a file to the media library with optional title, caption, alt text, and description
2. **List** — List media items with filters (type, status, search, per_page)
3. **Update** — Update media metadata (title, caption, alt text, description)
4. **Delete** — Delete a media item by ID (force delete)
5. **Get** — Retrieve media item details and URLs by ID

### Workflow

1. Verify WordPress credentials
2. Determine action from user request
3. For uploads, validate file path exists and check file type/size limits
4. Execute via WordPress REST API
5. Report results with media URL, ID, and dimensions (for images)
