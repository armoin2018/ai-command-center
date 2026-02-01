#!/bin/bash
#
# Zoom API Integration Installer
# Installs and configures the Zoom API integration skill for AI-ley
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
echo "║      Zoom API Integration Installer for AI-ley        ║"
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
    echo -e "${YELLOW}  ZOOM_CLIENT_ID=your_client_id_here${NC}"
    echo -e "${YELLOW}  ZOOM_CLIENT_SECRET=your_client_secret_here${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Run diagnostics
echo -e "${BLUE}[6/6] Running diagnostics...${NC}"
echo ""

if [ -n "$ZOOM_CLIENT_ID" ]; then
    echo -e "${GREEN}✓ ZOOM_CLIENT_ID environment variable is set${NC}"
else
    if grep -q "^ZOOM_CLIENT_ID=" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠ ZOOM_CLIENT_ID is set in .env${NC}"
    else
        echo -e "${RED}✗ ZOOM_CLIENT_ID is not configured${NC}"
    fi
fi

if [ -n "$ZOOM_CLIENT_SECRET" ]; then
    echo -e "${GREEN}✓ ZOOM_CLIENT_SECRET environment variable is set${NC}"
else
    if grep -q "^ZOOM_CLIENT_SECRET=" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠ ZOOM_CLIENT_SECRET is set in .env${NC}"
    else
        echo -e "${RED}✗ ZOOM_CLIENT_SECRET is not configured${NC}"
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
echo -e "1. ${YELLOW}Create Zoom App:${NC}"
echo "   Visit: https://marketplace.zoom.us/"
echo "   Click: Develop → Build App"
echo "   Choose: JWT app type"
echo "   Fill in: App details"
echo ""
echo -e "2. ${YELLOW}Get Your Credentials:${NC}"
echo "   App Dashboard → Basic Information"
echo "   Copy: Client ID"
echo "   Copy: Client Secret"
echo ""
echo -e "3. ${YELLOW}Enable API Scopes:${NC}"
echo "   Go to: Scopes section"
echo "   Add: meeting:create, meeting:read, meeting:update"
echo "   Add: recording:read, webinar:read"
echo "   Save: Changes"
echo ""
echo -e "4. ${YELLOW}Configure Environment:${NC}"
echo "   Edit: .env"
echo "   Add credentials:"
echo "   ZOOM_CLIENT_ID=your_client_id"
echo "   ZOOM_CLIENT_SECRET=your_client_secret"
echo ""
echo -e "5. ${YELLOW}Verify Setup:${NC}"
echo "   Run: npm run detect"
echo "   Run: npm run auth -- verify"
echo "   Run: npm run diagnose"
echo ""
echo -e "6. ${YELLOW}Start Using:${NC}"
echo "   npm run setup         # Interactive setup"
echo "   npm run meeting -- create --topic \"Meeting\" --duration 30"
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
echo "  Marketplace:     https://marketplace.zoom.us/"
echo "  API Reference:   https://developers.zoom.us/docs/api/"
echo "  Authentication:  https://developers.zoom.us/docs/api/rest/authentication/"
echo "  JWT Guide:       https://developers.zoom.us/docs/api/rest/authentication/#jwt"
echo "  Help Center:     https://support.zoom.us/"
echo ""

if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ Ready to use!${NC}"
else
    echo -e "${YELLOW}⚠ Build output not found, try: npm run build${NC}"
fi

echo ""
