#!/bin/bash

###############################################################################
# WordPress Integration for AI-ley - Installation Script
# 
# This script sets up the WordPress integration skill for AI-ley
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
print_header "WordPress Integration Installation"

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
        print_warning "Edit .env with your WordPress credentials:"
        print_warning "  For WordPress.com:"
        print_warning "    WORDPRESS_COM_CLIENT_ID=your_id"
        print_warning "    WORDPRESS_COM_CLIENT_SECRET=your_secret"
        print_warning "  For Self-Hosted:"
        print_warning "    WORDPRESS_SITE_URL=https://example.com"
        print_warning "    WORDPRESS_APP_USERNAME=admin"
        print_warning "    WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx"
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
if [ -z "$WORDPRESS_COM_CLIENT_ID" ] && [ -z "$WORDPRESS_SITE_URL" ]; then
    print_warning "WordPress credentials not set in environment"
else
    print_success "WordPress credentials found"
fi

# Try to detect account tier if credentials are available
if [ -n "$WORDPRESS_COM_CLIENT_ID" ] || [ -n "$WORDPRESS_SITE_URL" ]; then
    echo ""
    print_info "Testing WordPress connection..."
    
    if npm run detect 2>/dev/null; then
        print_success "WordPress connection verified"
    else
        print_warning "Could not verify connection - ensure .env is configured"
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
echo "   Edit .env with your WordPress credentials:"
echo ""
echo "   ${YELLOW}For WordPress.com:${NC}"
echo "   1. Visit https://developer.wordpress.com/apps/"
echo "   2. Create new OAuth application"
echo "   3. Copy Client ID and Client Secret"
echo "   4. Edit .env:"
echo "      ${YELLOW}nano .env${NC}"
echo "      WORDPRESS_COM_CLIENT_ID=your_id"
echo "      WORDPRESS_COM_CLIENT_SECRET=your_secret"
echo ""
echo "   ${YELLOW}For Self-Hosted WordPress:${NC}"
echo "   1. Log in to WordPress admin"
echo "   2. Go to Users → Your Profile"
echo "   3. Generate Application Password"
echo "   4. Edit .env:"
echo "      ${YELLOW}nano .env${NC}"
echo "      WORDPRESS_SITE_URL=https://example.com"
echo "      WORDPRESS_APP_USERNAME=admin"
echo "      WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx"
echo ""

echo "2. ${GREEN}Verify Setup${NC}"
echo "   ${YELLOW}npm run detect${NC} - Detect account tier"
echo "   ${YELLOW}npm run auth verify${NC} - Verify credentials"
echo ""

echo "3. ${GREEN}Manage Your Site${NC}"
echo "   ${YELLOW}npm run post list${NC} - List posts"
echo "   ${YELLOW}npm run post create${NC} - Create post"
echo "   ${YELLOW}npm run user list${NC} - List users"
echo "   ${YELLOW}npm run comment list${NC} - List comments"
echo ""

echo "4. ${GREEN}Explore Features${NC}"
echo "   - Quick Start: Open ${YELLOW}README.md${NC}"
echo "   - All Commands: Open ${YELLOW}QUICK_REFERENCE.md${NC}"
echo "   - Full Docs: Open ${YELLOW}SKILL.md${NC}"
echo ""

echo "Support & Resources:"
echo "   - WordPress.com: https://wordpress.com/"
echo "   - Developer Docs: https://developer.wordpress.org/rest-api/"
echo "   - OAuth Apps: https://developer.wordpress.com/apps/"
echo "   - Support: https://support.wordpress.com/"
echo ""

print_success "Installation finished successfully!"
echo ""
