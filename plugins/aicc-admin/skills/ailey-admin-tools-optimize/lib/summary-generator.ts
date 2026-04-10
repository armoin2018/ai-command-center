/**
 * Summary Report Generator
 * 
 * Generates comprehensive reports for optimization runs:
 * - Improvements made
 * - Guideline violations
 * - Files needing attention
 * - Score breakdown tables
 */

import type { OptimizationResult, QualityMetrics } from './types.js';
import chalk from 'chalk';

export interface SummaryReport {
  totalFiles: number;
  successfulOptimizations: number;
  failedOptimizations: number;
  averageScore: number;
  improvementsMade: string[];
  guidelineViolations: GuidelineViolation[];
  filesNeedingAttention: FileAttention[];
  scoreBreakdown: ScoreBreakdown[];
}

export interface GuidelineViolation {
  filePath: string;
  guideline: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface FileAttention {
  filePath: string;
  score: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  issues: string[];
}

export interface ScoreBreakdown {
  type: string;
  count: number;
  averageScore: number;
  range: string;
}

export class SummaryGenerator {
  /**
   * Generate comprehensive summary report
   */
  generate(results: OptimizationResult[]): SummaryReport {
    const totalFiles = results.length;
    const successfulOptimizations = results.filter(r => r.success).length;
    const failedOptimizations = totalFiles - successfulOptimizations;
    
    const scores = results.filter(r => r.success).map(r => r.qualityScore);
    const averageScore = scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    const improvementsMade = this.collectImprovements(results);
    const guidelineViolations: GuidelineViolation[] = []; // Will be populated from AI review
    const filesNeedingAttention = this.identifyFilesNeedingAttention(results);
    const scoreBreakdown = this.generateScoreBreakdown(results);

    return {
      totalFiles,
      successfulOptimizations,
      failedOptimizations,
      averageScore,
      improvementsMade,
      guidelineViolations,
      filesNeedingAttention,
      scoreBreakdown
    };
  }

  /**
   * Generate formatted text report
   */
  generateTextReport(summary: SummaryReport, verbose: boolean = false): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n' + '='.repeat(80)));
    lines.push(chalk.bold.cyan('OPTIMIZATION SUMMARY REPORT'));
    lines.push(chalk.bold('='.repeat(80) + '\n'));

    // Overview
    lines.push(chalk.bold('Overview:'));
    lines.push(`  Total Files Processed: ${summary.totalFiles}`);
    lines.push(`  Successful: ${chalk.green(summary.successfulOptimizations.toString())}`);
    lines.push(`  Failed: ${summary.failedOptimizations > 0 ? chalk.red(summary.failedOptimizations.toString()) : summary.failedOptimizations}`);
    lines.push(`  Average Quality Score: ${this.formatScore(summary.averageScore)}`);
    lines.push('');

    // Improvements Made
    if (summary.improvementsMade.length > 0) {
      lines.push(chalk.bold('Improvements Made:'));
      const improvementCounts = this.countImprovements(summary.improvementsMade);
      for (const [improvement, count] of improvementCounts) {
        lines.push(`  ${chalk.green('✓')} ${improvement}: ${count} file(s)`);
      }
      lines.push('');
    }

    // Files Needing Attention
    if (summary.filesNeedingAttention.length > 0) {
      lines.push(chalk.bold('Files Needing Attention:'));
      
      const critical = summary.filesNeedingAttention.filter(f => f.priority === 'critical');
      const high = summary.filesNeedingAttention.filter(f => f.priority === 'high');
      const medium = summary.filesNeedingAttention.filter(f => f.priority === 'medium');

      if (critical.length > 0) {
        lines.push(chalk.red(`  Critical (score < 2.0): ${critical.length} file(s)`));
        if (verbose) {
          critical.forEach(f => {
            lines.push(`    - ${f.filePath} (${f.score.toFixed(1)})`);
            f.issues.forEach(issue => lines.push(`      • ${issue}`));
          });
        }
      }

      if (high.length > 0) {
        lines.push(chalk.yellow(`  High Priority (score 2.0-3.4): ${high.length} file(s)`));
        if (verbose) {
          high.forEach(f => {
            lines.push(`    - ${f.filePath} (${f.score.toFixed(1)})`);
            f.issues.forEach(issue => lines.push(`      • ${issue}`));
          });
        }
      }

      if (medium.length > 0) {
        lines.push(chalk.blue(`  Medium Priority (score 3.5-4.4): ${medium.length} file(s)`));
        if (verbose) {
          medium.forEach(f => {
            lines.push(`    - ${f.filePath} (${f.score.toFixed(1)})`);
          });
        }
      }
      lines.push('');
    }

    // Score Breakdown Table
    if (summary.scoreBreakdown.length > 0) {
      lines.push(chalk.bold('Score Breakdown by Type:'));
      lines.push('');
      lines.push('  ┌' + '─'.repeat(78) + '┐');
      lines.push(`  │ ${'Type'.padEnd(20)} │ ${'Count'.padEnd(8)} │ ${'Avg Score'.padEnd(12)} │ ${'Range'.padEnd(30)} │`);
      lines.push('  ├' + '─'.repeat(78) + '┤');
      
      summary.scoreBreakdown.forEach(breakdown => {
        const score = this.formatScore(breakdown.averageScore, false);
        lines.push(
          `  │ ${breakdown.type.padEnd(20)} │ ${breakdown.count.toString().padEnd(8)} │ ${score.padEnd(12)} │ ${breakdown.range.padEnd(30)} │`
        );
      });
      
      lines.push('  └' + '─'.repeat(78) + '┘');
      lines.push('');
    }

    // Guideline Violations
    if (summary.guidelineViolations.length > 0) {
      lines.push(chalk.bold('Guideline Violations:'));
      
      const highSev = summary.guidelineViolations.filter(v => v.severity === 'high');
      const medSev = summary.guidelineViolations.filter(v => v.severity === 'medium');
      
      if (highSev.length > 0) {
        lines.push(chalk.red(`  High Severity: ${highSev.length}`));
        if (verbose) {
          highSev.forEach(v => {
            lines.push(`    ${v.filePath}: ${v.guideline}`);
            lines.push(`      ${v.description}`);
          });
        }
      }

      if (medSev.length > 0) {
        lines.push(chalk.yellow(`  Medium Severity: ${medSev.length}`));
      }
      
      lines.push('');
    }

    lines.push(chalk.bold('='.repeat(80)));
    return lines.join('\n');
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(summary: SummaryReport): string {
    const lines: string[] = [];

    lines.push('# Optimization Summary Report\n');
    lines.push(`**Generated:** ${new Date().toISOString()}\n`);

    // Overview
    lines.push('## Overview\n');
    lines.push(`- **Total Files Processed:** ${summary.totalFiles}`);
    lines.push(`- **Successful:** ${summary.successfulOptimizations}`);
    lines.push(`- **Failed:** ${summary.failedOptimizations}`);
    lines.push(`- **Average Quality Score:** ${summary.averageScore.toFixed(1)}/5.0`);
    lines.push('');

    // Score Distribution
    lines.push('## Score Distribution\n');
    lines.push('| Range | Quality | Count | Percentage |');
    lines.push('|-------|---------|-------|------------|');
    
    const scoreRanges = [
      { min: 4.5, max: 5.0, label: 'Exceptional' },
      { min: 4.0, max: 4.4, label: 'Good' },
      { min: 3.5, max: 3.9, label: 'Moderate' },
      { min: 3.0, max: 3.4, label: 'Fair' },
      { min: 0.0, max: 2.9, label: 'Needs Work' }
    ];

    scoreRanges.forEach(range => {
      const count = summary.filesNeedingAttention.filter(
        f => f.score >= range.min && f.score <= range.max
      ).length;
      const pct = ((count / summary.totalFiles) * 100).toFixed(1);
      lines.push(`| ${range.min.toFixed(1)}-${range.max.toFixed(1)} | ${range.label} | ${count} | ${pct}% |`);
    });
    lines.push('');

    // Improvements Made
    if (summary.improvementsMade.length > 0) {
      lines.push('## Improvements Made\n');
      const improvementCounts = this.countImprovements(summary.improvementsMade);
      for (const [improvement, count] of improvementCounts) {
        lines.push(`- ✓ **${improvement}**: ${count} file(s)`);
      }
      lines.push('');
    }

    // Files Needing Attention
    if (summary.filesNeedingAttention.length > 0) {
      lines.push('## Files Needing Attention\n');
      
      const critical = summary.filesNeedingAttention.filter(f => f.priority === 'critical');
      const high = summary.filesNeedingAttention.filter(f => f.priority === 'high');
      const medium = summary.filesNeedingAttention.filter(f => f.priority === 'medium');

      if (critical.length > 0) {
        lines.push('### Critical Priority (Score < 2.0)\n');
        lines.push('| File | Score | Issues |');
        lines.push('|------|-------|--------|');
        critical.forEach(f => {
          lines.push(`| ${f.filePath} | ${f.score.toFixed(1)} | ${f.issues.join(', ')} |`);
        });
        lines.push('');
      }

      if (high.length > 0) {
        lines.push('### High Priority (Score 2.0-3.4)\n');
        lines.push('| File | Score | Issues |');
        lines.push('|------|-------|--------|');
        high.forEach(f => {
          lines.push(`| ${f.filePath} | ${f.score.toFixed(1)} | ${f.issues.join(', ')} |`);
        });
        lines.push('');
      }

      if (medium.length > 0) {
        lines.push('### Medium Priority (Score 3.5-4.4)\n');
        lines.push('| File | Score |');
        lines.push('|------|-------|');
        medium.forEach(f => {
          lines.push(`| ${f.filePath} | ${f.score.toFixed(1)} |`);
        });
        lines.push('');
      }
    }

    // Score Breakdown by Type
    if (summary.scoreBreakdown.length > 0) {
      lines.push('## Score Breakdown by Type\n');
      lines.push('| Type | Count | Average Score | Range |');
      lines.push('|------|-------|---------------|-------|');
      summary.scoreBreakdown.forEach(breakdown => {
        lines.push(
          `| ${breakdown.type} | ${breakdown.count} | ${breakdown.averageScore.toFixed(1)} | ${breakdown.range} |`
        );
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Collect all improvements made
   */
  private collectImprovements(results: OptimizationResult[]): string[] {
    const allChanges: string[] = [];
    
    results.forEach(result => {
      if (result.success && result.changes.length > 0) {
        allChanges.push(...result.changes);
      }
    });

    return allChanges;
  }

  /**
   * Count improvement types
   */
  private countImprovements(improvements: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    
    improvements.forEach(improvement => {
      // Extract improvement type from description
      const type = improvement.split(':')[0] || improvement;
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    return counts;
  }

  /**
   * Identify files needing attention based on scores
   */
  private identifyFilesNeedingAttention(results: OptimizationResult[]): FileAttention[] {
    return results
      .filter(r => r.success && r.qualityScore < 4.5)
      .map(r => ({
        filePath: r.filePath,
        score: r.qualityScore,
        priority: this.determinePriority(r.qualityScore),
        issues: r.changes.filter(c => c.toLowerCase().includes('issue') || c.toLowerCase().includes('error'))
      }))
      .sort((a, b) => a.score - b.score);
  }

  /**
   * Determine priority based on score
   */
  private determinePriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score < 2.0) return 'critical';
    if (score < 3.5) return 'high';
    if (score < 4.5) return 'medium';
    return 'low';
  }

  /**
   * Generate score breakdown by type
   */
  private generateScoreBreakdown(results: OptimizationResult[]): ScoreBreakdown[] {
    const typeMap = new Map<string, OptimizationResult[]>();
    
    results.forEach(r => {
      if (r.success) {
        const type = r.resourceType || 'unknown';
        if (!typeMap.has(type)) {
          typeMap.set(type, []);
        }
        typeMap.get(type)!.push(r);
      }
    });

    return Array.from(typeMap.entries()).map(([type, items]) => {
      const scores = items.map(i => i.qualityScore);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      
      return {
        type,
        count: items.length,
        averageScore: Math.round(avg * 10) / 10,
        range: `${min.toFixed(1)} - ${max.toFixed(1)}`
      };
    });
  }

  /**
   * Format score with color
   */
  private formatScore(score: number, useColor: boolean = true): string {
    const formatted = score.toFixed(1);
    
    if (!useColor) return formatted;

    if (score >= 4.5) return chalk.green(formatted);
    if (score >= 4.0) return chalk.blue(formatted);
    if (score >= 3.5) return chalk.yellow(formatted);
    if (score >= 3.0) return chalk.magenta(formatted);
    return chalk.red(formatted);
  }
}
