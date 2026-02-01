#!/bin/bash

# Threads Content Manager Installation Script

echo "🧵 Installing Threads Content Manager..."
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required (you have $(node -v))"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Installation failed"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env - please configure with your credentials"
else
    echo "ℹ️  .env already exists"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Run: npm run setup (for detailed setup instructions)"
echo "  2. Create Meta app and configure Threads API"
echo "  3. Configure .env with your credentials"
echo "  4. Run: npm run auth start (to authenticate)"
echo "  5. Run: npm test (to verify connection)"
echo ""
echo "📖 Full documentation: see SKILL.md"
echo ""
