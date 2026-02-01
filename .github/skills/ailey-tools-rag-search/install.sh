#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   AI-ley RAG Search - Installation Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Check Node.js
echo -e "${YELLOW}→${NC} Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗${NC} Node.js 18+ required (found v$NODE_VERSION)"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# Check npm
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

# Create .env if needed
if [ ! -f .env ]; then
    echo -e "${YELLOW}→${NC} Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created"
    echo -e "${YELLOW}  ⚠  Edit .env and configure your credentials${NC}"
else
    echo -e "${BLUE}ℹ${NC} .env file already exists"
fi

# Verify build
echo -e "\n${YELLOW}→${NC} Verifying build..."
if [ -f "dist/index.js" ] && [ -f "dist/cli.js" ]; then
    echo -e "${GREEN}✓${NC} Build output verified"
else
    echo -e "${RED}✗${NC} Build output missing"
    exit 1
fi

# Check ChromaDB
echo -e "${YELLOW}→${NC} Checking ChromaDB..."
if command -v chroma &> /dev/null; then
    echo -e "${GREEN}✓${NC} ChromaDB CLI installed"
else
    echo -e "${YELLOW}⚠${NC} ChromaDB CLI not found"
    echo -e "${YELLOW}  Install with: pip install chromadb${NC}"
fi

# Success
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Next Steps:${NC}\n"

if ! command -v chroma &> /dev/null; then
    echo -e "${YELLOW}1.${NC} Install ChromaDB:"
    echo -e "   ${GREEN}pip install chromadb${NC}"
    echo -e ""
fi

echo -e "${YELLOW}2.${NC} Start ChromaDB server:"
echo -e "   ${GREEN}chroma run --path ./chromadb_data --port 8000${NC}"
echo -e ""

if ! grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${YELLOW}3.${NC} Configure .env file:"
    echo -e "   ${BLUE}CHROMADB_HOST=localhost${NC}"
    echo -e "   ${BLUE}CHROMADB_PORT=8000${NC}"
    echo -e "   ${BLUE}EMBEDDING_PROVIDER=openai${NC}"
    echo -e "   ${BLUE}OPENAI_API_KEY=sk-proj-...${NC}"
    echo -e ""
    echo -e "${YELLOW}4.${NC} Optional: Google grounding"
    echo -e "   ${BLUE}GOOGLE_API_KEY=AIza...${NC}"
    echo -e "   ${BLUE}GOOGLE_SEARCH_ENGINE_ID=abc123...${NC}"
    echo -e ""
fi

echo -e "${YELLOW}5.${NC} Verify installation:"
echo -e "   ${GREEN}npm run diagnose${NC}"
echo -e ""

echo -e "${YELLOW}6.${NC} List RAG collections:"
echo -e "   ${GREEN}npm run list${NC}"
echo -e ""

echo -e "${YELLOW}7.${NC} Search a collection:"
echo -e "   ${GREEN}npm run search -- -c \"collection-name\" -q \"your query\"${NC}"
echo -e ""

echo -e "${BLUE}Features:${NC}"
echo -e "  ${BLUE}•${NC} Semantic search with ChromaDB"
echo -e "  ${BLUE}•${NC} Multi-RAG joining with tag filters"
echo -e "  ${BLUE}•${NC} Google grounding for current info"
echo -e "  ${BLUE}•${NC} OpenAI, Cohere, HuggingFace embeddings"

echo -e "\n${BLUE}Integration:${NC}"
echo -e "  Create RAGs with: ${GREEN}ailey-tools-tag-n-rag${NC}"
echo -e "  Search RAGs with: ${GREEN}ailey-tools-rag-search${NC}"

echo -e "\n${BLUE}Documentation:${NC}"
echo -e "  ${BLUE}•${NC} Full docs: ${GREEN}cat SKILL.md${NC}"
echo -e "  ${BLUE}•${NC} Quick start: ${GREEN}cat README.md${NC}"
echo -e "  ${BLUE}•${NC} Commands: ${GREEN}cat QUICK_REFERENCE.md${NC}"

echo -e "\n${BLUE}Resources:${NC}"
echo -e "  ${BLUE}•${NC} ChromaDB: https://docs.trychroma.com/"
echo -e "  ${BLUE}•${NC} OpenAI: https://platform.openai.com/"
echo -e "  ${BLUE}•${NC} Google CSE: https://programmablesearchengine.google.com/"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
