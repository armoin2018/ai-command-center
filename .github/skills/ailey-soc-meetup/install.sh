#!/bin/bash

# Meetup Integration Manager - Installation Script

set -e

echo "🚀 Installing Meetup Integration Manager..."
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  Please edit .env and add your Meetup OAuth credentials:"
    echo "   - MEETUP_CLIENT_ID"
    echo "   - MEETUP_CLIENT_SECRET"
    echo "   - MEETUP_REDIRECT_URI"
    echo ""
fi

# Success message
echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Meetup OAuth credentials"
echo "2. Run: npm run detect (to check account tier)"
echo "3. Run: npm run auth start (to authenticate)"
echo ""
echo "For more information, see README.md or SKILL.md"
echo ""
