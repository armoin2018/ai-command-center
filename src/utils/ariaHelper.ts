/**
 * ARIA Helper Utilities
 * AICC-0248: Accessibility helpers for webview panels
 */

/** Generate ARIA-compliant table markup */
export function ariaTable(options: {
  caption: string;
  headers: string[];
  id?: string;
}): { tableAttrs: string; thAttrs: (col: string) => string } {
  return {
    tableAttrs: `role="grid" aria-label="${options.caption}"${options.id ? ` id="${options.id}"` : ''}`,
    thAttrs: (col: string) => `role="columnheader" scope="col" aria-label="${col}"`
  };
}

/** Generate ARIA attributes for accordion components */
export function ariaAccordion(sectionId: string, expanded: boolean): {
  headerAttrs: string;
  bodyAttrs: string;
} {
  return {
    headerAttrs: `role="button" aria-expanded="${expanded}" aria-controls="${sectionId}-body" tabindex="0"`,
    bodyAttrs: `id="${sectionId}-body" role="region" aria-labelledby="${sectionId}-header"`
  };
}

/** Generate ARIA attributes for status indicators */
export function ariaStatus(status: string, label: string): string {
  return `role="status" aria-live="polite" aria-label="${label}: ${status}"`;
}

/** Generate ARIA attributes for modal dialogs */
export function ariaModal(title: string): string {
  return `role="dialog" aria-modal="true" aria-label="${title}"`;
}

/** Generate skip navigation link HTML */
export function skipNavLink(targetId: string, label: string = 'Skip to main content'): string {
  return `<a href="#${targetId}" class="sr-only sr-only-focusable" tabindex="0">${label}</a>`;
}
