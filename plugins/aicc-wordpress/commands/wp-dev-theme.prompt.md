---
id: wp-dev-theme
name: wpDevTheme
description: Scaffold or develop a custom WordPress theme with proper template hierarchy, theme.json, block patterns, and WPCS compliance.
keywords: [wordpress, theme, development, scaffold, gutenberg, fse, template, child-theme]
tools: [execute, read, edit, search, web]
agent: AI-ley WordPress
---

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md`

**Instructions:**
- `instructions/tools/wordpress.instructions.md` — WordPress coding standards
- `instructions/web-design/blog.instructions.md` — Blog layouts
- `instructions/web-design/storefront.instructions.md` — Storefront layouts
- `instructions/web-design/admin-dashboard.instructions.md` — Admin dashboard patterns

**Personas:**
- `personas/wordpress-developer.md` — WordPress development expertise
- `personas/senior-php-developer.md` — PHP best practices

## Task

Develop a custom WordPress theme:

### Options

1. **Classic Theme** — Traditional PHP template-based theme using the template hierarchy
2. **Block Theme (FSE)** — Full Site Editing theme with theme.json, block templates, and template parts
3. **Child Theme** — Child theme extending an existing parent theme
4. **Starter Theme** — Scaffold from Underscores (_s), Sage/Roots, or custom boilerplate

### Workflow

1. Determine theme type and target design (reference web-design instructions)
2. Scaffold directory structure with required files (style.css, functions.php, theme.json, etc.)
3. Implement template hierarchy (index, single, page, archive, 404, search)
4. Add block patterns and custom Gutenberg blocks if FSE
5. Configure theme.json for colors, typography, spacing, and layout
6. Implement proper asset enqueueing, i18n, and security practices
7. Validate WPCS compliance

### Output

- Complete theme directory structure with all files
- Proper `style.css` header with theme metadata
- `functions.php` with hooks, enqueues, and theme support declarations
- Template files following WordPress template hierarchy
- `theme.json` for block themes
- README with installation and customization instructions
