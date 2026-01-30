import { useState, useEffect } from 'react';

export type Theme = 'auto' | 'light' | 'dark' | 'high-contrast';

const THEME_STORAGE_KEY = 'aicc-theme-preference';

/**
 * Custom hook for managing theme preference.
 * Persists theme selection in localStorage and applies theme class to document.
 */
export const useTheme = (): [Theme, (theme: Theme) => void] => {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Load theme from localStorage on mount
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return (savedTheme as Theme) || 'auto';
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    };

    useEffect(() => {
        // Remove all theme classes
        document.body.classList.remove('theme-auto', 'theme-light', 'theme-dark', 'theme-high-contrast');

        // Apply current theme class
        document.body.classList.add(`theme-${theme}`);

        // If auto theme, detect VS Code theme from CSS variables
        if (theme === 'auto') {
            const detectVSCodeTheme = () => {
                const backgroundColor = getComputedStyle(document.body)
                    .getPropertyValue('--vscode-editor-background')
                    .trim();
                
                if (!backgroundColor) {
                    return;
                }

                // Convert to RGB and calculate luminance
                const rgb = backgroundColor.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                    const r = parseInt(rgb[0]);
                    const g = parseInt(rgb[1]);
                    const b = parseInt(rgb[2]);
                    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

                    // Apply light or dark based on background luminance
                    if (luminance > 0.5) {
                        document.body.classList.add('theme-detected-light');
                        document.body.classList.remove('theme-detected-dark');
                    } else {
                        document.body.classList.add('theme-detected-dark');
                        document.body.classList.remove('theme-detected-light');
                    }
                }
            };

            // Detect theme on mount and when CSS variables change
            detectVSCodeTheme();

            // Watch for VS Code theme changes
            const observer = new MutationObserver(detectVSCodeTheme);
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });

            return () => observer.disconnect();
        }
    }, [theme]);

    return [theme, setTheme];
};
