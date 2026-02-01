#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   OpenAI DALL-E & Sora Skill - Installation Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Check Node.js version
echo -e "${YELLOW}→${NC} Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗${NC} Node.js 18+ required (found v$NODE_VERSION)"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# Check npm version
echo -e "${YELLOW}→${NC} Checking npm version..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm $(npm -v)"

# Install dependencies
echo -e "\n${YELLOW}→${NC} Installing dependencies..."
if npm install; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${RED}✗${NC} Failed to install dependencies"
    exit 1
fi

# Build TypeScript
echo -e "${YELLOW}→${NC} Building TypeScript..."
if npm run build; then
    echo -e "${GREEN}✓${NC} TypeScript compiled"
else
    echo -e "${RED}✗${NC} TypeScript compilation failed"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}→${NC} Creating .env file from template..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created"
    echo -e "${YELLOW}  ⚠  Please edit .env and add your OpenAI API key${NC}"
else
    echo -e "${BLUE}ℹ${NC} .env file already exists"
fi

# Check if API key is configured
echo -e "\n${YELLOW}→${NC} Checking configuration..."
if [ -f .env ]; then
    if grep -q "OPENAI_API_KEY=sk-" .env; then
        echo -e "${GREEN}✓${NC} OpenAI API key appears to be configured"
        
        # Optional: Try to verify API key works
        echo -e "${YELLOW}→${NC} Testing API connection..."
        if npm run detect 2>/dev/null | grep -q "Account Tier"; then
            echo -e "${GREEN}✓${NC} API connection successful"
        else
            echo -e "${YELLOW}⚠${NC} Could not verify API connection (key may be invalid)"
        fi
    else
        echo -e "${YELLOW}⚠${NC} OpenAI API key not configured in .env"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env file not found"
fi

# Create output directory
OUTPUT_DIR="./output"
if [ ! -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
    echo -e "${GREEN}✓${NC} Output directory created: $OUTPUT_DIR"
fi

# Verify build output
echo -e "${YELLOW}→${NC} Verifying build output..."
if [ -f "dist/index.js" ] && [ -f "dist/cli.js" ]; then
    echo -e "${GREEN}✓${NC} Build output verified"
else
    echo -e "${RED}✗${NC} Build output missing"
    exit 1
fi

# Success summary
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Next Steps:${NC}\n"

if ! grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${YELLOW}1.${NC} Get your OpenAI API key:"
    echo -e "   ${BLUE}→${NC} Visit https://platform.openai.com/api-keys"
    echo -e "   ${BLUE}→${NC} Click 'Create new secret key'"
    echo -e "   ${BLUE}→${NC} Copy the key (shown only once!)"
    echo -e ""
    echo -e "${YELLOW}2.${NC} Configure your API key:"
    echo -e "   ${BLUE}→${NC} Edit .env file"
    echo -e "   ${BLUE}→${NC} Set OPENAI_API_KEY=your_key_here"
    echo -e ""
    echo -e "${YELLOW}3.${NC} Verify installation:"
    echo -e "   ${GREEN}npm run detect${NC}"
    echo -e ""
    echo -e "${YELLOW}4.${NC} Generate your first image:"
    echo -e "   ${GREEN}npm run generate -- --prompt \"Mountain sunset\"${NC}"
else
    echo -e "${YELLOW}1.${NC} Check your account tier:"
    echo -e "   ${GREEN}npm run detect${NC}"
    echo -e ""
    echo -e "${YELLOW}2.${NC} Generate your first image:"
    echo -e "   ${GREEN}npm run generate -- --prompt \"Mountain sunset\"${NC}"
    echo -e ""
    echo -e "${YELLOW}3.${NC} Try HD quality:"
    echo -e "   ${GREEN}npm run generate -- --prompt \"Cityscape\" --quality hd${NC}"
    echo -e ""
    echo -e "${YELLOW}4.${NC} View generation history:"
    echo -e "   ${GREEN}npm run history${NC}"
fi

echo -e "\n${BLUE}Account Tiers:${NC}"
echo -e "  ${BLUE}•${NC} Free Trial: \$5 credits, expires in 3 months"
echo -e "  ${BLUE}•${NC} Tier 1: \$5+ spent, 5 req/min, full DALL-E 3"
echo -e "  ${BLUE}•${NC} Tier 4: \$250+ spent, 15 req/min, Sora early access"
echo -e "  ${BLUE}•${NC} Tier 5: \$1,000+ spent, 50 req/min, enterprise features"

echo -e "\n${BLUE}Resources:${NC}"
echo -e "  ${BLUE}•${NC} Platform: https://platform.openai.com/"
echo -e "  ${BLUE}•${NC} API Keys: https://platform.openai.com/api-keys"
echo -e "  ${BLUE}•${NC} Pricing: https://openai.com/pricing"
echo -e "  ${BLUE}•${NC} Sora: https://openai.com/sora"

echo -e "\n${BLUE}Documentation:${NC}"
echo -e "  ${BLUE}•${NC} Full docs: ${GREEN}cat SKILL.md${NC}"
echo -e "  ${BLUE}•${NC} Quick start: ${GREEN}cat README.md${NC}"
echo -e "  ${BLUE}•${NC} Command reference: ${GREEN}cat QUICK_REFERENCE.md${NC}"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
