/**
 * Artifact Cleaner
 * Removes corrupt or broken content artifacts from markdown files
 */

export interface ArtifactCleanResult {
  cleaned: string;
  removed: string[];
}

export class ArtifactCleaner {
  /**
   * Clean all corrupt artifacts from content
   */
  clean(content: string): ArtifactCleanResult {
    let cleaned = content;
    const removed: string[] = [];

    // Remove broken reference links
    const brokenRefResult = this.removeBrokenReferences(cleaned);
    cleaned = brokenRefResult.cleaned;
    removed.push(...brokenRefResult.removed);

    // Remove malformed code blocks
    const brokenCodeResult = this.removeMalformedCodeBlocks(cleaned);
    cleaned = brokenCodeResult.cleaned;
    removed.push(...brokenCodeResult.removed);

    // Remove empty sections
    const emptySectionResult = this.removeEmptySections(cleaned);
    cleaned = emptySectionResult.cleaned;
    removed.push(...emptySectionResult.removed);

    // Remove duplicate blank lines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

    return { cleaned, removed };
  }

  /**
   * Remove broken reference links like [text](./broken/path.
   */
  private removeBrokenReferences(content: string): ArtifactCleanResult {
    const removed: string[] = [];
    
    // Find references with incomplete paths (ending with . or no extension)
    const brokenRefPattern = /\[([^\]]+)\]\(\.\/[^)]*\.\s*\)/g;
    const matches = content.match(brokenRefPattern);
    
    if (matches) {
      matches.forEach(match => removed.push(`Broken reference: ${match}`));
      content = content.replace(brokenRefPattern, '[$1]');
    }

    return { cleaned: content, removed };
  }

  /**
   * Remove malformed code blocks (unclosed, wrong fence count)
   */
  private removeMalformedCodeBlocks(content: string): ArtifactCleanResult {
    const removed: string[] = [];
    const lines = content.split('\n');
    const cleaned: string[] = [];
    
    let inCodeBlock = false;
    let codeBlockStart = -1;
    let consecutiveBackticks = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const backtickMatch = line.match(/^(`{3,})/);
      
      if (backtickMatch) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = i;
          consecutiveBackticks = backtickMatch[1].length;
          cleaned.push(line);
        } else {
          // Check if closing fence matches opening
          if (backtickMatch[1].length === consecutiveBackticks) {
            inCodeBlock = false;
            cleaned.push(line);
          } else {
            // Mismatched fence - keep it anyway
            cleaned.push(line);
          }
        }
      } else {
        cleaned.push(line);
      }
    }

    // If still in code block at end, it's unclosed - remove it
    if (inCodeBlock) {
      removed.push(`Unclosed code block starting at line ${codeBlockStart + 1}`);
      // Remove the unclosed block
      cleaned.splice(codeBlockStart);
    }

    return { cleaned: cleaned.join('\n'), removed };
  }

  /**
   * Remove empty markdown sections (heading with no content)
   */
  private removeEmptySections(content: string): ArtifactCleanResult {
    const removed: string[] = [];
    const lines = content.split('\n');
    const cleaned: string[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this is a heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // Look ahead to see if next non-empty line is another heading
        let j = i + 1;
        let hasContent = false;
        
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine.trim() === '') {
            j++;
            continue;
          }
          
          // If next non-empty line is a heading, this section is empty
          if (nextLine.match(/^#{1,6}\s+/)) {
            break;
          }
          
          hasContent = true;
          break;
        }
        
        if (!hasContent && j > i + 1) {
          removed.push(`Empty section: ${headingMatch[2]}`);
          i++; // Skip this heading
          continue;
        }
      }
      
      cleaned.push(line);
      i++;
    }

    return { cleaned: cleaned.join('\n'), removed };
  }

  /**
   * Remove specific artifact patterns
   */
  removePattern(content: string, pattern: RegExp, description: string): ArtifactCleanResult {
    const removed: string[] = [];
    const matches = content.match(pattern);
    
    if (matches) {
      matches.forEach(() => removed.push(description));
      content = content.replace(pattern, '');
    }

    return { cleaned: content, removed };
  }
}
