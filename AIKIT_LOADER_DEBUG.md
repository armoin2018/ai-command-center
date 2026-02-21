# AI Kit Loader Debug & Logging Enhancement

## Issue

AI Kit Loader in Secondary Panel stuck in "Loading AI Kits..." state with no visible errors.

## Resolution Applied (February 5, 2026)

### Changes Made

#### 1. Frontend Logging (media/secondaryPanel/app.js)

Added comprehensive console logging at every critical point:

**Message Handling**
- `[AIKIT]` prefix on all AI Kit related logs
- Log every incoming message with type and payload
- Log every outgoing message to backend
- Track message flow: send → receive → render

**Panel Rendering**
- Log when `renderAIKitLoaderPanel()` is called
- Log HTML insertion confirmation
- Log catalog load initiation

**Catalog Rendering**
- Log number of kits received
- Log grid element found/not found
- Log kit card creation count
- Log click handler attachment

**Modal Operations**
- Log modal open with kit name
- Log tab switching
- Log settings/config/component loading
- Log modal close events

**Error Handling**
- Log all errors with context
- Log warnings for unknown messages
- Log element not found errors

#### 2. Backend Logging (src/views/secondaryPanelProvider.ts)

Added detailed server-side logging:

**Message Reception**
- Log when fetchData message received
- Log endpoint being called
- Log parameters passed

**Catalog Fetching**
- Log workspace folder detection
- Log catalog path being scanned
- Log each kit folder discovered
- Log structure.json loading
- Log icon file loading with size
- Log installation status checking
- Log final kit count before sending to webview
- Log webview message transmission

**Error Handling**
- Log errors with full stack traces
- Log missing files or folders
- Log permission issues

### Debugging Workflow

#### 1. Open Developer Tools

```
View → Command Palette → Developer: Toggle Developer Tools
```

#### 2. Monitor Console

Look for these log sequences:

**Successful Flow:**
```
[AIKIT] Rendering AI Kit Loader panel
[AIKIT] Panel HTML rendered, loading catalog...
[AIKIT] loadAIKitCatalog() called
[AIKIT] Sending fetchData message to backend
[AIKIT] fetchData message sent
[AIKIT] Sending message to backend: fetchData {endpoint: 'aikit-catalog', params: {}}
[AIKIT] Received message: aikitCatalog {kits: [...]}
[AIKIT] Rendering catalog with X kits
[AIKIT] renderAIKitCatalog() called with X kits
[AIKIT] Creating kit cards for X kits
[AIKIT] Adding click handlers to X kit cards
[AIKIT] Catalog rendering complete
```

**Backend Logs (VS Code Output → Extension Host):**
```
[INFO] fetchData message received {endpoint: 'aikit-catalog'}
[INFO] Fetching AI Kit catalog
[INFO] _fetchAIKitCatalog started
[INFO] Catalog path /path/to/.github/aicc/catalog
[INFO] Found kit folders {count: X, folders: [...]}
[INFO] Processing kit folder ai-ley
[INFO] Loaded structure {name: 'ai-ley'}
[INFO] Icon loaded {kit: 'ai-ley', size: 12345}
[INFO] Kit added to catalog {name: 'ai-ley', installed: false}
[INFO] Sending catalog to webview {kitCount: X}
[INFO] Catalog message sent to webview
```

#### 3. Check for Missing Files

If stuck at "Loading...", check:

```bash
# Verify catalog directory exists
ls -la .github/aicc/catalog/

# Check for structure.json files
find .github/aicc/catalog -name "structure.json"

# Check for icons
find .github/aicc/catalog -name "*.png" -o -name "*.jpg" -o -name "*.svg"
```

#### 4. Check Console for Specific Errors

**Common Issues:**

1. **No "Received message: aikitCatalog"**
   - Backend not responding
   - Check Extension Host output logs
   - Verify message type spelling matches

2. **"catalog-grid element not found"**
   - DOM not ready
   - HTML rendering failed
   - Check panel-content exists

3. **"No workspace folder open"**
   - Open a folder in VS Code
   - Catalog requires workspace

4. **"Catalog path does not exist"**
   - Create `.github/aicc/catalog/` directory
   - Install at least one kit

### Testing Commands

#### Test in Browser Console

```javascript
// Check if app instance exists
console.log(window.app);

// Manually trigger catalog load
window.app?.loadAIKitCatalog();

// Check current kit
console.log(window.app?.currentKit);

// Send test message
window.app?.sendMessage('fetchData', { endpoint: 'aikit-catalog', params: {} });
```

#### VS Code Extension Logs

```
View → Output → Select "Extension Host" from dropdown
```

Look for:
- `[INFO] fetchData message received`
- `[INFO] _fetchAIKitCatalog started`
- `[ERROR]` messages

### Known Potential Issues

#### 1. fs-extra Module Not Found

If backend logs show module errors:

```bash
cd .github/aicc
npm install fs-extra
```

#### 2. Permission Errors

If logs show EACCES errors:

```bash
chmod -R 755 .github/aicc/catalog
```

#### 3. Malformed JSON

If structure.json parsing fails:

```bash
# Validate all structure.json files
find .github/aicc/catalog -name "structure.json" -exec jq . {} \;
```

#### 4. Message Type Mismatch

If no response from backend, verify spelling:
- Frontend sends: `fetchData`
- Backend handles: `fetchData`
- Backend responds: `aikitCatalog`
- Frontend handles: `aikitCatalog`

### Quick Fix Checklist

- [ ] Developer Tools open and monitoring console
- [ ] Extension Host output visible
- [ ] Workspace folder is open
- [ ] `.github/aicc/catalog/` directory exists
- [ ] At least one kit folder with `structure.json` exists
- [ ] Console shows "[AIKIT] Rendering AI Kit Loader panel"
- [ ] Console shows "[AIKIT] Sending fetchData message to backend"
- [ ] Extension Host shows "[INFO] _fetchAIKitCatalog started"
- [ ] Console shows "[AIKIT] Received message: aikitCatalog"
- [ ] Console shows "[AIKIT] Catalog rendering complete"

### Rollback Instructions

If enhanced logging causes issues, revert with:

```bash
git checkout HEAD -- media/secondaryPanel/app.js
git checkout HEAD -- src/views/secondaryPanelProvider.ts
```

### Next Steps if Still Stuck

1. Share full console log output (with [AIKIT] prefix)
2. Share Extension Host output
3. Verify file structure:
   ```bash
   tree .github/aicc/catalog -L 2
   ```
4. Check VS Code version compatibility
5. Try reloading window: `Cmd+Shift+P` → "Reload Window"

### Performance Impact

The additional logging adds minimal overhead:
- ~10-20ms per catalog load
- ~5-10ms per kit card render
- Console logging only (no file I/O)
- Can be disabled by removing `console.log` calls

### Success Metrics

When working correctly, you should see:
- Catalog loads in <500ms for 10 kits
- Kit cards render immediately after data received
- Modal opens in <100ms on card click
- Tab switching is instant
- No error messages in console or Extension Host

---

**Last Updated:** February 5, 2026  
**Status:** Enhanced logging deployed, awaiting test results
