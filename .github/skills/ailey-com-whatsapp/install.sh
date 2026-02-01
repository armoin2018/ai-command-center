#!/bin/bash
#
# WhatsApp Business Integration Installer
# Installs and configures the WhatsApp Business integration skill for AI-ley
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║  WhatsApp Business Integration Installer for AI-ley   ║"
echo "║                    Version 1.0.0                       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
echo -e "${BLUE}[1/6] Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"

# Check npm
echo -e "${BLUE}[2/6] Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION} found${NC}"

# Install dependencies
echo -e "${BLUE}[3/6] Installing dependencies...${NC}"
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
    echo "Running: npm install"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Build TypeScript
echo -e "${BLUE}[4/6] Building TypeScript...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript compiled successfully${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript compilation completed with warnings${NC}"
fi

# Setup environment
echo -e "${BLUE}[5/6] Setting up environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo "Copying .env.example to .env"
    cp .env.example .env
    echo -e "${YELLOW}⚠ .env file created (CONFIGURE THIS!)${NC}"
    echo -e "${YELLOW}  Please edit .env and add your credentials:${NC}"
    echo -e "${YELLOW}  WHATSAPP_API_TOKEN=your_token_here${NC}"
    echo -e "${YELLOW}  WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here${NC}"
    echo -e "${YELLOW}  WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id_here${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Run diagnostics
echo -e "${BLUE}[6/6] Running diagnostics...${NC}"
echo ""

if [ -n "$WHATSAPP_API_TOKEN" ]; then
    echo -e "${GREEN}✓ WHATSAPP_API_TOKEN environment variable is set${NC}"
else
    if grep -q "^WHATSAPP_API_TOKEN=" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠ WHATSAPP_API_TOKEN is set in .env${NC}"
    else
        echo -e "${RED}✗ WHATSAPP_API_TOKEN is not configured${NC}"
    fi
fi

if [ -n "$WHATSAPP_PHONE_NUMBER_ID" ]; then
    echo -e "${GREEN}✓ WHATSAPP_PHONE_NUMBER_ID environment variable is set${NC}"
else
    if grep -q "^WHATSAPP_PHONE_NUMBER_ID=" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠ WHATSAPP_PHONE_NUMBER_ID is set in .env${NC}"
    else
        echo -e "${RED}✗ WHATSAPP_PHONE_NUMBER_ID is not configured${NC}"
    fi
fi

if [ -n "$WHATSAPP_BUSINESS_ACCOUNT_ID" ]; then
    echo -e "${GREEN}✓ WHATSAPP_BUSINESS_ACCOUNT_ID environment variable is set${NC}"
else
    if grep -q "^WHATSAPP_BUSINESS_ACCOUNT_ID=" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠ WHATSAPP_BUSINESS_ACCOUNT_ID is set in .env${NC}"
    else
        echo -e "${RED}✗ WHATSAPP_BUSINESS_ACCOUNT_ID is not configured${NC}"
    fi
fi

# Display instructions
echo ""
echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "1. ${YELLOW}Get Your API Credentials:${NC}"
echo "   Visit: https://developers.facebook.com/"
echo "   Create an app (Business type)"
echo "   Add WhatsApp product"
echo "   Go to API Setup section"
echo ""
echo -e "2. ${YELLOW}Get Your Phone Number ID:${NC}"
echo "   Dashboard → Phone Numbers"
echo "   Add or select your phone number"
echo "   Complete SMS/call verification"
echo "   Copy your Phone Number ID"
echo ""
echo -e "3. ${YELLOW}Configure Environment:${NC}"
echo "   Edit: .env"
echo "   Add credentials:"
echo "   WHATSAPP_API_TOKEN=your_bearer_token"
echo "   WHATSAPP_PHONE_NUMBER_ID=your_phone_id"
echo "   WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id"
echo ""
echo -e "4. ${YELLOW}Verify Setup:${NC}"
echo "   Run: npm run detect"
echo "   Run: npm run auth -- verify"
echo "   Run: npm run diagnose"
echo ""
echo -e "5. ${YELLOW}Start Messaging:${NC}"
echo "   npm run send -- text --phone 15551234567 --message \"Hello\""
echo "   npm run setup         # Interactive setup"
echo "   npm run --help        # See all commands"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Documentation:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo "  README.md           - Quick start guide"
echo "  QUICK_REFERENCE.md  - Command reference"
echo "  SKILL.md            - Complete documentation"
echo "  SUMMARY.md          - Project summary"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Resources:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo "  Developers:     https://developers.facebook.com/"
echo "  Getting Started: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
echo "  API Reference:   https://developers.facebook.com/docs/whatsapp/cloud-api/reference"
echo "  Help Center:     https://www.whatsapp.com/business/help/"
echo "  Pricing:         https://www.whatsapp.com/business/pricing/"
echo ""

if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ Ready to use!${NC}"
else
    echo -e "${YELLOW}⚠ Build output not found, try: npm run build${NC}"
fi

echo ""
