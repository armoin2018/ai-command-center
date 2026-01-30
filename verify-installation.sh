#!/bin/bash
# Verify AI Command Center Extension Installation

echo "🔍 AI Command Center - Installation Verification"
echo "=================================================="
echo ""

# Find code command
CODE_CMD=""
if command -v code &> /dev/null; then
    CODE_CMD="code"
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    CODE_CMD="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
else
    echo "❌ VS Code 'code' command not found"
    exit 1
fi

# Check if extension is installed
echo "📦 Checking extension installation..."
if "$CODE_CMD" --list-extensions | grep -q "ai-command-center.ai-command-center"; then
    echo "✅ Extension is installed"
else
    echo "❌ Extension NOT installed"
    exit 1
fi

# Check extension directory
EXT_DIR=~/.vscode/extensions/ai-command-center.ai-command-center-1.0.0
if [ -d "$EXT_DIR" ]; then
    echo "✅ Extension directory exists: $EXT_DIR"
else
    echo "❌ Extension directory not found"
    exit 1
fi

# Check version
echo ""
echo "🏷️  Version Information:"
VERSION=$(cat "$EXT_DIR/package.json" | python3 -c "import sys, json; print(json.load(sys.stdin)['version'])")
echo "   Installed version: $VERSION"

# Check webview bundle
if [ -f "$EXT_DIR/media/webview/bundle.js" ]; then
    BUNDLE_SIZE=$(ls -lh "$EXT_DIR/media/webview/bundle.js" | awk '{print $5}')
    echo "✅ WebView bundle exists ($BUNDLE_SIZE)"
else
    echo "❌ WebView bundle NOT found"
fi

# Check compiled extension
if [ -f "$EXT_DIR/out/extension.js" ]; then
    echo "✅ Extension compiled code exists"
else
    echo "❌ Extension compiled code NOT found"
fi

echo ""
echo "📋 Extension Files:"
ls -lh "$EXT_DIR/media/webview/" | tail -n +2

echo ""
echo "=================================================="
echo "✅ Installation verification complete!"
echo ""
echo "To use the extension:"
echo "1. Reload VS Code window (Cmd+Shift+P → Developer: Reload Window)"
echo "2. Open Command Palette (Cmd+Shift+P)"
echo "3. Run: AI Command Center: Open Planning Panel"
echo ""
echo "If panel doesn't appear, check:"
echo "- View → Output → 'Log (Extension Host)' for activation logs"
echo "- Developer Tools (Help → Toggle Developer Tools) → Console for errors"
echo "=================================================="
