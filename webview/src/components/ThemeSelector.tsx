import React from 'react';
import './ThemeSelector.css';

export type Theme = 'auto' | 'light' | 'dark' | 'high-contrast';

interface ThemeSelectorProps {
    currentTheme: Theme;
    onChange: (theme: Theme) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onChange }) => {
    const themes: Array<{ value: Theme; label: string; icon: string }> = [
        { value: 'auto', label: 'Auto (Follow VS Code)', icon: '🔄' },
        { value: 'light', label: 'Light', icon: '☀️' },
        { value: 'dark', label: 'Dark', icon: '🌙' },
        { value: 'high-contrast', label: 'High Contrast', icon: '⚡' }
    ];

    return (
        <div className="theme-selector">
            <label htmlFor="theme-select" className="theme-selector__label">
                Theme:
            </label>
            <select
                id="theme-select"
                className="theme-selector__select"
                value={currentTheme}
                onChange={(e) => onChange(e.target.value as Theme)}
                aria-label="Select theme"
            >
                {themes.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                        {theme.icon} {theme.label}
                    </option>
                ))}
            </select>
        </div>
    );
};
