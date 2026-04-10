---
id: wp-user
name: wpUser
description: Manage WordPress users — list, create, update roles, or delete users and manage capabilities.
keywords: [wordpress, user, role, admin, author, editor, permissions]
tools: [execute, read, edit, search]
agent: AI-ley WordPress
---

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md`

**Persona:** `personas/wordpress-developer.md`

## Task

Manage WordPress users:

### Actions

1. **List** — List users with filters (role, search, per_page, orderby)
2. **Get** — Get user details by ID
3. **Create** — Create a new user with username, email, password, and role
4. **Update** — Update user details (name, email, role, bio, etc.)
5. **Delete** — Delete a user by ID with option to reassign content

### WordPress Roles

- **Administrator** — Full site control
- **Editor** — Manage and publish all content
- **Author** — Publish and manage own posts
- **Contributor** — Write and manage own posts (no publishing)
- **Subscriber** — Read-only access and profile management
