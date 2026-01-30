import React, { useState, useEffect } from 'react';
import { TreeNodeData } from '../types/tree';
import './AdvancedFilter.css';

export interface FilterCondition {
    id: string;
    field: 'type' | 'status' | 'priority' | 'tags' | 'estimatedHours' | 'name' | 'dueDate';
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'before' | 'after';
    value: string | number | string[];
    logic?: 'AND' | 'OR';
}

export interface FilterPreset {
    id: string;
    title: string;
    conditions: FilterCondition[];
    createdOn: string;
}

interface AdvancedFilterProps {
    onFilterChange: (filters: FilterCondition[]) => void;
    onClose: () => void;
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ onFilterChange, onClose }) => {
    const [conditions, setConditions] = useState<FilterCondition[]>([
        { id: '1', field: 'status', operator: 'equals', value: 'in-progress' }
    ]);
    const [presets, setPresets] = useState<FilterPreset[]>([]);
    const [presetName, setPresetName] = useState('');
    const [showSavePreset, setShowSavePreset] = useState(false);

    useEffect(() => {
        // Load saved presets from localStorage
        const saved = localStorage.getItem('filterPresets');
        if (saved) {
            setPresets(JSON.parse(saved));
        }
    }, []);

    const addCondition = () => {
        const newCondition: FilterCondition = {
            id: Date.now().toString(),
            field: 'status',
            operator: 'equals',
            value: '',
            logic: conditions.length > 0 ? 'AND' : undefined
        };
        setConditions([...conditions, newCondition]);
    };

    const removeCondition = (id: string) => {
        const updated = conditions.filter(c => c.id !== id);
        // Update logic for first condition
        if (updated.length > 0 && updated[0].logic) {
            updated[0] = { ...updated[0], logic: undefined };
        }
        setConditions(updated);
    };

    const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
        setConditions(conditions.map(c => 
            c.id === id ? { ...c, ...updates } : c
        ));
    };

    const applyFilters = () => {
        onFilterChange(conditions);
    };

    const clearFilters = () => {
        setConditions([]);
        onFilterChange([]);
    };

    const savePreset = () => {
        if (!presetName.trim()) {
            alert('Please enter a preset name');
            return;
        }

        const newPreset: FilterPreset = {
            id: Date.now().toString(),
            title: presetName,
            conditions: [...conditions],
            createdOn: new Date().toISOString()
        };

        const updated = [...presets, newPreset];
        setPresets(updated);
        localStorage.setItem('filterPresets', JSON.stringify(updated));
        setPresetName('');
        setShowSavePreset(false);
    };

    const loadPreset = (preset: FilterPreset) => {
        setConditions([...preset.conditions]);
        onFilterChange(preset.conditions);
    };

    const deletePreset = (id: string) => {
        const updated = presets.filter(p => p.id !== id);
        setPresets(updated);
        localStorage.setItem('filterPresets', JSON.stringify(updated));
    };

    const getOperatorsForField = (field: string): string[] => {
        switch (field) {
            case 'estimatedHours':
                return ['equals', 'notEquals', 'greaterThan', 'lessThan'];
            case 'dueDate':
                return ['before', 'after', 'equals'];
            case 'tags':
                return ['contains', 'in'];
            case 'name':
                return ['contains', 'equals', 'notEquals'];
            default:
                return ['equals', 'notEquals', 'in'];
        }
    };

    const renderValueInput = (condition: FilterCondition) => {
        const { field, operator, value } = condition;

        if (field === 'type') {
            return (
                <select
                    value={value as string}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    className="filter-input"
                >
                    <option value="">Select type...</option>
                    <option value="epic">Epic</option>
                    <option value="story">Story</option>
                    <option value="task">Task</option>
                </select>
            );
        }

        if (field === 'status') {
            return (
                <select
                    value={value as string}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    className="filter-input"
                >
                    <option value="">Select status...</option>
                    <option value="todo">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending">Blocked</option>
                    <option value="done">Completed</option>
                </select>
            );
        }

        if (field === 'priority') {
            return (
                <select
                    value={value as string}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    className="filter-input"
                >
                    <option value="">Select priority...</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            );
        }

        if (field === 'estimatedHours') {
            return (
                <input
                    type="number"
                    value={value as number}
                    onChange={(e) => updateCondition(condition.id, { value: parseInt(e.target.value) || 0 })}
                    className="filter-input"
                    placeholder="Enter points..."
                />
            );
        }

        if (field === 'dueDate') {
            return (
                <input
                    type="date"
                    value={value as string}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    className="filter-input"
                />
            );
        }

        // Default text input for name, tags
        return (
            <input
                type="text"
                value={value as string}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="filter-input"
                placeholder={`Enter ${field}...`}
            />
        );
    };

    return (
        <div className="advanced-filter-overlay" onClick={onClose}>
            <div className="advanced-filter-panel" onClick={(e) => e.stopPropagation()}>
                <div className="filter-header">
                    <h2>Advanced Filters</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </div>

                <div className="filter-content">
                    {/* Filter Conditions */}
                    <div className="filter-conditions">
                        {conditions.map((condition, index) => (
                            <div key={condition.id} className="filter-condition">
                                {index > 0 && (
                                    <select
                                        value={condition.logic || 'AND'}
                                        onChange={(e) => updateCondition(condition.id, { logic: e.target.value as 'AND' | 'OR' })}
                                        className="logic-select"
                                    >
                                        <option value="AND">AND</option>
                                        <option value="OR">OR</option>
                                    </select>
                                )}

                                <select
                                    value={condition.field}
                                    onChange={(e) => updateCondition(condition.id, { 
                                        field: e.target.value as any,
                                        operator: 'equals',
                                        value: ''
                                    })}
                                    className="field-select"
                                >
                                    <option value="type">Type</option>
                                    <option value="status">Status</option>
                                    <option value="priority">Priority</option>
                                    <option value="tags">Tags</option>
                                    <option value="estimatedHours">Story Points</option>
                                    <option value="name">Name</option>
                                    <option value="dueDate">Due Date</option>
                                </select>

                                <select
                                    value={condition.operator}
                                    onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                                    className="operator-select"
                                >
                                    {getOperatorsForField(condition.field).map(op => (
                                        <option key={op} value={op}>
                                            {op === 'equals' ? '=' : 
                                             op === 'notEquals' ? '≠' :
                                             op === 'contains' ? 'contains' :
                                             op === 'greaterThan' ? '>' :
                                             op === 'lessThan' ? '<' :
                                             op === 'in' ? 'in' :
                                             op === 'before' ? 'before' :
                                             'after'}
                                        </option>
                                    ))}
                                </select>

                                {renderValueInput(condition)}

                                <button
                                    onClick={() => removeCondition(condition.id)}
                                    className="remove-condition"
                                    title="Remove condition"
                                >
                                    ×
                                </button>
                            </div>
                        ))}

                        <button onClick={addCondition} className="add-condition">
                            + Add Condition
                        </button>
                    </div>

                    {/* Saved Presets */}
                    <div className="filter-presets">
                        <h3>Saved Filters</h3>
                        {presets.length === 0 ? (
                            <p className="no-presets">No saved filters yet</p>
                        ) : (
                            <div className="preset-list">
                                {presets.map(preset => (
                                    <div key={preset.id} className="preset-item">
                                        <button
                                            onClick={() => loadPreset(preset)}
                                            className="preset-name"
                                        >
                                            {preset.title}
                                        </button>
                                        <span className="preset-conditions">
                                            {preset.conditions.length} condition{preset.conditions.length !== 1 ? 's' : ''}
                                        </span>
                                        <button
                                            onClick={() => deletePreset(preset.id)}
                                            className="delete-preset"
                                            title="Delete preset"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showSavePreset ? (
                            <div className="save-preset-form">
                                <input
                                    type="text"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                    placeholder="Filter name..."
                                    className="preset-name-input"
                                    autoFocus
                                />
                                <div className="save-preset-actions">
                                    <button onClick={savePreset} className="save-button">Save</button>
                                    <button onClick={() => setShowSavePreset(false)} className="cancel-button">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowSavePreset(true)}
                                className="show-save-preset"
                                disabled={conditions.length === 0}
                            >
                                💾 Save Current Filters
                            </button>
                        )}
                    </div>
                </div>

                <div className="filter-actions">
                    <button onClick={clearFilters} className="clear-button">
                        Clear All
                    </button>
                    <button onClick={applyFilters} className="apply-button">
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
};
