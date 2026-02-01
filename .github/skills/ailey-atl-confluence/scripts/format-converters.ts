/**
 * Format conversion utilities for Confluence Storage Format
 * Converts between Markdown, HTML, and Confluence Storage Format
 */

import { Converter as ShowdownConverter } from 'showdown';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import mammoth from 'mammoth';
// @ts-ignore - pdf-parse lacks type definitions
import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';
import { basename } from 'path';

/**
 * Convert Markdown to Confluence Storage Format
 */
export async function markdownToStorage(markdown: string): Promise<string> {
  // Convert Markdown to HTML
  const converter = new ShowdownConverter({
    tables: true,
    strikethrough: true,
    tasklists: true,
    ghCodeBlocks: true,
  });
  
  const html = converter.makeHtml(markdown);
  
  // Convert HTML to Confluence Storage Format
  return htmlToStorage(html);
}

/**
 * Convert Confluence Storage Format to Markdown
 */
export function storageToMarkdown(storage: string): string {
  // Convert storage format to clean HTML first
  const html = storageToHtml(storage);
  
  // Convert HTML to Markdown
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });
  
  // Custom rules for Confluence-specific elements
  turndownService.addRule('confluenceCodeBlock', {
    // @ts-ignore - TurndownService filter signature
    filter: (node) => {
      return node.nodeName === 'AC:STRUCTURED-MACRO' && 
             node.getAttribute('ac:name') === 'code';
    },
    // @ts-ignore - TurndownService replacement signature
    replacement: (content, node) => {
      const params = node.querySelectorAll('ac\\:parameter');
      let language = '';
      for (const param of params) {
        if (param.getAttribute('ac:name') === 'language') {
          language = param.textContent || '';
        }
      }
      const body = node.querySelector('ac\\:plain-text-body');
      const code = body?.textContent || content;
      return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    },
  });
  
  return turndownService.turndown(html);
}

/**
 * Convert HTML to Confluence Storage Format
 */
export function htmlToStorage(html: string): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  // Convert code blocks to Confluence code macro
  const codeBlocks = doc.querySelectorAll('pre code');
  // @ts-ignore - JSDOM element types
  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre) return;
    
    // Detect language from class name
    const className = code.className || '';
    const langMatch = className.match(/language-(\w+)/);
    const language = langMatch ? langMatch[1] : '';
    
    // Create Confluence code macro
    const macro = doc.createElement('ac:structured-macro');
    macro.setAttribute('ac:name', 'code');
    
    if (language) {
      const langParam = doc.createElement('ac:parameter');
      langParam.setAttribute('ac:name', 'language');
      langParam.textContent = language;
      macro.appendChild(langParam);
    }
    
    const body = doc.createElement('ac:plain-text-body');
    body.textContent = code.textContent || '';
    macro.appendChild(body);
    
    pre.replaceWith(macro);
  });
  
  // Convert images to Confluence image macro (placeholder - needs attachment upload)
  const images = doc.querySelectorAll('img');
  // @ts-ignore - JSDOM element types
  images.forEach((img) => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    
    // For now, keep as regular img tag
    // In a real implementation, upload as attachment and use ac:image macro
    img.setAttribute('title', alt);
  });
  
  return doc.body.innerHTML;
}

/**
 * Convert Confluence Storage Format to clean HTML
 */
export function storageToHtml(storage: string): string {
  const dom = new JSDOM(storage);
  const doc = dom.window.document;
  
  // Convert Confluence code macros to HTML code blocks
  const codeMacros = doc.querySelectorAll('ac\\:structured-macro[ac\\:name="code"]');
  // @ts-ignore - JSDOM element types
  codeMacros.forEach((macro) => {
    const params = macro.querySelectorAll('ac\\:parameter');
    let language = '';
    for (const param of params) {
      if (param.getAttribute('ac:name') === 'language') {
        language = param.textContent || '';
      }
    }
    
    const body = macro.querySelector('ac\\:plain-text-body');
    const code = body?.textContent || '';
    
    const pre = doc.createElement('pre');
    const codeEl = doc.createElement('code');
    if (language) {
      codeEl.className = `language-${language}`;
    }
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    
    macro.replaceWith(pre);
  });
  
  // Convert Confluence image macros to HTML img tags
  const imageMacros = doc.querySelectorAll('ac\\:image');
  // @ts-ignore - JSDOM element types
  imageMacros.forEach((macro) => {
    const attachment = macro.querySelector('ri\\:attachment');
    if (attachment) {
      const filename = attachment.getAttribute('ri:filename') || '';
      const img = doc.createElement('img');
      img.setAttribute('src', filename);
      img.setAttribute('alt', filename);
      macro.replaceWith(img);
    }
  });
  
  return doc.body.innerHTML;
}

/**
 * Convert Word document to Confluence Storage Format
 */
export async function docxToStorage(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  
  // Convert DOCX to HTML using mammoth
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  
  // Convert HTML to Storage Format
  return htmlToStorage(html);
}

/**
 * Convert PDF to Confluence Storage Format
 * Note: PDF conversion is basic (text extraction only)
 */
export async function pdfToStorage(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  
  // Extract text from PDF
  const data = await pdfParse(buffer);
  const text = data.text;
  
  // Convert text to basic Markdown structure
  const lines = text.split('\n');
  const markdown = lines
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .join('\n\n');
  
  // Convert Markdown to Storage Format
  return markdownToStorage(markdown);
}

/**
 * Create Confluence image macro for an attachment
 */
export function createImageMacro(filename: string, width?: number, height?: number): string {
  let macro = `<ac:image`;
  if (width) macro += ` ac:width="${width}"`;
  if (height) macro += ` ac:height="${height}"`;
  macro += `>`;
  macro += `<ri:attachment ri:filename="${filename}" />`;
  macro += `</ac:image>`;
  return macro;
}

/**
 * Create Confluence link macro
 */
export function createLinkMacro(pageId: string, linkText: string): string {
  return `<ac:link><ri:page ri:content-title="${pageId}" /><ac:plain-text-link-body><![CDATA[${linkText}]]></ac:plain-text-link-body></ac:link>`;
}

/**
 * Wrap content in Confluence Storage Format structure
 */
export function wrapInStorageFormat(content: string): string {
  return `<div xmlns="http://www.w3.org/1999/xhtml">${content}</div>`;
}

/**
 * Detect format from file extension
 */
export function detectFormat(filePath: string): 'markdown' | 'docx' | 'pdf' | 'html' | 'unknown' {
  const ext = filePath.toLowerCase().split('.').pop() || '';
  
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'html' || ext === 'htm') return 'html';
  
  return 'unknown';
}

/**
 * Convert file to Confluence Storage Format based on extension
 */
export async function fileToStorage(filePath: string): Promise<string> {
  const format = detectFormat(filePath);
  
  switch (format) {
    case 'markdown': {
      const markdown = await readFile(filePath, 'utf-8');
      return markdownToStorage(markdown);
    }
    case 'docx':
      return docxToStorage(filePath);
    case 'pdf':
      return pdfToStorage(filePath);
    case 'html': {
      const html = await readFile(filePath, 'utf-8');
      return htmlToStorage(html);
    }
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}
