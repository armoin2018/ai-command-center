#!/bin/bash

# AI Command Center - VSIX Build Script
# Compiles TypeScript, builds WebView, and packages extension

set -e  # Exit on any error

echo "🚀 AI Command Center - Building VSIX Package"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Node.js version
echo -e "${BLUE}[1/6]${NC} Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "✓ Node.js $NODE_VERSION"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}[2/6]${NC} Installing extension dependencies..."
npm install
echo -e "${GREEN}✓ Extension dependencies installed${NC}"
echo ""

# Step 3: Install WebView dependencies
echo -e "${BLUE}[3/6]${NC} Installing WebView dependencies..."
cd webview
npm install
cd ..
echo -e "${GREEN}✓ WebView dependencies installed${NC}"
echo ""

# Step 4: Compile TypeScript
echo -e "${BLUE}[4/6]${NC} Compiling TypeScript extension..."
npx tsc -p . --noUnusedParameters false --noUnusedLocals false
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript compiled successfully${NC}"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    exit 1
fi
echo ""

# Step 5: Build WebView
echo -e "${BLUE}[5/6]${NC} Building WebView production bundle..."
cd webview
npm run build
if [ $? -eq 0 ]; then
    BUNDLE_SIZE=$(du -h ../media/webview/bundle.js | cut -f1)
    echo -e "${GREEN}✓ WebView built successfully ($BUNDLE_SIZE)${NC}"
else
    echo -e "${RED}✗ WebView build failed${NC}"
    exit 1
fi
cd ..
echo ""

# Step 6: Package VSIX
echo -e "${BLUE}[6/6]${NC} Packaging VSIX..."

# Check if vsce is installed
if ! command -v vsce &> /dev/null; then
    echo -e "${YELLOW}⚠ vsce not found, installing...${NC}"
    npm install -g @vscode/vsce
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
VSIX_NAME="ai-command-center-${VERSION}.vsix"

# Package the extension
vsce package --out "$VSIX_NAME"

if [ $? -eq 0 ]; then
    VSIX_SIZE=$(du -h "$VSIX_NAME" | cut -f1)
    echo ""
    echo -e "${GREEN}=============================================="
    echo "🎉 VSIX Package Created Successfully!"
    echo "=============================================="
    echo ""
    echo "📦 Package: $VSIX_NAME"
    echo "📏 Size: $VSIX_SIZE"
    echo "🏷️  Version: $VERSION"
    echo ""
    echo "To install:"
    echo "  code --install-extension $VSIX_NAME"
    echo ""
    echo "To publish:"
    echo "  vsce publish"
    echo -e "==============================================\${NC}"
else
    echo -e "${RED}✗ VSIX packaging failed${NC}"
    exit 1
fi
