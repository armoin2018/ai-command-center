# Gamma Themes Gallery

Complete reference for Gamma presentation themes with previews and use cases.

## Overview

Gamma provides professionally designed themes optimized for different presentation types. Each theme includes carefully selected:

- **Color Palettes**: Coordinated colors for backgrounds, text, and accents
- **Typography**: Font combinations for headings and body text
- **Layouts**: Slide templates for various content types
- **Graphics**: Icon styles and visual elements

## Default Themes

### Default

**ID:** `default`  
**Name:** Gamma Default

**Description:**
Clean and modern theme suitable for any presentation type. Balanced color palette with professional typography.

**Best For:**
- General presentations
- Corporate meetings
- Educational content
- When theme choice is uncertain

**Color Palette:**
- Primary: Blue (#2E5BFF)
- Background: White (#FFFFFF)
- Text: Dark Gray (#1A1A1A)
- Accent: Light Blue (#E6EEFF)

**Preview:** https://gamma.app/themes/default

---

### Modern

**ID:** `modern`  
**Name:** Modern Minimal

**Description:**
Sleek minimalist design with clean lines and ample white space. Emphasizes content over decoration.

**Best For:**
- Tech presentations
- Product launches
- Design portfolios
- Startup pitches

**Color Palette:**
- Primary: Black (#000000)
- Background: White (#FFFFFF)
- Text: Charcoal (#333333)
- Accent: Gold (#FFD700)

**Preview:** https://gamma.app/themes/modern

---

### Vibrant

**ID:** `vibrant`  
**Name:** Vibrant Colors

**Description:**
Bold and energetic color palette with high contrast. Grabs attention and maintains engagement.

**Best For:**
- Marketing presentations
- Creative pitches
- Brand launches
- Event announcements

**Color Palette:**
- Primary: Magenta (#FF006E)
- Secondary: Cyan (#00D9FF)
- Background: White (#FFFFFF)
- Text: Navy (#001F3F)

**Preview:** https://gamma.app/themes/vibrant

---

### Professional

**ID:** `professional`  
**Name:** Professional Business

**Description:**
Traditional corporate theme with conservative colors and formal layouts. Projects authority and credibility.

**Best For:**
- Board presentations
- Financial reports
- Business proposals
- Executive summaries

**Color Palette:**
- Primary: Navy (#003366)
- Secondary: Gray (#6C757D)
- Background: Light Gray (#F8F9FA)
- Text: Dark Blue (#002244)

**Preview:** https://gamma.app/themes/professional

---

### Creative

**ID:** `creative`  
**Name:** Creative Studio

**Description:**
Artistic and expressive theme with dynamic layouts and bold typography. Encourages creativity.

**Best For:**
- Agency pitches
- Portfolio presentations
- Art/design showcases
- Creative briefs

**Color Palette:**
- Primary: Purple (#8B5CF6)
- Secondary: Orange (#FB923C)
- Background: Cream (#FFF8E1)
- Text: Deep Purple (#4C1D95)

**Preview:** https://gamma.app/themes/creative

---

## Specialized Themes

### Dark Mode

**ID:** `dark`  
**Name:** Dark Professional

**Description:**
Dark background with light text for modern, high-contrast presentations. Easy on the eyes in low-light settings.

**Best For:**
- Tech conferences
- Product demos
- Evening presentations
- Video recordings

**Color Palette:**
- Background: Dark Gray (#1E1E1E)
- Text: White (#FFFFFF)
- Primary: Electric Blue (#0EA5E9)
- Accent: Lime (#84CC16)

---

### Academic

**ID:** `academic`  
**Name:** Academic Research

**Description:**
Formal theme optimized for research presentations and educational content. Clear hierarchy and readable fonts.

**Best For:**
- Research presentations
- Academic conferences
- Thesis defenses
- Educational lectures

**Color Palette:**
- Primary: Burgundy (#800020)
- Secondary: Navy (#000080)
- Background: White (#FFFFFF)
- Text: Black (#000000)

---

### Gradient

**ID:** `gradient`  
**Name:** Modern Gradient

**Description:**
Contemporary theme with smooth gradient backgrounds and modern typography. Visually striking yet professional.

**Best For:**
- Product launches
- Brand presentations
- Modern corporate
- Innovation showcases

**Color Palette:**
- Gradient: Blue to Purple
- Background: Light (#F0F4FF)
- Text: Dark (#1A202C)
- Accent: Violet (#7C3AED)

---

### Minimal

**ID:** `minimal`  
**Name:** Ultra Minimal

**Description:**
Extreme minimalism with maximum white space. Focuses attention entirely on content.

**Best For:**
- Design presentations
- Photography portfolios
- Art showcases
- Conceptual pitches

**Color Palette:**
- Background: White (#FFFFFF)
- Text: Black (#000000)
- Accent: Red (#DC2626)
- Lines: Gray (#E5E7EB)

---

### Bold

**ID:** `bold`  
**Name:** Bold Impact

**Description:**
High-contrast theme with large typography and bold colors. Maximum visual impact.

**Best For:**
- Sales presentations
- Campaign launches
- Motivational talks
- Brand announcements

**Color Palette:**
- Primary: Red (#EF4444)
- Secondary: Black (#000000)
- Background: White (#FFFFFF)
- Text: Dark Gray (#111827)

---

## Theme Selection Guide

### By Industry

| Industry | Recommended Themes |
|----------|-------------------|
| Technology | Modern, Dark, Gradient |
| Finance | Professional, Academic, Default |
| Creative | Creative, Vibrant, Minimal |
| Education | Academic, Default, Professional |
| Marketing | Vibrant, Bold, Gradient |
| Healthcare | Professional, Default, Academic |
| Consulting | Professional, Modern, Default |

### By Presentation Type

| Type | Recommended Themes |
|------|-------------------|
| Sales Pitch | Bold, Vibrant, Modern |
| Research | Academic, Professional, Default |
| Product Launch | Modern, Gradient, Creative |
| Quarterly Review | Professional, Default, Modern |
| Training | Default, Academic, Professional |
| Portfolio | Creative, Minimal, Modern |
| Proposal | Professional, Default, Modern |

### By Audience

| Audience | Recommended Themes |
|----------|-------------------|
| Executives | Professional, Modern, Default |
| Clients | Professional, Modern, Gradient |
| Investors | Professional, Bold, Modern |
| Students | Academic, Default, Vibrant |
| Creatives | Creative, Vibrant, Minimal |
| General Public | Default, Modern, Gradient |

## Using Themes

### CLI

```bash
# List all themes
npm run gamma themes

# Create with specific theme
npm run gamma create file -i content.md --theme modern

# Use default theme (omit --theme)
npm run gamma create file -i content.md
```

### TypeScript

```typescript
// List themes
const themes = await client.listThemes();

// Create with theme
const project = await client.createPresentation({
  title: 'My Presentation',
  content: '# Slide 1',
  theme: 'professional',
});
```

## Theme Customization

### Current Limitations

Gamma API themes are pre-defined. Custom theme creation is not available via API.

**Workaround:**
1. Create presentation with base theme
2. Open in Gamma web interface
3. Customize colors, fonts, layouts
4. Export when finalized

### Future Enhancements

Planned features for theme customization:

- Custom color palettes via API
- Font selection
- Layout preferences
- Brand kit integration

## Theme Previews

To preview themes before creation:

1. Visit https://gamma.app/themes
2. Browse theme gallery
3. View sample presentations
4. Note theme ID for API use

## Best Practices

1. **Match Content**: Choose theme that complements your content type
2. **Consider Audience**: Professional audiences prefer conservative themes
3. **Test Exports**: Preview theme in export format (PPTX/PDF) before finalizing
4. **Brand Alignment**: Select themes matching brand colors when possible
5. **Consistency**: Use same theme across related presentations

## Troubleshooting

### Theme Not Found

**Error:** `Invalid theme ID`

**Solution:**
```bash
# List valid theme IDs
npm run gamma themes --format list

# Use valid ID
npm run gamma create file -i content.md --theme professional
```

### Theme Looks Different After Export

Some themes may appear differently in PowerPoint/PDF vs. web view. Test exports early in creation process.

### Custom Theme Request

For enterprise custom themes, contact Gamma support: https://gamma.app/enterprise

## Additional Resources

- **Theme Gallery**: https://gamma.app/themes
- **Theme Documentation**: https://gamma.app/docs/themes
- **Custom Themes**: https://gamma.app/enterprise

---
