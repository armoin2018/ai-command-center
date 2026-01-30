/**
 * Footer normalizer for AI-ley kit resources
 */

import type { FooterSchema } from './types.js';

export class FooterNormalizer {
  /**
   * Normalize footer with version, dates, and score
   */
  normalize(footer: any): FooterSchema {
    const today = new Date().toISOString().split('T')[0];

    return {
      version: footer.version || '1.0.0',
      updated: today,
      reviewed: footer.reviewed || today,
      score: this.normalizeScore(footer.score)
    };
  }

  /**
   * Normalize score to 0.0-5.0 range
   */
  private normalizeScore(score: any): number {
    if (typeof score === 'number') {
      return Math.max(0, Math.min(5, Math.round(score * 10) / 10));
    }
    return 3.0;
  }

  /**
   * Validate footer completeness
   */
  validate(footer: FooterSchema): string[] {
    const errors: string[] = [];

    if (!footer.version || !/^\d+\.\d+\.\d+$/.test(footer.version)) {
      errors.push('Invalid version format (expected X.Y.Z)');
    }
    if (!footer.updated || !/^\d{4}-\d{2}-\d{2}$/.test(footer.updated)) {
      errors.push('Invalid updated date format (expected YYYY-MM-DD)');
    }
    if (!footer.reviewed || !/^\d{4}-\d{2}-\d{2}$/.test(footer.reviewed)) {
      errors.push('Invalid reviewed date format (expected YYYY-MM-DD)');
    }
    if (typeof footer.score !== 'number' || footer.score < 0 || footer.score > 5) {
      errors.push('Invalid score (expected 0.0-5.0)');
    }

    return errors;
  }
}
