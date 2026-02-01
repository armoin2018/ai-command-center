/**
 * Type definitions for AI-ley kit optimization
 */

export type ResourceType = 'instruction' | 'persona' | 'agent' | 'skill' | 'prompt';

export interface FrontmatterSchema {
  id?: string;
  name: string;
  description: string;
  keywords?: string[];
  tools?: string[];
  agent?: string;
  skills?: string[];
  [key: string]: any;
}

export interface FooterSchema {
  version: string;
  updated: string;
  reviewed: string;
  score: number;
}

export interface QualityMetrics {
  clarity: number;
  conciseness: number;
  accuracy: number;
  referenceMaterial: number;
  sufficiency: number;
  noConjunctions: number;
  noSoftLanguage: number;
  noRepetition: number;
  validFilePointers: number;
  validVariablePointers: number;
  overall: number;
}

export interface OptimizationResult {
  filePath: string;
  resourceType: ResourceType;
  originalSize: number;
  optimizedSize: number;
  changes: string[];
  qualityScore: number;
  success: boolean;
  error?: string;
}

export interface FileContent {
  frontmatter: FrontmatterSchema;
  body: string;
  footer: FooterSchema;
  metadata?: {
    duplicateFootersRemoved?: number;
  };
}

export interface ProcessingOptions {
  dryRun?: boolean;
  targetLines?: number;
  extractCode?: boolean;
  extractExamples?: boolean;
  aiReview?: boolean;
  verbose?: boolean;
}
