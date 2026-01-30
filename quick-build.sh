#!/bin/bash
# Quick Build - AI Command Center
# Fast build without full setup

set -e

echo "🔨 Quick Build - AI Command Center"
echo ""

# Compile TypeScript
echo "📝 Compiling TypeScript..."
npx tsc -p ./ --noUnusedParameters false --noUnusedLocals false

# Build WebView
echo "⚛️  Building WebView..."
cd webview && npm run build && cd ..

# Verify WebView build
if [ -f "media/webview/bundle.js" ]; then
    BUNDLE_SIZE=$(du -h media/webview/bundle.js | cut -f1)
    echo "✓ WebView bundle: $BUNDLE_SIZE"
else
    echo "✗ WebView build failed - bundle.js not found"
    exit 1
fi

# Package VSIX
echo "📦 Creating VSIX..."
vsce package

echo ""
echo "✅ Build complete!"
ls -lh *.vsix
