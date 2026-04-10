---
id: wp-plugin
name: wpPlugin
description: Manage WordPress plugins — list installed, search directory, install, activate, deactivate, update, or remove plugins.
keywords: [wordpress, plugin, install, activate, manage, extend]
tools: [execute, read, edit, search]
agent: AI-ley WordPress
---

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md`

**Persona:** `personas/wordpress-developer.md`

## Task

Manage WordPress plugins:

### Actions

1. **List** — List all installed plugins with status (active/inactive) and version
2. **Search** — Search the WordPress plugin directory for plugins by keyword
3. **Install** — Install a plugin by slug from the WordPress plugin directory
4. **Activate** — Activate an installed plugin by slug
5. **Deactivate** — Deactivate an active plugin by slug
6. **Update** — Update a plugin to the latest version
7. **Delete** — Remove an inactive plugin

### Notes

- Plugin management requires WordPress Business plan or self-hosted with REST API
- Always check account tier before attempting plugin operations
- Warn user if their tier does not support plugin management
