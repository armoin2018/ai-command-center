import { ChromaClient, Collection, OpenAIEmbeddingFunction, CohereEmbeddingFunction } from 'chromadb';
import axios from 'axios';
import { OpenAI } from 'openai';

// Interfaces
export interface RAGSearchConfig {
  chromadb: {
    host?: string;
    port?: number;
    path?: string;
  };
  embedding: {
    provider: 'openai' | 'cohere' | 'huggingface';
    apiKey: string;
    model?: string;
  };
  google?: GoogleConfig;
  search?: {
    topK?: number;
    threshold?: number;
    reranking?: boolean;
  };
}

export interface GoogleConfig {
  apiKey?: string;
  searchEngineId?: string;
  serpApiKey?: string;
  resultsCount?: number;
}

export interface SearchOptions {
  collection: string;
  query: string;
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface JoinSearchOptions {
  collections: string[];
  query: string;
  topK?: number;
  mergeStrategy?: 'interleave' | 'score' | 'collection' | 'round-robin';
}

export interface TagSearchOptions {
  tags: string[];
  query: string;
  topK?: number;
  mergeStrategy?: 'interleave' | 'score' | 'collection' | 'round-robin';
}

export interface GroundedSearchOptions {
  collection?: string;
  collections?: string[];
  tags?: string[];
  query: string;
  topK?: number;
  webResults?: number;
  combineStrategy?: 'rag-first' | 'web-first' | 'interleave' | 'scored';
}

export interface WebSearchOptions {
  query: string;
  count?: number;
}

export interface EmbeddingSearchOptions {
  collection: string;
  embedding: number[];
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface BatchSearchOptions {
  collection: string;
  queries: string[];
  topK?: number;
}

export interface CacheConfig {
  ttl?: number;
  maxSize?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  source: string;
  distance: number;
}

export interface CollectionInfo {
  name: string;
  count: number;
  metadata: Record<string, any>;
  created?: string;
}

// Main RAG Search Client
export class RAGSearchClient {
  private client: ChromaClient;
  private embeddingFunction: any;
  private config: RAGSearchConfig;
  private googleConfig?: GoogleConfig;
  private cache: Map<string, { results: SearchResult[]; timestamp: number }>;
  private cacheConfig?: CacheConfig;

  constructor(config: RAGSearchConfig) {
    this.config = config;
    this.cache = new Map();

    // Initialize ChromaDB client
    const { host = 'localhost', port = 8000, path } = config.chromadb;
    
    if (path) {
      this.client = new ChromaClient({ path });
    } else {
      this.client = new ChromaClient({ host, port });
    }

    // Initialize embedding function
    this.initializeEmbedding();

    // Configure Google if provided
    if (config.google) {
      this.googleConfig = config.google;
    }
  }

  private initializeEmbedding(): void {
    const { provider, apiKey, model } = this.config.embedding;

    switch (provider) {
      case 'openai':
        this.embeddingFunction = new OpenAIEmbeddingFunction({
          openai_api_key: apiKey,
          openai_model: model || 'text-embedding-3-small'
        });
        break;
      case 'cohere':
        this.embeddingFunction = new CohereEmbeddingFunction({
          cohere_api_key: apiKey,
          model: model || 'embed-english-v3.0'
        });
        break;
      case 'huggingface':
        // HuggingFace requires custom implementation
        this.embeddingFunction = this.createHuggingFaceEmbedding(apiKey, model);
        break;
      default:
        throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  }

  private createHuggingFaceEmbedding(apiKey: string, model?: string) {
    return {
      generate: async (texts: string[]) => {
        const modelName = model || 'sentence-transformers/all-MiniLM-L6-v2';
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${modelName}`,
          { inputs: texts },
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        return response.data;
      }
    };
  }

  async connect(): Promise<void> {
    // Test connection
    await this.client.heartbeat();
  }

  async disconnect(): Promise<void> {
    // ChromaDB doesn't require explicit disconnect
  }

  // Collection Management
  async listCollections(): Promise<CollectionInfo[]> {
    const collections = await this.client.listCollections();
    
    const infos: CollectionInfo[] = [];
    for (const col of collections) {
      const count = await col.count();
      infos.push({
        name: col.name,
        count,
        metadata: col.metadata || {},
        created: col.metadata?.created
      });
    }
    
    return infos;
  }

  async getCollection(name: string): Promise<Collection> {
    return await this.client.getCollection({
      name,
      embeddingFunction: this.embeddingFunction
    });
  }

  async findCollectionsByTag(tag: string): Promise<CollectionInfo[]> {
    const allCollections = await this.listCollections();
    
    return allCollections.filter(col => {
      const tags = col.metadata.tags || [];
      return Array.isArray(tags) && tags.includes(tag);
    });
  }

  async findCollectionsByTags(tags: string[]): Promise<CollectionInfo[]> {
    const allCollections = await this.listCollections();
    
    return allCollections.filter(col => {
      const colTags = col.metadata.tags || [];
      return Array.isArray(colTags) && tags.some(tag => colTags.includes(tag));
    });
  }

  // Single Collection Search
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const {
      collection: collectionName,
      query,
      topK = this.config.search?.topK || 10,
      threshold = this.config.search?.threshold || 0.7,
      filter
    } = options;

    // Check cache
    const cacheKey = `${collectionName}:${query}:${topK}:${JSON.stringify(filter)}`;
    if (this.cacheConfig) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (this.cacheConfig.ttl || 3600) * 1000) {
        return cached.results;
      }
    }

    const collection = await this.getCollection(collectionName);
    
    const results = await collection.query({
      queryTexts: [query],
      nResults: topK,
      where: filter
    });

    const searchResults: SearchResult[] = [];
    
    if (results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances?.[0]?.[i] || 0;
        const score = 1 - distance; // Convert distance to similarity score
        
        if (score >= threshold) {
          searchResults.push({
            id: results.ids[0][i],
            content: results.documents?.[0]?.[i] || '',
            metadata: results.metadatas?.[0]?.[i] || {},
            score,
            distance,
            source: collectionName
          });
        }
      }
    }

    // Cache results
    if (this.cacheConfig) {
      this.cache.set(cacheKey, {
        results: searchResults,
        timestamp: Date.now()
      });

      // Enforce cache size limit
      if (this.cache.size > (this.cacheConfig.maxSize || 1000)) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }

    return searchResults;
  }

  async searchWithEmbedding(options: EmbeddingSearchOptions): Promise<SearchResult[]> {
    const {
      collection: collectionName,
      embedding,
      topK = 10,
      threshold = 0.7,
      filter
    } = options;

    const collection = await this.getCollection(collectionName);
    
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
      where: filter
    });

    const searchResults: SearchResult[] = [];
    
    if (results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances?.[0]?.[i] || 0;
        const score = 1 - distance;
        
        if (score >= threshold) {
          searchResults.push({
            id: results.ids[0][i],
            content: results.documents?.[0]?.[i] || '',
            metadata: results.metadatas?.[0]?.[i] || {},
            score,
            distance,
            source: collectionName
          });
        }
      }
    }

    return searchResults;
  }

  // Multi-Collection Search
  async joinSearch(options: JoinSearchOptions): Promise<SearchResult[]> {
    const {
      collections,
      query,
      topK = 10,
      mergeStrategy = 'interleave'
    } = options;

    // Search each collection
    const allResults = await Promise.all(
      collections.map(collectionName =>
        this.search({ collection: collectionName, query, topK })
      )
    );

    // Merge results based on strategy
    return this.mergeResults(allResults, mergeStrategy, topK);
  }

  async joinSearchByTags(options: TagSearchOptions): Promise<SearchResult[]> {
    const {
      tags,
      query,
      topK = 10,
      mergeStrategy = 'interleave'
    } = options;

    // Find collections with matching tags
    const collections = await this.findCollectionsByTags(tags);
    
    if (collections.length === 0) {
      return [];
    }

    // Search each collection
    const allResults = await Promise.all(
      collections.map(col =>
        this.search({ collection: col.name, query, topK })
      )
    );

    return this.mergeResults(allResults, mergeStrategy, topK);
  }

  private mergeResults(
    resultSets: SearchResult[][],
    strategy: 'interleave' | 'score' | 'collection' | 'round-robin',
    topK: number
  ): SearchResult[] {
    switch (strategy) {
      case 'score':
        // Flatten and sort by score
        return resultSets
          .flat()
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

      case 'interleave':
        // Alternate between collections
        const interleaved: SearchResult[] = [];
        const maxLen = Math.max(...resultSets.map(rs => rs.length));
        
        for (let i = 0; i < maxLen && interleaved.length < topK; i++) {
          for (const results of resultSets) {
            if (results[i] && interleaved.length < topK) {
              interleaved.push(results[i]);
            }
          }
        }
        
        return interleaved;

      case 'collection':
        // Group by collection, ordered by average score
        const byCollection = resultSets
          .map(results => ({
            results,
            avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
          }))
          .sort((a, b) => b.avgScore - a.avgScore);
        
        return byCollection
          .flatMap(group => group.results)
          .slice(0, topK);

      case 'round-robin':
        // Equal distribution
        const perCollection = Math.ceil(topK / resultSets.length);
        return resultSets
          .flatMap(results => results.slice(0, perCollection))
          .slice(0, topK);

      default:
        return resultSets.flat().slice(0, topK);
    }
  }

  // Google Grounding
  configureGoogle(config: GoogleConfig): void {
    this.googleConfig = { ...this.googleConfig, ...config };
  }

  async groundedSearch(options: GroundedSearchOptions): Promise<SearchResult[]> {
    const {
      collection,
      collections,
      tags,
      query,
      topK = 10,
      webResults = 5,
      combineStrategy = 'rag-first'
    } = options;

    // Get RAG results
    let ragResults: SearchResult[];
    
    if (collection) {
      ragResults = await this.search({ collection, query, topK });
    } else if (collections) {
      ragResults = await this.joinSearch({ collections, query, topK });
    } else if (tags) {
      ragResults = await this.joinSearchByTags({ tags, query, topK });
    } else {
      throw new Error('Must specify collection, collections, or tags');
    }

    // Get web results
    const webSearchResults = await this.webSearch({ query, count: webResults });

    // Combine based on strategy
    return this.combineResults(ragResults, webSearchResults, combineStrategy, topK + webResults);
  }

  async webSearch(options: WebSearchOptions): Promise<SearchResult[]> {
    const { query, count = 5 } = options;

    if (!this.googleConfig) {
      throw new Error('Google configuration not provided');
    }

    // Try SerpAPI first
    if (this.googleConfig.serpApiKey) {
      return await this.serpApiSearch(query, count);
    }

    // Fall back to Google Custom Search
    if (this.googleConfig.apiKey && this.googleConfig.searchEngineId) {
      return await this.googleCustomSearch(query, count);
    }

    throw new Error('No Google API credentials configured');
  }

  private async googleCustomSearch(query: string, count: number): Promise<SearchResult[]> {
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: this.googleConfig!.apiKey,
      cx: this.googleConfig!.searchEngineId,
      q: query,
      num: Math.min(count, 10)
    };

    const response = await axios.get(url, { params });
    
    return response.data.items?.map((item: any, index: number) => ({
      id: item.link,
      content: item.snippet || '',
      metadata: {
        title: item.title,
        url: item.link,
        displayUrl: item.displayLink
      },
      score: 1 - (index / count), // Decreasing score by position
      distance: index / count,
      source: 'web'
    })) || [];
  }

  private async serpApiSearch(query: string, count: number): Promise<SearchResult[]> {
    const url = 'https://serpapi.com/search';
    const params = {
      api_key: this.googleConfig!.serpApiKey,
      q: query,
      num: count,
      engine: 'google'
    };

    const response = await axios.get(url, { params });
    
    return response.data.organic_results?.map((item: any, index: number) => ({
      id: item.link,
      content: item.snippet || '',
      metadata: {
        title: item.title,
        url: item.link,
        displayUrl: item.displayed_link,
        position: item.position
      },
      score: 1 - (index / count),
      distance: index / count,
      source: 'web'
    })) || [];
  }

  private combineResults(
    ragResults: SearchResult[],
    webResults: SearchResult[],
    strategy: 'rag-first' | 'web-first' | 'interleave' | 'scored',
    limit: number
  ): SearchResult[] {
    switch (strategy) {
      case 'rag-first':
        return [...ragResults, ...webResults].slice(0, limit);

      case 'web-first':
        return [...webResults, ...ragResults].slice(0, limit);

      case 'interleave':
        const interleaved: SearchResult[] = [];
        const maxLen = Math.max(ragResults.length, webResults.length);
        
        for (let i = 0; i < maxLen && interleaved.length < limit; i++) {
          if (ragResults[i]) interleaved.push(ragResults[i]);
          if (webResults[i] && interleaved.length < limit) {
            interleaved.push(webResults[i]);
          }
        }
        
        return interleaved;

      case 'scored':
        return [...ragResults, ...webResults]
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

      default:
        return [...ragResults, ...webResults].slice(0, limit);
    }
  }

  // Advanced Features
  async rerank(results: SearchResult[], query: string, topK: number): Promise<SearchResult[]> {
    // Simple reranking based on keyword matching
    // In production, use a cross-encoder model
    const keywords = query.toLowerCase().split(/\s+/);
    
    const reranked = results.map(result => {
      const content = result.content.toLowerCase();
      const matches = keywords.filter(kw => content.includes(kw)).length;
      const rerankScore = (result.score * 0.7) + (matches / keywords.length * 0.3);
      
      return { ...result, score: rerankScore };
    });

    return reranked
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async batchSearch(options: BatchSearchOptions): Promise<SearchResult[][]> {
    const { collection, queries, topK = 10 } = options;

    return await Promise.all(
      queries.map(query => this.search({ collection, query, topK }))
    );
  }

  async embed(text: string): Promise<number[]> {
    if (this.config.embedding.provider === 'openai') {
      const openai = new OpenAI({ apiKey: this.config.embedding.apiKey });
      const response = await openai.embeddings.create({
        model: this.config.embedding.model || 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    }

    // For other providers, use the embedding function
    const embeddings = await this.embeddingFunction.generate([text]);
    return embeddings[0];
  }

  // Utilities
  enableCache(config: CacheConfig): void {
    this.cacheConfig = config;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig?.maxSize || 0,
      ttl: this.cacheConfig?.ttl || 0
    };
  }
}
