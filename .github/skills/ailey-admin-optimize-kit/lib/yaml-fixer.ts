/**
 * YAML Frontmatter Fixer
 * 
 * Automatically detects and fixes common YAML frontmatter errors:
 * - Invalid ** markers in keywords (e.g., **platform, **avoid)
 * - Unclosed flow collections (missing closing brackets)
 * - Unidentified aliases (e.g., *platform, *use, *avoid)
 * - Invalid escape sequences in file patterns
 * - Malformed arrays (missing commas, quotes)
 */

export interface YamlFixResult {
  success: boolean;
  fixed: boolean;
  changes: string[];
  errors: string[];
  originalContent?: string;
  fixedContent?: string;
}

export class YamlFixer {
  private changes: string[] = [];
  private errors: string[] = [];

  /**
   * Fix common YAML frontmatter errors in markdown content
   */
  fixYamlFrontmatter(content: string): YamlFixResult {
    this.changes = [];
    this.errors = [];

    try {
      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (!frontmatterMatch) {
        return {
          success: true,
          fixed: false,
          changes: [],
          errors: ['No YAML frontmatter found'],
        };
      }

      const originalFrontmatter = frontmatterMatch[1];
      let fixedFrontmatter = originalFrontmatter;

      // Apply fixes in order
      fixedFrontmatter = this.fixInvalidMarkers(fixedFrontmatter);
      fixedFrontmatter = this.fixUnidentifiedAliases(fixedFrontmatter);
      fixedFrontmatter = this.fixUnclosedArrays(fixedFrontmatter);
      fixedFrontmatter = this.fixEscapeSequences(fixedFrontmatter);
      fixedFrontmatter = this.fixMalformedArrays(fixedFrontmatter);

      // Check if any changes were made
      const fixed = fixedFrontmatter !== originalFrontmatter;

      if (fixed) {
        const fixedContent = content.replace(
          /^---\n[\s\S]*?\n---/,
          `---\n${fixedFrontmatter}\n---`
        );

        return {
          success: true,
          fixed: true,
          changes: this.changes,
          errors: [],
          originalContent: content,
          fixedContent,
        };
      }

      return {
        success: true,
        fixed: false,
        changes: [],
        errors: [],
      };

    } catch (error) {
      this.errors.push(`Failed to fix YAML: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        fixed: false,
        changes: this.changes,
        errors: this.errors,
      };
    }
  }

  /**
   * Fix invalid ** markers in keywords and other fields
   * Pattern: **word, **phrase (in both list and inline array formats)
   */
  private fixInvalidMarkers(yaml: string): string {
    // Fix ** in inline arrays: [**word, **phrase]
    const inlineArrayPattern = /(\[[^\]]*?\*\*[^\]]*?\])/g;
    yaml = yaml.replace(inlineArrayPattern, (match) => {
      const fixed = match.replace(/\*\*([a-zA-Z][a-zA-Z0-9-_]*)/g, (m, word) => {
        this.changes.push(`Removed invalid ** marker in inline array: **${word} → ${word}`);
        return word;
      });
      return fixed;
    });

    // Fix ** at start of list items: - **word
    const markerPattern = /(\s+-\s+)(\*\*[a-zA-Z][a-zA-Z0-9-_]*)/g;
    const matches = yaml.match(markerPattern);
    if (matches && matches.length > 0) {
      yaml = yaml.replace(markerPattern, (match, prefix, word) => {
        const cleaned = word.replace(/^\*\*/, '');
        this.changes.push(`Removed invalid ** marker: ${word} → ${cleaned}`);
        return `${prefix}${cleaned}`;
      });
    }

    // Fix ** at end of words
    const endMarkerPattern = /([a-zA-Z][a-zA-Z0-9-_]*)(\*\*)/g;
    yaml = yaml.replace(endMarkerPattern, (match, word, marker) => {
      // Don't replace if it's part of a glob pattern like **/*.md
      if (word === '' || /[\/\.]/.test(match)) {
        return match;
      }
      this.changes.push(`Removed trailing ** marker: ${word}${marker} → ${word}`);
      return word;
    });

    return yaml;
  }

  /**
   * Fix unidentified aliases (YAML anchor references without anchors)
   * Pattern: *word (in both list and inline array formats)
   */
  private fixUnidentifiedAliases(yaml: string): string {
    // Fix * in inline arrays: [*word, *phrase] (but not **)
    const inlineArrayPattern = /(\[[^\]]*?\*[^\]]*?\])/g;
    yaml = yaml.replace(inlineArrayPattern, (match) => {
      // Only fix single * not followed by another *
      const fixed = match.replace(/(?<!\*)\*(?!\*)([a-zA-Z][a-zA-Z0-9-_]*)/g, (m, word) => {
        this.changes.push(`Removed invalid alias in inline array: *${word} → ${word}`);
        return word;
      });
      return fixed;
    });

    // Fix * at start of list items: - *word (but not **)
    const aliasPattern = /(\s+-\s+)(?<!\*)\*(?!\*)([a-zA-Z][a-zA-Z0-9-_]*)/g;
    const matches = yaml.match(aliasPattern);
    if (matches && matches.length > 0) {
      yaml = yaml.replace(aliasPattern, (match, prefix, word) => {
        this.changes.push(`Removed invalid alias: *${word} → ${word}`);
        return `${prefix}${word}`;
      });
    }

    return yaml;
  }

  /**
   * Fix unclosed flow collections (arrays)
   * Ensures all [ have matching ]
   */
  private fixUnclosedArrays(yaml: string): string {
    const lines = yaml.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for array fields with opening [ but no closing ]
      if (line.includes('[') && !line.includes(']')) {
        const openBrackets = (line.match(/\[/g) || []).length;
        const closeBrackets = (line.match(/\]/g) || []).length;
        
        if (openBrackets > closeBrackets) {
          // Add missing closing brackets
          const missing = openBrackets - closeBrackets;
          lines[i] = line + ']'.repeat(missing);
          this.changes.push(`Added ${missing} closing bracket(s) to line: ${line.trim()}`);
        }
      }
      
      // Fix nested brackets in inline arrays: [word, [other] → [word, other]
      if (line.includes('[') && line.includes(']')) {
        const nestedBracketPattern = /(\[[^\]]*?)\[([^\]]*?)\]/g;
        const fixed = line.replace(nestedBracketPattern, (match, before, inside) => {
          this.changes.push(`Removed nested brackets in array: ${match}`);
          return `${before}${inside}`;
        });
        
        if (fixed !== line) {
          lines[i] = fixed;
        }
      }

      // Fix unclosed strings in description or other fields
      if (line.match(/description:\s*['"][^'"]*$/)) {
        // Description string not closed - add closing quote
        const quote = line.includes("'") ? "'" : '"';
        lines[i] = line + quote;
        this.changes.push(`Added closing quote to description: ${line.trim()}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Fix invalid escape sequences
   * Pattern: glob patterns with backslash escapes
   */
  private fixEscapeSequences(yaml: string): string {
    // Fix glob patterns with invalid escapes
    const escapePattern = /(\*\*\/\\?\*\.)/g;
    
    const matches = yaml.match(escapePattern);
    if (matches && matches.length > 0) {
      yaml = yaml.replace(escapePattern, (match) => {
        const fixed = match.replace(/\\/, '');
        this.changes.push(`Fixed escape sequence: ${match} → ${fixed}`);
        return fixed;
      });
    }

    return yaml;
  }

  /**
   * Fix malformed arrays (missing commas, improper quotes)
   */
  private fixMalformedArrays(yaml: string): string {
    const lines = yaml.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Fix arrays with missing commas between items
      // Pattern: word}] or word} with missing comma
      if (line.includes('}]') && !line.includes(',')) {
        const fixed = line.replace(/}]/, '},]').replace(/,]/, ']');
        if (fixed !== line) {
          lines[i] = fixed;
          this.changes.push(`Fixed array syntax in line: ${line.trim()}`);
        }
      }

      // Fix single-line arrays missing commas between string items
      const arrayMatch = line.match(/:\s*\[(.*)\]/);
      if (arrayMatch) {
        const items = arrayMatch[1];
        // Check if items are separated by spaces instead of commas
        if (!items.includes(',') && items.split(/\s+/).length > 1) {
          const fixedItems = items.split(/\s+/)
            .filter(item => item.trim())
            .map(item => item.includes('"') ? item : `"${item}"`)
            .join(', ');
          
          lines[i] = line.replace(/:\s*\[.*\]/, `: [${fixedItems}]`);
          this.changes.push(`Fixed array commas in line: ${line.trim()}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Validate that YAML can be parsed after fixes
   */
  validateYaml(yaml: string): boolean {
    try {
      // Basic validation - check for balanced brackets
      const openBrackets = (yaml.match(/\[/g) || []).length;
      const closeBrackets = (yaml.match(/\]/g) || []).length;
      
      if (openBrackets !== closeBrackets) {
        this.errors.push(`Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`);
        return false;
      }

      return true;
    } catch (error) {
      this.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

/**
 * Convenience function to fix YAML frontmatter in markdown content
 */
export function fixYamlFrontmatter(content: string): YamlFixResult {
  const fixer = new YamlFixer();
  return fixer.fixYamlFrontmatter(content);
}
