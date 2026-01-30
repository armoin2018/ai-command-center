import React from 'react';
import { WorkspaceTemplates, WorkspaceTemplate } from '../utils/workspaceTemplates';
import { TreeNodeData } from '../types/tree';
import './OnboardingWizard.css';

interface OnboardingWizardProps {
    onComplete: (template: WorkspaceTemplate) => void;
    onSkip: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
    const [step, setStep] = React.useState(1);
    const [selectedTemplate, setSelectedTemplate] = React.useState<WorkspaceTemplate | null>(null);
    const templates = WorkspaceTemplates.getTemplates();

    const handleSelectTemplate = (template: WorkspaceTemplate) => {
        setSelectedTemplate(template);
        setStep(2);
    };

    const handleComplete = () => {
        if (selectedTemplate) {
            onComplete(selectedTemplate);
            localStorage.setItem('onboardingCompleted', 'true');
        }
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-wizard">
                <div className="wizard-header">
                    <h2>Welcome to AI Command Center! 👋</h2>
                    <button className="skip-button" onClick={onSkip}>
                        Skip
                    </button>
                </div>

                <div className="wizard-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-number">1</div>
                        <div className="step-label">Choose Template</div>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                        <div className="step-number">2</div>
                        <div className="step-label">Customize</div>
                    </div>
                    <div className="progress-line" />
                    <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <div className="step-label">Get Started</div>
                    </div>
                </div>

                {step === 1 && (
                    <div className="wizard-content">
                        <h3>Choose a Workspace Template</h3>
                        <p>Select a template to get started quickly with pre-configured structure and sample data.</p>
                        
                        <div className="templates-grid">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="template-card"
                                    onClick={() => handleSelectTemplate(template)}
                                >
                                    <div className="template-icon">{template.icon}</div>
                                    <h4>{template.title}</h4>
                                    <p>{template.description}</p>
                                    <span className="template-category">{template.category}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && selectedTemplate && (
                    <div className="wizard-content">
                        <h3>Customize Your Workspace</h3>
                        <p>Review the template structure. You can modify this later.</p>
                        
                        <div className="template-preview">
                            <div className="preview-header">
                                <span className="preview-icon">{selectedTemplate.icon}</span>
                                <h4>{selectedTemplate.title}</h4>
                            </div>
                            <div className="preview-description">
                                {selectedTemplate.description}
                            </div>
                            <div className="preview-stats">
                                <div className="stat">
                                    <span className="stat-label">Epics</span>
                                    <span className="stat-value">
                                        {selectedTemplate.tree.length}
                                    </span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Total Items</span>
                                    <span className="stat-value">
                                        {countItems(selectedTemplate.tree)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="preview-tree">
                                {selectedTemplate.tree.slice(0, 3).map(epic => (
                                    <div key={epic.id} className="preview-item">
                                        <span className="item-icon">🎯</span>
                                        <span className="item-name">{epic.title}</span>
                                        {epic.children && (
                                            <span className="item-count">
                                                ({epic.children.length} items)
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="wizard-actions">
                            <button className="btn-back" onClick={() => setStep(1)}>
                                ← Back
                            </button>
                            <button className="btn-next" onClick={() => setStep(3)}>
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && selectedTemplate && (
                    <div className="wizard-content">
                        <h3>You're All Set! 🎉</h3>
                        <p>Your workspace is ready. Here are some tips to get started:</p>
                        
                        <div className="tips-list">
                            <div className="tip-item">
                                <span className="tip-icon">⌨️</span>
                                <div className="tip-content">
                                    <strong>Keyboard Shortcuts</strong>
                                    <p>Press <kbd>Ctrl/Cmd+K</kbd> to see all available shortcuts</p>
                                </div>
                            </div>
                            <div className="tip-item">
                                <span className="tip-icon">🔍</span>
                                <div className="tip-content">
                                    <strong>Quick Search</strong>
                                    <p>Press <kbd>Ctrl/Cmd+F</kbd> to search across all items</p>
                                </div>
                            </div>
                            <div className="tip-item">
                                <span className="tip-icon">📊</span>
                                <div className="tip-content">
                                    <strong>Multiple Views</strong>
                                    <p>Switch between Tree, Timeline, Kanban, Calendar, and Charts views</p>
                                </div>
                            </div>
                            <div className="tip-item">
                                <span className="tip-icon">💾</span>
                                <div className="tip-content">
                                    <strong>Auto-Save</strong>
                                    <p>All changes are automatically saved to your configuration</p>
                                </div>
                            </div>
                        </div>

                        <div className="wizard-actions">
                            <button className="btn-back" onClick={() => setStep(2)}>
                                ← Back
                            </button>
                            <button className="btn-complete" onClick={handleComplete}>
                                Start Planning! 🚀
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

function countItems(nodes: TreeNodeData[]): number {
    let count = nodes.length;
    nodes.forEach(node => {
        if (node.children) {
            count += countItems(node.children);
        }
    });
    return count;
}
