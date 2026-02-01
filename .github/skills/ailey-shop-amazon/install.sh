#!/bin/bash

# Amazon SP-API AI-ley Skill Installation Script
# Supports both personal (Individual) and business (Professional) sellers

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "    Amazon SP-API AI-ley Skill Installation"
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
    echo -e "${BLUE}  → Edit .env with your Amazon SP-API credentials${NC}"
else
    echo -e "${BLUE}ℹ${NC} .env already exists"
fi

# Environment diagnostics
echo ""
echo -e "${YELLOW}→${NC} Running diagnostics..."
echo ""

# Check environment variables
ENV_VARS=(
    "AMAZON_CLIENT_ID"
    "AMAZON_CLIENT_SECRET"
    "AMAZON_REFRESH_TOKEN"
    "AMAZON_ACCESS_KEY_ID"
    "AMAZON_SECRET_ACCESS_KEY"
    "AMAZON_SELLER_ID"
    "AMAZON_MARKETPLACE_ID"
)

MISSING_VARS=0
for VAR in "${ENV_VARS[@]}"; do
    if grep -q "^${VAR}=" .env && ! grep -q "^${VAR}=$" .env; then
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
    echo -e "2. Create your first product:"
    echo -e "   ${BLUE}npm run product create -- --sku \"SKU-001\" --title \"Product\" --price 29.99 --quantity 100${NC}"
    echo ""
    echo -e "3. Check orders:"
    echo -e "   ${BLUE}npm run order list${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} $MISSING_VARS environment variable(s) need configuration"
    echo ""
    echo -e "${YELLOW}Setup Guide:${NC}"
    echo ""
    echo -e "${BLUE}Personal Sellers (Individual Plan - \$0.99/sale):${NC}"
    echo -e "1. Sign up at: ${BLUE}https://sell.amazon.com/${NC}"
    echo -e "2. Choose Individual plan"
    echo -e "3. Complete identity verification"
    echo ""
    echo -e "${BLUE}Business Sellers (Professional Plan - \$39.99/month):${NC}"
    echo -e "1. Sign up at: ${BLUE}https://sell.amazon.com/${NC}"
    echo -e "2. Choose Professional plan"
    echo -e "3. Provide business information"
    echo -e "4. Complete identity verification"
    echo ""
    echo -e "${BLUE}Get API Credentials:${NC}"
    echo -e "1. Register as developer in Seller Central"
    echo -e "2. Get LWA credentials: ${BLUE}https://developer.amazonservices.com/${NC}"
    echo -e "3. Get AWS IAM credentials from Seller Central"
    echo -e "4. Copy Seller ID and Marketplace ID"
    echo ""
    echo -e "${YELLOW}Run for detailed instructions:${NC}"
    echo -e "   ${BLUE}npm run setup${NC}"
    echo ""
fi

echo -e "${YELLOW}Resources:${NC}"
echo -e "  • Seller Central: ${BLUE}https://sellercentral.amazon.com/${NC}"
echo -e "  • SP-API Docs: ${BLUE}https://developer-docs.amazon.com/sp-api/${NC}"
echo -e "  • Full Documentation: ${BLUE}SKILL.md${NC}"
echo -e "  • Quick Reference: ${BLUE}QUICK_REFERENCE.md${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
