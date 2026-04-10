# Confluence Storage Format Guide

Complete reference for Confluence Storage Format (XHTML-based markup).

## Overview

Confluence Storage Format is the canonical format for content stored in Confluence. It's an XHTML-based format that includes:

- Standard HTML elements (`<p>`, `<h1>`, `<strong>`, etc.)
- Confluence-specific macros (`<ac:structured-macro>`, `<ac:image>`, etc.)
- Rich Internet (RI) resource identifiers for links and references

## Basic Structure

```xml
<div xmlns="http://www.w3.org/1999/xhtml">
  <p>Content goes here</p>
</div>
```

The root `<div>` element with XHTML namespace is optional but recommended.

---

## Standard HTML Elements

### Text Formatting

```xml
<p>Paragraph text</p>
<strong>Bold text</strong>
<em>Italic text</em>
<u>Underlined text</u>
<s>Strikethrough text</s>
<code>Inline code</code>
<sub>Subscript</sub>
<sup>Superscript</sup>
```

### Headings

```xml
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>
```

### Lists

**Unordered:**
```xml
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

**Ordered:**
```xml
<ol>
  <li>First</li>
  <li>Second</li>
  <li>Third</li>
</ol>
```

**Nested:**
```xml
<ul>
  <li>Parent item
    <ul>
      <li>Child item 1</li>
      <li>Child item 2</li>
    </ul>
  </li>
</ul>
```

### Links

**External:**
```xml
<a href="https://example.com">Link text</a>
```

**Internal (Confluence link macro preferred):**
```xml
<ac:link>
  <ri:page ri:content-title="Page Title" />
  <ac:plain-text-link-body><![CDATA[Link Text]]></ac:plain-text-link-body>
</ac:link>
```

### Tables

```xml
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cell 1</td>
      <td>Cell 2</td>
    </tr>
    <tr>
      <td>Cell 3</td>
      <td>Cell 4</td>
    </tr>
  </tbody>
</table>
```

### Line Breaks

```xml
<br />
```

### Horizontal Rule

```xml
<hr />
```

---

## Confluence Macros

Macros are Confluence-specific elements with the `ac:` namespace.

### Code Block Macro

```xml
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">javascript</ac:parameter>
  <ac:parameter ac:name="theme">Midnight</ac:parameter>
  <ac:parameter ac:name="linenumbers">true</ac:parameter>
  <ac:plain-text-body><![CDATA[function hello() {
  console.log("Hello, world!");
}]]></ac:plain-text-body>
</ac:structured-macro>
```

**Supported Languages:**
- `actionscript3`, `bash`, `csharp`, `cpp`, `css`, `diff`, `erlang`, `groovy`, `html`, `java`, `javascript`, `json`, `perl`, `php`, `python`, `ruby`, `scala`, `sql`, `xml`, `yaml`

**Parameters:**
- `language`: Programming language
- `theme`: Code highlighting theme (e.g., `Midnight`, `RDark`, `Eclipse`)
- `linenumbers`: Show line numbers (`true`/`false`)
- `title`: Code block title
- `collapse`: Collapsible code block (`true`/`false`)

### Info/Warning/Note Panels

**Info Panel:**
```xml
<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>This is important information.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

**Warning Panel:**
```xml
<ac:structured-macro ac:name="warning">
  <ac:rich-text-body>
    <p>This is a warning message.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

**Note Panel:**
```xml
<ac:structured-macro ac:name="note">
  <ac:rich-text-body>
    <p>This is a note.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

**Tip Panel:**
```xml
<ac:structured-macro ac:name="tip">
  <ac:rich-text-body>
    <p>This is a helpful tip.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

**With Title:**
```xml
<ac:structured-macro ac:name="info">
  <ac:parameter ac:name="title">Important Notice</ac:parameter>
  <ac:rich-text-body>
    <p>Content here.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

### Expand/Collapse Macro

```xml
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Click to expand</ac:parameter>
  <ac:rich-text-body>
    <p>Hidden content revealed on click.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

### Status Macro

```xml
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="title">APPROVED</ac:parameter>
</ac:structured-macro>
```

**Colors:**
- `Grey`, `Red`, `Yellow`, `Green`, `Blue`

### Table of Contents Macro

```xml
<ac:structured-macro ac:name="toc">
  <ac:parameter ac:name="maxLevel">3</ac:parameter>
  <ac:parameter ac:name="minLevel">1</ac:parameter>
  <ac:parameter ac:name="outline">true</ac:parameter>
</ac:structured-macro>
```

### Children Display Macro

```xml
<ac:structured-macro ac:name="children">
  <ac:parameter ac:name="all">true</ac:parameter>
  <ac:parameter ac:name="sort">title</ac:parameter>
</ac:structured-macro>
```

### Excerpt Macro

**Define excerpt:**
```xml
<ac:structured-macro ac:name="excerpt">
  <ac:rich-text-body>
    <p>This is an excerpt that can be included elsewhere.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

**Include excerpt:**
```xml
<ac:structured-macro ac:name="excerpt-include">
  <ac:parameter ac:name="nopanel">true</ac:parameter>
  <ri:page ri:content-title="Source Page" />
</ac:structured-macro>
```

---

## Images

### Image Macro

**External URL:**
```xml
<ac:image>
  <ri:url ri:value="https://example.com/image.png" />
</ac:image>
```

**Attachment:**
```xml
<ac:image ac:width="600">
  <ri:attachment ri:filename="screenshot.png" />
</ac:image>
```

**Parameters:**
- `ac:width`: Width in pixels
- `ac:height`: Height in pixels
- `ac:align`: Alignment (`left`, `center`, `right`)
- `ac:title`: Image title/alt text

**Full Example:**
```xml
<ac:image ac:align="center" ac:width="800" ac:height="600">
  <ri:attachment ri:filename="diagram.png" />
</ac:image>
```

### Thumbnail

```xml
<ac:image ac:thumbnail="true">
  <ri:attachment ri:filename="large-image.png" />
</ac:image>
```

---

## Links and References

### Page Link

**By Title:**
```xml
<ac:link>
  <ri:page ri:content-title="Another Page" />
  <ac:plain-text-link-body><![CDATA[Click here]]></ac:plain-text-link-body>
</ac:link>
```

**By Space and Title:**
```xml
<ac:link>
  <ri:page ri:space-key="DEV" ri:content-title="API Guide" />
  <ac:plain-text-link-body><![CDATA[API Guide]]></ac:plain-text-link-body>
</ac:link>
```

**Without Link Text (uses page title):**
```xml
<ac:link>
  <ri:page ri:content-title="Another Page" />
</ac:link>
```

### Attachment Link

```xml
<ac:link>
  <ri:attachment ri:filename="document.pdf" />
  <ac:plain-text-link-body><![CDATA[Download PDF]]></ac:plain-text-link-body>
</ac:link>
```

### User Link

```xml
<ac:link>
  <ri:user ri:userkey="john.doe" />
</ac:link>
```

---

## Advanced Macros

### Jira Issues Macro

```xml
<ac:structured-macro ac:name="jira">
  <ac:parameter ac:name="server">Company Jira</ac:parameter>
  <ac:parameter ac:name="jqlQuery">project = DEV AND status = "In Progress"</ac:parameter>
</ac:structured-macro>
```

### Include Page Macro

```xml
<ac:structured-macro ac:name="include">
  <ac:parameter ac:name=""><ri:page ri:content-title="Template Page" /></ac:parameter>
</ac:structured-macro>
```

### Anchor Macro

**Define anchor:**
```xml
<ac:structured-macro ac:name="anchor">
  <ac:parameter ac:name="">section-1</ac:parameter>
</ac:structured-macro>
```

**Link to anchor:**
```xml
<a href="#section-1">Jump to Section 1</a>
```

### Panel Macro

```xml
<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="borderStyle">solid</ac:parameter>
  <ac:parameter ac:name="borderColor">#ccc</ac:parameter>
  <ac:parameter ac:name="bgColor">#f0f0f0</ac:parameter>
  <ac:rich-text-body>
    <p>Panel content</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

---

## Conversion Examples

### Markdown → Storage Format

**Markdown:**
```markdown
# Heading

Paragraph with **bold** and *italic* text.

```python
print("Hello")
```

- List item 1
- List item 2
```

**Storage Format:**
```xml
<h1>Heading</h1>
<p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">python</ac:parameter>
  <ac:plain-text-body><![CDATA[print("Hello")]]></ac:plain-text-body>
</ac:structured-macro>

<ul>
  <li>List item 1</li>
  <li>List item 2</li>
</ul>
```

### HTML → Storage Format

**HTML:**
```html
<h2>API Endpoints</h2>
<p>The API provides the following endpoints:</p>
<pre><code class="language-bash">curl https://api.example.com/users</code></pre>
```

**Storage Format:**
```xml
<h2>API Endpoints</h2>
<p>The API provides the following endpoints:</p>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[curl https://api.example.com/users]]></ac:plain-text-body>
</ac:structured-macro>
```

---

## Best Practices

### 1. Use CDATA for Code

✅ Correct:
```xml
<ac:plain-text-body><![CDATA[console.log("Hello");]]></ac:plain-text-body>
```

❌ Wrong:
```xml
<ac:plain-text-body>console.log("Hello");</ac:plain-text-body>
```

### 2. Escape Special Characters

When NOT using CDATA:

| Character | Escape |
|-----------|--------|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&apos;` |

### 3. Use Semantic HTML

✅ Better:
```xml
<h2>Section Title</h2>
<p>Content</p>
```

❌ Avoid:
```xml
<p><strong>Section Title</strong></p>
<p>Content</p>
```

### 4. Prefer Confluence Macros

For code blocks, panels, and special formatting, use Confluence macros instead of plain HTML.

✅ Better:
```xml
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">javascript</ac:parameter>
  <ac:plain-text-body><![CDATA[code here]]></ac:plain-text-body>
</ac:structured-macro>
```

❌ Avoid:
```xml
<pre><code>code here</code></pre>
```

### 5. Close All Tags

Storage Format is XHTML, so all tags must be closed:

✅ Correct:
```xml
<br />
<hr />
<img src="..." />
```

❌ Wrong:
```xml
<br>
<hr>
<img src="...">
```

---

## Common Patterns

### Documentation Page Template

```xml
<h1>Page Title</h1>

<ac:structured-macro ac:name="toc">
  <ac:parameter ac:name="maxLevel">3</ac:parameter>
</ac:structured-macro>

<h2>Overview</h2>
<p>Description of the page content.</p>

<ac:structured-macro ac:name="info">
  <ac:parameter ac:name="title">Note</ac:parameter>
  <ac:rich-text-body>
    <p>Important information here.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Details</h2>
<p>Detailed content...</p>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">python</ac:parameter>
  <ac:plain-text-body><![CDATA[
def example():
    print("Example code")
]]></ac:plain-text-body>
</ac:structured-macro>
```

### API Documentation Template

```xml
<h1>API Endpoint: GET /users</h1>

<h2>Description</h2>
<p>Retrieves a list of users.</p>

<h2>Request</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[
curl -X GET https://api.example.com/users \
  -H "Authorization: Bearer TOKEN"
]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Response</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[
{
  "users": [
    {"id": 1, "name": "John Doe"},
    {"id": 2, "name": "Jane Smith"}
  ]
}
]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Status Codes</h2>
<table>
  <thead>
    <tr>
      <th>Code</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>200</td>
      <td>Success</td>
    </tr>
    <tr>
      <td>401</td>
      <td>Unauthorized</td>
    </tr>
  </tbody>
</table>
```

---

## Troubleshooting

### Issue: Content Not Rendering

**Cause**: Invalid XML structure

**Solution**: Validate XML structure, ensure all tags are closed

### Issue: Code Block Not Formatted

**Cause**: Missing CDATA or incorrect macro structure

**Solution**: Use proper code macro structure with CDATA

### Issue: Images Not Displaying

**Cause**: Attachment not uploaded or incorrect filename

**Solution**: Upload attachment first, then reference with exact filename

### Issue: Links Broken

**Cause**: Page title or space key incorrect

**Solution**: Verify page exists and title matches exactly (case-sensitive)

---

## Tools

### Validation

Use XML validators to check Storage Format syntax:

```bash
# Using xmllint (macOS/Linux)
echo '<p>Test</p>' | xmllint --format -
```

### Conversion

Use the format-converters script:

```typescript
import { htmlToStorage, storageToMarkdown } from './scripts/format-converters';

// HTML → Storage
const storage = htmlToStorage('<p>Hello <strong>world</strong></p>');

// Storage → Markdown
const markdown = storageToMarkdown('<p>Hello <strong>world</strong></p>');
```

---

## Additional Resources

- **Confluence Storage Format Documentation**: https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html
- **Macro Browser**: View in Confluence UI → Insert → Other Macros
- **REST API**: https://developer.atlassian.com/cloud/confluence/rest/v1/intro/

---
