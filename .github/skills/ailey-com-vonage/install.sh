#!/bin/bash

###############################################################################
# Vonage Communications API Skill - Installation Script
# 
# This script sets up the Vonage Communications API integration for AI-ley
# 
# Usage: ./install.sh
# 
# Prerequisites:
#   - Node.js 18+
#   - npm 9+
#
# Steps:
#   1. Check Node.js and npm versions
#   2. Install npm dependencies
#   3. Compile TypeScript
#   4. Create .env file from example
#   5. Verify setup with diagnostics
#   6. Display next steps
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Start installation
print_header "Vonage Communications API Installation"

# ============================================================================
# Step 1: Check Node.js and npm versions
# ============================================================================

print_info "Checking environment..."

# Check if node is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo ""
    echo "Install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required (found: $(node -v))"
    echo ""
    echo "Install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

print_success "Node.js $(node -v)"

# Check npm version
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    echo ""
    echo "Install npm from: https://www.npmjs.com/"
    exit 1
fi

NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
    print_error "npm 9+ is required (found: $(npm -v))"
    echo ""
    echo "Update npm: npm install -g npm@latest"
    exit 1
fi

print_success "npm $(npm -v)"

# ============================================================================
# Step 2: Install npm dependencies
# ============================================================================

print_info "Installing dependencies..."

if npm install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    echo ""
    echo "Try running manually:"
    echo "  npm install"
    exit 1
fi

# ============================================================================
# Step 3: Compile TypeScript
# ============================================================================

print_info "Compiling TypeScript..."

if npm run build; then
    print_success "TypeScript compiled"
else
    print_error "Failed to compile TypeScript"
    echo ""
    echo "Try running manually:"
    echo "  npm run build"
    exit 1
fi

# ============================================================================
# Step 4: Setup environment
# ============================================================================

print_info "Setting up environment..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from template"
        print_warning "Edit .env with your Vonage credentials:"
        print_warning "  VONAGE_API_KEY=your_key_here"
        print_warning "  VONAGE_API_SECRET=your_secret_here"
    else
        print_error ".env.example not found"
    fi
else
    print_success ".env file already exists"
fi

# ============================================================================
# Step 5: Run diagnostics
# ============================================================================

print_info "Running diagnostics..."
echo ""

# Check environment variables
if [ -z "$VONAGE_API_KEY" ]; then
    print_warning "VONAGE_API_KEY not set in environment"
else
    print_success "VONAGE_API_KEY is set"
fi

if [ -z "$VONAGE_API_SECRET" ]; then
    print_warning "VONAGE_API_SECRET not set in environment"
else
    print_success "VONAGE_API_SECRET is set"
fi

# Try to detect account tier if credentials are available
if [ -n "$VONAGE_API_KEY" ] && [ -n "$VONAGE_API_SECRET" ]; then
    echo ""
    print_info "Testing API credentials..."
    
    if npm run detect 2>/dev/null; then
        print_success "API credentials verified"
    else
        print_warning "Could not verify credentials - ensure .env is configured"
    fi
fi

# ============================================================================
# Step 6: Display next steps
# ============================================================================

echo ""
print_header "Installation Complete!"

echo "Next Steps:"
echo ""
echo "1. ${GREEN}Configure Credentials${NC}"
echo "   Edit .env and add your Vonage API credentials:"
echo "   - Get API Key & Secret from: https://dashboard.vonage.com/"
echo "   - Open editor:"
echo "     ${YELLOW}nano .env${NC}"
echo ""

echo "2. ${GREEN}Verify Setup${NC}"
echo "   Test that everything is working:"
echo "   ${YELLOW}npm run detect${NC}"
echo "   ${YELLOW}npm run auth verify${NC}"
echo ""

echo "3. ${GREEN}Send Your First SMS${NC}"
echo "   ${YELLOW}npm run sms send --to=441632960000 --message=\"Hello from Vonage!\"${NC}"
echo ""

echo "4. ${GREEN}Explore Features${NC}"
echo "   See available commands:"
echo "   ${YELLOW}npm run setup${NC} - Interactive setup guide"
echo "   ${YELLOW}npm run auth info${NC} - Get account information"
echo "   ${YELLOW}npm run report usage${NC} - Get usage statistics"
echo ""

echo "5. ${GREEN}Documentation${NC}"
echo "   - Quick Start: Open ${YELLOW}README.md${NC}"
echo "   - Full Docs: Open ${YELLOW}SKILL.md${NC}"
echo "   - Commands: Open ${YELLOW}QUICK_REFERENCE.md${NC}"
echo ""

echo "Support:"
echo "   - Vonage Docs: https://developer.vonage.com/"
echo "   - Dashboard: https://dashboard.vonage.com/"
echo "   - Support: https://support.vonage.com/"
echo ""

print_success "Installation finished successfully!"
echo ""
