# 🔧 Installation & Troubleshooting Guide

## ✅ EXTENSION INSTALLED

**Status**: ✅ Extension successfully installed  
**Version**: 1.0.0  
**Location**: `~/.vscode/extensions/ai-command-center.ai-command-center-1.0.0/`  
**WebView Bundle**: ✅ 345 KB bundle.js present

---

## 🚀 Opening the Panel

**IMPORTANT**: After installation, you **MUST reload VS Code** for the extension to activate.

### Step 1: Reload VS Code
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: **"Developer: Reload Window"**
3. Press Enter

### Step 2: Open the Panel
1. Press `Cmd+Shift+P` again
2. Type: **"AI Command Center: Open Planning Panel"**
3. Press Enter

The panel should open on the right side with the React UI.

---

## 🔍 Troubleshooting

### Panel Still Not Opening?

**Check Extension Activation:**
1. View → Output
2. Select **"Log (Extension Host)"** from dropdown
3. Look for: `"AI Command Center: Starting activation..."`
4. Check for any errors

**Check WebView Console:**
1. Help → Toggle Developer Tools (or `Cmd+Option+I`)
2. Switch to **Console** tab
3. Look for errors related to:
   - `ai-command-center`
   - WebView loading
   - CSP (Content Security Policy) violations
   - `bundle.js` loading errors

**Force Clean Reload:**
```bash
# Uninstall extension
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --uninstall-extension ai-command-center.ai-command-center

# Reinstall
cd /Users/blainemcdonnell/git/ai-command-center
./install-extension.sh

# Reload VS Code: Cmd+Shift+P → "Developer: Reload Window"
```

### Version Not Updating?

Run verification script:
```bash
cd /Users/blainemcdonnell/git/ai-command-center
./verify-installation.sh
```

Should show **Version 1.0.0**. If not, completely uninstall and reinstall.

---

## 📦 Installation Methods

### Method 1: Automated Script (Recommended)

1. Open VS Code
2. Click Extensions icon in sidebar (or `Cmd+Shift+X`)
3. Click `...` menu (top-right of Extensions view)
4. Select **"Install from VSIX..."**
5. Navigate to and select: `ai-command-center-1.0.0.vsix`
6. Click **"Install"**
7. **Reload VS Code** when prompted

### Method 2: Command Line

```bash
# If 'code' command is in PATH:
code --install-extension ai-command-center-1.0.0.vsix --force

# If not, add to PATH first (macOS):
# Open VS Code
# Cmd+Shift+P → "Shell Command: Install 'code' command in PATH"
```

### Method 3: Drag & Drop

1. Open VS Code
2. Drag `ai-command-center-1.0.0.vsix` file
3. Drop onto Extensions sidebar
4. Click "Install"
5. Reload VS Code

---

## 🚀 Opening the Panel

After installation and reload:

1. **Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `AI Command Center: Open Planning Panel`
3. Press Enter

Or use any of these commands:
- `AI Command Center: Create Epic`
- `AI Command Center: Create Story`
- `AI Command Center: Create Task`

---

## 🔍 Troubleshooting

### Panel Not Opening?

**Check Extension is Installed:**
```bash
code --list-extensions | grep ai-command-center
```

Should show: `ai-command-center.ai-command-center`

**Check Extension is Activated:**
1. View → Output
2. Select "Log (Extension Host)" from dropdown
3. Look for: "AI Command Center: Starting activation..."

**Force Reload:**
1. `Cmd+Shift+P` → "Developer: Reload Window"
2. Try opening panel again

### Version Not Updating?

**Uninstall completely first:**
1. Extensions view → Find "AI Command Center"
2. Right-click → Uninstall
3. Reload VS Code
4. Install new VSIX

### Webview Not Loading?

**Check Console:**
1. `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
2. Check Console tab for errors
3. Look for CSP or resource loading errors

**Verify Files in VSIX:**
```bash
unzip -l ai-command-center-1.0.0.vsix | grep bundle.js
```
Should show: `extension/media/webview/bundle.js`

---

## 📋 Extension Info

**Publisher**: ai-command-center  
**Extension ID**: `ai-command-center.ai-command-center`  
**Version**: 1.0.0  
**Engine**: VS Code ^1.85.0

**Included Files:**
- ✅ Extension code (`out/`)
- ✅ WebView bundle (345 KB `media/webview/bundle.js`)
- ✅ MCP server implementation
- ✅ Configuration templates

---

## 🎯 Quick Test

After installation:

1. **Open Command**: `AI Command Center: Open Planning Panel`
2. **Expected**: WebView panel opens on right side
3. **Shows**: React UI with planning tree interface
4. **Features Available**:
   - Create Epic/Story/Task
   - Multiple view modes (Tree, Timeline, Kanban, Calendar, Charts, Sprint)
   - Filtering and search
   - Offline mode indicator

---

## 🐛 Known Issues

### "code command not found"
- Install shell command: `Cmd+Shift+P` → "Shell Command: Install 'code' command in PATH"
- Or use VS Code UI method instead

### Bundle Size Warning
- Expected: Webpack shows "big" warning for 345 KB bundle
- Impact: None - this is acceptable for a React app
- Can be ignored

### Extension Not Activating
- Check workspace: Extension needs a workspace folder
- Check logs: View → Output → "Log (Extension Host)"
- Try: Developer → Reload Window

---

## 📝 Development Mode

If you want to run from source (for development):

1. Open this folder in VS Code
2. Press `F5` to launch Extension Development Host
3. In new window, run commands
4. Changes require rebuild: `npm run compile`

---

## 🆘 Still Having Issues?

1. **Check Extension Host logs**: View → Output → "Log (Extension Host)"
2. **Check Webview logs**: Developer Tools → Console
3. **Verify installation**: Extensions view should show "AI Command Center v1.0.0"
4. **Try fresh install**: Uninstall → Reload → Install → Reload

---

## ✅ Successful Installation Looks Like:

```
Extensions view:
  AI Command Center
  v1.0.0
  ai-command-center
  ✓ Enabled

Command Palette shows:
  AI Command Center: Create Epic
  AI Command Center: Create Story  
  AI Command Center: Create Task
  AI Command Center: Open Planning Panel
  [... 9 more commands]

Panel opens:
  - React UI loads
  - Planning tree visible
  - Toolbar with buttons
  - Multiple view tabs
```

---

**Ready to use!** 🎉

Next: Open the planning panel and start creating epics, stories, and tasks!
