#!/bin/bash

# Google Gemini Image & Video Generation AI-ley Skill Installation Script

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "    Google Gemini AI-ley Skill Installation"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${YELLOW}→${NC} Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js not found"
    echo -e "  Install from: https://nodejs.org/ (v18+ required)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗${NC} Node.js v18+ required (found v$NODE_VERSION)"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# Check npm version
echo -e "${YELLOW}→${NC} Checking npm version..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm v$(npm -v)"

# Install dependencies
echo ""
echo -e "${YELLOW}→${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"

# Build TypeScript
echo ""
echo -e "${YELLOW}→${NC} Building TypeScript..."
npm run build
echo -e "${GREEN}✓${NC} Build successful"

# Setup .env file
echo ""
echo -e "${YELLOW}→${NC} Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file from template"
    echo -e "${BLUE}  → Edit .env with your Google Gemini API key${NC}"
else
    echo -e "${BLUE}ℹ${NC} .env already exists"
fi

# Create output directory
OUTPUT_DIR="${GEMINI_OUTPUT_DIR:-./output}"
if [ ! -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
    echo -e "${GREEN}✓${NC} Created output directory: $OUTPUT_DIR"
fi

# Environment diagnostics
echo ""
echo -e "${YELLOW}→${NC} Running diagnostics..."
echo ""

# Check environment variables
ENV_VARS=(
    "GEMINI_API_KEY"
    "GEMINI_ACCOUNT_TYPE"
)

MISSING_VARS=0
for VAR in "${ENV_VARS[@]}"; do
    if grep -q "^${VAR}=" .env && ! grep -q "^${VAR}=your_" .env && ! grep -q "^${VAR}=$" .env; then
        echo -e "${GREEN}✓${NC} ${VAR}"
    else
        echo -e "${RED}✗${NC} ${VAR} (not configured)"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done

echo ""

# Check build output
if [ -f "dist/index.js" ] && [ -f "dist/cli.js" ]; then
    echo -e "${GREEN}✓${NC} Build output verified"
else
    echo -e "${RED}✗${NC} Build output missing"
    exit 1
fi

# Check CLI availability
if [ -f "dist/cli.js" ]; then
    echo -e "${GREEN}✓${NC} CLI available"
else
    echo -e "${RED}✗${NC} CLI not found"
    exit 1
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "                    ${GREEN}Installation Complete${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $MISSING_VARS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All environment variables configured"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo -e "1. Verify connection:"
    echo -e "   ${BLUE}npm run detect${NC}"
    echo ""
    echo -e "2. Generate your first image:"
    echo -e "   ${BLUE}npm run generate -- --prompt \"Mountain landscape\" --output \"test.png\"${NC}"
    echo ""
    echo -e "3. Generate a video:"
    echo -e "   ${BLUE}npm run video -- --prompt \"Ocean waves\" --duration 8 --output \"test.mp4\"${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} $MISSING_VARS environment variable(s) need configuration"
    echo ""
    echo -e "${YELLOW}Setup Guide:${NC}"
    echo ""
    echo -e "${BLUE}For Free/Pay-as-you-go Plans:${NC}"
    echo -e "1. Visit: ${BLUE}https://aistudio.google.com/app/apikey${NC}"
    echo -e "2. Click 'Create API key'"
    echo -e "3. Copy your API key"
    echo -e "4. Add to .env file:"
    echo -e "   ${GREEN}GEMINI_API_KEY=AIzaSy...your_key${NC}"
    echo -e "   ${GREEN}GEMINI_ACCOUNT_TYPE=free${NC}  # or 'paid'"
    echo ""
    echo -e "${BLUE}For Enterprise (Vertex AI):${NC}"
    echo -e "1. Create GCP project at: ${BLUE}https://console.cloud.google.com/${NC}"
    echo -e "2. Enable Vertex AI API"
    echo -e "3. Create Service Account with 'aiplatform.user' role"
    echo -e "4. Download JSON key file"
    echo -e "5. Add to .env file:"
    echo -e "   ${GREEN}GEMINI_PROJECT_ID=your-project${NC}"
    echo -e "   ${GREEN}GEMINI_LOCATION=us-central1${NC}"
    echo -e "   ${GREEN}GEMINI_SERVICE_ACCOUNT_KEY=/path/to/key.json${NC}"
    echo -e "   ${GREEN}GEMINI_ACCOUNT_TYPE=enterprise${NC}"
    echo ""
    echo -e "${YELLOW}Run for detailed instructions:${NC}"
    echo -e "   ${BLUE}npm run setup${NC}"
    echo ""
fi

echo -e "${YELLOW}Account Tiers:${NC}"
echo -e "  • ${BLUE}Free${NC}: 15 req/min, 1,500/day, 1024x1024 images, 8s videos"
echo -e "  • ${BLUE}Pay-as-you-go${NC}: 60 req/min, 10K/day, 2048x2048 images, 16s videos, upscaling"
echo -e "  • ${BLUE}Enterprise${NC}: 300 req/min, 100K+/day, 8K images, 60s videos, custom features"
echo ""
echo -e "${YELLOW}Resources:${NC}"
echo -e "  • Google AI Studio: ${BLUE}https://aistudio.google.com/${NC}"
echo -e "  • API Docs: ${BLUE}https://ai.google.dev/gemini-api/docs${NC}"
echo -e "  • Pricing: ${BLUE}https://ai.google.dev/pricing${NC}"
echo -e "  • Full Documentation: ${BLUE}SKILL.md${NC}"
echo -e "  • Quick Reference: ${BLUE}QUICK_REFERENCE.md${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
