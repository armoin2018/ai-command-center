#!/bin/bash

echo "🚀 Installing ailey-data-kafka..."
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
  echo "✅ Dependencies installed successfully"
else
  echo "❌ Failed to install dependencies"
  exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Configure your Kafka connection in .env file"
echo "   - Copy .env.example to .env and fill in your details"
echo "   - Or create ~/.vscode/.env for global configuration"
echo ""
echo "2. Test your connection:"
echo "   npm run kafka test"
echo ""
echo "3. See SETUP.md for detailed deployment-specific instructions"
echo "4. See SKILL.md for complete documentation"
echo ""
