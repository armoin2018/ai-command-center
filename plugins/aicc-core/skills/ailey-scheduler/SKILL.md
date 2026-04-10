---
id:
name: ailey-scheduler
description: Performs CRUD operations for scheduled tasks stored in `.my/aicc/tasks.json` validated against `.github/aicc/schemas/tasks.v1.schema.json`. Create, read, update, delete, list, stop, restart, and run tasks. Use when managing scheduled tasks, creating automation schedules, enabling/disabling task execution, querying task status, or configuring scheduler settings.
---
# AI-ley Scheduler

Manage scheduled tasks in `.my/aicc/tasks.json` with full CRUD operations, lifecycle control, and schema validation.

## Overview

**Data Operations:** Create, Read, Update, Delete tasks with schema validation
**Lifecycle Control:** Stop (disable), restart (re-enable), run now, list tasks
**Scheduling:** Interval, cron, and specific-time schedule types
**Settings:** Global concurrency, rate limiting, stuck-task detection

## Data File

- **Tasks file:** `.my/aicc/tasks.json`
- **Schema:** `.github/aicc/schemas/tasks.v1.schema.json`
- **Schema version:** `1.0.0`

Initialize empty tasks file if missing:

```json
{
  "$schema": "../.github/aicc/schemas/tasks.v1.schema.json",
  "version": "1.0.0",
  "tasks": [],
  "settings": {
    "maxConcurrentTasks": 3,
    "rateLimitPerMinute": 30,
    "stuckThresholdSeconds": 600
  }
}
```

## Task Schema

Each task requires: `id`, `name`, `enabled`, `schedule`, `actions`.

```json
{
  "id": "task-001",
  "name": "Jira Sync",
  "description": "Sync plan items with Jira every 30 minutes",
  "enabled": true,
  "schedule": {
    "type": "interval",
    "intervalUnit": "minutes",
    "intervalValue": 30
  },
  "actions": [
    {
      "actionId": "plan.sync",
      "command": "aicc.syncJira",
      "args": {},
      "order": 1
    }
  ],
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T10:00:00Z",
  "preventOverlap": true,
  "killTimeoutEnabled": false,
  "killTimeoutSeconds": 300
}
```

### Schedule Types

**Interval** — repeat every N units:
```json
{
  "type": "interval",
  "intervalUnit": "minutes",
  "intervalValue": 30
}
```

**Cron** — 5-field cron expression (minute hour dayOfMonth month dayOfWeek):
```json
{
  "type": "cron",
  "cronExpression": "0 */6 * * *"
}
```

**Specific-time** — run at a fixed time, optionally on specific days:
```json
{
  "type": "specific-time",
  "specificTime": "09:00",
  "daysOfWeek": ["mon", "tue", "wed", "thu", "fri"],
  "startTime": "08:00",
  "endTime": "18:00"
}
```

### Actions

Each action needs `actionId` and `command`. Known action IDs from the AICC ActionRegistry:

| actionId | Description |
|----------|-------------|
| `plan.create` | Create a plan item |
| `plan.update` | Update a plan item |
| `plan.updateStatus` | Update item status |
| `plan.delete` | Remove a plan item |
| `plan.archive` | Archive items |
| `plan.sync` | Trigger Jira sync |
| `plan.reload` | Reload PLAN.json |

Custom commands can reference any VS Code command ID.

## Operations

### Create Task

Generate a unique ID (e.g., `task-NNN` or UUID), set `createdAt` and `updatedAt` to current ISO timestamp, append to `tasks` array, write file.

```
/addTask name="Jira Sync" schedule.type=interval schedule.intervalUnit=minutes schedule.intervalValue=30 actions=[{actionId:"plan.sync", command:"aicc.syncJira"}]
```

### Read Task

Find by `id` or `name` (partial match, case-insensitive). Return matching task(s) with all fields including `lastRun` status.

```
/getTask id=task-001
/getTask name="Jira"
```

### Update Task

Find by `id`, merge provided fields, update `updatedAt` timestamp. Validate against schema before writing.

```
/updateTask id=task-001 schedule.intervalValue=60
/updateTask id=task-001 enabled=false
```

### Delete Task

Find by `id`, remove from `tasks` array, write file.

```
/deleteTask id=task-001
```

### List Tasks

Display all tasks in a formatted table. Filter by `enabled`, `schedule.type`, or action ID.

```
/listTasks
/listTasks --enabled
/listTasks --disabled
/listTasks --type=cron
```

Output format:
```
| ID       | Name         | Schedule         | Enabled | Last Run            | Status  |
|----------|--------------|------------------|---------|---------------------|---------|
| task-001 | Jira Sync    | Every 30 min     | ✅      | 2026-02-23 09:30:00 | success |
| task-002 | Auto-Archive | Daily at 00:00   | ⏸️      | 2026-02-22 00:00:00 | success |
```

### Stop Task

Set `enabled: false` on a task by ID. Update `updatedAt`.

```
/stopTask id=task-001
```

### Restart Task

Set `enabled: true` on a task by ID. Update `updatedAt`.

```
/restartTask id=task-001
```

### Run Now

Record `lastRun.timestamp` to current time, set `lastRun.status` to indicate manual trigger. The runtime engine in `src/scheduler/schedulerEngine.ts` handles actual execution.

```
/runTask id=task-001
```

### Update Settings

Modify global `settings` object:

```
/updateSettings maxConcurrentTasks=5 rateLimitPerMinute=60 stuckThresholdSeconds=900
```

## Validation Rules

Before any write operation:

1. **Schema validation** — validate full document against `.github/aicc/schemas/tasks.v1.schema.json`
2. **Unique IDs** — no duplicate `id` values in `tasks` array
3. **Required fields** — every task must have `id`, `name`, `enabled`, `schedule`, `actions`
4. **Schedule consistency** — `interval` type requires `intervalUnit` + `intervalValue`; `cron` requires `cronExpression`; `specific-time` requires `specificTime`
5. **Action validity** — each action must have `actionId` and `command`
6. **Time format** — `specificTime`, `startTime`, `endTime` must match `HH:MM` 24h pattern
7. **Days of week** — only `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`

## File Operations

**Read:** `JSON.parse(fs.readFileSync('.my/aicc/tasks.json', 'utf-8'))`

**Write (atomic):**
1. Write to `.my/aicc/tasks.json.tmp`
2. Backup existing to `.my/aicc/tasks.json.bak`
3. Rename `.tmp` → `.my/aicc/tasks.json`

**Initialize:** Create `.my/aicc/` directory if missing, write empty tasks document.

## Integration with Scheduler Engine

The runtime engine at `src/scheduler/schedulerEngine.ts` (singleton `SchedulerEngine`) loads from `.my/aicc/tasks.json` via `src/scheduler/schedulerPersistence.ts`. This is the single source of truth for all scheduled task state — both user-configured desired state and engine runtime state are stored here.

On first load, `SchedulerPersistence` automatically migrates tasks from the legacy `.project/scheduled-tasks.json` location if the new file does not yet exist.

Key engine methods:
- `SchedulerEngine.getInstance().addTask(task)` — register task
- `toggleTask(id, enabled)` — stop/restart
- `executeNow(id)` — immediate execution
- `getTasks()` — list all active tasks
- `removeTask(id)` — unregister

## Error Handling

| Error | Resolution |
|-------|------------|
| File not found | Initialize with empty document |
| Invalid JSON | Report parse error with line/column |
| Schema violation | List specific validation errors |
| Duplicate ID | Reject with existing task details |
| Unknown task ID | List available task IDs |

## Resources

- Schema: `.github/aicc/schemas/tasks.v1.schema.json`
- Engine: `src/scheduler/schedulerEngine.ts`
- Persistence: `src/scheduler/schedulerPersistence.ts`
- Actions: `src/actions/actionHandlers.ts`

---
version: 1.0.0
updated: 2026-02-23
reviewed: 2026-02-23
score: 4.0
---
