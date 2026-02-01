/**
 * HTML Summary Generator
 * Creates visually attractive interactive summary reports
 */

import { writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OptimizationResult } from './types.js';

const execAsync = promisify(exec);

export interface SummaryReport {
  timestamp: string;
  totalFiles: number;
  successful: number;
  failed: number;
  totalChanges: number;
  avgScore: number;
  byType: {
    [key: string]: {
      total: number;
      successful: number;
      failed: number;
      avgScore: number;
      results: OptimizationResult[];
    };
  };
}

export class HTMLSummaryGenerator {
  /**
   * Generate interactive HTML summary report
   */
  async generate(results: OptimizationResult[], outputPath: string): Promise<void> {
    const report = this.buildReport(results);
    const html = this.generateHTML(report);
    
    await writeFile(outputPath, html, 'utf-8');
    console.log(`\n📊 Summary report generated: ${outputPath}`);
    
    // Launch in browser
    await this.launchInBrowser(outputPath);
  }

  /**
   * Build summary report from results
   */
  private buildReport(results: OptimizationResult[]): SummaryReport {
    const byType: SummaryReport['byType'] = {};
    
    // Group by resource type
    results.forEach(result => {
      const type = result.resourceType;
      if (!byType[type]) {
        byType[type] = {
          total: 0,
          successful: 0,
          failed: 0,
          avgScore: 0,
          results: []
        };
      }
      
      byType[type].total++;
      if (result.success) {
        byType[type].successful++;
      } else {
        byType[type].failed++;
      }
      byType[type].results.push(result);
    });

    // Calculate average scores
    Object.values(byType).forEach(typeData => {
      const scores = typeData.results
        .filter(r => r.success)
        .map(r => r.qualityScore);
      typeData.avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    });

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);
    const avgScore = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.qualityScore, 0) / (successful || 1);

    return {
      timestamp: new Date().toISOString(),
      totalFiles: results.length,
      successful,
      failed,
      totalChanges,
      avgScore,
      byType
    };
  }

  /**
   * Generate HTML content
   */
  private generateHTML(report: SummaryReport): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI-ley Kit Optimizer Summary</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .timestamp {
            opacity: 0.9;
            font-size: 0.9em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px 40px;
            background: #f8f9fa;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .tabs {
            display: flex;
            background: #e9ecef;
            padding: 0 40px;
            gap: 5px;
            overflow-x: auto;
        }
        
        .tab {
            padding: 15px 25px;
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 1em;
            font-weight: 500;
            color: #495057;
            border-radius: 12px 12px 0 0;
            transition: all 0.3s;
        }
        
        .tab:hover {
            background: rgba(102, 126, 234, 0.1);
        }
        
        .tab.active {
            background: white;
            color: #667eea;
            font-weight: 600;
        }
        
        .tab-content {
            display: none;
            padding: 40px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .filters {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        
        .filter-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .filter-group label {
            font-weight: 500;
            color: #495057;
        }
        
        input[type="text"], select {
            padding: 10px 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 0.95em;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .priority-section {
            margin-bottom: 30px;
        }
        
        .priority-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .priority-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .priority-critical { background: #dc3545; color: white; }
        .priority-high { background: #fd7e14; color: white; }
        .priority-medium { background: #ffc107; color: #000; }
        .priority-low { background: #28a745; color: white; }
        
        .file-grid {
            display: grid;
            gap: 15px;
        }
        
        .file-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 8px;
            transition: all 0.3s;
        }
        
        .file-card:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .file-card.failed {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        
        .file-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .file-name {
            font-weight: 600;
            color: #212529;
            font-size: 1.05em;
        }
        
        .score-badge {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.9em;
        }
        
        .score-badge.low { background: #dc3545; }
        .score-badge.medium { background: #ffc107; color: #000; }
        .score-badge.high { background: #28a745; }
        
        .file-changes {
            margin-top: 10px;
        }
        
        .change-item {
            color: #6c757d;
            font-size: 0.9em;
            padding: 5px 0;
            padding-left: 20px;
            position: relative;
        }
        
        .change-item:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
        }
        
        .warning-item:before {
            content: "⚠";
            color: #ffc107;
        }
        
        .error-message {
            color: #dc3545;
            font-size: 0.9em;
            margin-top: 10px;
            padding: 10px;
            background: white;
            border-radius: 6px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        
        .empty-state svg {
            width: 100px;
            height: 100px;
            margin-bottom: 20px;
            opacity: 0.3;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎯 AI-ley Kit Optimizer Summary</h1>
            <div class="timestamp">${new Date(report.timestamp).toLocaleString()}</div>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Files</div>
                <div class="stat-value">${report.totalFiles}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Successful</div>
                <div class="stat-value" style="color: #28a745;">${report.successful}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Failed</div>
                <div class="stat-value" style="color: #dc3545;">${report.failed}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Changes</div>
                <div class="stat-value" style="color: #ffc107;">${report.totalChanges}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Score</div>
                <div class="stat-value">${report.avgScore.toFixed(1)}</div>
            </div>
        </div>
        
        <div class="tabs">
            ${Object.keys(report.byType).map((type, i) => 
                `<button class="tab ${i === 0 ? 'active' : ''}" onclick="switchTab('${type}')">${this.formatType(type)}</button>`
            ).join('')}
        </div>
        
        ${Object.entries(report.byType).map(([type, data], i) => this.generateTabContent(type, data, i === 0)).join('')}
    </div>
    
    <script>
        function switchTab(tabId) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        }
        
        function filterFiles(type) {
            const nameFilter = document.getElementById(\`\${type}-name-filter\`).value.toLowerCase();
            const priorityFilter = document.getElementById(\`\${type}-priority-filter\`).value;
            
            document.querySelectorAll(\`#\${type} .file-card\`).forEach(card => {
                const name = card.dataset.name.toLowerCase();
                const priority = card.dataset.priority;
                
                const nameMatch = !nameFilter || name.includes(nameFilter);
                const priorityMatch = !priorityFilter || priority === priorityFilter;
                
                card.style.display = nameMatch && priorityMatch ? 'block' : 'none';
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Generate tab content for a resource type
   */
  private generateTabContent(type: string, data: any, isActive: boolean): string {
    const prioritized = this.prioritizeResults(data.results);
    
    return `
        <div id="${type}" class="tab-content ${isActive ? 'active' : ''}">
            <div class="filters">
                <div class="filter-group">
                    <label>Filter by name:</label>
                    <input type="text" id="${type}-name-filter" placeholder="Search files..." oninput="filterFiles('${type}')">
                </div>
                <div class="filter-group">
                    <label>Priority:</label>
                    <select id="${type}-priority-filter" onchange="filterFiles('${type}')">
                        <option value="">All</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            
            ${Object.entries(prioritized).map(([priority, results]) => 
                this.generatePrioritySection(priority, results as OptimizationResult[])
            ).join('')}
        </div>
    `;
  }

  /**
   * Prioritize results by score and success
   */
  private prioritizeResults(results: OptimizationResult[]): Record<string, OptimizationResult[]> {
    const prioritized: Record<string, OptimizationResult[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    results.forEach(result => {
      if (!result.success) {
        prioritized.critical.push(result);
      } else if (result.qualityScore < 3.0) {
        prioritized.critical.push(result);
      } else if (result.qualityScore < 4.0) {
        prioritized.high.push(result);
      } else if (result.qualityScore < 4.5) {
        prioritized.medium.push(result);
      } else {
        prioritized.low.push(result);
      }
    });

    return prioritized;
  }

  /**
   * Generate priority section HTML
   */
  private generatePrioritySection(priority: string, results: OptimizationResult[]): string {
    if (results.length === 0) return '';

    return `
        <div class="priority-section">
            <div class="priority-header">
                <span class="priority-badge priority-${priority}">${priority} (${results.length})</span>
            </div>
            <div class="file-grid">
                ${results.map(result => this.generateFileCard(result, priority)).join('')}
            </div>
        </div>
    `;
  }

  /**
   * Generate file card HTML
   */
  private generateFileCard(result: OptimizationResult, priority: string): string {
    const fileName = result.filePath.split('/').pop() || result.filePath;
    const scoreClass = result.qualityScore >= 4.5 ? 'high' : result.qualityScore >= 4.0 ? 'medium' : 'low';
    
    return `
        <div class="file-card ${result.success ? '' : 'failed'}" data-name="${fileName}" data-priority="${priority}">
            <div class="file-header">
                <div class="file-name">${fileName}</div>
                ${result.success ? `<div class="score-badge ${scoreClass}">${result.qualityScore.toFixed(1)}</div>` : ''}
            </div>
            ${result.success ? `
                <div class="file-changes">
                    ${result.changes.map(change => {
                      const isWarning = change.toLowerCase().includes('warning') || change.toLowerCase().includes('exceeds');
                      const itemClass = isWarning ? 'change-item warning-item' : 'change-item';
                      return `<div class="${itemClass}">${change}</div>`;
                    }).join('')}
                </div>
            ` : `
                <div class="error-message">❌ ${result.error || 'Optimization failed'}</div>
            `}
        </div>
    `;
  }

  /**
   * Format resource type for display
   */
  private formatType(type: string): string {
    const formatted = type.charAt(0).toUpperCase() + type.slice(1);
    return formatted + 's';
  }

  /**
   * Launch HTML file in default browser
   */
  private async launchInBrowser(filePath: string): Promise<void> {
    try {
      const platform = process.platform;
      let command: string;

      if (platform === 'darwin') {
        command = `open "${filePath}"`;
      } else if (platform === 'win32') {
        command = `start "${filePath}"`;
      } else {
        command = `xdg-open "${filePath}"`;
      }

      await execAsync(command);
      console.log('🌐 Summary opened in browser');
    } catch (error) {
      console.warn('Could not auto-launch browser:', error);
      console.log(`📄 Open manually: ${filePath}`);
    }
  }
}
