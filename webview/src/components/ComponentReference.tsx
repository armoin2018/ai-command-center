/**
 * ComponentReference Component
 * 
 * Displays a reference label on UI components when enabled.
 * This helps developers and users identify which component they're looking at
 * for easier communication about updates and issues.
 * 
 * Toggle: Settings > AI Command Center > Show Component References
 * Setting: aicc.ui.showComponentReferences
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import './ComponentReference.css';

// Context for the reference system
interface ComponentReferenceContextType {
    showReferences: boolean;
    setShowReferences: (show: boolean) => void;
}

const ComponentReferenceContext = createContext<ComponentReferenceContextType>({
    showReferences: false,
    setShowReferences: () => {}
});

/**
 * Provider for the component reference system
 */
export const ComponentReferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showReferences, setShowReferences] = useState(false);

    // Listen for settings changes from VS Code
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === 'settingsUpdate' && message.payload?.showComponentReferences !== undefined) {
                setShowReferences(message.payload.showComponentReferences);
            }
            if (message.type === 'init' && message.payload?.settings?.showComponentReferences !== undefined) {
                setShowReferences(message.payload.settings.showComponentReferences);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <ComponentReferenceContext.Provider value={{ showReferences, setShowReferences }}>
            {children}
        </ComponentReferenceContext.Provider>
    );
};

/**
 * Hook to access the reference system
 */
export const useComponentReference = () => useContext(ComponentReferenceContext);

/**
 * Reference label positions
 */
export type ReferencePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';

/**
 * Props for the ComponentRef component
 */
interface ComponentRefProps {
    /** Unique reference ID (e.g., "MAIN-PANEL", "FILTER-BAR", "TREE-VIEW") */
    refId: string;
    /** Optional component name for display */
    name?: string;
    /** File path for the component source */
    filePath?: string;
    /** Position of the reference label */
    position?: ReferencePosition;
    /** Children to wrap */
    children: React.ReactNode;
    /** Additional class name */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}

/**
 * Component Reference wrapper - shows a reference label on hover/always when enabled
 */
export const ComponentRef: React.FC<ComponentRefProps> = ({
    refId,
    name,
    filePath,
    position = 'top-left',
    children,
    className = '',
    style = {}
}) => {
    const { showReferences } = useComponentReference();

    if (!showReferences) {
        return <>{children}</>;
    }

    const displayName = name || refId;
    const tooltip = filePath ? `${displayName}\n📁 ${filePath}` : displayName;

    return (
        <div 
            className={`component-ref-wrapper ${className}`} 
            style={style}
            data-ref-id={refId}
        >
            <div 
                className={`component-ref-label ref-position-${position}`}
                title={tooltip}
            >
                <span className="ref-badge">REF</span>
                <span className="ref-id">{refId}</span>
            </div>
            {children}
        </div>
    );
};

/**
 * Inline reference badge - for smaller elements
 */
interface InlineRefProps {
    refId: string;
    filePath?: string;
}

export const InlineRef: React.FC<InlineRefProps> = ({ refId, filePath }) => {
    const { showReferences } = useComponentReference();

    if (!showReferences) {
        return null;
    }

    return (
        <span 
            className="inline-ref-badge" 
            title={filePath ? `${refId}\n📁 ${filePath}` : refId}
        >
            {refId}
        </span>
    );
};

/**
 * Component Reference Map - Documents all available references
 * This can be used to generate documentation or for lookup
 */
export const COMPONENT_REFERENCES = {
    // Main Panels
    'MAIN-PANEL': {
        name: 'Main Planning Panel',
        filePath: 'src/panels/mainPanel.ts',
        description: 'The main WebView panel containing the planning tree and views'
    },
    'SECONDARY-PANEL': {
        name: 'Secondary Panel',
        filePath: 'src/views/secondaryPanelProvider.ts',
        description: 'The bottom panel with tabs for Planning, AI Kit Loader, etc.'
    },
    
    // React Components (webview/src/components/)
    'APP': {
        name: 'App Component',
        filePath: 'webview/src/App.tsx',
        description: 'Root React component'
    },
    'TOOLBAR': {
        name: 'Toolbar',
        filePath: 'webview/src/components/Toolbar.tsx',
        description: 'Top action toolbar'
    },
    'FILTER-BAR': {
        name: 'Filter Bar',
        filePath: 'webview/src/components/FilterBar.tsx',
        description: 'Search and filter controls'
    },
    'TREE-VIEW': {
        name: 'Tree View',
        filePath: 'webview/src/components/TreeView.tsx',
        description: 'Hierarchical tree view of epics/stories/tasks'
    },
    'TREE-NODE': {
        name: 'Tree Node',
        filePath: 'webview/src/components/TreeNode.tsx',
        description: 'Individual tree node (epic/story/task/bug)'
    },
    'DETAILS-PANEL': {
        name: 'Details Panel',
        filePath: 'webview/src/components/DetailsPanel.tsx',
        description: 'Side panel showing selected item details'
    },
    'STATS-PANEL': {
        name: 'Stats Panel',
        filePath: 'webview/src/components/StatsPanel.tsx',
        description: 'Statistics and metrics panel'
    },
    'KANBAN-BOARD': {
        name: 'Kanban Board',
        filePath: 'webview/src/components/KanbanBoard.tsx',
        description: 'Kanban board view'
    },
    'TIMELINE-VIEW': {
        name: 'Timeline View',
        filePath: 'webview/src/components/TimelineView.tsx',
        description: 'Timeline/Gantt view'
    },
    'CALENDAR-VIEW': {
        name: 'Calendar View',
        filePath: 'webview/src/components/CalendarView.tsx',
        description: 'Calendar view'
    },
    'CHARTS': {
        name: 'Charts',
        filePath: 'webview/src/components/Charts.tsx',
        description: 'Charts and analytics view'
    },
    'SPRINT-PANEL': {
        name: 'Sprint Panel',
        filePath: 'webview/src/components/SprintPanel.tsx',
        description: 'Sprint planning panel'
    },
    
    // Secondary Panel Tabs
    'SEC-PLANNING-TAB': {
        name: 'Planning Tab (Secondary)',
        filePath: 'src/views/secondaryPanelProvider.ts#renderPlanningPanel',
        description: 'Planning accordion in secondary panel'
    },
    'SEC-AIKIT-TAB': {
        name: 'AI Kit Loader Tab',
        filePath: 'src/views/secondaryPanelProvider.ts#renderAIKitLoaderPanel',
        description: 'AI Kit loader in secondary panel'
    },
    'SEC-STATUS-BADGES': {
        name: 'Status Badges',
        filePath: 'src/views/secondaryPanelProvider.ts#renderPlanningPanel',
        description: 'Status filter badges (todo, open, in-progress, etc.)'
    },
    'SEC-ACCORDION-LIST': {
        name: 'Accordion List',
        filePath: 'src/views/secondaryPanelProvider.ts#renderAccordionItem',
        description: 'Expandable accordion list of items'
    },
    'SEC-ACCORDION-ITEM': {
        name: 'Accordion Item',
        filePath: 'src/views/secondaryPanelProvider.ts#renderAccordionItem',
        description: 'Individual accordion item (epic/story/task/bug)'
    },
    
    // Media Components
    'MEDIA-FILTER-BAR': {
        name: 'Filter Bar (Media)',
        filePath: 'media/components/filter-bar/',
        description: 'Legacy filter bar component'
    },
    'MEDIA-PLANNING-TREE': {
        name: 'Planning Tree (Media)',
        filePath: 'media/components/planning-tree/',
        description: 'Legacy planning tree component'
    }
} as const;

export type ComponentRefId = keyof typeof COMPONENT_REFERENCES;

/**
 * Get component info by reference ID
 */
export const getComponentInfo = (refId: string) => {
    return COMPONENT_REFERENCES[refId as ComponentRefId] || null;
};

export default ComponentRef;
