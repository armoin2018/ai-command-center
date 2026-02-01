/**
 * AI-powered quality reviewer for AI-ley kit resources
 */

import type { QualityMetrics } from './types.js';

export class AIReviewer {
  /**
   * Review content for quality metrics
   */
  async review(content: string, filePath?: string): Promise<QualityMetrics> {
    return {
      clarity: this.assessClarity(content),
      conciseness: this.assessConciseness(content),
      accuracy: this.assessAccuracy(content),
      referenceMaterial: this.assessReferences(content),
      sufficiency: this.assessSufficiency(content),
      noConjunctions: this.assessConjunctions(content),
      noSoftLanguage: this.assessSoftLanguage(content),
      noRepetition: this.assessRepetition(content),
      validFilePointers: filePath ? await this.assessFilePointers(content, filePath) : 5.0,
      validVariablePointers: this.assessVariablePointers(content),
      overall: 0 // Calculated below
    };
  }

  /**
   * Calculate overall quality score
   */
  calculateOverall(metrics: QualityMetrics): number {
    const weights = {
      clarity: 0.15,
      conciseness: 0.10,
      accuracy: 0.20,
      referenceMaterial: 0.10,
      sufficiency: 0.10,
      noConjunctions: 0.05,
      noSoftLanguage: 0.10,
      noRepetition: 0.10,
      validFilePointers: 0.05,
      validVariablePointers: 0.05
    };

    const overall = 
      metrics.clarity * weights.clarity +
      metrics.conciseness * weights.conciseness +
      metrics.accuracy * weights.accuracy +
      metrics.referenceMaterial * weights.referenceMaterial +
      metrics.sufficiency * weights.sufficiency +
      metrics.noConjunctions * weights.noConjunctions +
      metrics.noSoftLanguage * weights.noSoftLanguage +
      metrics.noRepetition * weights.noRepetition +
      metrics.validFilePointers * weights.validFilePointers +
      metrics.validVariablePointers * weights.validVariablePointers;

    return Math.round(overall * 10) / 10;
  }

  /**
   * Assess clarity (0.0-5.0)
   */
  private assessClarity(content: string): number {
    let score = 5.0;

    // Deduct for unclear headings
    const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
    const unclearHeadings = headings.filter(h => h.length < 10 || h.length > 100);
    score -= unclearHeadings.length * 0.1;

    // Deduct for long paragraphs (>200 words)
    const paragraphs = content.split('\n\n');
    const longParagraphs = paragraphs.filter(p => p.split(' ').length > 200);
    score -= longParagraphs.length * 0.2;

    // Deduct for jargon without explanation
    const jargonTerms = ['MCP', 'SDK', 'API', 'CLI', 'CRUD'];
    const jargonCount = jargonTerms.filter(term => 
      content.includes(term) && !content.includes(`${term}:`) && !content.includes(`${term} (`)
    ).length;
    score -= jargonCount * 0.1;

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess conciseness (0.0-5.0)
   */
  private assessConciseness(content: string): number {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).length;

    // Target: <= 300 lines
    let score = 5.0;
    if (lines > 300) {
      score -= Math.min(2.0, (lines - 300) / 100);
    }

    // Deduct for redundancy
    const sentences = content.split(/[.!?]+/);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    const redundancyRatio = 1 - (uniqueSentences.size / sentences.length);
    score -= redundancyRatio * 2.0;

    // Deduct for wordy phrases
    const wordyPhrases = [
      'in order to',
      'due to the fact that',
      'at this point in time',
      'for the purpose of'
    ];
    const wordyCount = wordyPhrases.filter(phrase => 
      content.toLowerCase().includes(phrase)
    ).length;
    score -= wordyCount * 0.2;

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess accuracy (0.0-5.0)
   */
  private assessAccuracy(content: string): number {
    let score = 5.0;

    // Deduct for broken links
    const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    const internalLinks = links.filter(l => l.includes('](./') || l.includes('](../'));
    // Note: Can't check broken links without file system access
    // This is a placeholder for more sophisticated checking

    // Deduct for inconsistent terminology
    const terms: Record<string, string[]> = {
      'AI-ley': ['ailey', 'AILEY', 'ai-ley'],
      'TypeScript': ['typescript', 'Typescript'],
      'MCP': ['mcp', 'Mcp']
    };

    for (const [correct, variants] of Object.entries(terms)) {
      for (const variant of variants) {
        if (content.includes(variant)) {
          score -= 0.2;
        }
      }
    }

    // Deduct for vague language
    const vagueTerms = ['might', 'maybe', 'probably', 'perhaps', 'could be'];
    const vagueCount = vagueTerms.filter(term => 
      content.toLowerCase().includes(term)
    ).length;
    score -= vagueCount * 0.1;

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess reference material (0.0-5.0)
   */
  private assessReferences(content: string): number {
    let score = 3.0; // Baseline

    // Award for citations
    const citations = content.match(/\[([^\]]+)\]\([^)]+\)/g) || [];
    score += Math.min(1.0, citations.length * 0.1);

    // Award for code examples
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    score += Math.min(1.0, codeBlocks.length * 0.2);

    // Award for structured data (tables, lists)
    const tables = content.match(/\|.*\|/g) || [];
    score += Math.min(0.5, tables.length * 0.05);

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess sufficiency (0.0-5.0)
   */
  private assessSufficiency(content: string): number {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).length;

    let score = 3.0;

    // Award for adequate length
    if (lines >= 50 && lines <= 300) score += 1.0;
    if (words >= 500 && words <= 3000) score += 1.0;

    // Award for structure
    const headings = content.match(/^#{1,6}\s+/gm) || [];
    if (headings.length >= 3) score += 0.5;

    // Award for examples
    if (content.toLowerCase().includes('example')) score += 0.5;

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess use of conjunctions (0.0-5.0)
   * Higher score = fewer problematic conjunctions
   */
  private assessConjunctions(content: string): number {
    const problematicConjunctions = [
      'and/or',
      'but also',
      'as well as'
    ];

    let count = 0;
    for (const conjunction of problematicConjunctions) {
      const regex = new RegExp(conjunction, 'gi');
      const matches = content.match(regex);
      if (matches) count += matches.length;
    }

    // Deduct 0.5 per occurrence
    return Math.max(0, 5.0 - (count * 0.5));
  }

  /**
   * Assess soft language usage (0.0-5.0)
   * Must > Should > Can hierarchy
   * Higher score = more decisive language
   */
  private assessSoftLanguage(content: string): number {
    let score = 5.0;

    // Count soft language by priority
    const softLanguage = {
      can: /\bcan\b/gi,
      could: /\bcould\b/gi,
      may: /\bmay\b/gi,
      might: /\bmight\b/gi,
      should: /\bshould\b/gi,
      would: /\bwould\b/gi
    };

    const imperative = {
      must: /\bmust\b/gi,
      shall: /\bshall\b/gi,
      will: /\bwill\b/gi
    };

    let softCount = 0;
    for (const [_, regex] of Object.entries(softLanguage)) {
      const matches = content.match(regex);
      if (matches) softCount += matches.length;
    }

    let strongCount = 0;
    for (const [_, regex] of Object.entries(imperative)) {
      const matches = content.match(regex);
      if (matches) strongCount += matches.length;
    }

    // Ideal: More strong language than soft
    const ratio = strongCount / Math.max(1, softCount + strongCount);
    
    // Deduct based on soft language prevalence
    if (ratio < 0.3) score -= 2.0; // Too much soft language
    else if (ratio < 0.5) score -= 1.0;
    else if (ratio < 0.7) score -= 0.5;

    // Additional deduction for excessive soft language count
    if (softCount > 20) score -= 1.0;
    else if (softCount > 10) score -= 0.5;

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess repetition (0.0-5.0)
   * Higher score = less repetition
   */
  private assessRepetition(content: string): number {
    let score = 5.0;

    // Check for repeated sentences (exact matches)
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 20); // Only sentences with substance

    const sentenceSet = new Set(sentences);
    const repetitionRate = 1 - (sentenceSet.size / Math.max(1, sentences.length));
    score -= repetitionRate * 3.0;

    // Check for repeated phrases (3+ words)
    const words = content.toLowerCase().split(/\s+/);
    const phrases = new Map<string, number>();
    
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
    }

    // Count phrases that appear more than once
    let repeatedPhrases = 0;
    for (const count of phrases.values()) {
      if (count > 1) repeatedPhrases++;
    }

    // Deduct for excessive phrase repetition
    if (repeatedPhrases > 20) score -= 1.5;
    else if (repeatedPhrases > 10) score -= 1.0;
    else if (repeatedPhrases > 5) score -= 0.5;

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess file pointer validity (0.0-5.0)
   * Checks for valid file references
   */
  private async assessFilePointers(content: string, basePath: string): Promise<number> {
    let score = 5.0;

    // Extract file references
    const fileReferences = [
      ...Array.from(content.matchAll(/`([^`]+\.(md|ts|js|json|yaml|yml|sh|py))`/g)),
      ...Array.from(content.matchAll(/\[([^\]]+)\]\(([^)]+\.(md|ts|js|json|yaml|yml|sh|py))\)/g))
    ];

    if (fileReferences.length === 0) return 5.0; // No references to validate

    let invalidCount = 0;
    const { existsSync } = await import('fs');
    const { resolve, dirname } = await import('path');

    for (const match of fileReferences) {
      const filePath = match[2] || match[1];
      
      // Skip URLs
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) continue;
      
      // Skip variables
      if (filePath.includes('{{') || filePath.includes('${')) continue;

      try {
        const fullPath = resolve(dirname(basePath), filePath);
        if (!existsSync(fullPath)) {
          invalidCount++;
        }
      } catch {
        invalidCount++;
      }
    }

    // Deduct 0.5 per invalid reference
    score -= invalidCount * 0.5;

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Assess variable pointer validity (0.0-5.0)
   * Checks for valid mustache/template variables
   */
  private assessVariablePointers(content: string): number {
    let score = 5.0;

    // Extract mustache variables
    const mustacheVars = content.matchAll(/\{\{([^}]+)\}\}/g);
    const templateVars = content.matchAll(/\$\{([^}]+)\}/g);

    const commonVars = [
      'folders.plan', 'folders.personas', 'folders.instructions',
      'files.requirements', 'files.plan', 'files.health-check', 'files.suggestions',
      'project_name', 'iso_date', 'baseFileName'
    ];

    let invalidCount = 0;

    for (const match of mustacheVars) {
      const varName = match[1].trim();
      
      // Check if it's a known variable or follows expected pattern
      const isValid = 
        commonVars.includes(varName) ||
        varName.startsWith('folders.') ||
        varName.startsWith('files.') ||
        varName.startsWith('indexes.');
      
      if (!isValid) {
        invalidCount++;
      }
    }

    for (const match of templateVars) {
      const varName = match[1].trim();
      
      // Template variables are more flexible
      // Only flag if they look malformed
      if (varName.length === 0 || varName.includes('{{')) {
        invalidCount++;
      }
    }

    // Deduct 0.3 per invalid variable
    score -= invalidCount * 0.3;

    return Math.max(0, Math.min(5, score));
  }
}
