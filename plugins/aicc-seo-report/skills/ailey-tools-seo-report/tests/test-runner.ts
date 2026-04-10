#!/usr/bin/env node
/**
 * Test Runner for SEO Report Skill
 * Comprehensive test suite for all components
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

class TestRunner {
  private results: TestResult[] = [];

  async run(testName: string, testFn: () => Promise<void> | void): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: true,
        message: 'Test passed',
        duration
      });
      console.log(chalk.green(`✓ ${testName} (${duration}ms)`));
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.results.push({
        name: testName,
        passed: false,
        message,
        duration
      });
      console.log(chalk.red(`✗ ${testName} (${duration}ms)`));
      console.log(chalk.red(`  ${message}`));
    }
  }

  printSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    console.log('\n' + '='.repeat(50));
    if (failed === 0) {
      console.log(chalk.green.bold(`✓ All ${total} tests passed!`));
    } else {
      console.log(chalk.red.bold(`✗ ${failed} of ${total} tests failed`));
    }
    console.log('='.repeat(50) + '\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  console.log(chalk.bold.blue('\nRunning SEO Report Skill Tests\n'));

  const runner = new TestRunner();

  // Test 1: Type definitions exist and export correctly
  await runner.run('Type definitions are valid', async () => {
    const { SEOScorer } = await import('../lib/analyzers/scorer.js');
    const { WebCrawler } = await import('../lib/collectors/crawler.js');
    
    if (!SEOScorer) throw new Error('SEOScorer not exported');
    if (!WebCrawler) throw new Error('WebCrawler not exported');
  });

  // Test 2: SEOScorer initialization and methods
  await runner.run('SEOScorer initialization', async () => {
    const { SEOScorer } = await import('../lib/analyzers/scorer.js');
    const scorer = new SEOScorer();
    
    if (typeof scorer.calculateOverallScore !== 'function') {
      throw new Error('calculateOverallScore method missing');
    }
  });

  // Test 3: SEOScorer crawlability scoring
  await runner.run('SEOScorer crawlability scoring', async () => {
    const { SEOScorer } = await import('../lib/analyzers/scorer.js');
    const scorer = new SEOScorer();
    
    const score = scorer.scoreCrawlability(true, true, true, 2);
    
    if (score < 0 || score > 100) {
      throw new Error(`Invalid score: ${score}`);
    }
    if (score !== 90) {
      throw new Error(`Expected score 90, got ${score}`);
    }
  });

  // Test 4: SEOScorer title optimization scoring
  await runner.run('SEOScorer title optimization', async () => {
    const { SEOScorer } = await import('../lib/analyzers/scorer.js');
    const scorer = new SEOScorer();
    
    // Optimal title
    const optimalScore = scorer.scoreTitleOptimization(45, true);
    if (optimalScore !== 100) {
      throw new Error(`Expected optimal score 100, got ${optimalScore}`);
    }
    
    // Too short title
    const shortScore = scorer.scoreTitleOptimization(20, true);
    if (shortScore >= optimalScore) {
      throw new Error('Short title should score lower');
    }
    
    // No keyword
    const noKeywordScore = scorer.scoreTitleOptimization(45, false);
    if (noKeywordScore >= optimalScore) {
      throw new Error('Title without keyword should score lower');
    }
  });

  // Test 5: SEOScorer content quality scoring
  await runner.run('SEOScorer content quality', async () => {
    const { SEOScorer } = await import('../lib/analyzers/scorer.js');
    const scorer = new SEOScorer();
    
    const score = scorer.scoreContentQuality(1200, 75, false);
    
    if (score < 0 || score > 100) {
      throw new Error(`Invalid score: ${score}`);
    }
  });

  // Test 6: SEOScorer grade conversion
  await runner.run('SEOScorer grade conversion', async () => {
    const { SEOScorer } = await import('../lib/analyzers/scorer.js');
    const scorer = new SEOScorer();
    
    if (scorer.getGrade(95) !== 'A') throw new Error('95 should be A');
    if (scorer.getGrade(85) !== 'B') throw new Error('85 should be B');
    if (scorer.getGrade(75) !== 'C') throw new Error('75 should be C');
    if (scorer.getGrade(65) !== 'D') throw new Error('65 should be D');
    if (scorer.getGrade(50) !== 'F') throw new Error('50 should be F');
  });

  // Test 7: WebCrawler initialization
  await runner.run('WebCrawler initialization', async () => {
    const { WebCrawler } = await import('../lib/collectors/crawler.js');
    
    const crawler = new WebCrawler({
      url: 'https://example.com',
      maxPages: 5,
      userAgent: 'SEO-Analyzer/1.0',
      timeout: 30000,
      respectRobots: false,
      keywords: [],
      competitors: [],
      crawlDepth: 1
    });
    
    if (typeof crawler.init !== 'function') {
      throw new Error('init method missing');
    }
  });

  // Test 8: HTML Reporter generation
  await runner.run('HTML Reporter generates valid HTML', async () => {
    const { HTMLReportGenerator } = await import('../lib/reporters/html-reporter.js');
    const { createMockReport } = await import('./fixtures/mock-data.js');
    
    const generator = new HTMLReportGenerator();
    const report = createMockReport();
    const outputPath = path.join(__dirname, 'output', 'test-report.html');
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await generator.generate(report, outputPath);
    
    const content = await fs.readFile(outputPath, 'utf-8');
    
    if (!content.includes('<!DOCTYPE html>')) {
      throw new Error('Invalid HTML: missing DOCTYPE');
    }
    if (!content.includes('SEO Audit Report')) {
      throw new Error('HTML missing title');
    }
    if (!content.includes(report.metadata.domain)) {
      throw new Error('HTML missing domain');
    }
  });

  // Test 9: Markdown Reporter generation
  await runner.run('Markdown Reporter generates valid Markdown', async () => {
    const { MarkdownReportGenerator } = await import('../lib/reporters/markdown-reporter.js');
    const { createMockReport } = await import('./fixtures/mock-data.js');
    
    const generator = new MarkdownReportGenerator();
    const report = createMockReport();
    const outputPath = path.join(__dirname, 'output', 'test-report.md');
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await generator.generate(report, outputPath);
    
    const content = await fs.readFile(outputPath, 'utf-8');
    
    if (!content.includes('# SEO Audit Report')) {
      throw new Error('Markdown missing title');
    }
    if (!content.includes(report.metadata.domain)) {
      throw new Error('Markdown missing domain');
    }
    if (!content.includes('## Executive Summary')) {
      throw new Error('Markdown missing executive summary section');
    }
  });

  // Test 10: Report generators handle all data
  await runner.run('Report generators handle complete data', async () => {
    const { HTMLReportGenerator } = await import('../lib/reporters/html-reporter.js');
    const { MarkdownReportGenerator } = await import('../lib/reporters/markdown-reporter.js');
    const { createComplexMockReport } = await import('./fixtures/mock-data.js');
    
    const report = createComplexMockReport();
    
    const htmlGen = new HTMLReportGenerator();
    const mdGen = new MarkdownReportGenerator();
    
    const htmlPath = path.join(__dirname, 'output', 'complex-test.html');
    const mdPath = path.join(__dirname, 'output', 'complex-test.md');
    
    await htmlGen.generate(report, htmlPath);
    await mdGen.generate(report, mdPath);
    
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    const mdContent = await fs.readFile(mdPath, 'utf-8');
    
    // Verify critical issues appear in both
    if (!htmlContent.includes('Critical Issue 1')) {
      throw new Error('HTML missing critical issues');
    }
    if (!mdContent.includes('Critical Issue 1')) {
      throw new Error('Markdown missing critical issues');
    }
  });

  // Test 11: Score interpretation
  await runner.run('Score interpretation messages', async () => {
    const { SEOScorer } = await import('../lib/analyzers/scorer.js');
    const scorer = new SEOScorer();
    
    const interpretation = scorer.getScoreInterpretation(95);
    
    if (!interpretation || interpretation.length === 0) {
      throw new Error('No interpretation for score');
    }
  });

  // Test 12: Recommendation generation logic
  await runner.run('Recommendation priority logic', async () => {
    const { createMockReport } = await import('./fixtures/mock-data.js');
    const report = createMockReport();
    
    const critical = report.recommendations.filter(r => r.priority === 'critical');
    const high = report.recommendations.filter(r => r.priority === 'high');
    
    if (critical.length === 0 && high.length === 0) {
      throw new Error('No high-priority recommendations in mock data');
    }
  });

  // Test 13: Implementation roadmap structure
  await runner.run('Implementation roadmap has all phases', async () => {
    const { createMockReport } = await import('./fixtures/mock-data.js');
    const report = createMockReport();
    
    if (!report.implementationRoadmap.day30) {
      throw new Error('Missing day30 roadmap');
    }
    if (!report.implementationRoadmap.day90) {
      throw new Error('Missing day90 roadmap');
    }
    if (!Array.isArray(report.implementationRoadmap.day30)) {
      throw new Error('day30 should be an array');
    }
  });

  // Test 14: Executive summary completeness
  await runner.run('Executive summary has required fields', async () => {
    const { createMockReport } = await import('./fixtures/mock-data.js');
    const report = createMockReport();
    const summary = report.executiveSummary;
    
    if (typeof summary.overallHealthScore !== 'number') {
      throw new Error('Missing overallHealthScore');
    }
    if (!summary.healthGrade) {
      throw new Error('Missing healthGrade');
    }
    if (!Array.isArray(summary.strengths)) {
      throw new Error('strengths should be an array');
    }
    if (!Array.isArray(summary.weaknesses)) {
      throw new Error('weaknesses should be an array');
    }
  });

  // Test 15: Metadata completeness
  await runner.run('Report metadata is complete', async () => {
    const { createMockReport } = await import('./fixtures/mock-data.js');
    const report = createMockReport();
    
    if (!report.metadata.domain) {
      throw new Error('Missing domain');
    }
    if (!(report.metadata.generatedAt instanceof Date)) {
      throw new Error('generatedAt should be a Date');
    }
    if (typeof report.metadata.pagesAnalyzed !== 'number') {
      throw new Error('pagesAnalyzed should be a number');
    }
  });

  runner.printSummary();
}

main().catch(error => {
  console.error(chalk.red('Test runner failed:'), error);
  process.exit(1);
});
