# AI Command Center - Packaging Guide

## Building the VSIX Package

### Quick Start

Run the automated build script:

```bash
./build-vsix.sh
```

This script will:
1. ✅ Check Node.js version
2. ✅ Install extension dependencies
3. ✅ Install WebView dependencies
4. ✅ Compile TypeScript extension code
5. ✅ Build WebView production bundle (345 KB)
6. ✅ Package into .vsix file using vsce

### Manual Build Steps

If you prefer to build manually:

```bash
# 1. Install dependencies
npm install
cd webview && npm install && cd ..

# 2. Compile TypeScript
npm run compile

# 3. Build WebView
npm run build:webview

# 4. Package VSIX
npm run package
```

### Using npm Scripts

```bash
# Build VSIX using npm script
npm run build:vsix

# Or package directly (after manual compile)
npm run package
```

## Installation

### Local Installation

```bash
code --install-extension ai-command-center-1.0.0.vsix
```

Or in VS Code:
1. Open Extensions view (Ctrl+Shift+X)
2. Click "..." menu → "Install from VSIX..."
3. Select the .vsix file

### Uninstall

```bash
code --uninstall-extension ai-command-center.ai-command-center
```

## Publishing

### Prerequisites

1. **Create Personal Access Token**:
   - Go to https://dev.azure.com/
   - Create a new organization (if needed)
   - Create a PAT with "Marketplace (Publish)" scope

2. **Create Publisher** (first time only):
   ```bash
   vsce create-publisher <publisher-name>
   ```

3. **Login**:
   ```bash
   vsce login <publisher-name>
   ```

### Publish to Marketplace

```bash
# Publish current version
vsce publish

# Or publish with version bump
vsce publish minor  # 1.0.0 -> 1.1.0
vsce publish patch  # 1.0.0 -> 1.0.1
vsce publish major  # 1.0.0 -> 2.0.0
```

### Pre-release Version

```bash
vsce publish --pre-release
```

## Package Contents

### Included in VSIX

✅ **Extension Code**:
- `out/` - Compiled JavaScript from TypeScript
- `package.json` - Extension manifest
- `README.md` - Main documentation
- `LICENSE` - MIT license
- `CHANGELOG.md` - Version history
- `RELEASE_NOTES.md` - v1.0.0 release notes

✅ **WebView Bundle**:
- `webview/dist/bundle.js` (345 KB) - Production React bundle
- `webview/dist/index.html` - WebView HTML

✅ **Assets**:
- `media/` - CSS, JS for WebView
- `images/` - Icons and screenshots
- `.project/defaults/` - Default configuration templates

✅ **MCP Server**:
- `src/mcp/` - MCP server implementation
- `src/mcp/openapi.json` - API specification

### Excluded from VSIX

❌ Source files (`src/**/*.ts`, `webview/src/**`)
❌ Build configuration (`tsconfig.json`, `webpack.config.js`)
❌ Development docs (`AGENT*.md`, `BUILD_SUMMARY.md`, etc.)
❌ Test files (`**/*.test.ts`)
❌ Node modules (`node_modules/`)
❌ Logs and temp files

See [.vscodeignore](.vscodeignore) for complete exclusion list.

## Versioning

Current version: **1.0.0**

### Version Scheme

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.x.x): Breaking changes
- **MINOR** (x.1.x): New features, backward compatible
- **PATCH** (x.x.1): Bug fixes, backward compatible

### Updating Version

**Option 1**: npm version command
```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

**Option 2**: Manual edit
Update `version` in `package.json`:
```json
{
  "version": "1.0.1"
}
```

## Build Output

Successful build produces:

```
ai-command-center-1.0.0.vsix
```

**Typical size**: ~1-2 MB (includes 345 KB WebView bundle)

## Troubleshooting

### vsce not found

```bash
npm install -g @vscode/vsce
```

### TypeScript compilation errors

```bash
# Clean and rebuild
rm -rf out/
npm run compile
```

### WebView build errors

```bash
# Clean and rebuild WebView
cd webview
rm -rf dist/ node_modules/
npm install
npm run build
```

### Missing dependencies

```bash
# Reinstall all dependencies
rm -rf node_modules/ webview/node_modules/
npm install
cd webview && npm install
```

### Package size too large

Check `.vscodeignore` to ensure source files are excluded:
```bash
# Test what will be included
vsce ls
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Build VSIX

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: ./build-vsix.sh
      - uses: actions/upload-artifact@v3
        with:
          name: vsix
          path: '*.vsix'
```

## Quality Checks

Before packaging, ensure:

- ✅ All TypeScript compiles without errors
- ✅ WebView builds successfully (345 KB bundle)
- ✅ No sensitive data in package (check with `vsce ls`)
- ✅ README.md is up to date
- ✅ CHANGELOG.md includes latest changes
- ✅ Version number is correct in package.json
- ✅ License file is present
- ✅ Icons and images are included

## Post-Build Validation

Test the packaged extension:

```bash
# Install locally
code --install-extension ai-command-center-1.0.0.vsix

# Verify extension loads
code --list-extensions | grep ai-command-center

# Test core functionality
# 1. Open VS Code
# 2. Run "AI Command Center: Open Planning Panel"
# 3. Verify WebView loads
# 4. Test sprint planning, offline mode, custom fields
```

## Support

For build issues:
- Check build logs in terminal
- Review TypeScript/Webpack error messages
- Ensure Node.js 18+ and npm are installed
- Verify all dependencies are installed

---

**Build script**: [build-vsix.sh](build-vsix.sh)  
**Package config**: [.vscodeignore](.vscodeignore)  
**Main docs**: [README.md](README.md)
