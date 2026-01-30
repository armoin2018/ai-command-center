# Bundled Libraries Guide

All libraries are bundled into the VSIX package and available globally in the webview.

## Coding Style

The webview uses **jQuery coding style** for DOM manipulation and **Bootstrap visual style** for UI components.

## Available Libraries

### 1. jQuery (v3.7.1)
**Purpose**: DOM manipulation, event handling, AJAX requests

```typescript
import { $ } from './utils/libraries';

// DOM manipulation
$('.my-element').addClass('active');
$('#tree-container').empty();

// Event handling
$('#button').on('click', () => {
  console.log('Clicked!');
});

// Chaining
$('.node')
  .addClass('selected')
  .fadeIn(300)
  .css('color', 'blue');

// AJAX
$.ajax({
  url: '/api/data',
  method: 'GET',
  success: (data) => console.log(data)
});
```

### 2. Bootstrap (v5.3.2)
**Purpose**: Responsive UI framework, visual styling

```typescript
// Bootstrap CSS and JS are auto-loaded
// Use Bootstrap classes in JSX:

<div className="container-fluid">
  <div className="row">
    <div className="col-md-6">
      <button className="btn btn-primary">Primary Button</button>
    </div>
  </div>
</div>

// Bootstrap components with data attributes:
<button 
  className="btn btn-primary" 
  data-bs-toggle="modal" 
  data-bs-target="#myModal"
>
  Open Modal
</button>

<div className="modal fade" id="myModal">
  <div className="modal-dialog">
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title">Modal Title</h5>
        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div className="modal-body">Modal content</div>
    </div>
  </div>
</div>

// Common Bootstrap Classes:
// Layout: container, row, col-md-6, d-flex, justify-content-between
// Spacing: p-3, m-2, mt-4, mb-3, gap-2
// Colors: bg-primary, text-white, border-secondary
// Components: btn, btn-primary, card, badge, alert
```

### 3. Lodash (v4.17.21)
**Purpose**: Utility functions for arrays, objects, functions
```typescript
import { _ } from './utils/libraries';

// Array operations
const grouped = _.groupBy(items, 'status');
const sorted = _.orderBy(items, ['priority'], ['desc']);
const unique = _.uniq(items);

// Object operations
const cloned = _.cloneDeep(myObject);
const merged = _.merge({}, obj1, obj2);

// Function operations
const debounced = _.debounce(myFunction, 300);
const throttled = _.throttle(myFunction, 1000);

// Utility
const sum = _.sumBy(items, 'points');
const avg = _.meanBy(items, 'score');
```

### 4. Moment.js (v2.30.1)
```typescript
import { moment } from './utils/libraries';

// Date formatting
const formatted = moment().format('YYYY-MM-DD HH:mm:ss');
const display = moment().format('MMMM Do YYYY, h:mm:ss a');

// Relative time
const relative = moment(date).fromNow(); // "2 hours ago"
const future = moment(date).toNow(); // "in 2 hours"

// Date arithmetic
const tomorrow = moment().add(1, 'day');
const lastWeek = moment().subtract(1, 'week');

// Comparisons
const isAfter = moment(date1).isAfter(date2);
const isBetween = moment(date).isBetween(start, end);
```

### 5. Chart.js (v4.5.1)
```typescript
import { Chart } from './utils/libraries';

// Create a chart
const ctx = canvasRef.current?.getContext('2d');
if (ctx) {
  new Chart(ctx, {
    type: 'bar', // 'line', 'pie', 'doughnut', 'radar', etc.
    data: {
      labels: ['Epic', 'Story', 'Task', 'Bug'],
      datasets: [{
        label: 'Count',
        data: [12, 19, 8, 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(34, 197, 94, 0.5)',
          'rgba(239, 68, 68, 0.5)'
        ]
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
```

### 6. Tabulator (v6.2.5)
**Purpose**: Advanced data tables with sorting, filtering, editing

```typescript
import { Tabulator } from './utils/libraries';

// Create a data table
new Tabulator(divRef.current, {
  data: tableData,
  layout: 'fitColumns',
  pagination: true,
  paginationSize: 10,
  columns: [
    { title: 'ID', field: 'id', width: 70 },
    { title: 'Name', field: 'name', editor: 'input' },
    { 
      title: 'Status', 
      field: 'status',
      formatter: (cell) => {
        const value = cell.getValue();
        return `<span class="badge bg-primary">${value}</span>`;
      }
    },
    { title: 'Points', field: 'points', align: 'right' }
  ],
  rowClick: (e, row) => {
    console.log('Row clicked:', row.getData());
  }
});
```

### 7. Tagify (v4.31.3) ⭐ NEW
**Purpose**: Tags/chips input with autocomplete and validation

```typescript
import { Tagify } from './utils/libraries';

// Basic tags input
const tagify = new Tagify(inputRef.current, {
  whitelist: ['React', 'TypeScript', 'jQuery', 'Bootstrap'],
  maxTags: 10,
  dropdown: {
    maxItems: 20,
    enabled: 0,
    closeOnSelect: false
  }
});

// Listen for changes
tagify.on('change', (e) => {
  const tags = JSON.parse(e.detail.value).map(tag => tag.value);
  console.log('Tags:', tags);
});

// Add/remove tags programmatically
tagify.addTags(['React', 'TypeScript']);
tagify.removeAllTags();

// Use the TagifyInput component (recommended):
import { TagifyInput } from './components/TagifyInput';

<TagifyInput
  label="Technology Stack"
  value={['React', 'TypeScript']}
  onChange={(tags) => setTags(tags)}
  whitelist={['React', 'Vue', 'Angular', 'TypeScript', 'JavaScript']}
  maxTags={5}
  placeholder="Select technologies..."
/>
```

## jQuery Coding Style Examples

### Creating DOM Elements
```typescript
// Create elements with jQuery
const $card = $('<div>')
  .addClass('card mb-3')
  .append(
    $('<div>')
      .addClass('card-header')
      .text('Card Title')
  )
  .append(
    $('<div>')
      .addClass('card-body')
      .append($('<p>').text('Card content'))
  );

$('#container').append($card);
```

### Event Delegation
```typescript
// Efficient event handling for dynamic content
$('#tree-container').on('click', '.tree-node', function() {
  const nodeId = $(this).data('node-id');
  console.log('Node clicked:', nodeId);
});
```

### AJAX with Promises
```typescript
$.ajax({
  url: '/api/items',
  method: 'GET'
}).done((data) => {
  console.log('Success:', data);
}).fail((error) => {
  console.error('Error:', error);
});
```

## Bootstrap Visual Style Guide

### Card Components
```html
<div className="card">
  <div className="card-header bg-primary text-white">
    Header
  </div>
  <div className="card-body">
    <h5 className="card-title">Title</h5>
    <p className="card-text">Content</p>
    <button className="btn btn-primary">Action</button>
  </div>
</div>
```

### Button Groups
```html
<div className="btn-toolbar gap-2">
  <div className="btn-group">
    <button className="btn btn-primary">Primary</button>
    <button className="btn btn-outline-secondary">Secondary</button>
  </div>
</div>
```

### Badges & Status Indicators
```html
<span className="badge bg-primary">Primary</span>
<span className="badge bg-success">Success</span>
<span className="badge bg-warning">Warning</span>
<span className="badge bg-danger">Danger</span>
<span className="badge bg-info">Info</span>
<span className="badge bg-secondary">Secondary</span>
```

### Flex Layout
```html
<div className="d-flex justify-content-between align-items-center p-3">
  <div>Left content</div>
  <div className="d-flex gap-2">
    <button className="btn btn-sm btn-primary">Action 1</button>
    <button className="btn btn-sm btn-secondary">Action 2</button>
  </div>
</div>
```

## Bundle Structure

The webpack build creates optimized bundles:
- `bootstrap.bundle.js` (386 KB) - Bootstrap + jQuery
- `charts.bundle.js` (147 KB) - Chart.js + Mermaid
- `tabulator.bundle.js` (470 KB) - Tabulator tables
- `tagify.bundle.js` (87 KB) - Tagify tags input ⭐ NEW
- `utils.bundle.js` (358 KB) - Lodash + Moment
- `main.bundle.js` (230 KB) - Your application code
- `vendor.bundle.js` (147 KB) - React & dependencies

**Total size:** ~1.78 MB (minified, gzipped ~600 KB)

## Global Access

All libraries are also available globally via window object:
```typescript
window.$         // jQuery
window.jQuery    // jQuery
window._         // Lodash
window.moment    // Moment.js
window.Chart     // Chart.js
window.Tabulator // Tabulator
window.Tagify    // Tagify
```

## TypeScript Support

Full TypeScript definitions are included for:
- ✅ jQuery (@types/jquery)
- ✅ Lodash (@types/lodash)
- ✅ Bootstrap (built-in)
- ✅ Moment.js (built-in)
- ✅ Chart.js (built-in)
- ✅ Tabulator (custom declaration)
- ✅ Tagify (custom declaration)

## Component Examples

### jQuery Tree Component
See `src/components/JQueryTree.tsx` for a complete example of:
- jQuery-style DOM manipulation
- Bootstrap visual styling
- Event handling with jQuery
- Dynamic content creation

### Tagify Input Component
See `src/components/TagifyInput.tsx` for:
- Bootstrap form integration
- Tag input with autocomplete
- Whitelist validation
- Change event handling

### Library Usage Examples
See `src/components/LibraryExamples.tsx` for working examples of all libraries

## Best Practices

1. **Use Bootstrap classes** for all visual styling
2. **Use jQuery** for DOM manipulation and event handling
3. **Use Lodash** for data transformation
4. **Use Tagify** for tag/chip inputs
5. **Combine approaches** when beneficial (React for structure, jQuery for DOM effects)

## See Also

- `src/components/JQueryTree.tsx` - jQuery tree implementation
- `src/components/TagifyInput.tsx` - Tagify wrapper component
- `src/components/LibraryExamples.tsx` - Full working examples
- `src/utils/libraries.ts` - Library initialization and exports
