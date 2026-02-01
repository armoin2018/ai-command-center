/**
 * SEO Scoring Engine
 * Calculates scores for various SEO aspects on a 0-100 scale
 */

import type {
  PageData,
  TechnicalSEOData,
  PerformanceData,
  ContentAnalysis,
  SEOScores,
  ScoreBreakdown,
} from '../types.js';

export class SEOScorer {
  /**
   * Calculate overall SEO score and breakdown
   */
  calculateOverallScore(
    pages: PageData[],
    technical: TechnicalSEOData,
    performance: PerformanceData,
    content: ContentAnalysis
  ): SEOScores {
    const breakdown: ScoreBreakdown = {
      // Technical SEO (25% weight)
      crawlability: this.scoreCrawlabilityFromData(technical),
      siteSpeed: performance.pageSpeed.desktop,
      mobileOptimization: performance.lighthouse.accessibilityScore,
      schemaImplementation: this.scoreSchemaImplementation(pages),
      
      // Content (30% weight)
      titleOptimization: this.scoreTitleOptimizationFromData(content.titleOptimization),
      metaDescriptionQuality: this.scoreMetaDescription(content.metaDescriptionOptimization),
      contentQuality: this.scoreContentQualityFromData(content.contentQuality),
      keywordOptimization: this.scoreKeywordOptimization(content.keywordAnalysis),
      imageOptimization: this.scoreImageOptimization(content.imageOptimization),
      
      // Performance (25% weight)
      pageSpeed: performance.lighthouse.performanceScore,
      userExperience: performance.lighthouse.bestPracticesScore,
      accessibility: performance.lighthouse.accessibilityScore,
      mobileUsability: this.scoreMobileUsability(performance),
      
      // Authority (20% weight)
      domainAuthority: 0, // Placeholder - requires external API
      backlinkQuality: 0, // Placeholder
      brandMentions: 0, // Placeholder
    };

    const technicalScore = this.calculateCategoryScore([
      breakdown.crawlability,
      breakdown.siteSpeed,
      breakdown.mobileOptimization,
      breakdown.schemaImplementation,
    ]);

    const contentScore = this.calculateCategoryScore([
      breakdown.titleOptimization,
      breakdown.metaDescriptionQuality,
      breakdown.contentQuality,
      breakdown.keywordOptimization,
      breakdown.imageOptimization,
    ]);

    const performanceScore = this.calculateCategoryScore([
      breakdown.pageSpeed,
      breakdown.userExperience,
      breakdown.accessibility,
      breakdown.mobileUsability,
    ]);

    const authorityScore = this.calculateCategoryScore([
      breakdown.domainAuthority,
      breakdown.backlinkQuality,
      breakdown.brandMentions,
    ]);

    const overall = Math.round(
      technicalScore * 0.25 +
      contentScore * 0.30 +
      performanceScore * 0.25 +
      authorityScore * 0.20
    );

    return {
      overall,
      technical: technicalScore,
      content: contentScore,
      performance: performanceScore,
      ux: breakdown.userExperience,
      authority: authorityScore,
      breakdown,
    };
  }

  private calculateCategoryScore(scores: number[]): number {
    const validScores = scores.filter(s => s > 0);
    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }

  // Public scoring methods for testing
  public scoreCrawlability(
    httpsEnabled: boolean,
    robotsTxtValid: boolean,
    sitemapValid: boolean,
    brokenLinksCount: number
  ): number {
    let score = 100;
    if (!httpsEnabled) score -= 20;
    if (!robotsTxtValid) score -= 10;
    if (!sitemapValid) score -= 15;
    score -= Math.min(brokenLinksCount * 5, 25);
    return Math.max(0, score);
  }

  public scoreTitleOptimization(length: number, keywordPresent: boolean): number {
    let score = 0;
    
    // Length scoring (0-60)
    if (length >= 30 && length <= 60) {
      score += 60;
    } else if (length < 30) {
      score += Math.round((length / 30) * 40); // Scale 0-30 to 0-40
    } else {
      score += Math.round(Math.max(0, 60 - (length - 60) * 2)); // Deduct 2 points per char over 60
    }
    
    // Keyword presence (40 points)
    if (keywordPresent) {
      score += 40;
    }
    
    return Math.min(100, score);
  }

  public scoreContentQuality(
    wordCount: number,
    readability: number,
    hasDuplicateContent: boolean
  ): number {
    let score = 0;
    
    // Word count (40 points)
    if (wordCount >= 1000) {
      score += 40;
    } else if (wordCount >= 500) {
      score += 30;
    } else if (wordCount >= 300) {
      score += 20;
    } else {
      score += Math.round((wordCount / 300) * 20);
    }
    
    // Readability (40 points)
    score += Math.round((readability / 100) * 40);
    
    // Duplicate content penalty (20 points)
    if (!hasDuplicateContent) {
      score += 20;
    }
    
    return Math.min(100, score);
  }

  public getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  public getScoreInterpretation(score: number): string {
    if (score >= 90) return 'Excellent - Site is well optimized';
    if (score >= 80) return 'Good - Minor improvements needed';
    if (score >= 70) return 'Fair - Several areas need attention';
    if (score >= 60) return 'Poor - Significant improvements required';
    return 'Critical - Major SEO issues detected';
  }

  private scoreCrawlabilityFromData(technical: TechnicalSEOData): number {
    let score = 100;
    
    // Deduct for issues
    if (!technical.sitemapValid) score -= 15;
    if (!technical.robotsTxtExists) score -= 10;
    if (technical.crawlErrors && technical.crawlErrors.length > 0) {
      score -= Math.min(technical.crawlErrors.length * 2, 30);
    }
    if (technical.brokenLinks.length > 0) {
      score -= Math.min(technical.brokenLinks.length, 20);
    }
    if (technical.indexability !== 'indexable') score -= 20;
    
    return Math.max(0, score);
  }

  private scoreSchemaImplementation(pages: PageData[]): number {
    const pagesWithSchema = pages.filter(p => p.schemaMarkup.length > 0).length;
    const percentage = (pagesWithSchema / pages.length) * 100;
    
    if (percentage >= 80) return 100;
    if (percentage >= 60) return 85;
    if (percentage >= 40) return 70;
    if (percentage >= 20) return 50;
    return Math.round(percentage * 2); // Scale 0-20% to 0-40 score
  }

  private scoreTitleOptimizationFromData(title: any): number {
    let score = 100;
    
    if (!title.optimal) score -= 20;
    if (!title.hasKeywords) score -= 30;
    if (!title.isUnique) score -= 25;
    if (title.length < 30 || title.length > 60) score -= 15;
    
    return Math.max(0, score);
  }

  private scoreMetaDescription(meta: any): number {
    let score = 100;
    
    if (!meta.optimal) score -= 20;
    if (!meta.hasKeywords) score -= 25;
    if (!meta.isUnique) score -= 20;
    if (meta.ctrPotential === 'low') score -= 20;
    if (meta.ctrPotential === 'medium') score -= 10;
    
    return Math.max(0, score);
  }

  private scoreContentQualityFromData(content: any): number {
    let score = 100;
    
    if (content.wordCount < 300) score -= 40;
    else if (content.wordCount < 600) score -= 20;
    else if (content.wordCount < 1000) score -= 10;
    
    if (content.readabilityScore < 40) score -= 20;
    else if (content.readabilityScore < 60) score -= 10;
    
    if (content.topicalDepth === 'shallow') score -= 25;
    else if (content.topicalDepth === 'moderate') score -= 10;
    
    if (content.engagement === 'low') score -= 15;
    
    return Math.max(0, score);
  }

  private scoreKeywordOptimization(keywords: any): number {
    let score = 100;
    const placement = keywords.keywordPlacement;
    
    if (!placement.inTitle) score -= 25;
    if (!placement.inMetaDescription) score -= 15;
    if (!placement.inH1) score -= 20;
    if (!placement.inUrl) score -= 10;
    if (!placement.inFirstParagraph) score -= 10;
    if (!placement.inAltTags) score -= 10;
    
    return Math.max(0, score);
  }

  private scoreImageOptimization(images: any): number {
    if (images.totalImages === 0) return 100;
    
    let score = 100;
    const missingAltPercent = (images.missingAltTags / images.totalImages) * 100;
    const oversizedPercent = (images.oversizedImages / images.totalImages) * 100;
    
    score -= missingAltPercent * 0.5; // Deduct up to 50 points
    score -= oversizedPercent * 0.3; // Deduct up to 30 points
    
    if (!images.lazyLoadingEnabled) score -= 10;
    if (!images.nextGenFormats) score -= 10;
    
    return Math.max(0, Math.round(score));
  }

  private scoreMobileUsability(performance: PerformanceData): number {
    const cwv = performance.coreWebVitals;
    let score = 100;
    
    // LCP scoring (target < 2.5s)
    if (cwv.lcp > 4.0) score -= 30;
    else if (cwv.lcp > 2.5) score -= 15;
    
    // CLS scoring (target < 0.1)
    if (cwv.cls > 0.25) score -= 30;
    else if (cwv.cls > 0.1) score -= 15;
    
    // FID scoring (target < 100ms)
    if (cwv.fid > 300) score -= 20;
    else if (cwv.fid > 100) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Convert score to letter grade
   */
  getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get score interpretation
   */
  getScoreInterpretation(score: number): string {
    if (score >= 90) return 'Excellent - SEO is well optimized';
    if (score >= 80) return 'Good - Minor improvements needed';
    if (score >= 70) return 'Fair - Several optimization opportunities';
    if (score >= 60) return 'Needs Improvement - Significant work required';
    return 'Poor - Major SEO issues need immediate attention';
  }
}
