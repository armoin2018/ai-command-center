#!/usr/bin/env node
/**
 * Skill Validator - Validates skill structure and content
 * 
 * Usage:
 *   node validate-skill.ts <path-to-skill>
 * 
 * Examples:
 *   node validate-skill.ts .github/skills/my-skill
 *   node validate-skill.ts ../ailey-custom-skill
 */

import { promises as fs } from 'fs';
import path from 'path';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface SkillMetadata {
  name: string;
  description: string;
  [key: string]: any;
}

/**
 * Validate YAML frontmatter format
 */
function extractFrontmatter(content: string): SkillMetadata | null {
  if (!content.startsWith('---\n')) {
    return null;
  }

  const endIndex = content.indexOf('\n---', 4);
  if (endIndex === -1) {
    return null;
  }

  const frontmatterText = content.substring(4, endIndex);
  const lines = frontmatterText.split('\n');
  const metadata: any = {};

  for (const line of lines) {
    if (!line.trim()) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    metadata[key] = value;
  }

  return metadata;
}

/**
 * Validate skill name format
 */
function validateName(name: string): string[] {
  const errors: string[] = [];

  if (!name) {
    errors.push('Missing required field: name');
    return errors;
  }

  const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!regex.test(name)) {
    errors.push('Name must be lowercase with hyphens only (e.g., "my-skill")');
  }

  if (name.length > 64) {
    errors.push(`Name exceeds 64 characters (${name.length} chars)`);
  }

  return errors;
}

/**
 * Validate skill description
 */
function validateDescription(description: string): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!description) {
    errors.push('Missing required field: description');
    return errors;
  }

  if (description.length > 1024) {
    errors.push(`Description exceeds 1024 characters (${description.length} chars)`);
  }

  if (description.length < 50) {
    warnings.push('Description is very short - consider adding more detail about when to use this skill');
  }

  // Check for common missing elements
  const lowerDesc = description.toLowerCase();
  if (!lowerDesc.includes('when') && !lowerDesc.includes('use')) {
    warnings.push('Description should include when to use this skill (triggers/contexts)');
  }

  return errors;
}

/**
 * Validate SKILL.md file
 */
async function validateSkillMd(skillPath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const skillMdPath = path.join(skillPath, 'SKILL.md');

  try {
    const content = await fs.readFile(skillMdPath, 'utf-8');

    // Extract frontmatter
    const metadata = extractFrontmatter(content);

    if (!metadata) {
      result.errors.push('Invalid or missing YAML frontmatter');
      result.valid = false;
      return result;
    }

    // Validate name
    const nameErrors = validateName(metadata.name);
    result.errors.push(...nameErrors);

    // Validate description
    const descErrors = validateDescription(metadata.description);
    result.errors.push(...descErrors);

    // Check for extra frontmatter fields
    const allowedFields = ['name', 'description'];
    const extraFields = Object.keys(metadata).filter(
      key => !allowedFields.includes(key)
    );

    if (extraFields.length > 0) {
      result.warnings.push(
        `Extra frontmatter fields detected (should only have name and description): ${extraFields.join(', ')}`
      );
    }

    // Validate body exists
    const bodyStart = content.indexOf('\n---', 4) + 5;
    const body = content.substring(bodyStart).trim();

    if (body.length < 100) {
      result.warnings.push('SKILL.md body is very short - consider adding more instructions');
    }

    // Check for TODO markers
    if (body.includes('[TODO:')) {
      result.warnings.push('SKILL.md contains TODO markers - complete these before finalizing');
    }

    // Check body length
    const bodyLines = body.split('\n').length;
    if (bodyLines > 500) {
      result.warnings.push(
        `SKILL.md body is ${bodyLines} lines - consider splitting content into reference files to keep under 500 lines`
      );
    }

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      result.errors.push('SKILL.md file not found');
    } else {
      result.errors.push(`Error reading SKILL.md: ${error.message}`);
    }
    result.valid = false;
  }

  if (result.errors.length > 0) {
    result.valid = false;
  }

  return result;
}

/**
 * Validate skill directory structure
 */
async function validateStructure(skillPath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const stat = await fs.stat(skillPath);
    if (!stat.isDirectory()) {
      result.errors.push('Path is not a directory');
      result.valid = false;
      return result;
    }

    const entries = await fs.readdir(skillPath);

    // Check for SKILL.md
    if (!entries.includes('SKILL.md')) {
      result.errors.push('Missing required SKILL.md file');
      result.valid = false;
    }

    // Check for common extraneous files
    const extraneousFiles = [
      'README.md',
      'INSTALLATION_GUIDE.md',
      'CHANGELOG.md',
      'QUICK_REFERENCE.md',
    ];

    for (const file of extraneousFiles) {
      if (entries.includes(file)) {
        result.warnings.push(
          `Found extraneous file: ${file} - skill should be self-documenting via SKILL.md`
        );
      }
    }

    // Check optional directories
    const optionalDirs = ['scripts', 'references', 'assets'];
    const presentDirs = optionalDirs.filter(dir => entries.includes(dir));

    if (presentDirs.length === 0) {
      result.warnings.push(
        'No resource directories found (scripts, references, assets) - this is okay if skill only needs instructions'
      );
    }

    // Validate scripts are executable if present
    if (entries.includes('scripts')) {
      const scriptsPath = path.join(skillPath, 'scripts');
      const scripts = await fs.readdir(scriptsPath);

      for (const script of scripts) {
        if (script.endsWith('.ts') || script.endsWith('.js')) {
          const scriptPath = path.join(scriptsPath, script);
          const content = await fs.readFile(scriptPath, 'utf-8');

          if (!content.startsWith('#!/usr/bin/env node')) {
            result.warnings.push(
              `Script ${script} missing shebang - should start with #!/usr/bin/env node`
            );
          }

          if (!content.includes('if (require.main === module)')) {
            result.warnings.push(
              `Script ${script} should support standalone execution with 'if (require.main === module)'`
            );
          }
        }
      }
    }

  } catch (error: any) {
    result.errors.push(`Error validating structure: ${error.message}`);
    result.valid = false;
  }

  return result;
}

/**
 * Validate entire skill
 */
async function validateSkill(skillPath: string): Promise<ValidationResult> {
  const combinedResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Validate structure
  const structureResult = await validateStructure(skillPath);
  combinedResult.errors.push(...structureResult.errors);
  combinedResult.warnings.push(...structureResult.warnings);

  if (!structureResult.valid) {
    combinedResult.valid = false;
    return combinedResult;
  }

  // Validate SKILL.md
  const skillMdResult = await validateSkillMd(skillPath);
  combinedResult.errors.push(...skillMdResult.errors);
  combinedResult.warnings.push(...skillMdResult.warnings);

  if (!skillMdResult.valid) {
    combinedResult.valid = false;
  }

  return combinedResult;
}

/**
 * Print validation results
 */
function printResults(result: ValidationResult, skillPath: string): void {
  console.log(`\n🔍 Validating skill: ${skillPath}\n`);

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
    console.log('');
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Skill validation passed with no issues!\n');
  } else if (result.valid) {
    console.log('✅ Skill validation passed with warnings.\n');
  } else {
    console.log('❌ Skill validation failed. Please fix errors before using.\n');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: validate-skill.ts <path-to-skill>');
    console.log('\nExamples:');
    console.log('  validate-skill.ts .github/skills/my-skill');
    console.log('  validate-skill.ts ../ailey-custom-skill');
    process.exit(1);
  }

  const skillPath = path.resolve(args[0]);
  const result = await validateSkill(skillPath);

  printResults(result, skillPath);

  process.exit(result.valid ? 0 : 1);
}

// Execute if run directly
if (require.main === module) {
  main().catch((error: Error) => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}

// Export for module usage
export { validateSkill, validateStructure, validateSkillMd };
