---
id: wp-dev-plugin
name: wpDevPlugin
description: Scaffold or develop a custom WordPress plugin with proper architecture, hooks, settings API, and WPCS compliance.
keywords: [wordpress, plugin, development, scaffold, hooks, filters, settings-api, custom-post-type]
tools: [execute, read, edit, search, web]
agent: AI-ley WordPress
---

## References

**Instructions:** `instructions/tools/wordpress.instructions.md`

**Personas:**
- `personas/wordpress-developer.md`
- `personas/senior-php-developer.md`

## Task

Develop a custom WordPress plugin:

### Options

1. **Simple Plugin** — Single-file plugin for a focused feature
2. **Full Plugin** — Multi-file plugin with proper OOP architecture, autoloading, and admin UI
3. **Gutenberg Block Plugin** — Plugin that registers custom Gutenberg blocks
4. **WooCommerce Extension** — Plugin extending WooCommerce functionality
5. **REST API Plugin** — Plugin adding custom REST API endpoints

### Workflow

1. Determine plugin purpose, scope, and required WordPress APIs
2. Scaffold plugin structure with main file, includes, classes, and assets
3. Implement proper activation/deactivation hooks and uninstall routine
4. Add Settings API pages if configuration is needed
5. Register Custom Post Types, Taxonomies, or Meta Boxes as required
6. Implement REST API endpoints if needed
7. Add internationalization (i18n) support
8. Write PHPUnit tests using WordPress test suite
9. Validate WPCS compliance

### Output

- Plugin directory with proper structure
- Main plugin file with header, activation/deactivation hooks
- OOP class architecture with autoloading
- Settings page (if applicable) using WordPress Settings API
- Proper sanitization, escaping, and nonce verification throughout
- README.txt following WordPress plugin readme standard
