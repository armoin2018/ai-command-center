#!/bin/bash

set -e

echo ""
echo "🕷️  AI-ley Web Crawler - Installation"
echo "======================================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18+ required (found: $(node -v))"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm not found"
  exit 1
fi
echo "✓ npm $(npm -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Check if TypeScript installed
if ! npm list typescript &> /dev/null; then
  echo "Installing TypeScript..."
  npm install --save-dev typescript
fi

# Compile TypeScript
echo ""
echo "Compiling TypeScript..."
npm run build

# Download Chromium for Puppeteer
echo ""
echo "Downloading Chromium for Puppeteer..."
npx puppeteer browsers install chrome

# Create .env if not exists
if [ ! -f .env ]; then
  echo ""
  echo "Creating .env file..."
  cp .env.example .env
  echo "✓ Created .env (edit with your configuration)"
else
  echo "✓ .env already exists"
fi

# Create output directory
echo ""
echo "Creating output directories..."
mkdir -p ./crawled
mkdir -p ./downloads
mkdir -p ./logs
echo "✓ Created output directories"

# Verify installation
echo ""
echo "Verifying installation..."

# Check TypeScript compilation
if [ ! -d "dist" ]; then
  echo "❌ Error: TypeScript compilation failed (dist/ not found)"
  exit 1
fi
echo "✓ TypeScript compiled"

# Check Puppeteer
if ! npm list puppeteer &> /dev/null; then
  echo "❌ Error: Puppeteer not installed"
  exit 1
fi
echo "✓ Puppeteer installed"

# Check Cheerio
if ! npm list cheerio &> /dev/null; then
  echo "❌ Error: Cheerio not installed"
  exit 1
fi
echo "✓ Cheerio installed"

# Check p-queue
if ! npm list p-queue &> /dev/null; then
  echo "❌ Error: p-queue not installed"
  exit 1
fi
echo "✓ p-queue installed"

# File count verification
FILE_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.md" -o -name "*.json" -o -name "*.sh" -o -name ".env.example" -o -name ".gitignore" \) ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./.git/*" | wc -l | xargs)
echo "✓ Found $FILE_COUNT skill files"

# Test basic functionality
echo ""
echo "Testing basic functionality..."
cat > test-crawl.js << 'EOF'
const { WebCrawler } = require('./dist/index.js');

async function test() {
  try {
    const crawler = new WebCrawler({
      startUrl: 'https://example.com',
      maxDepth: 1,
      maxPages: 1,
      maxDuration: 1,
      outputDir: './test-output',
      saveHtml: false,
      saveMetadata: false,
      respectRobotsTxt: false,
      logLevel: 'error'
    });
    
    console.log('✓ WebCrawler initialized');
    process.exit(0);
  } catch (error) {
    console.error('❌ WebCrawler test failed:', error.message);
    process.exit(1);
  }
}

test();
EOF

node test-crawl.js
rm -f test-crawl.js
rm -rf ./test-output

echo ""
echo "======================================"
echo "✓ Installation Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Run: npm run crawl -- --url \"https://example.com\""
echo "  3. Check ./crawled for output"
echo ""
echo "Commands:"
echo "  npm run setup       - Interactive setup"
echo "  npm run crawl       - Crawl website"
echo "  npm run sitemap     - Generate sitemap"
echo "  npm run download    - Download files"
echo "  npm run spider      - Fast link discovery"
echo "  npm run diagnose    - Run diagnostics"
echo ""
echo "Documentation:"
echo "  SKILL.md           - Full documentation"
echo "  README.md          - Quick start guide"
echo "  QUICK_REFERENCE.md - Command reference"
echo ""
