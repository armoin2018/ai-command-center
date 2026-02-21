#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig } from './config.js';
import { listCatalogItems } from './catalog-manager.js';
import { installKit, updateKit, removeKit, evolveKit } from './kit-operations.js';
import { loadKitConfig, saveKitConfig, getKitPaths } from './config.js';

const program = new Command();

program
  .name('catalog')
  .description('AI Kit Catalog Management Tool')
  .version('1.0.0');

/**
 * List kits in catalog
 */
program
  .command('list')
  .description('List all kits in catalog')
  .option('-i, --installed', 'Show only installed kits')
  .option('-c, --custom', 'Show only custom kits')
  .option('-p, --pattern <pattern>', 'Filter by name pattern (regex)')
  .option('--has-icon', 'Show only kits with icons')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const config = getConfig();
      config.verbose = options.verbose || config.verbose;
      
      const items = await listCatalogItems(config, {
        installed: options.installed,
        custom: options.custom,
        namePattern: options.pattern,
        hasIcon: options.hasIcon,
      });
      
      if (items.length === 0) {
        console.log(chalk.yellow('\nNo kits found matching criteria'));
        return;
      }
      
      console.log(chalk.blue(`\n📦 AI Kit Catalog (${items.length} kits)\n`));
      
      for (const item of items) {
        const icon = item.installed ? '✓' : ' ';
        const type = item.custom ? chalk.magenta('[CUSTOM]') : chalk.gray('[DEFAULT]');
        const name = chalk.cyan(item.name);
        const desc = item.structure.description ? chalk.gray(` - ${item.structure.description}`) : '';
        
        console.log(`${icon} ${name} ${type}${desc}`);
        
        if (options.verbose) {
          console.log(chalk.gray(`  Repository: ${item.structure.repo}`));
          console.log(chalk.gray(`  Branch: ${item.structure.branch}`));
          if (item.structure.dependencies && item.structure.dependencies.length > 0) {
            console.log(chalk.gray(`  Dependencies: ${item.structure.dependencies.join(', ')}`));
          }
          console.log('');
        }
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Install a kit
 */
program
  .command('install <kitName>')
  .description('Install a kit from catalog')
  .option('-f, --force', 'Force reinstall if already installed')
  .option('--skip-deps', 'Skip dependency installation')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Dry run (no actual changes)')
  .action(async (kitName, options) => {
    try {
      const config = getConfig();
      config.verbose = options.verbose || config.verbose;
      config.dryRun = options.dryRun || config.dryRun;
      
      await installKit(kitName, config, {
        force: options.force,
        skipDependencies: options.skipDeps,
        verbose: config.verbose,
        dryRun: config.dryRun,
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Update a kit
 */
program
  .command('update <kitName>')
  .description('Update an installed kit')
  .option('-f, --force', 'Force update regardless of refresh interval')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Dry run (no actual changes)')
  .action(async (kitName, options) => {
    try {
      const config = getConfig();
      config.verbose = options.verbose || config.verbose;
      config.dryRun = options.dryRun || config.dryRun;
      
      await updateKit(kitName, config, {
        force: options.force,
        verbose: config.verbose,
        dryRun: config.dryRun,
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Remove a kit
 */
program
  .command('remove <kitName>')
  .description('Remove an installed kit')
  .option('-f, --force', 'Force removal without confirmation')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Dry run (no actual changes)')
  .action(async (kitName, options) => {
    try {
      const config = getConfig();
      config.verbose = options.verbose || config.verbose;
      config.dryRun = options.dryRun || config.dryRun;
      
      if (!options.force && !config.dryRun) {
        console.log(chalk.yellow(`\n⚠️  This will remove kit "${kitName}" and all its files.`));
        console.log(chalk.yellow('Use --force to confirm, or Ctrl+C to cancel.'));
        process.exit(0);
      }
      
      await removeKit(kitName, config, {
        force: options.force,
        verbose: config.verbose,
        dryRun: config.dryRun,
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Configure a kit
 */
program
  .command('configure <kitName>')
  .description('Configure kit options')
  .option('-s, --set <key=value...>', 'Set configuration values')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-l, --list', 'List all configuration values')
  .option('-v, --verbose', 'Verbose output')
  .action(async (kitName, options) => {
    try {
      const config = getConfig();
      const paths = getKitPaths(kitName, config, false);
      
      if (options.list) {
        const values = await loadKitConfig(paths.configValuesPath);
        console.log(chalk.blue(`\n⚙️  Configuration for ${kitName}:\n`));
        for (const [key, value] of Object.entries(values)) {
          console.log(`${chalk.cyan(key)}: ${chalk.gray(JSON.stringify(value))}`);
        }
        return;
      }
      
      if (options.get) {
        const values = await loadKitConfig(paths.configValuesPath);
        const value = values[options.get];
        if (value !== undefined) {
          console.log(chalk.cyan(JSON.stringify(value, null, 2)));
        } else {
          console.log(chalk.yellow(`Key "${options.get}" not found`));
        }
        return;
      }
      
      if (options.set && Array.isArray(options.set)) {
        const values = await loadKitConfig(paths.configValuesPath);
        
        for (const pair of options.set) {
          const [key, ...valueParts] = pair.split('=');
          const value = valueParts.join('=');
          
          try {
            values[key] = JSON.parse(value);
          } catch {
            values[key] = value;
          }
          
          console.log(chalk.green(`✓ Set ${chalk.cyan(key)} = ${chalk.gray(value)}`));
        }
        
        await saveKitConfig(paths.configValuesPath, values);
        console.log(chalk.green(`\n✨ Configuration saved!`));
        return;
      }
      
      console.log(chalk.yellow('\nNo action specified. Use --set, --get, or --list'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Evolve a kit (contribute back)
 */
program
  .command('evolve <kitName>')
  .description('Contribute changes back to kit repository')
  .option('-b, --branch <name>', 'Branch name for evolution')
  .option('-m, --message <message>', 'Commit message')
  .option('--pr', 'Instructions for creating pull request')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Dry run (no actual changes)')
  .action(async (kitName, options) => {
    try {
      const config = getConfig();
      config.verbose = options.verbose || config.verbose;
      config.dryRun = options.dryRun || config.dryRun;
      
      await evolveKit(kitName, config, {
        branchName: options.branch,
        commitMessage: options.message,
        createPR: options.pr,
        verbose: config.verbose,
        dryRun: config.dryRun,
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
