/**
 * Markdown Report Generator
 * Creates clean, readable Markdown reports
 */

import { promises as fs } from 'fs';
import type { SEOReport } from '../types.js';

export class MarkdownReportGenerator {
  async generate(report: SEOReport, outputPath: string): Promise<void> {
    const markdown = this.createMarkdown(report);
    await fs.writeFile(outputPath, markdown, 'utf-8');
  }

  private createMarkdown(report: SEOReport): string {
    let md = '';
    
    md += this.renderHeader(report);
    md += this.renderExecutiveSummary(report);
    md += this.renderScoresOverview(report);
    md += this.renderTechnicalAnalysis(report);
    md += this.renderContentAnalysis(report);
    md += this.renderPerformanceAnalysis(report);
    md += this.renderRecommendations(report);
    md += this.renderRoadmap(report);
    md += this.renderFooter(report);
    
    return md;
  }

  private renderHeader(report: SEOReport): string {
    return `# SEO Audit Report

**Domain:** ${report.metadata.domain}  
**Generated:** ${report.metadata.generatedAt.toLocaleDateString()}  
**Pages Analyzed:** ${report.metadata.pagesAnalyzed}  
**Analysis Version:** ${report.metadata.analysisVersion}

---

`;
  }

  private renderExecutiveSummary(report: SEOReport): string {
    const { executiveSummary: summary } = report;
    
    let md = `## Executive Summary\n\n`;
    md += `### Overall Health Score: ${summary.overallHealthScore}/100 (Grade: ${summary.healthGrade})\n\n`;
    
    if (summary.criticalIssues.length > 0) {
      md += `### ⚠️ Critical Issues Requiring Immediate Attention\n\n`;
      summary.criticalIssues.forEach(issue => {
        md += `- ${issue}\n`;
      });
      md += '\n';
    }
    
    if (summary.quickWins.length > 0) {
      md += `### 🎯 Quick Wins for Immediate Improvement\n\n`;
      summary.quickWins.forEach(win => {
        md += `- ${win}\n`;
      });
      md += '\n';
    }
    
    md += `### Key Metrics\n\n`;
    md += `- **Strengths:** ${summary.strengths.join(', ')}\n`;
    md += `- **Weaknesses:** ${summary.weaknesses.join(', ')}\n`;
    md += `- **Estimated Monthly Organic Traffic:** ${summary.estimatedMonthlyTraffic.toLocaleString()}\n`;
    md += `- **Potential Traffic Increase:** ${summary.potentialTrafficIncrease}%\n\n`;
    
    return md;
  }

  private renderScoresOverview(report: SEOReport): string {
    const { scores } = report;
    
    let md = `## SEO Score Breakdown\n\n`;
    md += `| Category | Score | Grade | Status |\n`;
    md += `|----------|-------|-------|--------|\n`;
    md += `| Technical SEO | ${scores.technical} | ${this.getGrade(scores.technical)} | ${scores.technicalInsight} |\n`;
    md += `| Content Quality | ${scores.content} | ${this.getGrade(scores.content)} | ${scores.contentInsight} |\n`;
    md += `| Performance | ${scores.performance} | ${this.getGrade(scores.performance)} | ${scores.performanceInsight} |\n`;
    md += `| User Experience | ${scores.ux} | ${this.getGrade(scores.ux)} | ${scores.uxInsight} |\n`;
    md += `| Authority | ${scores.authority} | ${this.getGrade(scores.authority)} | ${scores.authorityInsight} |\n`;
    md += `| **Overall** | **${scores.overall}** | **${this.getGrade(scores.overall)}** | - |\n\n`;
    
    return md;
  }

  private renderTechnicalAnalysis(report: SEOReport): string {
    const tech = report.technicalSEO;
    
    let md = `## Technical SEO Analysis\n\n`;
    md += `### Core Technical Elements\n\n`;
    md += `| Element | Status | Details |\n`;
    md += `|---------|--------|----------|\n`;
    md += `| HTTPS | ${tech.httpsEnabled ? '✅' : '❌'} | ${tech.httpsEnabled ? 'Enabled' : 'Not enabled'} |\n`;
    md += `| Robots.txt | ${tech.robotsTxtExists ? '✅' : '❌'} | ${tech.robotsTxtValid ? 'Valid' : 'Invalid or missing'} |\n`;
    md += `| XML Sitemap | ${tech.sitemapValid ? '✅' : '❌'} | ${tech.sitemapUrls} URLs |\n`;
    md += `| Canonical Tags | ${tech.canonicalTagsPresent ? '✅' : '❌'} | ${tech.canonicalTagsValid} valid |\n`;
    md += `| Broken Links | ${tech.brokenLinks.length === 0 ? '✅' : '⚠️'} | ${tech.brokenLinks.length} found |\n`;
    md += `| Mobile Friendly | ${tech.mobileFriendly ? '✅' : '❌'} | ${tech.responsiveDesign ? 'Responsive' : 'Not responsive'} |\n\n`;
    
    if (tech.brokenLinks.length > 0) {
      md += `### Broken Links\n\n`;
      tech.brokenLinks.slice(0, 10).forEach(link => {
        md += `- ${link}\n`;
      });
      if (tech.brokenLinks.length > 10) {
        md += `- ... and ${tech.brokenLinks.length - 10} more\n`;
      }
      md += '\n';
    }
    
    if (tech.structuredData.length > 0) {
      md += `### Structured Data (Schema.org)\n\n`;
      tech.structuredData.forEach(schema => {
        md += `- **${schema.type}**: ${schema.valid ? '✅ Valid' : '❌ Invalid'}\n`;
      });
      md += '\n';
    }
    
    return md;
  }

  private renderContentAnalysis(report: SEOReport): string {
    const content = report.contentAnalysis;
    
    let md = `## Content Analysis\n\n`;
    
    md += `### Title Tag Optimization\n\n`;
    md += `- **Title:** ${content.titleOptimization.title}\n`;
    md += `- **Length:** ${content.titleOptimization.length} characters (optimal: 30-60)\n`;
    md += `- **Keyword Present:** ${content.titleOptimization.keywordPresent ? '✅' : '❌'}\n`;
    md += `- **Status:** ${content.titleOptimization.optimal ? '✅ Optimal' : '⚠️ Needs improvement'}\n\n`;
    
    md += `### Meta Description\n\n`;
    md += `- **Description:** ${content.metaDescription.description}\n`;
    md += `- **Length:** ${content.metaDescription.length} characters (optimal: 120-160)\n`;
    md += `- **Status:** ${content.metaDescription.optimal ? '✅ Optimal' : '⚠️ Needs improvement'}\n\n`;
    
    md += `### Content Quality\n\n`;
    md += `- **Word Count:** ${content.contentQuality.wordCount}\n`;
    md += `- **Readability Score:** ${content.contentQuality.readabilityScore}/100\n`;
    md += `- **Topical Depth:** ${content.contentQuality.topicalDepth}\n`;
    md += `- **Content Freshness:** ${content.contentQuality.contentFreshness}\n`;
    md += `- **Duplicate Content:** ${content.contentQuality.duplicateContent ? '❌ Detected' : '✅ None'}\n\n`;
    
    if (content.headingStructure.length > 0) {
      md += `### Heading Structure\n\n`;
      content.headingStructure.forEach(h => {
        md += `- **${h.tag.toUpperCase()}:** ${h.text} ${h.optimized ? '✅' : '⚠️'}\n`;
      });
      md += '\n';
    }
    
    if (content.keywordAnalysis.length > 0) {
      md += `### Keyword Analysis\n\n`;
      md += `| Keyword | Frequency | Density | Placement |\n`;
      md += `|---------|-----------|---------|----------|\n`;
      content.keywordAnalysis.slice(0, 10).forEach(kw => {
        md += `| ${kw.keyword} | ${kw.frequency} | ${kw.density.toFixed(2)}% | ${kw.placement.join(', ')} |\n`;
      });
      md += '\n';
    }
    
    return md;
  }

  private renderPerformanceAnalysis(report: SEOReport): string {
    const perf = report.performanceAnalysis;
    
    let md = `## Performance & Core Web Vitals\n\n`;
    
    md += `### Core Web Vitals\n\n`;
    md += `| Metric | Value | Target | Status |\n`;
    md += `|--------|-------|--------|--------|\n`;
    md += `| LCP (Largest Contentful Paint) | ${perf.coreWebVitals.lcp.toFixed(2)}s | < 2.5s | ${perf.coreWebVitals.lcp <= 2.5 ? '✅' : '❌'} |\n`;
    md += `| FID (First Input Delay) | ${perf.coreWebVitals.fid}ms | < 100ms | ${perf.coreWebVitals.fid <= 100 ? '✅' : '❌'} |\n`;
    md += `| CLS (Cumulative Layout Shift) | ${perf.coreWebVitals.cls.toFixed(3)} | < 0.1 | ${perf.coreWebVitals.cls <= 0.1 ? '✅' : '❌'} |\n`;
    md += `| TTFB (Time to First Byte) | ${perf.coreWebVitals.ttfb}ms | < 800ms | ${perf.coreWebVitals.ttfb <= 800 ? '✅' : '❌'} |\n\n`;
    
    md += `### Page Speed Metrics\n\n`;
    md += `- **Load Time:** ${perf.pageSpeed.loadTime}s\n`;
    md += `- **Time to Interactive:** ${perf.pageSpeed.timeToInteractive}s\n`;
    md += `- **Speed Index:** ${perf.pageSpeed.speedIndex}\n`;
    md += `- **Total Page Size:** ${(perf.pageSpeed.totalSize / 1024 / 1024).toFixed(2)} MB\n\n`;
    
    md += `### Optimization Opportunities\n\n`;
    perf.optimizationOpportunities.forEach(opp => {
      md += `- **${opp.type}**: ${opp.potentialSavings} (${opp.impact})\n`;
    });
    md += '\n';
    
    return md;
  }

  private renderRecommendations(report: SEOReport): string {
    const critical = report.recommendations.filter(r => r.priority === 'critical');
    const high = report.recommendations.filter(r => r.priority === 'high');
    const medium = report.recommendations.filter(r => r.priority === 'medium');
    const low = report.recommendations.filter(r => r.priority === 'low');
    
    let md = `## Actionable Recommendations\n\n`;
    md += `**Total:** ${report.recommendations.length} recommendations\n\n`;
    
    if (critical.length > 0) {
      md += `### 🚨 Critical Priority (${critical.length})\n\n`;
      critical.forEach((rec, i) => {
        md += this.formatRecommendation(rec, i + 1);
      });
    }
    
    if (high.length > 0) {
      md += `### ⚠️ High Priority (${high.length})\n\n`;
      high.forEach((rec, i) => {
        md += this.formatRecommendation(rec, i + 1);
      });
    }
    
    if (medium.length > 0) {
      md += `### 💡 Medium Priority (${medium.length})\n\n`;
      medium.forEach((rec, i) => {
        md += this.formatRecommendation(rec, i + 1);
      });
    }
    
    if (low.length > 0) {
      md += `### ✨ Low Priority (${low.length})\n\n`;
      low.forEach((rec, i) => {
        md += this.formatRecommendation(rec, i + 1);
      });
    }
    
    return md;
  }

  private formatRecommendation(rec: any, index: number): string {
    let md = `#### ${index}. ${rec.title}\n\n`;
    md += `**Category:** ${rec.category} | **Impact:** ${rec.impact} | **Effort:** ${rec.effort} | **Timeline:** ${rec.timeline}\n\n`;
    md += `${rec.description}\n\n`;
    md += `**Implementation Steps:**\n${rec.implementation}\n\n`;
    if (rec.resources && rec.resources.length > 0) {
      md += `**Resources:**\n`;
      rec.resources.forEach((res: string) => {
        md += `- ${res}\n`;
      });
      md += '\n';
    }
    md += '---\n\n';
    return md;
  }

  private renderRoadmap(report: SEOReport): string {
    const roadmap = report.implementationRoadmap;
    
    let md = `## Implementation Roadmap\n\n`;
    
    md += `### 🚀 30-Day Quick Wins (${roadmap.day30.length} tasks)\n\n`;
    roadmap.day30.forEach((rec, i) => {
      md += `${i + 1}. **${rec.title}** (${rec.impact} impact, ${rec.effort} effort)\n`;
    });
    md += '\n';
    
    md += `### 📈 90-Day Strategic Improvements (${roadmap.day90.length} tasks)\n\n`;
    roadmap.day90.forEach((rec, i) => {
      md += `${i + 1}. **${rec.title}** (${rec.impact} impact, ${rec.effort} effort)\n`;
    });
    md += '\n';
    
    md += `### 🎯 6-Month Goals (${roadmap.day180.length} tasks)\n\n`;
    roadmap.day180.forEach((rec, i) => {
      md += `${i + 1}. **${rec.title}** (${rec.impact} impact, ${rec.effort} effort)\n`;
    });
    md += '\n';
    
    if (roadmap.ongoing.length > 0) {
      md += `### 🔄 Ongoing Optimization (${roadmap.ongoing.length} tasks)\n\n`;
      roadmap.ongoing.forEach((rec, i) => {
        md += `${i + 1}. **${rec.title}**\n`;
      });
      md += '\n';
    }
    
    return md;
  }

  private renderFooter(report: SEOReport): string {
    return `---

*Report generated by AI-ley SEO Reporter v${report.metadata.analysisVersion}*  
*Generated on ${report.metadata.generatedAt.toLocaleString()}*

**Note:** This report is confidential and intended for internal use only.
`;
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
