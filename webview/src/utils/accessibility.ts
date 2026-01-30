/**
 * Accessibility Utilities
 * 
 * ARIA labels, keyboard navigation, and screen reader support
 */

export class AccessibilityManager {
    private static announcer: HTMLElement | null = null;

    /**
     * Initialize accessibility features
     */
    static initialize(): void {
        this.createLiveRegion();
        this.setupKeyboardNavigation();
    }

    /**
     * Create ARIA live region for screen reader announcements
     */
    private static createLiveRegion(): void {
        if (this.announcer) {
            return;
        }

        this.announcer = document.createElement('div');
        this.announcer.setAttribute('role', 'status');
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.style.position = 'absolute';
        this.announcer.style.left = '-10000px';
        this.announcer.style.width = '1px';
        this.announcer.style.height = '1px';
        this.announcer.style.overflow = 'hidden';
        document.body.appendChild(this.announcer);
    }

    /**
     * Announce message to screen readers
     */
    static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        if (!this.announcer) {
            this.createLiveRegion();
        }

        if (this.announcer) {
            this.announcer.setAttribute('aria-live', priority);
            this.announcer.textContent = message;

            // Clear after announcement
            setTimeout(() => {
                if (this.announcer) {
                    this.announcer.textContent = '';
                }
            }, 1000);
        }
    }

    /**
     * Setup global keyboard navigation
     */
    private static setupKeyboardNavigation(): void {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Global shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.triggerNewItem();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.showKeyboardShortcuts();
                        break;
                }
            }

            // Escape key - close modals/panels
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    /**
     * Focus search input
     */
    private static focusSearch(): void {
        const searchInput = document.querySelector<HTMLInputElement>('[role="searchbox"], input[type="search"]');
        if (searchInput) {
            searchInput.focus();
            this.announce('Search focused');
        }
    }

    /**
     * Trigger new item creation
     */
    private static triggerNewItem(): void {
        const newButton = document.querySelector<HTMLButtonElement>('[aria-label*="Create"], [title*="Create"]');
        if (newButton) {
            newButton.click();
            this.announce('Create new item');
        }
    }

    /**
     * Show keyboard shortcuts
     */
    private static showKeyboardShortcuts(): void {
        const shortcutsButton = document.querySelector<HTMLButtonElement>('[aria-label*="Shortcuts"], [title*="Shortcuts"]');
        if (shortcutsButton) {
            shortcutsButton.click();
            this.announce('Keyboard shortcuts panel opened');
        }
    }

    /**
     * Close modals/panels
     */
    private static closeModals(): void {
        const closeButtons = document.querySelectorAll<HTMLButtonElement>('[aria-label="Close"], .close-button, [data-close]');
        closeButtons.forEach(button => {
            if (button.offsetParent !== null) { // Visible
                button.click();
            }
        });
    }

    /**
     * Create focus trap for modal
     */
    static createFocusTrap(container: HTMLElement): () => void {
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') {
                return;
            }

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleTabKey);

        // Focus first element
        firstElement?.focus();

        // Return cleanup function
        return () => {
            container.removeEventListener('keydown', handleTabKey);
        };
    }

    /**
     * Get ARIA label for item type
     */
    static getTypeLabel(type: string): string {
        switch (type) {
            case 'epic':
                return 'Epic';
            case 'story':
                return 'Story';
            case 'task':
                return 'Task';
            default:
                return type;
        }
    }

    /**
     * Get ARIA label for status
     */
    static getStatusLabel(status: string): string {
        switch (status) {
            case 'todo':
                return 'Not started';
            case 'in-progress':
                return 'In progress';
            case 'pending':
                return 'Blocked';
            case 'done':
                return 'Completed';
            default:
                return status;
        }
    }

    /**
     * Get ARIA label for priority
     */
    static getPriorityLabel(priority: string): string {
        switch (priority) {
            case 'critical':
                return 'Critical priority';
            case 'high':
                return 'High priority';
            case 'medium':
                return 'Medium priority';
            case 'low':
                return 'Low priority';
            default:
                return priority;
        }
    }

    /**
     * Format item for screen reader
     */
    static formatItemForScreenReader(item: any): string {
        const parts = [
            this.getTypeLabel(item.type),
            item.title,
            this.getStatusLabel(item.status)
        ];

        if (item.priority) {
            parts.push(this.getPriorityLabel(item.priority));
        }

        if (item.estimatedHours) {
            parts.push(`${item.estimatedHours} story points`);
        }

        return parts.join(', ');
    }

    /**
     * Check if high contrast mode is enabled
     */
    static isHighContrastMode(): boolean {
        return window.matchMedia('(prefers-contrast: high)').matches;
    }

    /**
     * Check if reduced motion is preferred
     */
    static prefersReducedMotion(): boolean {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Apply high contrast styles if needed
     */
    static applyHighContrastStyles(): void {
        if (this.isHighContrastMode()) {
            document.body.classList.add('high-contrast');
        }

        // Listen for changes
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('high-contrast');
            } else {
                document.body.classList.remove('high-contrast');
            }
        });
    }

    /**
     * Disable animations if reduced motion preferred
     */
    static applyReducedMotion(): void {
        if (this.prefersReducedMotion()) {
            document.body.classList.add('reduce-motion');
        }

        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('reduce-motion');
            } else {
                document.body.classList.remove('reduce-motion');
            }
        });
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    AccessibilityManager.initialize();
    AccessibilityManager.applyHighContrastStyles();
    AccessibilityManager.applyReducedMotion();
}
