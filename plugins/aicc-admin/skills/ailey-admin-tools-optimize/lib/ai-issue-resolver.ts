/**
 * AI Issue Resolver
 * Attempts to automatically resolve common issues and warnings detected during optimization
 */

import { AIReviewer } from './ai-reviewer.js';
import { YamlFixer } from './yaml-fixer.js';
import { ArtifactCleaner } from './artifact-cleaner.js';

export interface IssueResolution {
  issue: string;
  resolved: boolean;
  solution?: string;
  error?: string;
}

export class AIIssueResolver {
  private aiReviewer: AIReviewer;
  private yamlFixer: YamlFixer;
  private artifactCleaner: ArtifactCleaner;

  constructor() {
    this.aiReviewer = new AIReviewer();
    this.yamlFixer = new YamlFixer();
    this.artifactCleaner = new ArtifactCleaner();
  }

  /**
   * Attempt to resolve detected issues in content
   */
  async resolve(content: string, issues: string[]): Promise<{ 
    resolvedContent: string; 
    resolutions: IssueResolution[] 
  }> {
    let resolvedContent = content;
    const resolutions: IssueResolution[] = [];

    for (const issue of issues) {
      const resolution = await this.resolveIssue(resolvedContent, issue);
      resolutions.push(resolution);
      
      if (resolution.resolved && resolution.solution) {
        resolvedContent = resolution.solution;
      }
    }

    return { resolvedContent, resolutions };
  }

  /**
   * Resolve a specific issue
   */
  private async resolveIssue(content: string, issue: string): Promise<IssueResolution> {
    const issueLower = issue.toLowerCase();

    try {
      // YAML frontmatter issues
      if (issueLower.includes('yaml') || issueLower.includes('frontmatter')) {
        return this.resolveYamlIssue(content, issue);
      }

      // Line count warnings
      if (issueLower.includes('exceeds target') || issueLower.includes('line')) {
        return this.resolveLineLengthIssue(content, issue);
      }

      // Quality score issues
      if (issueLower.includes('score') || issueLower.includes('quality')) {
        return this.resolveQualityIssue(content, issue);
      }

      // Artifact/formatting issues
      if (issueLower.includes('broken') || issueLower.includes('corrupt') || issueLower.includes('artifact')) {
        return this.resolveArtifactIssue(content, issue);
      }

      // Structural issues
      if (issueLower.includes('structure') || issueLower.includes('heading')) {
        return this.resolveStructuralIssue(content, issue);
      }

      // Default: Unable to auto-resolve
      return {
        issue,
        resolved: false,
        error: 'No automatic resolution strategy available for this issue'
      };

    } catch (error) {
      return {
        issue,
        resolved: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Resolve YAML frontmatter issues
   */
  private resolveYamlIssue(content: string, issue: string): IssueResolution {
    const result = this.yamlFixer.fixYamlFrontmatter(content);
    
    if (result.fixed && result.fixedContent) {
      return {
        issue,
        resolved: true,
        solution: result.fixedContent
      };
    }

    return {
      issue,
      resolved: false,
      error: result.errors.join('; ') || 'Could not fix YAML issue'
    };
  }

  /**
   * Resolve line length issues by suggesting condensing
   */
  private resolveLineLengthIssue(content: string, issue: string): IssueResolution {
    // Extract target and current line count from issue
    const match = issue.match(/(\d+)\s+lines\s+exceeds\s+target\s+(\d+)/i);
    
    if (!match) {
      return {
        issue,
        resolved: false,
        error: 'Could not parse line count from issue'
      };
    }

    const currentLines = parseInt(match[1]);
    const targetLines = parseInt(match[2]);
    const excessLines = currentLines - targetLines;

    // Suggest strategies based on excess
    const strategies: string[] = [];
    
    if (excessLines > 100) {
      strategies.push('Consider extracting code examples to separate files');
      strategies.push('Move detailed examples to examples/ directory');
    }
    
    if (excessLines > 50) {
      strategies.push('Condense verbose explanations');
      strategies.push('Use more concise language');
    }

    strategies.push('Remove redundant content');
    strategies.push('Use progressive disclosure for advanced topics');

    // This is a warning, not an error - provide guidance
    return {
      issue,
      resolved: false, // Can't auto-fix, but provide helpful info
      error: `Suggestions to reduce by ${excessLines} lines:\n${strategies.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    };
  }

  /**
   * Resolve quality score issues
   */
  private async resolveQualityIssue(content: string, issue: string): IssueResolution {
    // Quality issues require content analysis
    const metrics = await this.aiReviewer.review(content);
    const overallScore = this.aiReviewer.calculateOverall(metrics);

    const lowScoreAreas: string[] = [];
    
    if (metrics.clarity < 3.5) {
      lowScoreAreas.push('Clarity: Use clearer headings (10-100 chars) and shorter paragraphs (<200 words)');
    }
    if (metrics.conciseness < 3.5) {
      lowScoreAreas.push('Conciseness: Remove redundant content and wordy phrases');
    }
    if (metrics.accuracy < 3.5) {
      lowScoreAreas.push('Accuracy: Verify links and use precise technical language');
    }
    if (metrics.referenceMaterial < 3.5) {
      lowScoreAreas.push('References: Add code examples and citations');
    }
    if (metrics.sufficiency < 3.5) {
      lowScoreAreas.push('Sufficiency: Expand content with more examples and details');
    }

    return {
      issue,
      resolved: false, // Quality improvements require human judgment
      error: `Current score: ${overallScore.toFixed(1)}/5.0\nAreas needing improvement:\n${lowScoreAreas.join('\n')}`
    };
  }

  /**
   * Resolve artifact/corruption issues
   */
  private resolveArtifactIssue(content: string, issue: string): IssueResolution {
    const cleanResult = this.artifactCleaner.clean(content);
    
    if (cleanResult.removed.length > 0) {
      return {
        issue,
        resolved: true,
        solution: cleanResult.cleaned
      };
    }

    return {
      issue,
      resolved: false,
      error: 'No artifacts detected to clean'
    };
  }

  /**
   * Resolve structural issues
   */
  private resolveStructuralIssue(content: string, issue: string): IssueResolution {
    // Check for common structural problems
    const lines = content.split('\n');
    const headings = lines.filter(line => line.match(/^#{1,6}\s+/));
    
    if (headings.length < 3) {
      return {
        issue,
        resolved: false,
        error: 'Content needs more headings for better structure (minimum 3 recommended)'
      };
    }

    // Check heading hierarchy
    const headingLevels = headings.map(h => (h.match(/^(#{1,6})/)?.[1].length || 0));
    const hasLevel1 = headingLevels.includes(1);
    const hasLevel2 = headingLevels.includes(2);
    
    if (!hasLevel1) {
      return {
        issue,
        resolved: false,
        error: 'Add a top-level heading (# Title) for document structure'
      };
    }
    
    if (!hasLevel2) {
      return {
        issue,
        resolved: false,
        error: 'Add section headings (## Section) to organize content'
      };
    }

    return {
      issue,
      resolved: true,
      solution: content // Structure is adequate
    };
  }

  /**
   * Get resolution summary
   */
  getSummary(resolutions: IssueResolution[]): {
    total: number;
    resolved: number;
    failed: number;
    suggestions: string[];
  } {
    const resolved = resolutions.filter(r => r.resolved).length;
    const failed = resolutions.filter(r => !r.resolved).length;
    const suggestions = resolutions
      .filter(r => !r.resolved && r.error)
      .map(r => `${r.issue}: ${r.error}`);

    return {
      total: resolutions.length,
      resolved,
      failed,
      suggestions
    };
  }
}
