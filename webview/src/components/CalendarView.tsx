import React, { useState, useMemo } from 'react';
import { TreeNodeData } from '../types/tree';
import './CalendarView.css';

interface CalendarViewProps {
    tree: TreeNodeData[];
    onSelectNode: (node: TreeNodeData) => void;
    onUpdateDate?: (nodeId: string, date: Date) => void;
}

type ViewMode = 'month' | 'week';

interface CalendarItem {
    node: TreeNodeData;
    date: Date;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
    tree,
    onSelectNode,
    onUpdateDate
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [draggedItem, setDraggedItem] = useState<CalendarItem | null>(null);
    const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

    // Flatten tree and extract items with dates
    const flattenTree = (nodes: TreeNodeData[]): TreeNodeData[] => {
        return nodes.reduce((acc: TreeNodeData[], node) => {
            acc.push(node);
            if (node.children) {
                acc.push(...flattenTree(node.children));
            }
            return acc;
        }, []);
    };

    const allNodes = useMemo(() => flattenTree(tree), [tree]);

    // Get items with dates (dueDate or createdAt)
    const itemsByDate = useMemo(() => {
        const items: CalendarItem[] = [];
        allNodes.forEach(node => {
            if (node.deliverByDate) {
                items.push({ node, date: new Date(node.deliverByDate) });
            } else if (node.createdOn) {
                items.push({ node, date: new Date(node.createdOn) });
            }
        });
        return items;
    }, [allNodes]);

    // Get calendar days for current view
    const calendarDays = useMemo(() => {
        const days: Date[] = [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (viewMode === 'month') {
            // Get first day of month
            const firstDay = new Date(year, month, 1);
            const startDay = firstDay.getDay(); // 0-6 (Sun-Sat)

            // Start from previous month if needed to fill first week
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - startDay);

            // Generate 42 days (6 weeks)
            for (let i = 0; i < 42; i++) {
                const day = new Date(startDate);
                day.setDate(startDate.getDate() + i);
                days.push(day);
            }
        } else {
            // Week view - get current week
            const dayOfWeek = currentDate.getDay();
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                days.push(day);
            }
        }

        return days;
    }, [currentDate, viewMode]);

    // Get items for a specific date
    const getItemsForDate = (date: Date): CalendarItem[] => {
        return itemsByDate.filter(item => {
            const itemDate = item.date;
            return itemDate.getFullYear() === date.getFullYear() &&
                   itemDate.getMonth() === date.getMonth() &&
                   itemDate.getDate() === date.getDate();
        });
    };

    // Navigation
    const navigatePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(currentDate.getMonth() - 1);
        } else {
            newDate.setDate(currentDate.getDate() - 7);
        }
        setCurrentDate(newDate);
    };

    const navigateNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(currentDate.getMonth() + 1);
        } else {
            newDate.setDate(currentDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };

    const navigateToday = () => {
        setCurrentDate(new Date());
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, item: CalendarItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverDate(date);
    };

    const handleDragLeave = () => {
        setDragOverDate(null);
    };

    const handleDrop = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        setDragOverDate(null);

        if (draggedItem && onUpdateDate) {
            // Update item date to dropped date
            const newDate = new Date(date);
            newDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
            onUpdateDate(draggedItem.node.id, newDate);
        }

        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverDate(null);
    };

    // Formatting
    const formatMonthYear = () => {
        return currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
    };

    const formatWeekRange = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const isToday = (date: Date): boolean => {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    };

    const isCurrentMonth = (date: Date): boolean => {
        return date.getMonth() === currentDate.getMonth();
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'epic': return '#7c4dff';
            case 'story': return '#2196f3';
            case 'task': return '#4caf50';
            default: return '#9e9e9e';
        }
    };

    const getStatusIcon = (status: string): string => {
        switch (status) {
            case 'done': return '✓';
            case 'in-progress': return '⏳';
            case 'pending': return '🚫';
            default: return '○';
        }
    };

    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <div className="calendar-navigation">
                    <button onClick={navigatePrevious} className="nav-button">
                        ◀
                    </button>
                    <button onClick={navigateToday} className="today-button">
                        Today
                    </button>
                    <button onClick={navigateNext} className="nav-button">
                        ▶
                    </button>
                </div>
                
                <h2 className="calendar-title">
                    {viewMode === 'month' ? formatMonthYear() : formatWeekRange()}
                </h2>

                <div className="view-mode-toggle">
                    <button
                        className={viewMode === 'month' ? 'active' : ''}
                        onClick={() => setViewMode('month')}
                    >
                        Month
                    </button>
                    <button
                        className={viewMode === 'week' ? 'active' : ''}
                        onClick={() => setViewMode('week')}
                    >
                        Week
                    </button>
                </div>
            </div>

            <div className={`calendar-grid ${viewMode === 'week' ? 'week-view' : ''}`}>
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="calendar-day-header">
                        {day}
                    </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((date, index) => {
                    const items = getItemsForDate(date);
                    const isCurrentMonthDay = isCurrentMonth(date);
                    const isTodayDate = isToday(date);
                    const isDragOver = dragOverDate && 
                                      dragOverDate.getTime() === date.getTime();

                    return (
                        <div
                            key={index}
                            className={`calendar-day ${!isCurrentMonthDay ? 'other-month' : ''} ${isTodayDate ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, date)}
                        >
                            <div className="day-number">
                                {date.getDate()}
                            </div>
                            
                            <div className="day-items">
                                {items.slice(0, viewMode === 'month' ? 3 : 10).map(item => (
                                    <div
                                        key={item.node.id}
                                        className="calendar-item"
                                        style={{ borderLeftColor: getTypeColor(item.node.type) }}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectNode(item.node);
                                        }}
                                    >
                                        <span className="item-status">
                                            {getStatusIcon(item.node.status)}
                                        </span>
                                        <span className="item-title">
                                            {item.node.title}
                                        </span>
                                    </div>
                                ))}
                                {items.length > (viewMode === 'month' ? 3 : 10) && (
                                    <div className="more-items">
                                        +{items.length - (viewMode === 'month' ? 3 : 10)} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="calendar-legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#7c4dff' }}></span>
                    <span>Epic</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#2196f3' }}></span>
                    <span>Story</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#4caf50' }}></span>
                    <span>Task</span>
                </div>
            </div>
        </div>
    );
};
