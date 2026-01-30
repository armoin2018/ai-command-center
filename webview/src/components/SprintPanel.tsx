import React from 'react';
import { SprintManager, Sprint, BurndownData } from '../utils/sprintManager';
import { TreeNodeData } from '../types/tree';
import './SprintPanel.css';

interface SprintPanelProps {
    tree: TreeNodeData[];
    onUpdateTree?: (tree: TreeNodeData[]) => void;
}

export const SprintPanel: React.FC<SprintPanelProps> = ({ tree, onUpdateTree }) => {
    const [sprints, setSprints] = React.useState<Sprint[]>([]);
    const [activeSprint, setActiveSprint] = React.useState<Sprint | null>(null);
    const [showCreateForm, setShowCreateForm] = React.useState(false);
    const [selectedView, setSelectedView] = React.useState<'board' | 'burndown' | 'velocity' | 'retrospective'>('board');

    React.useEffect(() => {
        loadSprints();
    }, []);

    const loadSprints = () => {
        setSprints(SprintManager.getAllSprints());
        setActiveSprint(SprintManager.getActiveSprint());
    };

    const handleCreateSprint = (data: Partial<Sprint>) => {
        SprintManager.createSprint({
            title: data.title!,
            goal: data.goal || '',
            startDate: data.startDate!,
            endDate: data.endDate!,
            status: 'planning',
            capacity: data.capacity || 0,
            completed: 0,
            teamVelocity: SprintManager.calculateVelocity()
        });
        loadSprints();
        setShowCreateForm(false);
    };

    const velocity = SprintManager.calculateVelocity();
    const velocityHistory = SprintManager.getVelocityHistory();

    return (
        <div className="sprint-panel">
            <div className="sprint-header">
                <div className="header-info">
                    <h2>🏃 Sprint Planning</h2>
                    {activeSprint && (
                        <div className="active-sprint-badge">
                            Active: {activeSprint.title}
                        </div>
                    )}
                </div>
                <div className="header-actions">
                    <div className="velocity-display">
                        <span className="velocity-label">Team Velocity:</span>
                        <span className="velocity-value">{velocity} pts</span>
                    </div>
                    <button onClick={() => setShowCreateForm(true)} className="btn-primary">
                        + New Sprint
                    </button>
                </div>
            </div>

            <div className="sprint-tabs">
                <button
                    className={selectedView === 'board' ? 'active' : ''}
                    onClick={() => setSelectedView('board')}
                >
                    📋 Sprint Board
                </button>
                <button
                    className={selectedView === 'burndown' ? 'active' : ''}
                    onClick={() => setSelectedView('burndown')}
                >
                    📉 Burndown
                </button>
                <button
                    className={selectedView === 'velocity' ? 'active' : ''}
                    onClick={() => setSelectedView('velocity')}
                >
                    📊 Velocity
                </button>
                <button
                    className={selectedView === 'retrospective' ? 'active' : ''}
                    onClick={() => setSelectedView('retrospective')}
                >
                    💭 Retrospective
                </button>
            </div>

            <div className="sprint-content">
                {selectedView === 'board' && (
                    <SprintBoard sprints={sprints} onRefresh={loadSprints} />
                )}
                {selectedView === 'burndown' && activeSprint && (
                    <BurndownChart sprint={activeSprint} tree={tree} />
                )}
                {selectedView === 'velocity' && (
                    <VelocityChart history={velocityHistory} currentVelocity={velocity} />
                )}
                {selectedView === 'retrospective' && activeSprint && (
                    <SprintRetrospective sprint={activeSprint} />
                )}
            </div>

            {showCreateForm && (
                <SprintCreateForm
                    onSave={handleCreateSprint}
                    onCancel={() => setShowCreateForm(false)}
                    suggestedCapacity={velocity}
                />
            )}
        </div>
    );
};

// Sprint Board Component
const SprintBoard: React.FC<{ sprints: Sprint[]; onRefresh: () => void }> = ({ sprints, onRefresh }) => {
    const handleCompleteSprint = (sprintId: string) => {
        const sprint = sprints.find(s => s.id === sprintId);
        if (sprint && confirm(`Complete sprint "${sprint.title}"?`)) {
            SprintManager.completeSprint(sprintId, sprint.completed);
            onRefresh();
        }
    };

    return (
        <div className="sprint-board">
            {sprints.length === 0 ? (
                <div className="empty-state">
                    <p>No sprints created yet.</p>
                    <p>Create your first sprint to start planning!</p>
                </div>
            ) : (
                <div className="sprints-grid">
                    {sprints.map(sprint => {
                        const stats = SprintManager.getSprintStats(sprint.id);
                        const health = SprintManager.getSprintHealth(sprint.id);
                        
                        return (
                            <div key={sprint.id} className={`sprint-card ${sprint.status}`}>
                                <div className="sprint-card-header">
                                    <h3>{sprint.title}</h3>
                                    <span className={`status-badge ${sprint.status}`}>
                                        {sprint.status}
                                    </span>
                                </div>
                                
                                <div className="sprint-goal">{sprint.goal}</div>
                                
                                <div className="sprint-dates">
                                    {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                                </div>

                                {stats && (
                                    <div className="sprint-stats">
                                        <div className="stat-row">
                                            <span>Capacity:</span>
                                            <span>{stats.capacity} pts</span>
                                        </div>
                                        <div className="stat-row">
                                            <span>Committed:</span>
                                            <span>{stats.committed} pts</span>
                                        </div>
                                        <div className="stat-row">
                                            <span>Completed:</span>
                                            <span>{stats.completed} pts</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill"
                                                style={{ width: `${stats.completionRate}%` }}
                                            />
                                        </div>
                                        <div className="completion-rate">
                                            {Math.round(stats.completionRate)}% complete
                                        </div>
                                        {sprint.status === 'active' && (
                                            <div className={`health-indicator ${health}`}>
                                                {health === 'on-track' && '✅ On Track'}
                                                {health === 'at-risk' && '⚠️ At Risk'}
                                                {health === 'behind' && '🔴 Behind'}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {sprint.status === 'active' && (
                                    <button 
                                        className="complete-sprint-btn"
                                        onClick={() => handleCompleteSprint(sprint.id)}
                                    >
                                        Complete Sprint
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Burndown Chart Component
const BurndownChart: React.FC<{ sprint: Sprint; tree: TreeNodeData[] }> = ({ sprint, tree }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const burndownData = SprintManager.generateBurndownData(sprint.id, tree);

    React.useEffect(() => {
        if (!canvasRef.current || burndownData.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set dimensions
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        // Calculate max value
        const maxPoints = Math.max(...burndownData.map(d => Math.max(d.remainingPoints, d.idealRemaining)));

        // Draw axes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw ideal line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        burndownData.forEach((point, index) => {
            const x = padding + (chartWidth * index) / (burndownData.length - 1);
            const y = height - padding - (chartHeight * point.idealRemaining) / maxPoints;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw actual line
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        burndownData.forEach((point, index) => {
            const x = padding + (chartWidth * index) / (burndownData.length - 1);
            const y = height - padding - (chartHeight * point.remainingPoints) / maxPoints;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Add labels
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.fillText('Days', width / 2, height - 10);
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Story Points', 0, 0);
        ctx.restore();

        // Legend
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('— — Ideal', width - 120, 30);
        ctx.fillStyle = '#22c55e';
        ctx.fillText('—— Actual', width - 120, 50);

    }, [burndownData]);

    return (
        <div className="burndown-chart">
            <h3>Burndown Chart</h3>
            <canvas ref={canvasRef} width={800} height={400} />
        </div>
    );
};

// Velocity Chart Component
const VelocityChart: React.FC<{ history: any[]; currentVelocity: number }> = ({ history, currentVelocity }) => {
    return (
        <div className="velocity-chart">
            <h3>Velocity Trend</h3>
            <div className="velocity-stats">
                <div className="stat-card">
                    <div className="stat-value">{currentVelocity}</div>
                    <div className="stat-label">Current Velocity</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{history.length}</div>
                    <div className="stat-label">Completed Sprints</div>
                </div>
            </div>
            {history.length > 0 ? (
                <div className="velocity-bars">
                    {history.slice(-6).map((item, index) => (
                        <div key={index} className="velocity-bar-container">
                            <div className="velocity-bar">
                                <div 
                                    className="bar-planned"
                                    style={{ height: `${(item.planned / currentVelocity) * 100}%` }}
                                />
                                <div 
                                    className="bar-completed"
                                    style={{ height: `${(item.completed / currentVelocity) * 100}%` }}
                                />
                            </div>
                            <div className="bar-label">{item.sprintName}</div>
                            <div className="bar-values">
                                {item.completed}/{item.planned}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <p>Complete sprints to see velocity trends</p>
                </div>
            )}
        </div>
    );
};

// Sprint Retrospective Component
const SprintRetrospective: React.FC<{ sprint: Sprint }> = ({ sprint }) => {
    const [wentWell, setWentWell] = React.useState('');
    const [needsImprovement, setNeedsImprovement] = React.useState('');
    const [actionItems, setActionItems] = React.useState('');

    const handleSave = () => {
        const notes = `# Sprint Retrospective - ${sprint.title}\n\n## What went well\n${wentWell}\n\n## What needs improvement\n${needsImprovement}\n\n## Action items\n${actionItems}`;
        SprintManager.updateSprint(sprint.id, { notes });
        alert('Retrospective saved!');
    };

    return (
        <div className="sprint-retrospective">
            <h3>Sprint Retrospective - {sprint.title}</h3>
            
            <div className="retro-section">
                <h4>😊 What went well?</h4>
                <textarea
                    value={wentWell}
                    onChange={(e) => setWentWell(e.target.value)}
                    placeholder="What should we keep doing?"
                    rows={4}
                />
            </div>

            <div className="retro-section">
                <h4>🤔 What needs improvement?</h4>
                <textarea
                    value={needsImprovement}
                    onChange={(e) => setNeedsImprovement(e.target.value)}
                    placeholder="What should we change?"
                    rows={4}
                />
            </div>

            <div className="retro-section">
                <h4>✅ Action items</h4>
                <textarea
                    value={actionItems}
                    onChange={(e) => setActionItems(e.target.value)}
                    placeholder="What will we do differently?"
                    rows={4}
                />
            </div>

            <button onClick={handleSave} className="btn-primary">
                Save Retrospective
            </button>
        </div>
    );
};

// Sprint Create Form Component
const SprintCreateForm: React.FC<{
    onSave: (data: Partial<Sprint>) => void;
    onCancel: () => void;
    suggestedCapacity: number;
}> = ({ onSave, onCancel, suggestedCapacity }) => {
    const [formData, setFormData] = React.useState({
        title: '',
        goal: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        capacity: suggestedCapacity
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            alert('Sprint name is required');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="sprint-form-overlay">
            <div className="sprint-form">
                <h3>Create New Sprint</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Sprint Name *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Sprint 15"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Sprint Goal</label>
                        <textarea
                            value={formData.goal}
                            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                            placeholder="What do you want to achieve?"
                            rows={2}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Start Date *</label>
                            <input
                                type="date"
                                value={formData.startDate.toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>End Date *</label>
                            <input
                                type="date"
                                value={formData.endDate.toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Capacity (Story Points)</label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                            min="0"
                        />
                        {suggestedCapacity > 0 && (
                            <small>Suggested based on team velocity: {suggestedCapacity} pts</small>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onCancel}>Cancel</button>
                        <button type="submit" className="btn-primary">Create Sprint</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
