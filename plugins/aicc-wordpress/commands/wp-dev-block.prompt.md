---
id: wp-dev-block
name: wpDevBlock
description: Create a custom Gutenberg block with block.json, edit/save components, and server-side rendering.
keywords: [wordpress, gutenberg, block, editor, react, jsx, block-json, fse]
tools: [execute, read, edit, search, web]
agent: AI-ley WordPress
---

## References

**Instructions:** `instructions/tools/wordpress.instructions.md`

**Persona:** `personas/wordpress-developer.md`

## Task

Create a custom Gutenberg block:

### Workflow

1. Determine block purpose, attributes, and UI requirements
2. Scaffold block with `@wordpress/create-block` or manual structure
3. Create `block.json` with name, title, category, icon, attributes, and supports
4. Implement `edit.js` component with InspectorControls and BlockControls
5. Implement `save.js` component or server-side render callback
6. Add block styles (editor and frontend)
7. Register block in plugin's `index.js` or `functions.php`
8. Add block variations and patterns if applicable

### Output

- `block.json` — Block metadata and configuration
- `edit.js` — Editor component with attribute controls
- `save.js` — Frontend save component (or `render.php` for dynamic blocks)
- `style.scss` — Frontend styles
- `editor.scss` — Editor-only styles
- `index.js` — Block registration
- Build configuration (webpack/wp-scripts)
