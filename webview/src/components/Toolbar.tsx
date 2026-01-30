/**
 * Toolbar Component
 * 
 * Main action toolbar with create, refresh, and navigation actions
 */

import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
    onRefresh: () => void;
    onCreateEpic: () => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onExport?: (format: 'json' | 'yaml' | 'markdown') => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    onRefresh, 
    onCreateEpic, 
    onExpandAll, 
    onCollapseAll,
    onExport
}) => {
    const [showExportMenu, setShowExportMenu] = React.useState(false);

    const handleExport = (format: 'json' | 'yaml' | 'markdown') => {
        if (onExport) {
            onExport(format);
        }
        setShowExportMenu(false);
    };

    return (
        <div className="toolbar bg-light border-bottom p-2" role="toolbar" aria-label="Planning actions">
            <div className="d-flex justify-content-between align-items-center">
                <div className="btn-toolbar gap-2" role="group">
                    <div className="btn-group" role="group">
                        <button 
                            className="btn btn-primary btn-sm" 
                            onClick={onCreateEpic} 
                            title="Create Epic"
                            aria-label="Create new epic"
                        >
                            <span className="icon me-1" aria-hidden="true">➕</span>
                            <span>New Epic</span>
                        </button>
                        <button 
                            className="btn btn-outline-secondary btn-sm" 
                            onClick={onRefresh} 
                            title="Refresh"
                            aria-label="Refresh planning tree"
                        >
                            <span className="icon me-1" aria-hidden="true">🔄</span>
                            <span>Refresh</span>
                        </button>
                    </div>

                    <div className="btn-group" role="group">
                        <button 
                            className="btn btn-outline-secondary btn-sm" 
                            onClick={onExpandAll} 
                            title="Expand All"
                            aria-label="Expand all tree nodes"
                        >
                            <span className="icon me-1" aria-hidden="true">📂</span>
                            <span>Expand All</span>
                        </button>
                        <button 
                            className="btn btn-outline-secondary btn-sm" 
                            onClick={onCollapseAll} 
                            title="Collapse All"
                            aria-label="Collapse all tree nodes"
                        >
                            <span className="icon me-1" aria-hidden="true">📁</span>
                            <span>Collapse All</span>
                        </button>
                    </div>

                    {onExport && (
                        <div className="btn-group dropdown">
                            <button 
                                className="btn btn-outline-secondary btn-sm dropdown-toggle" 
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                title="Export"
                                aria-expanded={showExportMenu}
                                data-bs-toggle="dropdown"
                            >
                                <span className="icon me-1" aria-hidden="true">📥</span>
                                <span>Export</span>
                            </button>
                            {showExportMenu && (
                                <ul className="dropdown-menu show" style={{ position: 'absolute' }}>
                                    <li><button className="dropdown-item" onClick={() => handleExport('json')}>Export as JSON</button></li>
                                    <li><button className="dropdown-item" onClick={() => handleExport('yaml')}>Export as YAML</button></li>
                                    <li><button className="dropdown-item" onClick={() => handleExport('markdown')}>Export as Markdown</button></li>
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
