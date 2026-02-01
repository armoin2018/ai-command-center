#!/bin/bash

# WooCommerce Skill Installation Script
# This script sets up the WooCommerce integration skill for AI-ley

set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛒 WooCommerce Skill Installation${NC}\n"

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ required (currently $(node -v))${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm version
echo -e "${YELLOW}Checking npm version...${NC}"
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
  echo -e "${RED}❌ npm 9+ required (currently $(npm -v))${NC}"
  exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)\n${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$SKILL_DIR"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# Compile TypeScript
echo -e "${YELLOW}Compiling TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ TypeScript compiled${NC}\n"

# Setup .env file
echo -e "${YELLOW}Setting up environment configuration...${NC}"
if [ ! -f "$SKILL_DIR/.env" ]; then
  cp "$SKILL_DIR/.env.example" "$SKILL_DIR/.env"
  echo -e "${GREEN}✅ Created .env file (copy of .env.example)${NC}"
  echo -e "${YELLOW}   Edit .env with your WooCommerce credentials${NC}"
else
  echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# Environment diagnostics
echo -e "${YELLOW}Checking environment variables...${NC}"

if [ -z "$WOOCOMMERCE_STORE_URL" ] && [ -z "$WOOCOMMERCE_COM_EMAIL" ]; then
  echo -e "${YELLOW}⚠️  No WooCommerce credentials detected${NC}"
  echo -e "   Self-hosted: Set WOOCOMMERCE_STORE_URL, WOOCOMMERCE_API_KEY, WOOCOMMERCE_API_SECRET"
  echo -e "   WooCommerce.com: Set WOOCOMMERCE_COM_EMAIL, WOOCOMMERCE_COM_PASSWORD"
else
  echo -e "${GREEN}✅ Store configuration detected${NC}"
fi
echo ""

# Verify build output
echo -e "${YELLOW}Verifying build output...${NC}"
if [ -f "$SKILL_DIR/dist/index.js" ] && [ -f "$SKILL_DIR/dist/cli.js" ]; then
  echo -e "${GREEN}✅ Build output verified${NC}"
else
  echo -e "${RED}❌ Build output missing${NC}"
  exit 1
fi
echo ""

# Test CLI availability
echo -e "${YELLOW}Testing CLI availability...${NC}"
if node "$SKILL_DIR/dist/cli.js" --version > /dev/null 2>&1; then
  echo -e "${GREEN}✅ CLI is working${NC}"
else
  echo -e "${RED}❌ CLI test failed${NC}"
  exit 1
fi
echo ""

# Summary
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ WooCommerce Skill Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}📋 Next Steps:${NC}\n"

echo -e "${YELLOW}1. Configure credentials:${NC}"
echo -e "   Edit .env with your WooCommerce store details\n"

echo -e "${YELLOW}2. Verify connection:${NC}"
echo -e "   npm run auth -- verify\n"

echo -e "${YELLOW}3. Detect account tier:${NC}"
echo -e "   npm run detect\n"

echo -e "${YELLOW}4. View available commands:${NC}"
echo -e "   npm run setup\n"

echo -e "${YELLOW}5. Common operations:${NC}"
echo -e "   npm run product -- list\n"
echo -e "   npm run order -- list\n"
echo -e "   npm run customer -- list\n"
echo -e "   npm run report -- sales\n"

echo -e "${BLUE}📚 Documentation:${NC}\n"
echo -e "   SKILL.md - Comprehensive documentation"
echo -e "   README.md - Quick start guide"
echo -e "   QUICK_REFERENCE.md - Command reference\n"

echo -e "${BLUE}🔗 Resources:${NC}\n"
echo -e "   WooCommerce Docs: https://woocommerce.com/document/"
echo -e "   REST API: https://woocommerce.github.io/woocommerce-rest-api-docs/"
echo -e "   Developer: https://developer.woocommerce.com/\n"

echo -e "${GREEN}Happy selling! 🚀${NC}\n"
