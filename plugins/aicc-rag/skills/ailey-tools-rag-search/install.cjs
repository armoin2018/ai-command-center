#!/usr/bin/env node
const { install } = require('../../../_shared/install-utils');

install({
  name: 'AI-ley RAG Search Skill',
  nodeVersion: 18,
  npmInstall: true,
  build: true,
  envSetup: true,
  envVars: ['OPENAI_API_KEY', 'CHROMADB_HOST', 'CHROMADB_PORT', 'EMBEDDING_PROVIDER', 'GOOGLE_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID'],
  buildVerify: ['dist/index.js', 'dist/cli.js'],
  systemChecks: [['chroma', 'pip install chromadb']],
});
