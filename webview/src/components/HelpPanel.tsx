import React from 'react';
import './HelpPanel.css';

interface HelpPanelProps {
    onClose?: () => void;
}

interface HelpSection {
    id: string;
    title: string;
    icon: string;
    content: React.ReactNode;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ onClose }) => {
    const [activeSection, setActiveSection] = React.useState('getting-started');

    const sections: HelpSection[] = [
        {
            id: 'getting-started',
            title: 'Getting Started',
            icon: '🚀',
            content: (
                <div>
                    <h3>Welcome to AI Command Center!</h3>
                    <p>AI Command Center helps you manage your project planning with:</p>
                    <ul>
                        <li><strong>Hierarchical Structure:</strong> Organize work into Epics → Stories → Tasks</li>
                        <li><strong>Multiple Views:</strong> Tree, Timeline, Kanban, Calendar, and Charts</li>
                        <li><strong>JIRA Integration:</strong> Sync with JIRA Cloud seamlessly</li>
                        <li><strong>Advanced Filtering:</strong> Find exactly what you need</li>
                    </ul>
                    <h4>Quick Start</h4>
                    <ol>
                        <li>Choose a workspace template or start from scratch</li>
                        <li>Create epics for major initiatives</li>
                        <li>Break down epics into stories and tasks</li>
                        <li>Track progress across different views</li>
                        <li>Export or sync with JIRA when ready</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'keyboard-shortcuts',
            title: 'Keyboard Shortcuts',
            icon: '⌨️',
            content: (
                <div>
                    <h3>Keyboard Shortcuts</h3>
                    <div className="shortcuts-grid">
                        <div className="shortcut-group">
                            <h4>General</h4>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd>
                                <span>Show command palette</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>F</kbd>
                                <span>Search/Filter</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>N</kbd>
                                <span>Create new item</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>S</kbd>
                                <span>Save changes</span>
                            </div>
                        </div>
                        
                        <div className="shortcut-group">
                            <h4>Navigation</h4>
                            <div className="shortcut-item">
                                <kbd>↑</kbd> / <kbd>↓</kbd>
                                <span>Navigate items</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Enter</kbd>
                                <span>Edit selected item</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Esc</kbd>
                                <span>Cancel/Close</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Space</kbd>
                                <span>Expand/Collapse</span>
                            </div>
                        </div>
                        
                        <div className="shortcut-group">
                            <h4>Editing</h4>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>E</kbd>
                                <span>Edit item</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>D</kbd>
                                <span>Duplicate item</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Delete</kbd>
                                <span>Delete selected</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd>
                                <span>Undo</span>
                            </div>
                        </div>
                        
                        <div className="shortcut-group">
                            <h4>Views</h4>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>1</kbd>
                                <span>Tree view</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>2</kbd>
                                <span>Timeline view</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>3</kbd>
                                <span>Kanban view</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Ctrl/Cmd</kbd> + <kbd>4</kbd>
                                <span>Calendar view</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'views',
            title: 'Views & Layouts',
            icon: '👁️',
            content: (
                <div>
                    <h3>Views & Layouts</h3>
                    
                    <div className="view-section">
                        <h4>🌳 Tree View</h4>
                        <p>Hierarchical view showing epics, stories, and tasks in a collapsible tree structure.</p>
                        <ul>
                            <li>Click to expand/collapse nodes</li>
                            <li>Drag and drop to reorganize</li>
                            <li>Right-click for context menu</li>
                        </ul>
                    </div>
                    
                    <div className="view-section">
                        <h4>📅 Timeline View</h4>
                        <p>Gantt-style timeline showing items scheduled over time.</p>
                        <ul>
                            <li>Drag items to change dates</li>
                            <li>Resize to adjust duration</li>
                            <li>Zoom in/out with mouse wheel</li>
                        </ul>
                    </div>
                    
                    <div className="view-section">
                        <h4>📊 Kanban View</h4>
                        <p>Board view organized by status columns.</p>
                        <ul>
                            <li>Drag cards between columns</li>
                            <li>WIP limits per column</li>
                            <li>Swimlanes for grouping</li>
                        </ul>
                    </div>
                    
                    <div className="view-section">
                        <h4>📆 Calendar View</h4>
                        <p>Month/week calendar showing scheduled items.</p>
                        <ul>
                            <li>Drag to reschedule</li>
                            <li>Click date to create new item</li>
                            <li>Color-coded by priority</li>
                        </ul>
                    </div>
                    
                    <div className="view-section">
                        <h4>📈 Charts View</h4>
                        <p>Visual analytics and metrics.</p>
                        <ul>
                            <li>Status distribution pie chart</li>
                            <li>Priority breakdown</li>
                            <li>Story points over time</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'features',
            title: 'Features',
            icon: '⚡',
            content: (
                <div>
                    <h3>Key Features</h3>
                    
                    <div className="feature-section">
                        <h4>Bulk Operations</h4>
                        <p>Edit or delete multiple items at once:</p>
                        <ol>
                            <li>Enable selection mode</li>
                            <li>Check items to select</li>
                            <li>Use bulk actions bar</li>
                        </ol>
                    </div>
                    
                    <div className="feature-section">
                        <h4>Advanced Filtering</h4>
                        <p>Filter by multiple criteria:</p>
                        <ul>
                            <li>Status, priority, type</li>
                            <li>Tags and assignees</li>
                            <li>Date ranges</li>
                            <li>Custom filters</li>
                        </ul>
                    </div>
                    
                    <div className="feature-section">
                        <h4>Import & Export</h4>
                        <p>Supported formats:</p>
                        <ul>
                            <li><strong>JSON:</strong> Full data with hierarchy</li>
                            <li><strong>CSV:</strong> Flat table format</li>
                            <li><strong>Markdown:</strong> Human-readable with formatting</li>
                            <li><strong>HTML:</strong> Styled document</li>
                        </ul>
                    </div>
                    
                    <div className="feature-section">
                        <h4>JIRA Sync</h4>
                        <p>Two-way synchronization with JIRA Cloud:</p>
                        <ul>
                            <li>Configure JIRA connection in settings</li>
                            <li>Map projects and issue types</li>
                            <li>Pull latest from JIRA</li>
                            <li>Push changes back to JIRA</li>
                        </ul>
                    </div>
                    
                    <div className="feature-section">
                        <h4>Activity Log</h4>
                        <p>Track all changes:</p>
                        <ul>
                            <li>Create, edit, delete actions</li>
                            <li>Bulk operations</li>
                            <li>Import/export history</li>
                            <li>Undo support for some actions</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'faq',
            title: 'FAQ',
            icon: '❓',
            content: (
                <div>
                    <h3>Frequently Asked Questions</h3>
                    
                    <div className="faq-item">
                        <h4>Where is my data stored?</h4>
                        <p>All data is stored locally in your VS Code workspace configuration files. Nothing is sent to external servers unless you explicitly sync with JIRA.</p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>Can I use this with GitHub Projects?</h4>
                        <p>Currently, only JIRA Cloud integration is supported. GitHub Projects integration is planned for a future release.</p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>How do I share my workspace with my team?</h4>
                        <p>Export your workspace to JSON and share the file, or sync with JIRA for team collaboration.</p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>What's the difference between Epic, Story, and Task?</h4>
                        <p>
                            <strong>Epics</strong> are large initiatives that span multiple sprints.<br/>
                            <strong>Stories</strong> are user-facing features that can be completed in a sprint.<br/>
                            <strong>Tasks</strong> are technical work items that support stories.
                        </p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>Can I customize the fields?</h4>
                        <p>Custom fields support is planned for a future release. Currently, you can use tags for additional categorization.</p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>How do I report bugs or request features?</h4>
                        <p>Visit the GitHub repository and create an issue. Include as much detail as possible.</p>
                    </div>
                    
                    <div className="faq-item">
                        <h4>Is there a limit to how many items I can create?</h4>
                        <p>No hard limit, but performance may degrade with very large datasets (10,000+ items). Consider archiving completed work.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'troubleshooting',
            title: 'Troubleshooting',
            icon: '🔧',
            content: (
                <div>
                    <h3>Troubleshooting</h3>
                    
                    <div className="troubleshoot-item">
                        <h4>WebView not loading</h4>
                        <p><strong>Solution:</strong></p>
                        <ol>
                            <li>Reload VS Code window (Cmd+R / Ctrl+R)</li>
                            <li>Check Developer Console for errors</li>
                            <li>Ensure extension is up to date</li>
                            <li>Try reinstalling the extension</li>
                        </ol>
                    </div>
                    
                    <div className="troubleshoot-item">
                        <h4>JIRA sync failing</h4>
                        <p><strong>Solution:</strong></p>
                        <ol>
                            <li>Verify JIRA credentials in settings</li>
                            <li>Check API token is valid</li>
                            <li>Ensure JIRA instance URL is correct</li>
                            <li>Check network connectivity</li>
                        </ol>
                    </div>
                    
                    <div className="troubleshoot-item">
                        <h4>Changes not saving</h4>
                        <p><strong>Solution:</strong></p>
                        <ol>
                            <li>Check VS Code workspace is writable</li>
                            <li>Look for error messages in console</li>
                            <li>Try manually saving (Cmd+S / Ctrl+S)</li>
                            <li>Export data as backup before restart</li>
                        </ol>
                    </div>
                    
                    <div className="troubleshoot-item">
                        <h4>Performance issues</h4>
                        <p><strong>Solution:</strong></p>
                        <ol>
                            <li>Open Performance Monitor to identify bottlenecks</li>
                            <li>Collapse large tree sections</li>
                            <li>Use filters to reduce visible items</li>
                            <li>Archive or delete old items</li>
                        </ol>
                    </div>
                </div>
            )
        }
    ];

    const activeContent = sections.find(s => s.id === activeSection)?.content;

    return (
        <div className="help-panel">
            <div className="help-sidebar">
                <div className="help-header">
                    <h2>📚 Help & Documentation</h2>
                    {onClose && (
                        <button className="close-button" onClick={onClose}>
                            ✕
                        </button>
                    )}
                </div>
                <nav className="help-nav">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <span className="nav-icon">{section.icon}</span>
                            <span className="nav-label">{section.title}</span>
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="help-content">
                {activeContent}
            </div>
        </div>
    );
};
