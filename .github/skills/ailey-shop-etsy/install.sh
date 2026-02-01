#!/bin/bash

# Etsy AI-ley Skill Installation Script
# Automates setup, verification, and build of the Etsy skill

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_VERSION_REQUIRED=18
NPM_VERSION_REQUIRED=9

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Etsy AI-ley Skill Installation Script           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check command existence
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to get version
get_version() {
  echo "$1" | sed 's/[^0-9.]//g' | cut -d. -f1,2
}

# Function to compare versions
version_gt() {
  [[ $(echo -e "$1\n$2" | sort -V | head -n1) == "$2" ]]
}

# Check Node.js installation
echo -e "${YELLOW}→ Checking Node.js installation...${NC}"
if ! command_exists node; then
  echo -e "${RED}✗ Node.js is not installed${NC}"
  echo -e "${YELLOW}  Please install Node.js $NODE_VERSION_REQUIRED+ from https://nodejs.org/${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [[ $NODE_MAJOR -lt $NODE_VERSION_REQUIRED ]]; then
  echo -e "${RED}✗ Node.js $NODE_MAJOR is too old (required: $NODE_VERSION_REQUIRED+)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $NODE_VERSION (required: $NODE_VERSION_REQUIRED+)${NC}"

# Check npm installation
echo -e "${YELLOW}→ Checking npm installation...${NC}"
if ! command_exists npm; then
  echo -e "${RED}✗ npm is not installed${NC}"
  exit 1
fi

NPM_VERSION=$(npm -v)
NPM_MAJOR=$(echo "$NPM_VERSION" | cut -d. -f1)

if [[ $NPM_MAJOR -lt $NPM_VERSION_REQUIRED ]]; then
  echo -e "${RED}✗ npm $NPM_MAJOR is too old (required: $NPM_VERSION_REQUIRED+)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ npm $NPM_VERSION (required: $NPM_VERSION_REQUIRED+)${NC}"

# Check if already in the skill directory
echo -e "${YELLOW}→ Verifying installation path...${NC}"
if [[ ! -f "package.json" ]]; then
  echo -e "${RED}✗ package.json not found in $SKILL_DIR${NC}"
  echo -e "${YELLOW}  Please run this script from the Etsy skill directory${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Installation path verified: $SKILL_DIR${NC}"

# Check required files
echo -e "${YELLOW}→ Checking required files...${NC}"
REQUIRED_FILES=("package.json" "tsconfig.json" ".env.example" "SKILL.md" "README.md")
for file in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo -e "${GREEN}✓ $file${NC}"
  else
    echo -e "${RED}✗ $file not found${NC}"
    exit 1
  fi
done

# Install dependencies
echo ""
echo -e "${YELLOW}→ Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Compile TypeScript
echo ""
echo -e "${YELLOW}→ Compiling TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ TypeScript compiled to dist/${NC}"

# Setup environment variables if not present
echo ""
echo -e "${YELLOW}→ Checking environment configuration...${NC}"
if [[ ! -f ".env" ]]; then
  echo -e "${YELLOW}  Creating .env from .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓ .env created from template${NC}"
  echo ""
  echo -e "${BLUE}  ⚠ Please configure .env with your Etsy API credentials:${NC}"
  echo -e "${BLUE}    - ETSY_API_KEY${NC}"
  echo -e "${BLUE}    - ETSY_API_SECRET${NC}"
  echo -e "${BLUE}    - ETSY_ACCESS_TOKEN${NC}"
  echo -e "${BLUE}    - ETSY_SHOP_ID${NC}"
  echo ""
  echo -e "${BLUE}  Get credentials from: https://www.etsy.com/developers${NC}"
else
  echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Verify build output
echo ""
echo -e "${YELLOW}→ Verifying build output...${NC}"
if [[ ! -d "dist" ]]; then
  echo -e "${RED}✗ dist/ directory not created${NC}"
  exit 1
fi

if [[ ! -f "dist/index.js" ]]; then
  echo -e "${RED}✗ dist/index.js not found${NC}"
  exit 1
fi

if [[ ! -f "dist/cli.js" ]]; then
  echo -e "${RED}✗ dist/cli.js not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Build output verified${NC}"

# Run diagnostics
echo ""
echo -e "${YELLOW}→ Running diagnostics...${NC}"
npm run diagnose

# Verify skill structure
echo ""
echo -e "${YELLOW}→ Verifying skill structure...${NC}"
FILE_COUNT=$(find . -type f -not -path "./node_modules/*" -not -path "./.git/*" | wc -l)
echo -e "${GREEN}✓ Found $FILE_COUNT project files${NC}"

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Installation Complete! ✓                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Configure your API credentials in .env"
echo "2. Test connection: ${YELLOW}npm run auth -- verify${NC}"
echo "3. Detect your tier: ${YELLOW}npm run detect${NC}"
echo "4. Start managing: ${YELLOW}npm run shop -- info${NC}"
echo ""
echo -e "${GREEN}Available Commands:${NC}"
echo "  ${YELLOW}npm run setup${NC}        - Interactive setup wizard"
echo "  ${YELLOW}npm run detect${NC}       - Detect account tier"
echo "  ${YELLOW}npm run auth${NC}         - Manage authentication"
echo "  ${YELLOW}npm run shop${NC}         - Shop management"
echo "  ${YELLOW}npm run product${NC}      - Product/listing management"
echo "  ${YELLOW}npm run order${NC}        - Order management"
echo "  ${YELLOW}npm run review${NC}       - Review management"
echo "  ${YELLOW}npm run analytics${NC}    - Analytics/reporting"
echo "  ${YELLOW}npm run dev${NC}          - Watch mode"
echo ""
echo -e "${GREEN}Resources:${NC}"
echo "  • Documentation: README.md"
echo "  • Quick Reference: QUICK_REFERENCE.md"
echo "  • Full API Docs: SKILL.md"
echo "  • Developer Portal: https://www.etsy.com/developers"
echo ""
echo -e "${BLUE}For more help, see README.md or run: npm run setup${NC}"
echo ""
