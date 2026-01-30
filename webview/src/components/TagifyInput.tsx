/**
 * Tagify Input Component
 * 
 * Bootstrap-styled tags input using Tagify library
 * Used for labels, assignees, tags, etc.
 */

import React, { useEffect, useRef } from 'react';
import { Tagify } from '../utils/libraries';

interface TagifyInputProps {
  value?: string[];
  placeholder?: string;
  whitelist?: string[];
  maxTags?: number;
  onChange?: (tags: string[]) => void;
  label?: string;
  className?: string;
}

export const TagifyInput: React.FC<TagifyInputProps> = ({
  value = [],
  placeholder = 'Add tags...',
  whitelist = [],
  maxTags,
  onChange,
  label,
  className = ''
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const tagifyRef = useRef<any>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Initialize Tagify
    tagifyRef.current = new Tagify(inputRef.current, {
      whitelist: whitelist,
      maxTags: maxTags,
      dropdown: {
        maxItems: 20,
        classname: 'tagify__dropdown bootstrap-dropdown',
        enabled: 0,
        closeOnSelect: false
      },
      enforceWhitelist: whitelist.length > 0,
      placeholder: placeholder
    });

    // Listen for changes
    tagifyRef.current.on('change', (e: any) => {
      try {
        const tags = JSON.parse(e.detail.value).map((tag: any) => tag.value);
        if (onChange) {
          onChange(tags);
        }
      } catch (err) {
        if (onChange) {
          onChange([]);
        }
      }
    });

    // Set initial value
    if (value.length > 0) {
      tagifyRef.current.addTags(value);
    }

    // Cleanup
    return () => {
      if (tagifyRef.current) {
        tagifyRef.current.destroy();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update value when prop changes
  useEffect(() => {
    if (tagifyRef.current) {
      const currentTags = tagifyRef.current.value.map((tag: any) => tag.value);
      const valueSet = new Set(value);
      const currentSet = new Set(currentTags);
      
      // Check if they're different
      if (value.length !== currentTags.length || 
          !value.every(v => currentSet.has(v))) {
        tagifyRef.current.removeAllTags();
        if (value.length > 0) {
          tagifyRef.current.addTags(value);
        }
      }
    }
  }, [value]);

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label className="form-label fw-bold">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        placeholder={placeholder}
      />
      <div className="form-text">
        Press Enter to add tags{whitelist.length > 0 ? ' or select from suggestions' : ''}
      </div>
    </div>
  );
};

/**
 * Example usage component with Bootstrap styling
 */
export const TagifyExample: React.FC = () => {
  const [tags, setTags] = React.useState<string[]>(['React', 'TypeScript']);
  const [assignees, setAssignees] = React.useState<string[]>([]);
  const [labels, setLabels] = React.useState<string[]>([]);

  const assigneeWhitelist = [
    'john.doe@example.com',
    'jane.smith@example.com',
    'bob.jones@example.com',
    'alice.wilson@example.com'
  ];

  const labelWhitelist = [
    'bug',
    'feature',
    'enhancement',
    'documentation',
    'urgent',
    'low-priority'
  ];

  return (
    <div className="container-fluid p-4">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Tagify Examples with Bootstrap</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <TagifyInput
                label="Technology Tags"
                value={tags}
                onChange={setTags}
                placeholder="Add technology tags..."
              />
              
              <div className="alert alert-info">
                <strong>Current tags:</strong> {tags.join(', ') || 'None'}
              </div>
            </div>

            <div className="col-md-6">
              <TagifyInput
                label="Assignees"
                value={assignees}
                onChange={setAssignees}
                whitelist={assigneeWhitelist}
                maxTags={3}
                placeholder="Select assignees..."
              />
              
              <div className="alert alert-success">
                <strong>Selected assignees:</strong> {assignees.join(', ') || 'None'}
              </div>
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-12">
              <TagifyInput
                label="Labels"
                value={labels}
                onChange={setLabels}
                whitelist={labelWhitelist}
                placeholder="Add labels..."
              />
              
              <div className="d-flex gap-2 flex-wrap">
                {labels.map(label => (
                  <span key={label} className="badge bg-secondary">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 d-grid gap-2 d-md-flex">
            <button 
              className="btn btn-primary"
              onClick={() => console.log({ tags, assignees, labels })}
            >
              Log Values
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => {
                setTags([]);
                setAssignees([]);
                setLabels([]);
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
