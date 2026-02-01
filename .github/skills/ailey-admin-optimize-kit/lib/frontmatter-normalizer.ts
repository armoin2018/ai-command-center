/**
 * Frontmatter normalizer for AI-ley kit resources
 */

import type { FrontmatterSchema, ResourceType } from './types.js';
import path from 'path';

export class FrontmatterNormalizer {
  /**
   * Normalize frontmatter based on resource type
   */
  normalize(
    frontmatter: any,
    resourceType: ResourceType,
    baseFileName: string
  ): FrontmatterSchema {
    // Remove quotes from name and description if present
    const name = this.unquote(frontmatter.name) || this.generateName(baseFileName);
    const description = this.unquote(frontmatter.description) || '';

    const normalized: FrontmatterSchema = {
      id: baseFileName,
      name,
      description
    };

    // Only add keywords if they exist and have values
    const keywords = this.normalizeArray(frontmatter.keywords);
    if (keywords && keywords.length > 0) {
      normalized.keywords = keywords;
    }

    // Default tools array for agents if missing
    const tools = this.normalizeArray(frontmatter.tools);
    if (tools && tools.length > 0) {
      normalized.tools = tools;
    } else if (resourceType === 'agent' || resourceType === 'prompt') {
      // Add default tools for agents and prompts
      normalized.tools = ['execute', 'read', 'edit', 'search', 'web', 'agent', 'todo'];
    }

    // Resource-specific normalization
    if (resourceType === 'prompt') {
      normalized.agent = frontmatter.agent || 'AI-ley Orchestrator';
      
      // Only add skills if they exist and have values
      const skills = this.normalizeArray(frontmatter.skills);
      if (skills && skills.length > 0) {
        normalized.skills = skills;
      }
    }

    // Remove deprecated fields
    delete (normalized as any).agents;

    // Preserve other valid fields
    const validFields = this.getValidFields(resourceType);
    for (const [key, value] of Object.entries(frontmatter)) {
      if (validFields.includes(key) && !(key in normalized)) {
        (normalized as any)[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Remove quotes from string if present
   */
  private unquote(value: any): string | undefined {
    if (typeof value !== 'string') return value;
    
    // Remove leading/trailing quotes (single or double)
    return value.replace(/^['"]|['"]$/g, '');
  }

  /**
   * Normalize array fields
   */
  private normalizeArray(value: any): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return undefined;
  }

  /**
   * Generate name from base filename
   */
  private generateName(baseFileName: string): string {
    return baseFileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get valid fields for resource type
   */
  private getValidFields(resourceType: ResourceType): string[] {
    const common = ['id', 'name', 'description', 'keywords', 'tools', 'version', 'author', 'created', 'updated', 'status'];
    
    switch (resourceType) {
      case 'instruction':
        return [...common, 'applyTo', 'category'];
      case 'persona':
        return [...common, 'role', 'expertise', 'domain'];
      case 'agent':
        return [...common, 'extends', 'mode', 'capabilities'];
      case 'skill':
        return [...common, 'category', 'tags', 'dependencies'];
      case 'prompt':
        return [...common, 'agent', 'skills', 'model', 'argument-hint'];
      default:
        return common;
    }
  }

  /**
   * Validate frontmatter completeness
   */
  validate(frontmatter: FrontmatterSchema): string[] {
    const errors: string[] = [];

    if (!frontmatter.id) {
      errors.push('Missing required field: id');
    }
    if (!frontmatter.name) {
      errors.push('Missing required field: name');
    }
    if (!frontmatter.description) {
      errors.push('Missing required field: description');
    }

    return errors;
  }
}
