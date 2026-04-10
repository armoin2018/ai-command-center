# Canva Integration Examples

Practical examples demonstrating Canva automation workflows.

## Examples

### 1. Design Template (JSON)

**File:** `design-template.json`

Pre-configured design structure for programmatic creation. Use this template to:
- Define slide layouts and elements
- Set brand fonts and colors
- Enable autofill capabilities
- Create reusable design structures

**Usage:**
```typescript
import designTemplate from './design-template.json';
const design = await client.createDesign(designTemplate);
```

### 2. Autofill Data (JSON)

**File:** `autofill-data.json`

Batch data for generating multiple designs from a single template. Perfect for:
- Social media campaigns (generate 50+ posts)
- Personalized marketing materials
- Event invitations with variable data
- Product catalogs

**Usage:**
```typescript
import autofillData from './autofill-data.json';
for (const item of autofillData.data) {
  await client.createDesignFromTemplate(
    autofillData.template_id,
    item.variables
  );
}
```

### 3. Export Workflow (TypeScript)

**File:** `export-workflow.ts`

Automated export pipeline that:
- Lists and filters designs by query
- Exports to multiple formats (PNG, PDF, MP4)
- Polls export jobs until completion
- Downloads files to organized folders
- Handles errors and retries

**Run:**
```bash
npm install
npx tsx export-workflow.ts
```

**Customize:**
```typescript
const exportConfig = {
  query: 'Q1 2024',
  formats: ['PNG', 'PDF'],
  quality: 'high',
  outputDir: './exports',
  maxDesigns: 10,
};
```

### 4. Brand Consistency Checker (TypeScript)

**File:** `brand-consistency.ts`

Brand compliance analysis tool that:
- Fetches brand kit (colors, fonts, logos)
- Analyzes designs for brand adherence
- Generates compliance reports
- Suggests brand-aligned alternatives

**Requirements:**
- Pro+ tier for Brand Kit API access

**Run:**
```bash
npx tsx brand-consistency.ts
```

**Output:**
- Brand asset inventory
- Compliance rate per design
- Issue identification
- Improvement recommendations

### 5. Bulk Social Media Generator (TypeScript)

**File:** `bulk-social-media.ts`

Campaign automation that:
- Loads campaign data from JSON/CSV
- Generates designs for multiple platforms
- Exports in platform-optimized formats
- Organizes by campaign and platform
- Creates metadata for scheduling

**Run:**
```bash
npx tsx bulk-social-media.ts
```

**Features:**
- Multi-platform support (Instagram, Facebook, Twitter, LinkedIn)
- Batch processing with progress tracking
- Error handling and retry logic
- Campaign summary reports
- Metadata generation for schedulers

## Prerequisites

All TypeScript examples require:

```bash
npm install
```

Add Canva credentials to workspace `.env`:

```bash
CANVA_CLIENT_ID=your_client_id
CANVA_CLIENT_SECRET=your_client_secret
CANVA_ACCESS_TOKEN=your_access_token
CANVA_REFRESH_TOKEN=your_refresh_token
```

## Running Examples

### Option 1: Using tsx (Recommended)

```bash
npx tsx examples/export-workflow.ts
npx tsx examples/brand-consistency.ts
npx tsx examples/bulk-social-media.ts
```

### Option 2: Compile First

```bash
npm run build
node dist/examples/export-workflow.js
```

### Option 3: Using ts-node

```bash
npx ts-node examples/export-workflow.ts
```

## Customization Tips

### Modify Export Formats

```typescript
const exportConfig = {
  formats: ['PNG', 'PDF', 'MP4'], // Add or remove formats
  quality: 'high', // 'low' | 'medium' | 'high'
};
```

### Change Design Filters

```typescript
const designs = await client.listDesigns({
  query: 'marketing', // Search term
  ownership: 'owned', // 'owned' | 'shared' | 'all'
  limit: 20, // Max results
});
```

### Adjust Polling Intervals

```typescript
while (status.job.status === 'in_progress' && attempts < 30) {
  await sleep(3000); // Increase wait time
  status = await client.getExportStatus(jobId);
  attempts++;
}
```

## Common Use Cases

### Generate Event Invitations

1. Create template in Canva with placeholder fields
2. Prepare data file with guest info
3. Use autofill-data pattern to generate personalized invites
4. Export to PDF for printing

### Social Media Calendar

1. Plan month's content in spreadsheet
2. Load data using bulk-social-media pattern
3. Generate all designs in batch
4. Export for scheduling tools

### Brand Asset Library

1. Use brand-consistency checker to audit designs
2. Export compliant designs to asset library
3. Organize by category/campaign
4. Maintain metadata for search

### Automated Reporting

1. Connect to data source (database, API)
2. Generate charts/visualizations
3. Create designs using templates
4. Schedule exports and distribution

## Troubleshooting

### Export Timeouts

Increase polling attempts or wait time:
```typescript
const maxAttempts = 60; // Increase from 30
await sleep(5000); // Increase from 2000ms
```

### Rate Limiting

Add delays between requests:
```typescript
for (const design of designs) {
  await processDesign(design);
  await sleep(1000); // Wait 1 second between designs
}
```

### Brand Kit Access

Verify tier supports Brand Kit:
```bash
npm run canva detect-tier
```

Upgrade if needed:
```
https://www.canva.com/pricing/
```

## Additional Resources

- [Canva Connect API Docs](https://www.canva.dev/docs/connect/)
- [Autofill API Guide](https://www.canva.dev/docs/connect/autofill/)
- [Export API Reference](https://www.canva.dev/docs/connect/exports/)
- [Brand Kit API](https://www.canva.dev/docs/connect/brand-kit/)

## Support

- File issues in parent repository
- Check API status: https://status.canva.com/
- Community: https://community.canva.dev/
