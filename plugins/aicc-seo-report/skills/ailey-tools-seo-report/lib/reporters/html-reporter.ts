/**
 * HTML Report Generator
 * Creates interactive HTML reports with charts and visualizations
 */

import { promises as fs } from 'fs';
import type { SEOReport } from '../types.js';

export class HTMLReportGenerator {
  async generate(report: SEOReport, outputPath: string): Promise<void> {
    const html = this.createHTML(report);
    await fs.writeFile(outputPath, html, 'utf-8');
  }

  private createHTML(report: SEOReport): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${report.metadata.domain}</title>
  <style>
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    ${this.renderHeader(report)}
    ${this.renderExecutiveSummary(report)}
    ${this.renderScoresOverview(report)}
    ${this.renderTechnicalAnalysis(report)}
    ${this.renderContentAnalysis(report)}
    ${this.renderPerformanceAnalysis(report)}
    ${this.renderRecommendations(report)}
    ${this.renderRoadmap(report)}
    ${this.renderFooter(report)}
  </div>
  ${this.getScripts(report)}
</body>
</html>`;
  }

  private getStyles(): string {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 30px; }
      .header h1 { font-size: 2.5em; margin-bottom: 10px; }
      .header .meta { font-size: 1.1em; opacity: 0.9; }
      .section { background: white; padding: 30px; margin-bottom: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .section h2 { color: #667eea; margin-bottom: 20px; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
      .score-card { display: inline-block; background: #f8f9fa; padding: 20px 30px; border-radius: 10px; margin: 10px; text-align: center; min-width: 150px; }
      .score-card .label { font-size: 0.9em; color: #666; text-transform: uppercase; margin-bottom: 10px; }
      .score-card .value { font-size: 2.5em; font-weight: bold; }
      .score-A { color: #28a745; }
      .score-B { color: #17a2b8; }
      .score-C { color: #ffc107; }
      .score-D { color: #fd7e14; }
      .score-F { color: #dc3545; }
      .recommendation { border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; background: #f8f9fa; border-radius: 5px; }
      .recommendation.critical { border-color: #dc3545; background: #fff5f5; }
      .recommendation.high { border-color: #fd7e14; background: #fff8f5; }
      .recommendation.medium { border-color: #ffc107; background: #fffcf5; }
      .recommendation.low { border-color: #28a745; background: #f5fff8; }
      .recommendation h3 { color: #333; margin-bottom: 10px; }
      .recommendation .meta { display: flex; gap: 15px; margin: 10px 0; font-size: 0.9em; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600; }
      .badge.critical { background: #dc3545; color: white; }
      .badge.high { background: #fd7e14; color: white; }
      .badge.medium { background: #ffc107; color: #333; }
      .badge.low { background: #28a745; color: white; }
      .chart-container { position: relative; height: 300px; margin: 20px 0; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
      th { background: #667eea; color: white; font-weight: 600; }
      tr:hover { background: #f8f9fa; }
      .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
      .quick-wins { background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .quick-wins h3 { color: #155724; margin-bottom: 15px; }
      .quick-wins ul { list-style-position: inside; }
      .quick-wins li { padding: 5px 0; color: #155724; }
      @media print { .container { max-width: 100%; } .section { page-break-inside: avoid; } }
    `;
  }

  private renderHeader(report: SEOReport): string {
    return `
      <div class="header">
        <h1>SEO Audit Report</h1>
        <div class="meta">
          <div><strong>${report.metadata.domain}</strong></div>
          <div>Generated: ${report.metadata.generatedAt.toLocaleDateString()} | Pages Analyzed: ${report.metadata.pagesAnalyzed}</div>
        </div>
      </div>
    `;
  }

  private renderExecutiveSummary(report: SEOReport): string {
    const { executiveSummary: summary } = report;
    
    return `
      <div class="section">
        <h2>Executive Summary</h2>
        <div style="text-align: center; margin: 30px 0;">
          <div class="score-card">
            <div class="label">Overall Health Score</div>
            <div class="value score-${summary.healthGrade}">${summary.overallHealthScore}/100</div>
            <div class="label" style="margin-top: 10px;">Grade: ${summary.healthGrade}</div>
          </div>
        </div>

        ${summary.criticalIssues.length > 0 ? `
          <div style="background: #fff5f5; border: 2px solid #dc3545; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #dc3545; margin-bottom: 15px;">⚠️ Critical Issues Requiring Immediate Attention</h3>
            <ul>
              ${summary.criticalIssues.map(issue => `<li style="padding: 5px 0; color: #721c24;">${issue}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${summary.quickWins.length > 0 ? `
          <div class="quick-wins">
            <h3>🎯 Quick Wins for Immediate Improvement</h3>
            <ul>
              ${summary.quickWins.map(win => `<li>${win}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderScoresOverview(report: SEOReport): string {
    const { scores } = report;
    
    return `
      <div class="section">
        <h2>SEO Score Breakdown</h2>
        <div style="display: flex; flex-wrap: wrap; justify-content: center;">
          <div class="score-card">
            <div class="label">Technical SEO</div>
            <div class="value score-${this.getScoreClass(scores.technical)}">${scores.technical}</div>
          </div>
          <div class="score-card">
            <div class="label">Content</div>
            <div class="value score-${this.getScoreClass(scores.content)}">${scores.content}</div>
          </div>
          <div class="score-card">
            <div class="label">Performance</div>
            <div class="value score-${this.getScoreClass(scores.performance)}">${scores.performance}</div>
          </div>
          <div class="score-card">
            <div class="label">User Experience</div>
            <div class="value score-${this.getScoreClass(scores.ux)}">${scores.ux}</div>
          </div>
        </div>
        ${this.renderScoreVisualization(scores)}
      </div>
    `;
  }

  private renderTechnicalAnalysis(report: SEOReport): string {
    const tech = report.technicalSEO;
    
    return `
      <div class="section">
        <h2>Technical SEO Analysis</h2>
        <table>
          <tr>
            <th>Technical Element</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
          <tr>
            <td>HTTPS Enabled</td>
            <td>${tech.httpsEnabled ? '✅ Yes' : '❌ No'}</td>
            <td>${tech.httpsEnabled ? 'Secure connection' : 'Requires SSL certificate'}</td>
          </tr>
          <tr>
            <td>Robots.txt</td>
            <td>${tech.robotsTxtExists ? '✅ Yes' : '❌ No'}</td>
            <td>${tech.robotsTxtValid ? 'Valid' : 'Issues found'}</td>
          </tr>
          <tr>
            <td>XML Sitemap</td>
            <td>${tech.sitemapValid ? '✅ Valid' : '❌ Invalid'}</td>
            <td>${tech.sitemapUrls} URLs indexed</td>
          </tr>
          <tr>
            <td>Broken Links</td>
            <td>${tech.brokenLinks.length === 0 ? '✅ None' : `⚠️ ${tech.brokenLinks.length}`}</td>
            <td>${tech.brokenLinks.length === 0 ? 'All links working' : 'Requires fixing'}</td>
          </tr>
        </table>
      </div>
    `;
  }

  private renderContentAnalysis(report: SEOReport): string {
    const content = report.contentAnalysis;
    
    return `
      <div class="section">
        <h2>Content Analysis</h2>
        <h3>Title Tag Optimization</h3>
        <p><strong>Title:</strong> ${content.titleOptimization.title}</p>
        <p><strong>Length:</strong> ${content.titleOptimization.length} characters (optimal: 30-60)</p>
        <p><strong>Status:</strong> ${content.titleOptimization.optimal ? '✅ Optimal' : '⚠️ Needs improvement'}</p>
        
        <h3 style="margin-top: 30px;">Content Quality</h3>
        <p><strong>Word Count:</strong> ${content.contentQuality.wordCount}</p>
        <p><strong>Readability Score:</strong> ${content.contentQuality.readabilityScore}/100</p>
        <p><strong>Topical Depth:</strong> ${content.contentQuality.topicalDepth}</p>
      </div>
    `;
  }

  private renderPerformanceAnalysis(report: SEOReport): string {
    const perf = report.performanceAnalysis;
    
    return `
      <div class="section">
        <h2>Performance & Core Web Vitals</h2>
        <div style="display: flex; flex-wrap: wrap; justify-content: center;">
          <div class="score-card">
            <div class="label">LCP</div>
            <div class="value ${perf.coreWebVitals.lcp <= 2.5 ? 'score-A' : 'score-F'}">${perf.coreWebVitals.lcp.toFixed(1)}s</div>
            <div class="label">Target: < 2.5s</div>
          </div>
          <div class="score-card">
            <div class="label">FID</div>
            <div class="value ${perf.coreWebVitals.fid <= 100 ? 'score-A' : 'score-F'}">${perf.coreWebVitals.fid}ms</div>
            <div class="label">Target: < 100ms</div>
          </div>
          <div class="score-card">
            <div class="label">CLS</div>
            <div class="value ${perf.coreWebVitals.cls <= 0.1 ? 'score-A' : 'score-F'}">${perf.coreWebVitals.cls.toFixed(2)}</div>
            <div class="label">Target: < 0.1</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderRecommendations(report: SEOReport): string {
    const recs = report.recommendations;
    
    return `
      <div class="section">
        <h2>Actionable Recommendations</h2>
        <p style="margin-bottom: 20px;">Total: ${recs.length} recommendations across all categories</p>
        ${recs.map(rec => `
          <div class="recommendation ${rec.priority}">
            <h3>${rec.title}</h3>
            <div class="meta">
              <span class="badge ${rec.priority}">${rec.priority.toUpperCase()}</span>
              <span><strong>Impact:</strong> ${rec.impact}</span>
              <span><strong>Effort:</strong> ${rec.effort}</span>
              <span><strong>Timeline:</strong> ${rec.timeline}</span>
            </div>
            <p style="margin: 10px 0;">${rec.description}</p>
            <p><strong>Implementation:</strong> ${rec.implementation}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderRoadmap(report: SEOReport): string {
    const roadmap = report.implementationRoadmap;
    
    return `
      <div class="section">
        <h2>Implementation Roadmap</h2>
        <h3>30-Day Quick Wins (${roadmap.day30.length})</h3>
        <ul>
          ${roadmap.day30.map(rec => `<li>${rec.title}</li>`).join('')}
        </ul>
        
        <h3 style="margin-top: 20px;">90-Day Strategic Improvements (${roadmap.day90.length})</h3>
        <ul>
          ${roadmap.day90.map(rec => `<li>${rec.title}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private renderFooter(report: SEOReport): string {
    return `
      <div class="footer">
        <p>Report generated by AI-ley SEO Reporter v${report.metadata.analysisVersion}</p>
        <p>Generated on ${report.metadata.generatedAt.toLocaleString()}</p>
        <p style="margin-top: 10px;">This report is confidential and intended for internal use only.</p>
      </div>
    `;
  }

  private getScripts(report: SEOReport): string {
    return '';
  }

  private renderScoreVisualization(scores: any): string {
    const data = [
      { label: 'Technical', value: scores.technical },
      { label: 'Content', value: scores.content },
      { label: 'Performance', value: scores.performance },
      { label: 'UX', value: scores.ux },
      { label: 'Authority', value: scores.authority }
    ];
    
    return `
      <div style="margin: 30px 0;">
        <h3>Score Distribution</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${data.map(item => `
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 100px; text-align: right;">${item.label}:</div>
              <div style="flex: 1; background: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden;">
                <div style="background: ${this.getBarColor(item.value)}; width: ${item.value}%; height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; color: white; font-weight: bold;">
                  ${item.value}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private getBarColor(score: number): string {
    if (score >= 90) return '#28a745';
    if (score >= 80) return '#17a2b8';
    if (score >= 70) return '#ffc107';
    if (score >= 60) return '#fd7e14';
    return '#dc3545';
  }

  private getScoreClass(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
