/**
 * List Normalizer Module
 * 
 * Standardizes list formatting in markdown files:
 * - Regular lists start with "- "
 * - Checklists start with "[ ] " or "[x] "
 * - Ordered events use numbered sequences
 * - Prevents compound/mixed list types
 */

import type { FileContent } from './types.js';

export interface ListNormalizationResult {
  normalized: boolean;
  changes: string[];
}

interface ListContext {
  type: 'unordered' | 'checklist' | 'ordered' | 'mixed';
  startLine: number;
  endLine: number;
}

/**
 * Normalize list formatting in file content
 */
export function normalize(content: FileContent): ListNormalizationResult {
  const changes: string[] = [];
  const lines = content.body.split('\n');
  const normalizedLines: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if line is a list item
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.|\[[ xX]\])\s+(.+)$/);
    
    if (listMatch) {
      const indent = listMatch[1];
      const marker = listMatch[2];
      const text = listMatch[3];
      
      // Detect list context
      const context = detectListContext(lines, i);
      
      // Normalize based on context
      const normalized = normalizeListItem(indent, marker, text, context);
      
      if (normalized !== line) {
        changes.push(`Line ${i + 1}: "${line.trim()}" → "${normalized.trim()}"`);
      }
      
      normalizedLines.push(normalized);
    } else {
      normalizedLines.push(line);
    }
    
    i++;
  }
  
  content.body = normalizedLines.join('\n');
  
  return {
    normalized: changes.length > 0,
    changes
  };
}

/**
 * Detect the type and extent of a list context
 */
function detectListContext(lines: string[], startIndex: number): ListContext {
  const indent = lines[startIndex].match(/^(\s*)/)?.[1] || '';
  let type: ListContext['type'] = 'unordered';
  let endLine = startIndex;
  
  const markers = new Set<string>();
  
  // Scan forward to find list extent
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Empty line or less indented = end of list
    if (line.trim() === '' || (line.match(/^(\s*)/) && line.match(/^(\s*)/)?.[1].length < indent.length && line.trim() !== '')) {
      break;
    }
    
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.|\[[ xX]\])\s+/);
    if (listMatch && listMatch[1] === indent) {
      markers.add(listMatch[2]);
      endLine = i;
    }
  }
  
  // Determine list type based on markers
  const markerArray = Array.from(markers);
  const hasCheckbox = markerArray.some(m => m.match(/\[[ xX]\]/));
  const hasNumbered = markerArray.some(m => m.match(/\d+\./));
  const hasBullet = markerArray.some(m => m.match(/^[-*+]$/));
  
  if (hasCheckbox && (hasNumbered || hasBullet)) {
    type = 'mixed';
  } else if (hasCheckbox) {
    type = 'checklist';
  } else if (hasNumbered) {
    type = 'ordered';
  } else if (hasBullet) {
    type = 'unordered';
  }
  
  return { type, startLine: startIndex, endLine };
}

/**
 * Normalize a single list item based on context
 */
function normalizeListItem(
  indent: string,
  marker: string,
  text: string,
  context: ListContext
): string {
  // Handle mixed lists - convert to unordered by default
  if (context.type === 'mixed') {
    // If it's a checkbox, keep it as checkbox
    if (marker.match(/\[[ xX]\]/)) {
      return `${indent}${normalizeCheckbox(marker)} ${text}`;
    }
    // Convert everything else to unordered
    return `${indent}- ${text}`;
  }
  
  // Handle checklist normalization
  if (context.type === 'checklist') {
    return `${indent}${normalizeCheckbox(marker)} ${text}`;
  }
  
  // Handle ordered list normalization
  if (context.type === 'ordered') {
    // Keep numbered format (actual numbering will be handled by markdown renderer)
    if (!marker.match(/\d+\./)) {
      return `${indent}1. ${text}`;
    }
    return `${indent}${marker} ${text}`;
  }
  
  // Handle unordered list normalization
  if (context.type === 'unordered') {
    // Standardize to "- " format
    if (!marker.match(/^-$/)) {
      return `${indent}- ${text}`;
    }
  }
  
  return `${indent}${marker} ${text}`;
}

/**
 * Normalize checkbox format
 */
function normalizeCheckbox(marker: string): string {
  if (marker.match(/\[[xX]\]/)) {
    return '[x]';
  }
  return '[ ]';
}

/**
 * Detect and report compound/mixed list issues
 */
export function detectCompoundLists(content: FileContent): string[] {
  const issues: string[] = [];
  const lines = content.body.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.|\[[ xX]\])\s+/);
    
    if (listMatch) {
      const context = detectListContext(lines, i);
      
      if (context.type === 'mixed') {
        issues.push(
          `Lines ${context.startLine + 1}-${context.endLine + 1}: Mixed list types detected (bullets, numbers, and checkboxes). Consider separating into distinct lists.`
        );
        // Skip to end of this list
        i = context.endLine + 1;
        continue;
      }
    }
    
    i++;
  }
  
  return issues;
}
