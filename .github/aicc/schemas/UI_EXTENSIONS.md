# AI Kit Schema UI Extension Properties

This document describes the custom `x-` prefixed properties used in AI Kit schemas to control UI rendering behavior.

## Extension Properties

### `x-hidden`
**Type:** `boolean`  
**Default:** `false`

Completely hides the field from the UI. The field will not be displayed in forms, settings panels, or configuration modals.

**Use cases:**
- Internal/computed fields (e.g., `lastUpdated`)
- System metadata (e.g., `$schema`)
- Complex structures better managed elsewhere (e.g., `folderMapping`)

**Example:**
```json
{
  "lastUpdated": {
    "type": "string",
    "format": "date-time",
    "description": "ISO 8601 timestamp of last install or update",
    "x-hidden": true
  }
}
```

---

### `x-readonly`
**Type:** `boolean`  
**Default:** `false`

Shows the field in the UI but prevents editing. The field will be displayed with a disabled/grayed-out appearance.

**Use cases:**
- Immutable identifiers (e.g., `name`, `repo`)
- Auto-generated values (e.g., `version`)
- Reference data from source (e.g., `author`, `icon`)

**Example:**
```json
{
  "name": {
    "type": "string",
    "description": "Unique kit identifier",
    "x-readonly": true
  }
}
```

---

### `x-ui-order`
**Type:** `number`  
**Default:** Schema definition order

Controls the display order of fields in the UI. Lower numbers appear first. Fields without `x-ui-order` appear after ordered fields in schema definition order.

**Use cases:**
- Prioritize important fields at the top
- Organize fields logically (not alphabetically)
- Group related settings together

**Example:**
```json
{
  "name": {
    "type": "string",
    "x-ui-order": 1
  },
  "description": {
    "type": "string",
    "x-ui-order": 2
  },
  "refreshEnabled": {
    "type": "boolean",
    "x-ui-order": 10
  }
}
```

---

### `x-ui-group`
**Type:** `string`

Groups related fields together in the UI with a visual separator and optional group label.

**Use cases:**
- Organize complex forms into sections
- Group feature toggles with their settings
- Create logical field groupings

**Example:**
```json
{
  "refreshEnabled": {
    "type": "boolean",
    "x-ui-group": "refresh"
  },
  "refreshInterval": {
    "type": "number",
    "x-ui-group": "refresh"
  },
  "evolveEnabled": {
    "type": "boolean",
    "x-ui-group": "evolution"
  }
}
```

---

## Combined Usage Examples

### Hide computed fields, make identifiers readonly
```json
{
  "properties": {
    "name": {
      "type": "string",
      "x-readonly": true,
      "x-ui-order": 1
    },
    "lastUpdated": {
      "type": "string",
      "format": "date-time",
      "x-hidden": true
    }
  }
}
```

### Group feature settings with order control
```json
{
  "properties": {
    "description": {
      "type": "string",
      "x-ui-order": 1
    },
    "refreshEnabled": {
      "type": "boolean",
      "x-ui-order": 10,
      "x-ui-group": "refresh-settings"
    },
    "refreshInterval": {
      "type": "number",
      "x-ui-order": 11,
      "x-ui-group": "refresh-settings"
    }
  }
}
```

---

## Implementation Notes

### Rendering Logic

When rendering UI forms from schemas, the system should:

1. **Filter hidden fields:** Skip fields where `x-hidden: true`
2. **Sort by order:** Render fields in `x-ui-order` sequence (ascending)
3. **Group fields:** Render grouped fields together with visual separators
4. **Disable readonly:** Apply `disabled` or `readonly` HTML attributes

### Example Rendering Code

```typescript
function renderSchemaFields(schema: any, data: any): HTMLElement[] {
  const fields = Object.entries(schema.properties)
    .filter(([key, prop]) => !prop['x-hidden'])  // Filter hidden
    .sort((a, b) => {
      const orderA = a[1]['x-ui-order'] ?? Infinity;
      const orderB = b[1]['x-ui-order'] ?? Infinity;
      return orderA - orderB;
    });

  const grouped: Record<string, Array<[string, any]>> = {};
  const ungrouped: Array<[string, any]> = [];

  for (const [key, prop] of fields) {
    const group = prop['x-ui-group'];
    if (group) {
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push([key, prop]);
    } else {
      ungrouped.push([key, prop]);
    }
  }

  // Render ungrouped first, then grouped
  return [
    ...ungrouped.map(([k, p]) => renderField(k, p, data[k], p['x-readonly'])),
    ...Object.entries(grouped).map(([group, fields]) => 
      renderFieldGroup(group, fields, data)
    )
  ];
}
```

---

## Schema Files

These extension properties are used across all AI Kit schemas:

- `structure.v1.schema.json` - AI Kit structure configuration
- `components.v1.schema.json` - Component bundle definitions
- `plan.v1.schema.json` - Project planning data
- `tab.v1.schema.json` - Webview tab configuration
- `panel.v1.schema.json` - Panel configuration

---

## Future Extension Properties

Potential future additions:

- `x-ui-help`: Tooltip/help text for field
- `x-ui-placeholder`: Placeholder text for inputs
- `x-ui-widget`: Custom widget type (e.g., `color-picker`, `file-upload`)
- `x-ui-conditional`: Show/hide based on other field values
- `x-ui-validation`: Custom validation messages

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-05
