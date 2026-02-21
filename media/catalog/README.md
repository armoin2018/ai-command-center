# AI Kit Catalog UI

Apple Store-inspired web panel for managing AI kits in the secondary panel.

## Features

### Grid View
- **75x75px Icon Buttons** with 3px borders and 10px rounded corners
- **Kit Names** displayed below icons
- **Status Badges** showing installed/update available status
- **Hover Effects** for better UX

### Modal Dialog (80% x 80%)
- **Header**:
  - Left: 50x50px icon with 10px rounded corners
  - Center: Kit name
  - Right: Close button (✕)

- **Body Tabs**:
  1. **Settings Tab**
     - Editable fields from `.github/aicc/catalog/{{kitName}}/structure.json`
     - Loads values from `.my/aicc/catalog/{{kitName}}/structure.json` if exists
     - Install button for non-installed kits
     - Auto-saves to `.my/aicc/catalog/{{kitName}}/structure.json`
  
  2. **Configuration Tab**
     - Advanced settings from `.github/aicc/catalog/{{kitName}}/config.json`
     - Loads values from `.my/aicc/catalog/{{kitName}}/config.save.json`
     - Dynamic form generation based on JSON schema
  
  3. **Components Tab**
     - Tree view of bundled components
     - Defined in `.github/aicc/{{kitName}}/components.json`
     - Format: `{ "componentName": { "defaultEnabled": true, "files": [...] } }`
     - Installs/removes on checkbox toggle + save
     - Updates `.github/aicc/{{kitName}}/components.installed.json`

- **Footer**:
  - Left: Last updated timestamp from structure.json
  - Right: Save button

## File Structure

```
media/catalog/
├── index.html          # Main HTML template
├── catalog.css         # Apple Store-style CSS
├── catalog.js          # Main component logic
└── README.md           # This file
```

## VS Code Integration

The panel communicates with the VS Code extension via message passing:

### Messages from UI → Extension

```javascript
// List kits
vscode.postMessage({ command: 'catalog.list', payload: {} });

// Get kit details
vscode.postMessage({ 
  command: 'catalog.getDetails', 
  payload: { kitName: 'ai-ley' } 
});

// Install kit
vscode.postMessage({ 
  command: 'catalog.install', 
  payload: { kitName: 'ai-ley' } 
});

// Save configuration
vscode.postMessage({ 
  command: 'catalog.save', 
  payload: { 
    kitName: 'ai-ley',
    data: { settings: {}, configuration: {}, components: {} }
  } 
});
```

### Messages from Extension → UI

```javascript
// Send kit list
panel.webview.postMessage({ 
  command: 'catalog.kits', 
  data: [{ name, iconBase64, installed, structure }] 
});

// Send kit details
panel.webview.postMessage({ 
  command: 'catalog.kitDetails', 
  data: { name, structure, config, configValues, components, componentsInstalled } 
});

// Installation complete
panel.webview.postMessage({ 
  command: 'catalog.installComplete', 
  kitName: 'ai-ley' 
});

// Error
panel.webview.postMessage({ 
  command: 'catalog.error', 
  error: 'Error message' 
});
```

## Component Bundles Schema

Components are defined in `.github/aicc/{{kitName}}/components.json`:

```json
{
  "componentName": {
    "defaultEnabled": true,
    "files": [
      ".github/skills/example/script.ts",
      ".github/skills/example/types.ts"
    ],
    "description": "Optional description",
    "dependencies": ["other-component"]
  }
}
```

Installed components tracked in `.github/aicc/{{kitName}}/components.installed.json`:

```json
{
  "componentName": true,
  "optionalComponent": false
}
```

## Styling

Uses VS Code theme variables for consistent appearance:

- `--vscode-editor-background`
- `--vscode-foreground`
- `--vscode-button-background`
- `--vscode-input-background`
- `--vscode-panel-border`
- etc.

## Responsive Design

- Grid adjusts columns based on viewport width
- Modal resizes to 95% on mobile devices
- Touch-friendly button sizes

## Browser Compatibility

Requires modern browser with:
- CSS Grid
- Flexbox
- ES6+ JavaScript
- VS Code Webview API

## Development

To test locally:

1. Open in VS Code
2. Run extension development host (F5)
3. Open command palette: `AI-ley: Show Catalog`
4. View catalog panel in secondary sidebar

## Security

- Content Security Policy (CSP) enabled
- Base64 encoded images only (no external URLs)
- Input sanitization for user-provided values
- Read-only fields for installed kits (repo, name, icon)

## Future Enhancements

- [ ] Toast notifications for success/error messages
- [ ] Search and filter functionality
- [ ] Sort by name, date, status
- [ ] Batch install/update operations
- [ ] Dependency visualization
- [ ] Kit comparison view
- [ ] Export/import kit configurations
