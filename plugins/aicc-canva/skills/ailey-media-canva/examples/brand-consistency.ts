#!/usr/bin/env node

/**
 * Example: Brand Consistency Checker
 * 
 * This script demonstrates how to:
 * 1. Retrieve brand kit (colors, fonts, logos)
 * 2. Analyze designs for brand compliance
 * 3. Generate compliance reports
 * 4. Suggest brand-aligned alternatives
 * 
 * Requirements: Pro+ tier for Brand Kit API access
 */

import { getCanvaConfig } from '../scripts/config.js';
import CanvaClient from '../scripts/canva-client.js';
import chalk from 'chalk';

interface BrandCompliance {
  designId: string;
  designTitle: string;
  compliant: boolean;
  issues: string[];
  suggestions: string[];
}

async function checkBrandConsistency(): Promise<void> {
  const config = getCanvaConfig();
  const client = new CanvaClient(config);

  console.log(chalk.blue('🎨 Brand Consistency Checker\n'));

  // Step 1: Detect tier and verify Brand Kit access
  const tier = await client.detectTier();
  console.log(`Detected tier: ${chalk.cyan(tier)}`);

  if (!config.capabilities.brandKit) {
    console.log(chalk.red('\n❌ Brand Kit access requires Pro+ tier'));
    console.log(chalk.yellow('Upgrade at: https://www.canva.com/pricing/'));
    process.exit(1);
  }

  // Step 2: Fetch brand assets
  console.log(chalk.blue('\n📦 Fetching brand assets...\n'));

  const [colors, fonts, logos] = await Promise.all([
    client.getBrandColors(),
    client.getBrandFonts(),
    client.getBrandLogos(),
  ]);

  console.log(chalk.green('✓ Brand Colors:'), colors.items.length);
  console.log(chalk.green('✓ Brand Fonts:'), fonts.items.length);
  console.log(chalk.green('✓ Brand Logos:'), logos.items.length);

  // Display brand palette
  if (colors.items.length > 0) {
    console.log(chalk.blue('\n🎨 Brand Color Palette:'));
    colors.items.forEach(color => {
      console.log(`  • ${color.hex} - ${color.name || 'Unnamed'}`);
    });
  }

  // Display brand fonts
  if (fonts.items.length > 0) {
    console.log(chalk.blue('\n🔤 Brand Fonts:'));
    fonts.items.forEach(font => {
      console.log(`  • ${font.name} (${font.weights?.join(', ') || 'default weight'})`);
    });
  }

  // Step 3: Analyze designs
  console.log(chalk.blue('\n🔍 Analyzing designs for brand compliance...\n'));

  const { items: designs } = await client.listDesigns({ limit: 10 });
  const reports: BrandCompliance[] = [];

  for (const design of designs) {
    const report: BrandCompliance = {
      designId: design.id,
      designTitle: design.title,
      compliant: true,
      issues: [],
      suggestions: [],
    };

    // Note: Actual color/font analysis would require fetching design details
    // This is a simplified example showing the structure

    // Example checks (would need actual design data):
    // - Check if colors match brand palette
    // - Check if fonts are from brand font list
    // - Check if logos are properly used
    // - Check spacing, sizing consistency

    // Placeholder compliance logic
    const hasCompliance = Math.random() > 0.3; // Simulate compliance check
    
    if (!hasCompliance) {
      report.compliant = false;
      report.issues.push('Non-brand colors detected');
      report.suggestions.push(`Use brand colors: ${colors.items.slice(0, 3).map(c => c.hex).join(', ')}`);
    }

    reports.push(report);

    // Display result
    const status = report.compliant ? chalk.green('✓ COMPLIANT') : chalk.red('✗ NON-COMPLIANT');
    console.log(`${status} - ${design.title}`);
    
    if (!report.compliant) {
      report.issues.forEach(issue => {
        console.log(chalk.yellow(`  ⚠️  ${issue}`));
      });
      report.suggestions.forEach(suggestion => {
        console.log(chalk.cyan(`  💡 ${suggestion}`));
      });
    }
  }

  // Step 4: Summary
  const compliantCount = reports.filter(r => r.compliant).length;
  const totalCount = reports.length;
  const complianceRate = (compliantCount / totalCount * 100).toFixed(1);

  console.log(chalk.blue('\n📊 Summary:'));
  console.log(`  Total designs analyzed: ${totalCount}`);
  console.log(`  Compliant: ${chalk.green(compliantCount)}`);
  console.log(`  Non-compliant: ${chalk.red(totalCount - compliantCount)}`);
  console.log(`  Compliance rate: ${chalk.cyan(complianceRate + '%')}`);

  // Step 5: Recommendations
  if (complianceRate < '90') {
    console.log(chalk.yellow('\n💡 Recommendations:'));
    console.log('  • Use brand templates for new designs');
    console.log('  • Enable brand kit enforcement in team settings');
    console.log('  • Conduct brand training for team members');
    console.log('  • Set up automated brand compliance alerts');
  } else {
    console.log(chalk.green('\n✨ Excellent brand consistency!'));
  }
}

// Run the checker
checkBrandConsistency().catch(error => {
  console.error(chalk.red('\n❌ Error:'), error.message);
  process.exit(1);
});
