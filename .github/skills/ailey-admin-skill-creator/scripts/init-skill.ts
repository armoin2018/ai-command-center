#!/usr/bin/env node
/**
 * Skill Initializer - Creates a new skill from template
 * 
 * Usage:
 *   node init-skill.ts <skill-name> --path <output-directory>
 * 
 * Examples:
 *   node init-skill.ts my-new-skill --path .github/skills
 *   node init-skill.ts ailey-custom-skill --path .github/skills
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SkillConfig {
  name: string;
  title: string;
  outputPath: string;
}

const SKILL_TEMPLATE = `---
name: {skillName}
description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
---

# {skillTitle}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Structuring This Skill

[TODO: Choose the structure that best fits this skill's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Works well when there are clear step-by-step procedures
- Structure: ## Overview → ## Workflow Decision Tree → ## Step 1 → ## Step 2

**2. Task-Based** (best for tool collections)
- Works well when the skill offers different operations/capabilities
- Structure: ## Overview → ## Quick Start → ## Task Category 1 → ## Task Category 2

**3. Reference/Guidelines** (best for standards or specifications)
- Works well for brand guidelines, coding standards, or requirements
- Structure: ## Overview → ## Guidelines → ## Specifications → ## Usage

**4. Capabilities-Based** (best for integrated systems)
- Works well when the skill provides multiple interrelated features
- Structure: ## Overview → ## Core Capabilities → ### 1. Feature → ### 2. Feature

Delete this entire "Structuring This Skill" section when done - it's just guidance.]

## [TODO: Replace with first main section based on chosen structure]

[TODO: Add content here. See examples in existing skills:
- Code samples for technical skills
- Decision trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/templates/references as needed]

## Resources

This skill includes example resource directories:

### scripts/
Executable TypeScript code for deterministic operations.
See [example.ts](./scripts/example.ts) for template structure.

### references/
Documentation and reference material loaded into context as needed.
See [api_reference.md](./references/api_reference.md) for template structure.

### assets/
Files used in output, not loaded into context.
See [example_asset.txt](./assets/example_asset.txt) for example.

**Delete any unneeded directories.** Not every skill requires all three types.

---

**Version**: 1.0.0  
**Created**: {date}
`;

const EXAMPLE_SCRIPT = `#!/usr/bin/env node
/**
 * Example helper script for {skillName}
 * 
 * This is a placeholder script that can be executed directly.
 * Replace with actual implementation or delete if not needed.
 * 
 * Usage:
 *   node example.ts [arguments]
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Main function - replace with actual implementation
 */
async function main(): Promise<void> {
  console.log('✅ Example script for {skillName}');
  
  // TODO: Add actual script logic here
  // Examples:
  // - Data processing
  // - File conversion
  // - API calls
  // - Code generation
}

// Execute
main().catch((error: Error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

// Export for module usage
export { main };
`;

const EXAMPLE_REFERENCE = `# Reference Documentation for {skillTitle}

This is a placeholder for detailed reference documentation.
Replace with actual reference content or delete if not needed.

## Table of Contents

- [Overview](#overview)
- [API Reference](#api-reference)
- [Examples](#examples)

## Overview

Brief overview of what this reference covers.

## API Reference

Detailed API documentation, schemas, or specifications.

## Examples

Concrete examples showing usage patterns.

---

**Note**: For files >100 lines, include a table of contents at the top.
`;

const EXAMPLE_ASSET = `# Example Asset File

This placeholder represents where asset files would be stored.
Replace with actual asset files or delete if not needed.

Asset files are NOT loaded into context but used in output.

Example asset types:
- Templates: .pptx, .docx, .html
- Images: .png, .jpg, .svg
- Fonts: .ttf, .woff2
- Boilerplate code: Project directories
- Sample data: .csv, .json

Delete this file and add actual assets as needed.
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./scripts",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["scripts/**/*"],
  "exclude": ["node_modules", "dist"]
}
`;

const PACKAGE_JSON = `{
  "name": "{skillName}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "AI-ley skill: {skillTitle}",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
`;

const MCP_CONFIG = `{
  "mcpServers": {
    "{skillName}": {
      "command": "node",
      "args": [
        ".github/skills/{skillName}/scripts/mcp-server.js"
      ],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
`;

const MCP_SERVER_SCRIPT = `#!/usr/bin/env node
/**
 * MCP Server for {skillName}
 * 
 * Model Context Protocol (MCP) server providing tools and resources
 * for the {skillTitle} skill.
 * 
 * To enable this MCP server:
 * 1. Uncomment and implement the tool/resource handlers below
 * 2. Add dependencies to package.json: @modelcontextprotocol/sdk
 * 3. Update .github/skills/{skillName}/mcp.json with required configuration
 * 4. Reference this configuration in your VS Code settings or MCP client
 * 
 * Usage:
 *   node mcp-server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Tool definitions for this skill
const TOOLS: Tool[] = [
  // TODO: Define your tools here
  // Example:
  // {
  //   name: '{skillName}-example-tool',
  //   description: 'Example tool for {skillTitle}',
  //   inputSchema: {
  //     type: 'object',
  //     properties: {
  //       input: {
  //         type: 'string',
  //         description: 'Input parameter',
  //       },
  //     },
  //     required: ['input'],
  //   },
  // },
];

/**
 * Initialize and start the MCP server
 */
async function main(): Promise<void> {
  const server = new Server(
    {
      name: '{skillName}',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        // resources: {}, // Uncomment if providing resources
        // prompts: {},   // Uncomment if providing prompts
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // TODO: Implement tool handlers
    switch (name) {
      // case '{skillName}-example-tool':
      //   return {
      //     content: [
      //       {
      //         type: 'text',
      //         text: \`Example result: \${args.input}\`,
      //       },
      //     ],
      //   };

      default:
        throw new Error(\`Unknown tool: \${name}\`);
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('{skillTitle} MCP server started');
}

// Execute
main().catch((error: Error) => {
  console.error('MCP Server Error:', error);
  process.exit(1);
});
`;

const VSCODE_TOOLSET = `{
  "version": "0.1.0",
  "tools": [
    {
      "name": "{skillName}",
      "displayName": "{skillTitle}",
      "description": "TODO: Add description of what this tool does and when to use it",
      "modelDescription": "TODO: Add detailed description for AI model including parameters, expected inputs, and use cases",
      "inputSchema": {
        "type": "object",
        "properties": {
          "action": {
            "type": "string",
            "description": "The action to perform",
            "enum": ["example-action"]
          }
        },
        "required": ["action"]
      }
    }
  ]
}
`;

/**
 * Convert hyphenated skill name to Title Case
 */
function toTitleCase(skillName: string): string {
  return skillName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate skill name format
 */
function validateSkillName(name: string): boolean {
  // Must be lowercase, hyphens only, max 64 chars
  const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return regex.test(name) && name.length <= 64;
}

/**
 * Initialize a new skill directory with template files
 */
async function initSkill(config: SkillConfig): Promise<void> {
  const { name, title, outputPath } = config;
  const skillDir = path.join(outputPath, name);

  // Check if directory already exists
  try {
    await fs.access(skillDir);
    throw new Error(`Skill directory already exists: ${skillDir}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Create skill directory
  await fs.mkdir(skillDir, { recursive: true });
  console.log(`✅ Created skill directory: ${skillDir}`);

  // Create SKILL.md
  const skillMd = SKILL_TEMPLATE
    .replace(/{skillName}/g, name)
    .replace(/{skillTitle}/g, title)
    .replace(/{date}/g, new Date().toISOString().split('T')[0]);
  
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf-8');
  console.log('✅ Created SKILL.md');

  // Create scripts directory
  const scriptsDir = path.join(skillDir, 'scripts');
  await fs.mkdir(scriptsDir, { recursive: true });
  
  const exampleScript = EXAMPLE_SCRIPT.replace(/{skillName}/g, name);
  const scriptPath = path.join(scriptsDir, 'example.ts');
  await fs.writeFile(scriptPath, exampleScript, 'utf-8');
  await fs.chmod(scriptPath, 0o755);
  console.log('✅ Created scripts/example.ts');

  // Create references directory
  const referencesDir = path.join(skillDir, 'references');
  await fs.mkdir(referencesDir, { recursive: true });
  
  const exampleReference = EXAMPLE_REFERENCE.replace(/{skillTitle}/g, title);
  await fs.writeFile(
    path.join(referencesDir, 'api_reference.md'),
    exampleReference,
    'utf-8'
  );
  console.log('✅ Created references/api_reference.md');

  // Create assets directory
  const assetsDir = path.join(skillDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });
  
  await fs.writeFile(
    path.join(assetsDir, 'example_asset.txt'),
    EXAMPLE_ASSET,
    'utf-8'
  );
  console.log('✅ Created assets/example_asset.txt');

  // Create tsconfig.json
  await fs.writeFile(
    path.join(skillDir, 'tsconfig.json'),
    TSCONFIG,
    'utf-8'
  );
  console.log('✅ Created tsconfig.json');

  // Create package.json
  const packageJson = PACKAGE_JSON
    .replace(/{skillName}/g, name)
    .replace(/{skillTitle}/g, title);
  
  await fs.writeFile(
    path.join(skillDir, 'package.json'),
    packageJson,
    'utf-8'
  );
  console.log('✅ Created package.json');

  // Create MCP configuration
  const mcpConfig = MCP_CONFIG.replace(/{skillName}/g, name);
  await fs.writeFile(
    path.join(skillDir, 'mcp.json'),
    mcpConfig,
    'utf-8'
  );
  console.log('✅ Created mcp.json (MCP stdio configuration)');

  // Create MCP server script
  const mcpServer = MCP_SERVER_SCRIPT
    .replace(/{skillName}/g, name)
    .replace(/{skillTitle}/g, title);
  const mcpServerPath = path.join(scriptsDir, 'mcp-server.ts');
  await fs.writeFile(mcpServerPath, mcpServer, 'utf-8');
  await fs.chmod(mcpServerPath, 0o755);
  console.log('✅ Created scripts/mcp-server.ts');

  // Create VS Code toolset configuration
  const vscodeToolset = VSCODE_TOOLSET
    .replace(/{skillName}/g, name)
    .replace(/{skillTitle}/g, title);
  await fs.writeFile(
    path.join(skillDir, 'toolset.json'),
    vscodeToolset,
    'utf-8'
  );
  console.log('✅ Created toolset.json (VS Code toolset configuration)');

  // Print next steps
  console.log(`\n✅ Skill '${name}' initialized successfully at ${skillDir}`);
  console.log('\nNext steps:');
  console.log('1. Edit SKILL.md to complete the TODO items');
  console.log('2. Update description in SKILL.md frontmatter');
  console.log('3. Customize or delete example files in scripts/, references/, and assets/');
  console.log('4. Configure MCP server in mcp.json and scripts/mcp-server.ts (if needed)');
  console.log('5. Configure VS Code toolset in toolset.json (if needed)');
  console.log('6. Run npm install (if using dependencies)');
  console.log('7. Test the skill in VS Code with chat.useAgentSkills enabled');
}

/**
 * Parse command line arguments
 */
function parseArgs(): SkillConfig | null {
  const args = process.argv.slice(2);

  if (args.length < 3 || args[1] !== '--path') {
    return null;
  }

  const skillName = args[0];
  const outputPath = args[2];

  if (!validateSkillName(skillName)) {
    console.error('❌ Invalid skill name format');
    console.error('   Must be lowercase, use hyphens, and be max 64 characters');
    console.error('   Examples: my-skill, data-processor, ailey-custom-tool');
    return null;
  }

  const skillTitle = toTitleCase(skillName);

  return {
    name: skillName,
    title: skillTitle,
    outputPath,
  };
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log('Usage: init-skill.ts <skill-name> --path <output-directory>');
  console.log('\nSkill name requirements:');
  console.log('  - Lowercase letters, digits, and hyphens only');
  console.log('  - Max 64 characters');
  console.log('  - Must match directory name exactly');
  console.log('\nExamples:');
  console.log('  init-skill.ts my-new-skill --path .github/skills');
  console.log('  init-skill.ts ailey-api-helper --path .github/skills');
  console.log('  init-skill.ts custom-skill --path /custom/location');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const config = parseArgs();

  if (!config) {
    printUsage();
    process.exit(1);
  }

  console.log(`🚀 Initializing skill: ${config.name}`);
  console.log(`   Location: ${config.outputPath}`);
  console.log('');

  await initSkill(config);
}

// Execute
main().catch((error: Error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

// Export for module usage
export { initSkill, validateSkillName, toTitleCase };
