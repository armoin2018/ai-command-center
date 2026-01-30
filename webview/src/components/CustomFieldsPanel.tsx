import React from 'react';
import { CustomFieldsManager, CustomFieldDefinition, FieldType } from '../utils/customFields';
import './CustomFieldsPanel.css';

export const CustomFieldsPanel: React.FC = () => {
    const [definitions, setDefinitions] = React.useState<CustomFieldDefinition[]>([]);
    const [editingField, setEditingField] = React.useState<CustomFieldDefinition | null>(null);
    const [showNewFieldForm, setShowNewFieldForm] = React.useState(false);

    React.useEffect(() => {
        loadDefinitions();
    }, []);

    const loadDefinitions = () => {
        setDefinitions(CustomFieldsManager.getAllDefinitions());
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this custom field?')) {
            CustomFieldsManager.removeDefinition(id);
            loadDefinitions();
        }
    };

    const handleExport = () => {
        const data = CustomFieldsManager.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom-fields-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = CustomFieldsManager.import(event.target?.result as string);
                    if (result.success) {
                        alert('Custom fields imported successfully!');
                        loadDefinitions();
                    } else {
                        alert(`Import failed: ${result.error}`);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    return (
        <div className="custom-fields-panel">
            <div className="panel-header">
                <h2>⚙️ Custom Fields</h2>
                <div className="header-actions">
                    <button onClick={handleImport}>Import</button>
                    <button onClick={handleExport}>Export</button>
                    <button onClick={() => setShowNewFieldForm(true)} className="btn-primary">
                        + New Field
                    </button>
                </div>
            </div>

            <div className="fields-list">
                {definitions.map(def => (
                    <div key={def.id} className="field-card">
                        <div className="field-header">
                            <h3>{def.title}</h3>
                            <div className="field-actions">
                                <button onClick={() => setEditingField(def)}>Edit</button>
                                <button onClick={() => handleDelete(def.id)} className="btn-danger">
                                    Delete
                                </button>
                            </div>
                        </div>
                        <div className="field-details">
                            <div className="field-meta">
                                <span className="field-type">{def.type}</span>
                                {def.required && <span className="required-badge">Required</span>}
                            </div>
                            {def.description && <p className="field-description">{def.description}</p>}
                            <div className="applies-to">
                                <strong>Applies to:</strong> {def.appliesTo.join(', ')}
                            </div>
                            {def.options && def.options.length > 0 && (
                                <div className="field-options">
                                    <strong>Options:</strong> {def.options.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {definitions.length === 0 && (
                    <div className="empty-state">
                        <p>No custom fields defined yet.</p>
                        <button onClick={() => setShowNewFieldForm(true)} className="btn-primary">
                            Create your first custom field
                        </button>
                    </div>
                )}
            </div>

            {(showNewFieldForm || editingField) && (
                <CustomFieldForm
                    field={editingField}
                    onSave={(field) => {
                        CustomFieldsManager.addDefinition(field);
                        setEditingField(null);
                        setShowNewFieldForm(false);
                        loadDefinitions();
                    }}
                    onCancel={() => {
                        setEditingField(null);
                        setShowNewFieldForm(false);
                    }}
                />
            )}
        </div>
    );
};

interface CustomFieldFormProps {
    field: CustomFieldDefinition | null;
    onSave: (field: CustomFieldDefinition) => void;
    onCancel: () => void;
}

const CustomFieldForm: React.FC<CustomFieldFormProps> = ({ field, onSave, onCancel }) => {
    const [formData, setFormData] = React.useState<Partial<CustomFieldDefinition>>(
        field || {
            id: '',
            title: '',
            type: 'text',
            required: false,
            appliesTo: ['story']
        }
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title || !formData.type) {
            alert('Name and type are required');
            return;
        }

        const fieldDef: CustomFieldDefinition = {
            id: formData.id || `field-${Date.now()}`,
            title: formData.title,
            type: formData.type as FieldType,
            required: formData.required || false,
            description: formData.description,
            defaultValue: formData.defaultValue,
            options: formData.options,
            validation: formData.validation,
            appliesTo: formData.appliesTo || ['story']
        };

        onSave(fieldDef);
    };

    return (
        <div className="field-form-overlay">
            <div className="field-form">
                <h3>{field ? 'Edit Field' : 'New Custom Field'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="custom-field-name-input">Field Name *</label>
                        <input
                            id="custom-field-name-input"
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            aria-label="Custom field name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="custom-field-type-select">Field Type *</label>
                        <select
                            id="custom-field-type-select"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as FieldType })}
                            required
                            aria-label="Custom field type"
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="select">Select (dropdown)</option>
                            <option value="multi-select">Multi-select</option>
                            <option value="boolean">Boolean (checkbox)</option>
                            <option value="url">URL</option>
                            <option value="email">Email</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="custom-field-description-input">Description</label>
                        <textarea
                            id="custom-field-description-input"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            aria-label="Custom field description"
                        />
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                id="custom-field-required-checkbox"
                                type="checkbox"
                                checked={formData.required || false}
                                onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                                aria-label="Mark field as required"
                            />
                            Required field
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Applies To</label>
                        <div className="checkbox-group">
                            {(['epic', 'story', 'task'] as const).map(type => (
                                <label key={type} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.appliesTo?.includes(type)}
                                        onChange={(e) => {
                                            const current = formData.appliesTo || [];
                                            const updated = e.target.checked
                                                ? [...current, type]
                                                : current.filter(t => t !== type);
                                            setFormData({ ...formData, appliesTo: updated });
                                        }}
                                    />
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </label>
                            ))}
                        </div>
                    </div>

                    {(formData.type === 'select' || formData.type === 'multi-select') && (
                        <div className="form-group">
                            <label>Options (comma-separated)</label>
                            <input
                                type="text"
                                value={formData.options?.join(', ') || ''}
                                onChange={(e) => {
                                    const options = e.target.value.split(',').map(o => o.trim()).filter(Boolean);
                                    setFormData({ ...formData, options });
                                }}
                                placeholder="Option 1, Option 2, Option 3"
                            />
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" onClick={onCancel}>Cancel</button>
                        <button type="submit" className="btn-primary">
                            {field ? 'Update' : 'Create'} Field
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
