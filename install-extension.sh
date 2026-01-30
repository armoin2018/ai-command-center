#!/bin/bash
# Install AI Command Center Extension

set -e

VSIX_FILE="ai-command-center-1.0.40.vsix"

# Try to find the code command
CODE_CMD=""
if command -v code &> /dev/null; then
    CODE_CMD="code"
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    CODE_CMD="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
else
    echo "❌ Error: VS Code 'code' command not found"
    echo ""
    echo "To fix this:"
    echo "1. Open VS Code"
    echo "2. Press Cmd+Shift+P"
    echo "3. Type: Shell Command: Install 'code' command in PATH"
    echo "4. Press Enter"
    echo "5. Run this script again"
    echo ""
    echo "Or install manually:"
    echo "1. Open VS Code"
    echo "2. Extensions view (Cmd+Shift+X)"
    echo "3. Click ... menu → Install from VSIX..."
    echo "4. Select: $VSIX_FILE"
    exit 1
fi

if [ ! -f "$VSIX_FILE" ]; then
    echo "❌ Error: $VSIX_FILE not found"
    echo "Run ./build-vsix.sh first"
    exit 1
fi

echo "🔄 Uninstalling old version (if exists)..."
"$CODE_CMD" --uninstall-extension ai-command-center.ai-command-center 2>/dev/null || true

echo "📦 Installing $VSIX_FILE..."
"$CODE_CMD" --install-extension "$VSIX_FILE" --force

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Reload VS Code window (Cmd+R or Ctrl+R)"
echo "2. Open command palette (Cmd+Shift+P)"
echo "3. Run: AI Command Center: Open Planning Panel"
echo ""
