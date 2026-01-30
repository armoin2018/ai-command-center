# Planning Manager Documentation

## Overview

The Planning Manager provides a complete hierarchical planning system for managing Epics, Stories, and Tasks with file-based persistence, validation, and tree operations.

## Architecture

### Components

1. **PlanningManager**: Unified interface for all planning operations
2. **EpicManager**: Epic CRUD operations
3. **StoryManager**: Story CRUD operations
4. **TaskManager**: Task CRUD operations
5. **WorkspaceManager**: File system operations
6. **Validator**: Schema-based validation
7. **TreeBuilder**: Hierarchical tree construction
8. **TreeTraversal**: Tree navigation utilities

## Entities

### Epic

```typescript
interface Epic {
  id: string;              // Unique identifier (e.g., "epic-001")
  name: string;            // Epic name
  description: string;     // Detailed description
  status: Status;          // "planning" | "in-progress" | "completed" | "blocked"
  priority: Priority;      // "low" | "medium" | "high" | "critical"
  tags: string[];          // Categorization tags
  startDate?: Date;        // Planned start date
  endDate?: Date;          // Planned end date
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update timestamp
  metadata: Record<string, any>; // Custom metadata
}
```

### Story

```typescript
interface Story {
  id: string;              // Unique identifier (e.g., "story-001")
  epicId: string;          // Parent epic ID
  name: string;            // Story name
  description: string;     // User story description
  storyPoints: number;     // Story point estimate
  status: Status;          // Current status
  priority: Priority;      // Story priority
  tags: string[];          // Tags
  assignee?: string;       // Assigned developer
  startDate?: Date;        // Planned start
  endDate?: Date;          // Planned end
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update
  metadata: Record<string, any>; // Custom metadata
}
```

### Task

```typescript
interface Task {
  id: string;              // Unique identifier (e.g., "task-001")
  storyId: string;         // Parent story ID
  name: string;            // Task name
  description: string;     // Task description
  status: Status;          // Current status
  priority: Priority;      // Task priority
  tags: string[];          // Tags
  assignee?: string;       // Assigned developer
  estimatedHours?: number; // Time estimate
  actualHours?: number;    // Actual time spent
  startDate?: Date;        // Start date
  endDate?: Date;          // End date
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update
  metadata: Record<string, any>; // Custom metadata
}
```

## Usage

### Initialize Planning Manager

```typescript
import { PlanningManager } from './planning/planningManager';
import { Logger } from './logger';

const logger = Logger.getInstance();
const manager = PlanningManager.getInstance(logger);
```

### Epic Operations

```typescript
// Create epic
const epic = await manager.createEpic({
  name: 'User Management System',
  description: 'Complete user management with auth',
  status: 'planning',
  priority: 'high',
  tags: ['backend', 'auth'],
  startDate: new Date('2026-01-15'),
  endDate: new Date('2026-02-15')
});

// Get epic
const fetchedEpic = await manager.getEpic(epic.id);

// Update epic
const updatedEpic = await manager.updateEpic(epic.id, {
  status: 'in-progress',
  priority: 'critical'
});

// Delete epic
await manager.deleteEpic(epic.id);

// List all epics
const epics = await manager.listEpics();

// List epics by status
const activeEpics = await manager.listEpics({ status: 'in-progress' });
```

### Story Operations

```typescript
// Create story
const story = await manager.createStory({
  epicId: epic.id,
  name: 'User Registration',
  description: 'As a user, I want to register an account',
  storyPoints: 5,
  status: 'todo',
  priority: 'high',
  tags: ['api', 'validation']
});

// Get story
const fetchedStory = await manager.getStory(story.id);

// Update story
const updatedStory = await manager.updateStory(story.id, {
  status: 'in-progress',
  assignee: 'john.doe@example.com'
});

// Delete story
await manager.deleteStory(story.id);

// List all stories
const stories = await manager.listStories();

// List stories for an epic
const epicStories = await manager.listStories({ epicId: epic.id });
```

### Task Operations

```typescript
// Create task
const task = await manager.createTask({
  storyId: story.id,
  name: 'Create User model',
  description: 'Define User schema with validation',
  status: 'todo',
  priority: 'high',
  estimatedHours: 4,
  tags: ['database', 'model']
});

// Get task
const fetchedTask = await manager.getTask(task.id);

// Update task
const updatedTask = await manager.updateTask(task.id, {
  status: 'in-progress',
  assignee: 'jane.smith@example.com',
  actualHours: 2
});

// Delete task
await manager.deleteTask(task.id);

// List all tasks
const tasks = await manager.listTasks();

// List tasks for a story
const storyTasks = await manager.listTasks({ storyId: story.id });
```

### Tree Operations

```typescript
// Get complete planning tree
const tree = await manager.getTree();
console.log(`Total story points: ${tree.getTotalStoryPoints()}`);
console.log(`Completion: ${tree.getCompletionPercentage()}%`);

// Rebuild tree after changes
await manager.rebuildTree();

// Get tree statistics
const stats = await manager.getTreeStatistics();
console.log(stats);
// Output:
// {
//   totalEpics: 5,
//   totalStories: 23,
//   totalTasks: 87,
//   totalStoryPoints: 145,
//   completedStoryPoints: 62,
//   completionPercentage: 42.76,
//   statusCounts: { ... }
// }

// Search by name
const results = await manager.searchByName('authentication');

// Get blocked items
const blockedItems = await manager.getBlockedItems();
blockedItems.forEach(node => {
  console.log(`Blocked: ${node.name} (${node.type})`);
});
```

## File Structure

Planning artifacts are stored in a hierarchical file structure:

```
.project/plan/
├── epics/
│   ├── epic-001/
│   │   ├── epic.json
│   │   └── stories/
│   │       ├── story-001/
│   │       │   ├── story.json
│   │       │   └── tasks/
│   │       │       ├── task-001.json
│   │       │       └── task-002.json
│   │       └── story-002/
│   │           └── story.json
│   └── epic-002/
│       └── epic.json
├── sprints/
└── templates/
```

## Validation

All entities are validated against schemas before persistence:

### Epic Validation Rules

- `id`: Required, valid slug format
- `name`: Required, 1-200 characters
- `description`: Required, max 2000 characters
- `status`: Must be valid status
- `priority`: Must be valid priority
- `tags`: Optional array of strings
- `startDate`: Optional, valid date
- `endDate`: Optional, valid date, must be after startDate

### Story Validation Rules

- All epic validation rules
- `epicId`: Required, valid ID
- `storyPoints`: Required, valid story point value (0, 1, 2, 3, 5, 8, 13, 21)
- `assignee`: Optional, valid email format

### Task Validation Rules

- All story validation rules
- `storyId`: Required, valid ID
- `estimatedHours`: Optional, positive number
- `actualHours`: Optional, positive number

## Error Handling

The Planning Manager uses custom error types:

```typescript
try {
  await manager.createEpic({ /* ... */ });
} catch (error) {
  if (error instanceof UserError) {
    // Validation error, invalid input
    console.error('Invalid input:', error.message);
  } else if (error instanceof SystemError) {
    // System error, file I/O failure
    console.error('System error:', error.message);
  } else if (error instanceof ExternalError) {
    // External service error
    console.error('External error:', error.message);
  }
}
```

## Performance

### Atomic Writes

All file operations use atomic writes to prevent data corruption:

```typescript
// Writes to temporary file first, then renames
await workspaceManager.atomicWrite(filePath, content);

// Update with transformation
await workspaceManager.atomicUpdate(filePath, (data) => {
  data.status = 'completed';
  return data;
});
```

### Batch Operations

```typescript
// Write multiple files in one operation
await workspaceManager.batchWrite([
  { path: 'epic-001/epic.json', content: epic1 },
  { path: 'epic-002/epic.json', content: epic2 },
  { path: 'epic-003/epic.json', content: epic3 }
]);
```

### Caching

The PlanningManager caches the planning tree:

```typescript
// First call builds tree from files
const tree1 = await manager.getTree(); // ~500ms

// Subsequent calls use cached tree
const tree2 = await manager.getTree(); // ~1ms

// Cache is invalidated on mutations
await manager.updateEpic(epicId, { status: 'completed' });
const tree3 = await manager.getTree(); // ~500ms (rebuilds)
```

## Auto-Save

Configure auto-save in VS Code settings:

```json
{
  "aicc.autoSaveInterval": 30 // seconds, 0 to disable
}
```

Or programmatically:

```typescript
// Enable auto-save with 30-second interval
manager.enableAutoSave(30000);

// Disable auto-save
manager.disableAutoSave();
```

## File Watching

The PlanningManager can watch for external file changes:

```typescript
// Start file watcher
manager.startFileWatcher((event) => {
  console.log(`File changed: ${event.uri.fsPath}`);
  // Tree is automatically rebuilt
});

// Stop file watcher
manager.stopFileWatcher();
```

## Best Practices

### 1. Use the Unified Interface

Always use `PlanningManager` instead of individual managers:

```typescript
// ✓ Good
const manager = PlanningManager.getInstance();
await manager.createEpic({ /* ... */ });

// ✗ Avoid
const epicManager = new EpicManager(/* ... */);
await epicManager.createEpic({ /* ... */);
```

### 2. Handle Errors Properly

```typescript
try {
  const epic = await manager.createEpic(data);
  console.log(`Created epic: ${epic.id}`);
} catch (error) {
  if (error instanceof UserError) {
    // Show error to user
    vscode.window.showErrorMessage(error.message);
  } else {
    // Log system errors
    logger.error('Failed to create epic', { error });
  }
}
```

### 3. Use Batch Operations

```typescript
// ✓ Good - batch operation
await workspaceManager.batchWrite(files);

// ✗ Avoid - multiple individual writes
for (const file of files) {
  await workspaceManager.atomicWrite(file.path, file.content);
}
```

### 4. Clean Up Resources

```typescript
// In extension deactivation
export function deactivate() {
  const manager = PlanningManager.getInstance();
  manager.dispose(); // Stops auto-save, file watchers, etc.
}
```

### 5. Use Tree Operations for Queries

```typescript
// ✓ Good - use tree for complex queries
const tree = await manager.getTree();
const inProgressItems = tree.filter(node => node.status === 'in-progress');

// ✗ Avoid - multiple individual queries
const epics = await manager.listEpics({ status: 'in-progress' });
const stories = await manager.listStories({ status: 'in-progress' });
const tasks = await manager.listTasks({ status: 'in-progress' });
```

## API Reference

### PlanningManager Methods

#### Epic Operations
- `createEpic(data: CreateEpicData): Promise<Epic>`
- `getEpic(id: string): Promise<Epic>`
- `updateEpic(id: string, updates: Partial<Epic>): Promise<Epic>`
- `deleteEpic(id: string): Promise<void>`
- `listEpics(filters?: EpicFilters): Promise<Epic[]>`

#### Story Operations
- `createStory(data: CreateStoryData): Promise<Story>`
- `getStory(id: string): Promise<Story>`
- `updateStory(id: string, updates: Partial<Story>): Promise<Story>`
- `deleteStory(id: string): Promise<void>`
- `listStories(filters?: StoryFilters): Promise<Story[]>`

#### Task Operations
- `createTask(data: CreateTaskData): Promise<Task>`
- `getTask(id: string): Promise<Task>`
- `updateTask(id: string, updates: Partial<Task>): Promise<Task>`
- `deleteTask(id: string): Promise<void>`
- `listTasks(filters?: TaskFilters): Promise<Task[]>`

#### Tree Operations
- `getTree(): Promise<PlanningTree>`
- `rebuildTree(): Promise<PlanningTree>`
- `getTreeStatistics(): Promise<TreeStatistics>`
- `searchByName(query: string): Promise<PlanningNode[]>`
- `getBlockedItems(): Promise<PlanningNode[]>`

#### Lifecycle
- `enableAutoSave(interval: number): void`
- `disableAutoSave(): void`
- `startFileWatcher(callback: FileWatcherCallback): void`
- `stopFileWatcher(): void`
- `dispose(): void`

## Related Documentation

- [Configuration Guide](../CONFIGURATION.md)
- [Error Handling](../errorHandler.ts)
- [Logging](../logger.ts)
- [Validation Rules](../planning/validators/validationRules.ts)
