# Planning Tab Enhancements - Implementation Summary

## Overview

Enhanced the AI Command Center Secondary Panel's Planning Tab with batch operations and AI-powered refinement capabilities.

## Features Implemented

### 1. Checkbox Selection System
- Added checkboxes before each epic/story/task/bug item
- Tracks selected items in `selectedItemIds` Set
- Checkboxes maintain state during panel re-renders
- Click checkbox to toggle selection without expanding item

### 2. Batch Run Functionality
- Run button shows "Run Next" when no items selected
- Run button shows "Run (3)" when 3 items selected
- Clicking Run passes comma-separated IDs: `aicc.ailey.run {{id}}, {{id}}, {{id}}`
- If no items selected, runs without ID parameter

### 3. AI-Powered Refinement
- Magic wand icon (🪄) added before play button on each item
- Clicking wand executes `aicc-plan-refine` prompt with item ID
- Refines planning items for improved clarity, detail, and actionability
- Uses `ailey-admin-manage-plan` skill for CRUD operations

### 4. Status Display
- All status values now display in UPPERCASE
- Consistent formatting across dropdown and display

## Files Modified

### media/secondaryPanel/app.js
**Added to constructor (line 17):**
```javascript
this.selectedItemIds = new Set();
```

**Updated run button handler (lines 85-91):**
```javascript
document.getElementById('btn-run-next')?.addEventListener('click', () => {
    if (this.selectedItemIds.size > 0) {
        const ids = Array.from(this.selectedItemIds).join(', ');
        this.sendMessage('executeAction', { command: 'aicc.ailey.run', args: [ids] });
    } else {
        this.sendMessage('executeAction', { command: 'aicc.ailey.run' });
    }
});
```

**Updated buildAccordionItem() (lines 979-1010):**
- Added checkbox HTML before expand icon
- Changed status to uppercase: `item.status.toUpperCase()`
- Checkbox calls `app.toggleItemSelection(itemId, event)`

**Updated buildAccordionActions() (lines 1076-1098):**
- Added magic wand button before play button
- Wand button has `data-action="refine"`
- Changed status dropdown options to uppercase

**Updated handleItemAction() (lines 1444-1478):**
- Added `refine` action case at top of method
- Calls `aicc.executePrompt` with `aicc-plan-refine` and itemId

**Added new methods (lines 1479-1507):**
```javascript
toggleItemSelection(itemId, event) {
    event.stopPropagation();
    if (this.selectedItemIds.has(itemId)) {
        this.selectedItemIds.delete(itemId);
    } else {
        this.selectedItemIds.add(itemId);
    }
    this.updateRunButtonLabel();
    this.renderCurrentPanel();
}

updateRunButtonLabel() {
    const btn = document.getElementById('btn-run-next');
    if (btn && this.selectedItemIds.size > 0) {
        btn.textContent = `Run (${this.selectedItemIds.size})`;
    } else if (btn) {
        btn.textContent = 'Run Next';
    }
}
```

### media/secondaryPanel/styles.css
**Added wand icon (line 60):**
```css
.codicon-wand:before { content: "\ebcf"; }
```

**Added checkbox styling (lines 443-456):**
```css
.item-checkbox {
  margin: 0 6px 0 0;
  cursor: pointer;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  accent-color: var(--vscode-button-background);
}

.item-checkbox:hover {
  opacity: 0.8;
}

.item-checkbox:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

### .github/prompts/aicc-plan-refine.prompt.md
**Created new prompt (344 lines):**
- Frontmatter: name, description, agent (AI-ley Orchestrator)
- Workflow: Load → Analyze → Refine → Apply
- Analysis dimensions: Summary, Description, Acceptance Criteria, Technical Feasibility
- Examples: Epic, Story, Task refinement with before/after
- Integration: Uses `ailey-admin-manage-plan` skill
- Output: Updated planning item with improvements

## User Workflow

### Batch Run Items
1. Check boxes next to epics/stories/tasks to run
2. Run button updates to show "Run (3)"
3. Click Run button to execute all selected items
4. Items process in batch through AI-ley agent

### Refine Individual Items
1. Click magic wand icon (🪄) on any planning item
2. `aicc-plan-refine` prompt executes with item ID
3. AI analyzes and refines the item
4. Updated item saved back to `.project/PLAN.json`

### Status Management
- All status values display consistently in UPPERCASE
- Dropdown shows: BACKLOG, READY, IN-PROGRESS, BLOCKED, REVIEW, DONE, SKIP

## Technical Details

### Event Handling
- **Checkbox clicks**: Call `toggleItemSelection()` via inline `onclick` handler
- **Refine button**: Uses existing event delegation pattern with `data-action="refine"`
- **Run button**: Checks `selectedItemIds.size` to determine behavior

### State Management
- `selectedItemIds`: Set of item IDs with checked checkboxes
- `expandedItems`: Existing Set of expanded accordion items
- Both sets persist across panel re-renders
- Checkbox state synchronized with `selectedItemIds` Set

### Message Passing
- **Batch run**: `{ command: 'aicc.ailey.run', args: [ids] }`
- **Single run**: `{ command: 'aicc.ailey.run' }` (no args)
- **Refine**: `{ command: 'aicc.executePrompt', args: ['aicc-plan-refine', itemId] }`

## Testing Checklist

- [ ] Checkbox appears before each planning item
- [ ] Clicking checkbox toggles selection state
- [ ] Checkbox state persists when accordion expands/collapses
- [ ] Run button label updates: "Run Next" → "Run (3)"
- [ ] Batch run passes comma-separated IDs
- [ ] Single run (no checkboxes) works without ID
- [ ] Magic wand icon appears before play button
- [ ] Clicking wand executes refine prompt
- [ ] Status values display in UPPERCASE
- [ ] Status dropdown options are UPPERCASE
- [ ] Refine prompt validates and executes
- [ ] Updated items save to PLAN.json

## Next Steps

1. **VS Code Extension Integration**: Update extension to handle:
   - `aicc.executePrompt` command with prompt slug and args
   - Batch execution with multiple IDs from planning tab

2. **Prompt Integration**: Ensure prompt system can:
   - Load prompts from `.github/prompts/*.prompt.md`
   - Parse frontmatter and execute with correct agent
   - Pass arguments (item ID) to prompt context

3. **User Testing**: Validate workflows with:
   - Single item refinement
   - Batch item execution
   - Mixed operations (some selected, some refined)

4. **Documentation**: Update user guide with:
   - Checkbox selection screenshots
   - Batch run workflow
   - AI refinement capabilities
   - Best practices for planning items

---

**Status**: Implementation Complete ✅  
**Ready for**: VS Code Extension Integration  
**Blocks**: None  
**Version**: 1.0.0  
**Date**: 2026-01-30
