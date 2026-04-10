---
id: wp-page
name: wpPage
description: Create, update, list, or delete WordPress pages. Supports hierarchical pages with parent/child relationships and custom templates.
keywords: [wordpress, page, content, static, template, hierarchy]
tools: [execute, read, edit, search]
agent: AI-ley WordPress
---

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md`

**Instructions:** `instructions/tools/wordpress.instructions.md`

**Persona:** `personas/wordpress-developer.md`

## Task

Manage WordPress pages via the REST API:

### Actions

1. **Create** — Create a page with title, content, status, parent page, template, and menu order
2. **Update** — Update an existing page by ID
3. **List** — List pages with filters (status, parent, search, per_page, orderby)
4. **Delete** — Delete a page by ID
5. **Get** — Retrieve a single page by ID

### Workflow

1. Verify WordPress credentials
2. Determine action and parameters from user request
3. Execute via WordPress REST API
4. Report results with page URL, ID, and status
