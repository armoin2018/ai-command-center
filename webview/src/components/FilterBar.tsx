/**
 * Filter Bar Component
 * 
 * Provides filtering and search functionality for the planning tree
 */

import React from 'react';
import './FilterBar.css';

export interface FilterState {
    search: string;
    status: string[];
    type: string[];
    priority: string[];
    estimatedHoursMin?: number;
    estimatedHoursMax?: number;
    dateFrom?: string;
    dateTo?: string;
}

interface FilterBarProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    onClear: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onClear }) => {
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, search: e.target.value });
    };

    const handleStatusToggle = (status: string) => {
        const newStatus = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status];
        onFilterChange({ ...filters, status: newStatus });
    };

    const handleTypeToggle = (type: string) => {
        const newType = filters.type.includes(type)
            ? filters.type.filter(t => t !== type)
            : [...filters.type, type];
        onFilterChange({ ...filters, type: newType });
    };

    const handlePriorityToggle = (priority: string) => {
        const newPriority = filters.priority?.includes(priority)
            ? filters.priority.filter(p => p !== priority)
            : [...(filters.priority || []), priority];
        onFilterChange({ ...filters, priority: newPriority });
    };

    const handleStoryPointsChange = (min?: number, max?: number) => {
        onFilterChange({ ...filters, estimatedHoursMin: min, estimatedHoursMax: max });
    };

    const handleDateChange = (from?: string, to?: string) => {
        onFilterChange({ ...filters, dateFrom: from, dateTo: to });
    };

    const hasActiveFilters = filters.search || filters.status.length > 0 || filters.type.length > 0 
        || (filters.priority && filters.priority.length > 0) || filters.estimatedHoursMin !== undefined 
        || filters.estimatedHoursMax !== undefined || filters.dateFrom || filters.dateTo;

    return (
        <div className="filter-bar">
            <div className="filter-search">
                <div className="filter-input-group">
                    <input
                        id="filter-search-input"
                        type="text"
                        placeholder="Search by name or ID..."
                        value={filters.search}
                        onChange={handleSearchChange}
                        className="search-input"
                        aria-label="Search planning items by name, description, or ID"
                    />
                    {filters.search && (
                        <button 
                            className="search-clear"
                            onClick={() => onFilterChange({ ...filters, search: '' })}
                            title="Clear search"
                        >
                            ×
                        </button>
                    )}
                    <div className="filter-input-addon">
                        <button 
                            className="filter-addon-btn" 
                            title="Search"
                            aria-label="Search"
                        >
                            <span className="icon" aria-hidden="true">🔍</span>
                        </button>
                        <button 
                            className="filter-addon-btn" 
                            onClick={onClear}
                            title="Clear all filters"
                            aria-label="Clear all filters"
                        >
                            <span className="icon" aria-hidden="true">🗑️</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="filter-group">
                <label className="filter-label" id="status-filter-label">Status:</label>
                <div className="filter-chips" role="group" aria-labelledby="status-filter-label">
                    {['todo', 'in-progress', 'done', 'pending'].map(status => (
                        <button
                            key={status}
                            className={`filter-chip ${filters.status.includes(status) ? 'active' : ''}`}
                            onClick={() => handleStatusToggle(status)}
                            aria-label={`Filter by ${status}`}
                            aria-pressed={filters.status.includes(status)}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter-group">
                <label className="filter-label">Type:</label>
                <div className="filter-chips">
                    {['epic', 'story', 'task'].map(type => (
                        <button
                            key={type}
                            className={`filter-chip ${filters.type.includes(type) ? 'active' : ''}`}
                            onClick={() => handleTypeToggle(type)}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {hasActiveFilters && (
                <button className="filter-clear-all" onClick={onClear}>
                    Clear All Filters
                </button>
            )}
        </div>
    );
};
