#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for aicc-rag
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup({
  "pluginName": "aicc-rag",
  "env": [
    [
      "CHROMADB_HOST",
      "ChromaDB server host (default: localhost)"
    ],
    [
      "CHROMADB_PORT",
      "ChromaDB server port (default: 8000)"
    ],
    [
      "OPENAI_API_KEY",
      "OpenAI API key (for embeddings)"
    ]
  ]
});
