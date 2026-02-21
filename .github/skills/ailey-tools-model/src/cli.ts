#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ModelClient } from './index';

dotenv.config();

const program = new Command();

// Initialize client
const client = new ModelClient({
  enableApiRendering: process.env.ENABLE_API_RENDERING === 'true',
  mermaidInkUrl: process.env.MERMAID_INK_URL,
  plantumlServerUrl: process.env.PLANTUML_SERVER_URL,
  defaultRenderFormat: process.env.DEFAULT_RENDER_FORMAT as any,
  defaultDiagramType: process.env.DEFAULT_DIAGRAM_TYPE,
  defaultTheme: process.env.DEFAULT_THEME,
  templateDirectory: process.env.TEMPLATE_DIRECTORY,
  outputDirectory: process.env.OUTPUT_DIRECTORY,
  enableCache: process.env.ENABLE_CACHE === 'true',
  apiTimeout: parseInt(process.env.API_TIMEOUT || '10000')
});

// Event listeners
client.on('diagram-generated', (data) => {
  console.log(chalk.green(`✓ Generated ${data.type} diagram (${data.lineCount} lines)`));
});

client.on('conversion-complete', (data) => {
  console.log(chalk.green(`✓ Converted ${data.from} → ${data.to}`));
});

client.on('validation-failed', (data) => {
  console.log(chalk.red(`✗ Validation failed (${data.errors.length} errors)`));
});

client.on('render-complete', (data) => {
  console.log(chalk.green(`✓ Rendered ${data.format} (${(data.size / 1024).toFixed(2)} KB)`));
});

client.on('batch-progress', (data) => {
  console.log(chalk.blue(`  Progress: ${data.completed}/${data.total}`));
});

program
  .name('ailey-tools-model')
  .description('Mermaid and PlantUML diagram generation, translation, and rendering')
  .version('1.0.0');

// ============================================
// Generate Command
// ============================================

program
  .command('generate')
  .description('Generate diagrams from various inputs')
  .argument('<input>', 'Input (natural language, file path, or data)')
  .option('-t, --type <type>', 'Diagram type (flowchart, sequence, class, er, gantt, state, etc.)')
  .option('-f, --format <format>', 'Output format (mermaid, plantuml)', 'mermaid')
  .option('-o, --output <file>', 'Output file path')
  .option('--theme <theme>', 'Diagram theme (default, dark, forest, neutral)', 'default')
  .option('--template <name>', 'Use template from library')
  .option('--nl', 'Natural language input mode', false)
  .option('--data <file>', 'Data file for generation (JSON, YAML, CSV)')
  .action(async (input, options) => {
    try {
      console.log(chalk.blue('🔨 Generating diagram...'));

      let diagram: string;

      if (options.template) {
        // Generate from template
        let data = {};
        if (options.data) {
          const content = await fs.readFile(options.data, 'utf8');
          data = JSON.parse(content);
        }
        diagram = await client.generate.fromTemplate(options.template, {
          data,
          output: options.output
        });
      } else if (options.nl || !await fs.pathExists(input)) {
        // Natural language mode
        diagram = await client.generate.fromNaturalLanguage(input, {
          type: options.type,
          format: options.format,
          theme: options.theme,
          output: options.output
        });
      } else {
        // File input
        const ext = path.extname(input).toLowerCase();
        
        if (ext === '.json') {
          diagram = await client.generate.fromJSON(input, {
            type: options.type,
            format: options.format,
            output: options.output
          });
        } else if (ext === '.yaml' || ext === '.yml') {
          diagram = await client.generate.fromYAML(input, {
            type: options.type,
            format: options.format,
            output: options.output
          });
        } else if (ext === '.csv') {
          diagram = await client.generate.fromCSV(input, {
            type: options.type,
            format: options.format,
            output: options.output
          });
        } else {
          console.log(chalk.red('✗ Unsupported file type. Use JSON, YAML, or CSV.'));
          process.exit(1);
        }
      }

      if (!options.output) {
        console.log(chalk.gray('\n' + diagram + '\n'));
      }

      console.log(chalk.green('✅ Diagram generated successfully'));
    } catch (error) {
      console.error(chalk.red('✗ Generation failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// Convert Command
// ============================================

program
  .command('convert')
  .description('Convert between Mermaid and PlantUML formats')
  .argument('<input>', 'Input file path')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Target format (mermaid, plantuml, auto)', 'auto')
  .option('--preserve-comments', 'Preserve comments during conversion', true)
  .option('--preserve-formatting', 'Preserve formatting during conversion', true)
  .action(async (input, options) => {
    try {
      console.log(chalk.blue('🔄 Converting diagram...'));

      const code = await fs.readFile(input, 'utf8');
      
      let converted: string;
      
      if (options.format === 'auto') {
        converted = await client.convert.auto(code, {
          preserveComments: options.preserveComments,
          preserveFormatting: options.preserveFormatting,
          output: options.output
        });
      } else if (options.format === 'plantuml') {
        converted = await client.convert.mermaidToPlantUML(code, {
          preserveComments: options.preserveComments,
          preserveFormatting: options.preserveFormatting,
          output: options.output
        });
      } else if (options.format === 'mermaid') {
        converted = await client.convert.plantUMLToMermaid(code, {
          preserveComments: options.preserveComments,
          preserveFormatting: options.preserveFormatting,
          output: options.output
        });
      } else {
        console.log(chalk.red('✗ Invalid format. Use: mermaid, plantuml, or auto'));
        process.exit(1);
      }

      if (!options.output) {
        console.log(chalk.gray('\n' + converted + '\n'));
      }

      console.log(chalk.green('✅ Conversion complete'));
    } catch (error) {
      console.error(chalk.red('✗ Conversion failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// Parse Command
// ============================================

program
  .command('parse')
  .description('Parse and analyze diagram syntax')
  .argument('<input>', 'Input file path')
  .option('--analyze', 'Perform complexity analysis', false)
  .option('--extract', 'Extract diagram metadata', false)
  .option('--ast', 'Output abstract syntax tree', false)
  .option('-o, --output <file>', 'Save analysis to file (JSON)')
  .action(async (input, options) => {
    try {
      console.log(chalk.blue('🔍 Parsing diagram...'));

      const code = await fs.readFile(input, 'utf8');
      
      if (options.analyze) {
        const analysis = await client.analyze(code);
        
        console.log(chalk.cyan('\nComplexity Analysis:'));
        console.log(`  Nodes: ${analysis.nodeCount}`);
        console.log(`  Edges: ${analysis.edgeCount}`);
        console.log(`  Max Depth: ${analysis.maxDepth}`);
        console.log(`  Complexity: ${analysis.complexity} (score: ${analysis.score})`);
        
        if (options.output) {
          await fs.writeJson(options.output, analysis, { spaces: 2 });
        }
      } else {
        const ast = await client.parse(code);
        
        console.log(chalk.cyan('\nDiagram Metadata:'));
        console.log(`  Format: ${ast.format}`);
        console.log(`  Type: ${ast.type}`);
        console.log(`  Lines: ${ast.lines}`);
        
        if (options.ast) {
          console.log(chalk.gray('\n' + JSON.stringify(ast, null, 2) + '\n'));
        }
        
        if (options.output) {
          await fs.writeJson(options.output, ast, { spaces: 2 });
        }
      }

      console.log(chalk.green('\n✅ Parsing complete'));
    } catch (error) {
      console.error(chalk.red('✗ Parsing failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// Render Command
// ============================================

program
  .command('render')
  .description('Render diagrams to images via API')
  .argument('<input>', 'Input file path')
  .option('-f, --format <format>', 'Output format (svg, png, pdf)', 'svg')
  .option('-o, --output <file>', 'Output file path')
  .option('--api <api>', 'API to use (mermaid-ink, plantuml-server, auto)', 'auto')
  .option('--theme <theme>', 'Diagram theme')
  .action(async (input, options) => {
    try {
      if (process.env.ENABLE_API_RENDERING !== 'true') {
        console.log(chalk.yellow('⚠ API rendering is disabled'));
        console.log(chalk.gray('To enable: Set ENABLE_API_RENDERING=true in .env'));
        process.exit(1);
      }

      console.log(chalk.blue('🎨 Rendering diagram...'));

      const code = await fs.readFile(input, 'utf8');
      
      await client.render(code, {
        format: options.format,
        output: options.output,
        api: options.api === 'auto' ? undefined : options.api,
        theme: options.theme
      });

      console.log(chalk.green('✅ Rendering complete'));
    } catch (error) {
      console.error(chalk.red('✗ Rendering failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// Validate Command
// ============================================

program
  .command('validate')
  .description('Validate diagram syntax')
  .argument('<input>', 'Input file path')
  .option('--strict', 'Strict validation mode', false)
  .option('--max-complexity <n>', 'Maximum allowed complexity', parseInt)
  .option('-o, --output <file>', 'Save validation report')
  .action(async (input, options) => {
    try {
      console.log(chalk.blue('✓ Validating diagram...'));

      const code = await fs.readFile(input, 'utf8');
      const result = await client.validate(code);

      if (result.isValid) {
        console.log(chalk.green('\n✅ Valid diagram syntax'));
        
        if (result.metadata) {
          console.log(chalk.cyan('\nMetadata:'));
          console.log(`  Type: ${result.metadata.type}`);
          console.log(`  Format: ${result.metadata.format}`);
          console.log(`  Lines: ${result.metadata.lineCount}`);
        }
        
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠ Warnings:'));
          result.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
      } else {
        console.log(chalk.red('\n✗ Invalid diagram syntax'));
        console.log(chalk.red('\nErrors:'));
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

      if (options.maxComplexity) {
        const analysis = await client.analyze(code);
        if (analysis.score > options.maxComplexity) {
          console.log(chalk.red(`\n✗ Complexity exceeds maximum (${analysis.score} > ${options.maxComplexity})`));
          process.exit(1);
        }
      }

      if (options.output) {
        await fs.writeJson(options.output, result, { spaces: 2 });
      }

      if (!result.isValid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Validation failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// Template Command
// ============================================

program
  .command('template <action>')
  .description('Manage diagram templates (list, use, create, delete)')
  .argument('[name]', 'Template name')
  .option('--data <file>', 'Data file for template (JSON, YAML)')
  .option('-o, --output <file>', 'Output file path')
  .option('--input <file>', 'Input file for template creation')
  .action(async (action, name, options) => {
    try {
      if (action === 'list') {
        const templates = await client.template.list();
        
        console.log(chalk.cyan('\nAvailable Templates:'));
        if (templates.length === 0) {
          console.log(chalk.gray('  No templates found'));
        } else {
          templates.forEach(template => {
            console.log(`  - ${template}`);
          });
        }
      } else if (action === 'use' && name) {
        console.log(chalk.blue(`🔨 Generating from template: ${name}`));
        
        let data = {};
        if (options.data) {
          const content = await fs.readFile(options.data, 'utf8');
          data = JSON.parse(content);
        }
        
        const diagram = await client.template.use(name, data);
        
        if (options.output) {
          await fs.writeFile(options.output, diagram, 'utf8');
          console.log(chalk.green(`✓ Saved to ${options.output}`));
        } else {
          console.log(chalk.gray('\n' + diagram + '\n'));
        }
        
        console.log(chalk.green('✅ Template generated'));
      } else if (action === 'create' && name) {
        if (!options.input) {
          console.log(chalk.red('✗ --input <file> is required for template creation'));
          process.exit(1);
        }
        
        const content = await fs.readFile(options.input, 'utf8');
        await client.template.create(name, content);
        
        console.log(chalk.green(`✅ Template '${name}' created`));
      } else if (action === 'delete' && name) {
        await client.template.delete(name);
        console.log(chalk.green(`✅ Template '${name}' deleted`));
      } else {
        console.log(chalk.red('✗ Invalid action or missing template name'));
        console.log(chalk.gray('Usage: template <list|use|create|delete> [name]'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Template operation failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// Batch Command
// ============================================

program
  .command('batch <pattern>')
  .description('Process multiple diagrams')
  .option('--convert <format>', 'Convert to format (mermaid, plantuml)')
  .option('--render <format>', 'Render to image format (svg, png, pdf)')
  .option('--validate', 'Validate all diagrams', false)
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--concurrency <n>', 'Parallel processing', parseInt, 5)
  .action(async (pattern, options) => {
    try {
      console.log(chalk.blue('⚙️ Batch processing diagrams...'));

      const operation = options.convert ? 'convert' : options.render ? 'render' : options.validate ? 'validate' : null;
      
      if (!operation) {
        console.log(chalk.red('✗ Specify one operation: --convert, --render, or --validate'));
        process.exit(1);
      }

      const results = await client.batch.process([pattern], {
        operation,
        targetFormat: options.convert,
        format: options.render,
        outputDirectory: options.output,
        concurrency: options.concurrency
      });

      console.log(chalk.cyan('\nBatch Results:'));
      console.log(`  Total: ${results.total}`);
      console.log(chalk.green(`  Successful: ${results.successful}`));
      
      if (results.failed.length > 0) {
        console.log(chalk.red(`  Failed: ${results.failed.length}`));
        console.log(chalk.red('\nFailed Files:'));
        results.failed.forEach((file: string) => console.log(`  - ${file}`));
      }

      console.log(chalk.green('\n✅ Batch processing complete'));
    } catch (error) {
      console.error(chalk.red('✗ Batch processing failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// Diagnose Command
// ============================================

program
  .command('diagnose')
  .description('System diagnostics and configuration check')
  .action(async () => {
    console.log(chalk.cyan('🔍 Running diagnostics...\n'));

    // Node.js version
    console.log(chalk.blue('Node.js:'), process.version);
    
    // Environment variables
    console.log(chalk.blue('\nConfiguration:'));
    console.log(`  API Rendering: ${process.env.ENABLE_API_RENDERING === 'true' ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
    console.log(`  Mermaid.ink URL: ${process.env.MERMAID_INK_URL || 'Default'}`);
    console.log(`  PlantUML Server: ${process.env.PLANTUML_SERVER_URL || 'Default'}`);
    console.log(`  Default Format: ${process.env.DEFAULT_RENDER_FORMAT || 'svg'}`);
    console.log(`  Default Type: ${process.env.DEFAULT_DIAGRAM_TYPE || 'flowchart'}`);
    console.log(`  Template Dir: ${process.env.TEMPLATE_DIRECTORY || './templates'}`);
    console.log(`  Output Dir: ${process.env.OUTPUT_DIRECTORY || './output'}`);
    
    // Check directories
    console.log(chalk.blue('\nDirectories:'));
    const templateDir = process.env.TEMPLATE_DIRECTORY || './templates';
    const outputDir = process.env.OUTPUT_DIRECTORY || './output';
    
    console.log(`  Templates: ${await fs.pathExists(templateDir) ? chalk.green('✓') : chalk.yellow('✗ (will be created)')}`);
    console.log(`  Output: ${await fs.pathExists(outputDir) ? chalk.green('✓') : chalk.yellow('✗ (will be created)')}`);
    
    // Check dependencies
    console.log(chalk.blue('\nDependencies:'));
    try {
      require('axios');
      console.log(`  axios: ${chalk.green('✓')}`);
    } catch {
      console.log(`  axios: ${chalk.red('✗ Missing')}`);
    }
    
    try {
      require('js-yaml');
      console.log(`  js-yaml: ${chalk.green('✓')}`);
    } catch {
      console.log(`  js-yaml: ${chalk.red('✗ Missing')}`);
    }
    
    // Test basic functionality
    console.log(chalk.blue('\nFunctionality:'));
    try {
      const testClient = new ModelClient();
      const diagram = await testClient.generate.fromNaturalLanguage('Test', { type: 'flowchart' });
      console.log(`  Generation: ${chalk.green('✓')}`);
    } catch (error) {
      console.log(`  Generation: ${chalk.red('✗')}`);
    }
    
    console.log(chalk.green('\n✅ Diagnostics complete'));
  });

program.parse();
