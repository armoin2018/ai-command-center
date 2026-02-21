#!/bin/bash

# AI-ley Tools Model - Installation Script
# Mermaid and PlantUML diagram generation, translation, and rendering

set -e

echo "🔧 Installing AI-ley Tools Model..."
echo ""

# ============================================
# Check Node.js Version
# ============================================

echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required (found: $(node -v))"
    echo "Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js $(node -v)"

# ============================================
# Check npm
# ============================================

echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✓ npm $(npm -v)"

# ============================================
# Install Dependencies
# ============================================

echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

# ============================================
# Check TypeScript
# ============================================

echo ""
echo "Checking TypeScript..."
if ! npm list typescript &> /dev/null; then
    echo "Installing TypeScript..."
    npm install --save-dev typescript
fi

echo "✓ TypeScript available"

# ============================================
# Build TypeScript
# ============================================

echo ""
echo "Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build TypeScript"
    exit 1
fi

echo "✓ TypeScript compiled"

# ============================================
# Create .env File
# ============================================

echo ""
echo "Checking environment configuration..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "  Note: API rendering is disabled by default"
    echo "  To enable: Set ENABLE_API_RENDERING=true in .env"
else
    echo "✓ .env file exists"
fi

# ============================================
# Create Directories
# ============================================

echo ""
echo "Creating directories..."

mkdir -p templates
echo "✓ Created templates/"

mkdir -p output
echo "✓ Created output/"

mkdir -p logs
echo "✓ Created logs/"

mkdir -p .cache
echo "✓ Created .cache/"

# ============================================
# Verify Installation
# ============================================

echo ""
echo "Verifying installation..."

# Check dist directory
if [ ! -d "dist" ]; then
    echo "❌ dist/ directory not found"
    exit 1
fi
echo "✓ dist/ directory exists"

# Check for key dependencies
echo "Checking dependencies..."

if ! npm list axios --depth=0 &> /dev/null; then
    echo "❌ axios not found"
    exit 1
fi
echo "✓ axios installed"

if ! npm list chalk --depth=0 &> /dev/null; then
    echo "❌ chalk not found"
    exit 1
fi
echo "✓ chalk installed"

if ! npm list commander --depth=0 &> /dev/null; then
    echo "❌ commander not found"
    exit 1
fi
echo "✓ commander installed"

if ! npm list js-yaml --depth=0 &> /dev/null; then
    echo "❌ js-yaml not found"
    exit 1
fi
echo "✓ js-yaml installed"

# Count files
FILE_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.json" -o -name "*.md" -o -name "*.sh" -o -name ".env.example" -o -name ".gitignore" \) ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./.cache/*" | wc -l | tr -d ' ')
echo "✓ Found $FILE_COUNT source files"

if [ "$FILE_COUNT" -lt 11 ]; then
    echo "⚠ Warning: Expected at least 11 files, found $FILE_COUNT"
fi

# ============================================
# Test Basic Functionality
# ============================================

echo ""
echo "Testing basic functionality..."

cat > test-basic.js << 'EOF'
const { ModelClient } = require('./dist/index.js');

const client = new ModelClient({
  enableApiRendering: false
});

console.log('✓ ModelClient initialized successfully');
EOF

node test-basic.js
if [ $? -ne 0 ]; then
    echo "❌ Basic functionality test failed"
    rm -f test-basic.js
    exit 1
fi

rm -f test-basic.js
echo "✓ Basic functionality test passed"

# ============================================
# Installation Complete
# ============================================

echo ""
echo "============================================"
echo "✅ Installation Complete!"
echo "============================================"
echo ""
echo "Quick Start:"
echo ""
echo "1. Generate diagram from natural language:"
echo "   npm run generate -- \"User login flow\" --type sequence --nl"
echo ""
echo "2. Convert between formats:"
echo "   npm run convert -- diagram.mmd --output diagram.puml"
echo ""
echo "3. Validate syntax:"
echo "   npm run validate -- diagram.mmd"
echo ""
echo "4. Run diagnostics:"
echo "   npm run diagnose"
echo ""
echo "============================================"
echo "Optional: API Rendering Setup"
echo "============================================"
echo ""
echo "API rendering is disabled by default. To enable:"
echo ""
echo "1. Edit .env file:"
echo "   ENABLE_API_RENDERING=true"
echo ""
echo "2. Configure APIs (already set to public endpoints):"
echo "   MERMAID_INK_URL=https://mermaid.ink"
echo "   PLANTUML_SERVER_URL=https://www.plantuml.com/plantuml"
echo ""
echo "3. Self-host PlantUML (optional, for privacy):"
echo "   docker run -d -p 8080:8080 plantuml/plantuml-server:jetty"
echo "   PLANTUML_SERVER_URL=http://localhost:8080"
echo ""
echo "4. Test rendering:"
echo "   npm run render -- diagram.mmd --format svg --output diagram.svg"
echo ""
echo "============================================"
echo "VS Code Integration"
echo "============================================"
echo ""
echo "VS Code has built-in Mermaid preview support:"
echo ""
echo "1. Open any .mmd file"
echo "2. Press: Cmd+K V (Mac) or Ctrl+K V (Windows/Linux)"
echo "3. View live preview side-by-side"
echo ""
echo "Recommended extensions:"
echo "  - Markdown Preview Mermaid Support"
echo "  - PlantUML"
echo "  - Mermaid Editor"
echo ""
echo "============================================"
echo "Commands"
echo "============================================"
echo ""
echo "npm run generate    - Generate diagrams"
echo "npm run convert     - Convert formats"
echo "npm run parse       - Parse and analyze"
echo "npm run render      - Render to images (requires API)"
echo "npm run validate    - Validate syntax"
echo "npm run template    - Manage templates"
echo "npm run batch       - Process multiple files"
echo "npm run diagnose    - System diagnostics"
echo ""
echo "============================================"
echo "Documentation"
echo "============================================"
echo ""
echo "README.md           - Quick start guide"
echo "SKILL.md            - Full documentation"
echo "QUICK_REFERENCE.md  - Command reference"
echo "SUMMARY.md          - Project overview"
echo ""
echo "============================================"
echo ""
