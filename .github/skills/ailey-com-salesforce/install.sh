#!/bin/bash

set -e

echo ""
echo "☁️  AI-ley Salesforce Integration - Installation"
echo "=============================================="
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

# Check TypeScript
if ! npm list typescript &> /dev/null; then
  echo "Installing TypeScript..."
  npm install --save-dev typescript
fi

# Compile TypeScript
echo ""
echo "Compiling TypeScript..."
npm run build

# Create .env if not exists
if [ ! -f .env ]; then
  echo ""
  echo "Creating .env file..."
  cp .env.example .env
  echo "✓ Created .env (edit with your Connected App credentials)"
else
  echo "✓ .env already exists"
fi

# Create directories
echo ""
echo "Creating directories..."
mkdir -p .oauth
mkdir -p exports
mkdir -p logs
mkdir -p certs
echo "✓ Created directories"

# Verify installation
echo ""
echo "Verifying installation..."

# Check TypeScript compilation
if [ ! -d "dist" ]; then
  echo "❌ Error: TypeScript compilation failed (dist/ not found)"
  exit 1
fi
echo "✓ TypeScript compiled"

# Check dependencies
if ! npm list jsforce &> /dev/null; then
  echo "❌ Error: jsforce not installed"
  exit 1
fi
echo "✓ jsforce installed"

if ! npm list axios &> /dev/null; then
  echo "❌ Error: axios not installed"
  exit 1
fi
echo "✓ axios installed"

# File count verification
FILE_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.md" -o -name "*.json" -o -name "*.sh" -o -name ".env.example" -o -name ".gitignore" \) ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./.git/*" | wc -l | xargs)
echo "✓ Found $FILE_COUNT skill files"

# Test basic functionality
echo ""
echo "Testing basic functionality..."
cat > test-sf.js << 'EOF'
const { SalesforceClient } = require('./dist/index.js');

async function test() {
  try {
    const client = new SalesforceClient({
      clientId: 'test',
      clientSecret: 'test',
      loginUrl: 'https://login.salesforce.com'
    });
    
    console.log('✓ SalesforceClient initialized');
    process.exit(0);
  } catch (error) {
    console.error('❌ SalesforceClient test failed:', error.message);
    process.exit(1);
  }
}

test();
EOF

node test-sf.js
rm -f test-sf.js

echo ""
echo "=============================================="
echo "✓ Installation Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Create Connected App in Salesforce Setup"
echo "  2. Edit .env with Consumer Key and Consumer Secret"
echo "  3. Run: npm run setup"
echo "  4. Authenticate via OAuth flow"
echo ""
echo "Connected App Setup:"
echo "  1. Go to Setup → Apps → App Manager"
echo "  2. Click 'New Connected App'"
echo "  3. Basic Information:"
echo "     - Name: AI-ley Integration"
echo "     - API Name: ailey_integration"
echo "     - Contact Email: your-email@example.com"
echo "  4. API (Enable OAuth Settings):"
echo "     - Enable OAuth Settings: ✓"
echo "     - Callback URL: http://localhost:3000/oauth/callback"
echo "     - OAuth Scopes: full, refresh_token, api"
echo "  5. Save and copy Consumer Key and Consumer Secret to .env"
echo ""
echo "Commands:"
echo "  npm run setup       - OAuth authentication wizard"
echo "  npm run detect      - Detect Salesforce edition"
echo "  npm run query       - Execute SOQL queries"
echo "  npm run create      - Create records"
echo "  npm run bulk        - Bulk operations"
echo "  npm run export      - Export data to CSV"
echo "  npm run diagnose    - System diagnostics"
echo ""
echo "Documentation:"
echo "  SKILL.md           - Full documentation"
echo "  README.md          - Quick start guide"
echo "  QUICK_REFERENCE.md - Command reference"
echo ""
