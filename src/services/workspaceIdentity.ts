/**
 * Workspace Identity Detection Service
 * 
 * Detects the project type, language, and framework of the current
 * workspace by inspecting project files (package.json, pom.xml, etc.).
 * Returns suggested AI Kits based on the detected identity.
 * 
 * Part of AICC-0098: Default Kit Auto-Loading
 *   - AICC-0272: Workspace identity detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../logger';

/**
 * Describes the detected identity of a workspace.
 */
export interface WorkspaceIdentity {
    /** Primary language detected (e.g., 'typescript', 'python', 'java') */
    language: string;
    /** Framework detected, if any (e.g., 'react', 'spring', 'django') */
    framework?: string;
    /** Project type classification (e.g., 'web-app', 'library', 'cli') */
    projectType?: string;
    /** Whether an ai-ley configuration directory already exists */
    hasAiLey: boolean;
    /** List of suggested kit names based on the detected identity */
    kitSuggestions: string[];
}

/**
 * Configuration for auto-loading kits on workspace activation.
 */
export interface AutoLoadConfig {
    /** Whether auto-loading is enabled */
    enabled: boolean;
    /** Kit names to always load regardless of detection */
    defaultKits: string[];
    /** Whether to trigger auto-load on extension activation */
    onActivation: boolean;
}

/** Internal detection rule mapping a marker file to a language / framework */
interface DetectionRule {
    /** File or directory to check for (relative to workspace root) */
    marker: string;
    /** Whether the marker is a directory */
    isDirectory?: boolean;
    /** Language to assign when the marker is found */
    language: string;
    /** Framework to assign (optional) */
    framework?: string;
    /** Project type to assign (optional) */
    projectType?: string;
    /** Kit names to suggest */
    kits: string[];
}

/** Ordered list of detection rules — first match wins per category */
const DETECTION_RULES: DetectionRule[] = [
    // Node / TypeScript
    {
        marker: 'tsconfig.json',
        language: 'typescript',
        projectType: 'node',
        kits: ['ailey-typescript', 'ailey-node']
    },
    {
        marker: 'package.json',
        language: 'javascript',
        projectType: 'node',
        kits: ['ailey-node']
    },
    // Python
    {
        marker: 'pyproject.toml',
        language: 'python',
        kits: ['ailey-python']
    },
    {
        marker: 'requirements.txt',
        language: 'python',
        kits: ['ailey-python']
    },
    {
        marker: 'setup.py',
        language: 'python',
        kits: ['ailey-python']
    },
    {
        marker: 'Pipfile',
        language: 'python',
        kits: ['ailey-python']
    },
    // Java / Kotlin
    {
        marker: 'pom.xml',
        language: 'java',
        framework: 'maven',
        projectType: 'jvm',
        kits: ['ailey-java']
    },
    {
        marker: 'build.gradle',
        language: 'java',
        framework: 'gradle',
        projectType: 'jvm',
        kits: ['ailey-java']
    },
    {
        marker: 'build.gradle.kts',
        language: 'kotlin',
        framework: 'gradle',
        projectType: 'jvm',
        kits: ['ailey-kotlin', 'ailey-java']
    },
    // .NET / C#
    {
        marker: '*.csproj',
        language: 'csharp',
        framework: 'dotnet',
        projectType: 'dotnet',
        kits: ['ailey-dotnet']
    },
    {
        marker: '*.sln',
        language: 'csharp',
        framework: 'dotnet',
        projectType: 'dotnet',
        kits: ['ailey-dotnet']
    },
    // Go
    {
        marker: 'go.mod',
        language: 'go',
        kits: ['ailey-go']
    },
    // Rust
    {
        marker: 'Cargo.toml',
        language: 'rust',
        kits: ['ailey-rust']
    },
    // Ruby
    {
        marker: 'Gemfile',
        language: 'ruby',
        kits: ['ailey-ruby']
    },
    // PHP
    {
        marker: 'composer.json',
        language: 'php',
        kits: ['ailey-php']
    },
    // Swift
    {
        marker: 'Package.swift',
        language: 'swift',
        kits: ['ailey-swift']
    },
    // Dart / Flutter
    {
        marker: 'pubspec.yaml',
        language: 'dart',
        framework: 'flutter',
        kits: ['ailey-dart']
    }
];

/** Framework sub-detection for Node projects (reads package.json dependencies) */
interface FrameworkHint {
    /** Dependency name to look for in package.json */
    dependency: string;
    /** Framework name to assign */
    framework: string;
    /** Project type override */
    projectType?: string;
    /** Additional kits to suggest */
    kits: string[];
}

const NODE_FRAMEWORK_HINTS: FrameworkHint[] = [
    { dependency: 'react', framework: 'react', projectType: 'web-app', kits: ['ailey-react'] },
    { dependency: 'next', framework: 'nextjs', projectType: 'web-app', kits: ['ailey-nextjs'] },
    { dependency: 'vue', framework: 'vue', projectType: 'web-app', kits: ['ailey-vue'] },
    { dependency: 'nuxt', framework: 'nuxt', projectType: 'web-app', kits: ['ailey-nuxt'] },
    { dependency: '@angular/core', framework: 'angular', projectType: 'web-app', kits: ['ailey-angular'] },
    { dependency: 'svelte', framework: 'svelte', projectType: 'web-app', kits: ['ailey-svelte'] },
    { dependency: 'express', framework: 'express', projectType: 'api', kits: ['ailey-express'] },
    { dependency: 'fastify', framework: 'fastify', projectType: 'api', kits: ['ailey-fastify'] },
    { dependency: 'nestjs', framework: 'nestjs', projectType: 'api', kits: ['ailey-nestjs'] },
    { dependency: '@nestjs/core', framework: 'nestjs', projectType: 'api', kits: ['ailey-nestjs'] },
    { dependency: 'electron', framework: 'electron', projectType: 'desktop', kits: ['ailey-electron'] }
];

/**
 * WorkspaceIdentityDetector inspects workspace files to determine
 * the project language, framework, and type, then suggests
 * appropriate AI Kits for the workspace.
 */
export class WorkspaceIdentityDetector {
    private readonly logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Detect the identity of the current workspace.
     * 
     * Checks for known marker files (package.json, pom.xml, etc.)
     * and reads dependency lists to refine framework detection.
     * 
     * @param workspacePath - Absolute path to the workspace root.
     *                        Defaults to the first open workspace folder.
     * @returns Detected workspace identity with kit suggestions
     */
    public async detectWorkspaceIdentity(
        workspacePath?: string
    ): Promise<WorkspaceIdentity> {
        const wsPath = workspacePath
            ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!wsPath) {
            this.logger.warn('No workspace folder available for identity detection');
            return {
                language: 'unknown',
                hasAiLey: false,
                kitSuggestions: []
            };
        }

        // Check for existing ai-ley setup
        const hasAiLey = fs.existsSync(path.join(wsPath, '.github', 'ai-ley'))
            || fs.existsSync(path.join(wsPath, '.ai-ley'));

        // Run detection rules
        let language = 'unknown';
        let framework: string | undefined;
        let projectType: string | undefined;
        const kitSuggestions = new Set<string>();

        for (const rule of DETECTION_RULES) {
            const markerPath = path.join(wsPath, rule.marker);

            // Handle glob markers (*.csproj, *.sln)
            let found = false;
            if (rule.marker.includes('*')) {
                found = this.hasGlobMatch(wsPath, rule.marker);
            } else {
                found = fs.existsSync(markerPath);
            }

            if (found) {
                if (language === 'unknown') {
                    language = rule.language;
                }
                if (!framework && rule.framework) {
                    framework = rule.framework;
                }
                if (!projectType && rule.projectType) {
                    projectType = rule.projectType;
                }
                for (const kit of rule.kits) {
                    kitSuggestions.add(kit);
                }
            }
        }

        // Refine Node projects by reading package.json dependencies
        if ((language === 'javascript' || language === 'typescript') &&
            fs.existsSync(path.join(wsPath, 'package.json'))) {
            try {
                const pkgContent = fs.readFileSync(
                    path.join(wsPath, 'package.json'),
                    'utf-8'
                );
                const pkg = JSON.parse(pkgContent);
                const allDeps = {
                    ...pkg.dependencies,
                    ...pkg.devDependencies
                };

                for (const hint of NODE_FRAMEWORK_HINTS) {
                    if (allDeps[hint.dependency]) {
                        framework = framework ?? hint.framework;
                        projectType = projectType ?? hint.projectType;
                        for (const kit of hint.kits) {
                            kitSuggestions.add(kit);
                        }
                        break; // Use first match for framework
                    }
                }
            } catch {
                // package.json parse failure — continue with what we have
            }
        }

        const identity: WorkspaceIdentity = {
            language,
            framework,
            projectType,
            hasAiLey,
            kitSuggestions: Array.from(kitSuggestions)
        };

        this.logger.info('Workspace identity detected', {
            language: identity.language,
            framework: identity.framework,
            projectType: identity.projectType,
            hasAiLey: identity.hasAiLey,
            suggestions: identity.kitSuggestions.length
        });

        return identity;
    }

    // ─── Private Helpers ─────────────────────────────────────────────

    /**
     * Check if any file in the workspace root matches a simple glob pattern.
     * Supports patterns like `*.csproj`.
     */
    private hasGlobMatch(dir: string, pattern: string): boolean {
        try {
            const ext = pattern.replace('*', '');
            const files = fs.readdirSync(dir);
            return files.some(f => f.endsWith(ext));
        } catch {
            return false;
        }
    }
}
