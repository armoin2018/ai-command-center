#!/usr/bin/env node

/**
 * Example: Automated Export Workflow
 * 
 * This script demonstrates how to:
 * 1. List all designs
 * 2. Filter by criteria (title, date, tags)
 * 3. Export to multiple formats
 * 4. Download exported files
 * 5. Organize into folders
 */

import { getCanvaConfig } from '../scripts/config.js';
import CanvaClient from '../scripts/canva-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ExportConfig {
  query?: string;
  formats: Array<'PNG' | 'JPG' | 'PDF' | 'MP4' | 'GIF' | 'PPTX'>;
  quality?: 'low' | 'medium' | 'high';
  outputDir: string;
  maxDesigns?: number;
}

async function exportWorkflow(config: ExportConfig): Promise<void> {
  const canvaConfig = getCanvaConfig();
  const client = new CanvaClient(canvaConfig);

  console.log('🎨 Starting Canva Export Workflow...\n');

  // Step 1: List designs
  console.log('📋 Fetching designs...');
  const { items: designs } = await client.listDesigns({
    query: config.query,
    limit: config.maxDesigns || 10,
  });

  console.log(`Found ${designs.length} designs\n`);

  // Step 2: Create output directory
  const outputDir = path.resolve(__dirname, config.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Step 3: Export each design in all requested formats
  for (const design of designs) {
    console.log(`\n📄 Processing: ${design.title}`);
    const designFolder = path.join(outputDir, sanitizeFilename(design.title));
    
    if (!fs.existsSync(designFolder)) {
      fs.mkdirSync(designFolder, { recursive: true });
    }

    for (const format of config.formats) {
      try {
        console.log(`  ⏳ Exporting to ${format}...`);
        
        // Start export job
        const exportJob = await client.exportDesign(design.id, format, {
          quality: config.quality || 'high',
        });

        // Poll for completion
        let status = await client.getExportStatus(exportJob.job.id);
        let attempts = 0;
        const maxAttempts = 30;

        while (status.job.status === 'in_progress' && attempts < maxAttempts) {
          await sleep(2000); // Wait 2 seconds
          status = await client.getExportStatus(exportJob.job.id);
          attempts++;
        }

        if (status.job.status === 'success') {
          // Download exported file
          const url = status.job.urls?.[0];
          if (url) {
            const filename = `${sanitizeFilename(design.title)}.${format.toLowerCase()}`;
            const filepath = path.join(designFolder, filename);
            
            await downloadFile(url, filepath);
            console.log(`  ✅ Saved: ${filename}`);
          }
        } else if (status.job.status === 'failed') {
          console.log(`  ❌ Export failed: ${status.job.error?.message || 'Unknown error'}`);
        } else {
          console.log(`  ⚠️  Export timeout after ${maxAttempts * 2} seconds`);
        }

      } catch (error) {
        console.error(`  ❌ Error exporting to ${format}:`, error);
      }
    }
  }

  console.log('\n✨ Export workflow complete!');
  console.log(`📁 Files saved to: ${outputDir}`);
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

async function downloadFile(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filepath, Buffer.from(buffer));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Example usage
const exportConfig: ExportConfig = {
  query: 'Q1 2024',           // Search for designs matching query
  formats: ['PNG', 'PDF'],     // Export to PNG and PDF
  quality: 'high',             // High quality exports
  outputDir: './exports',      // Save to ./exports directory
  maxDesigns: 5,              // Limit to 5 designs
};

exportWorkflow(exportConfig).catch(console.error);
