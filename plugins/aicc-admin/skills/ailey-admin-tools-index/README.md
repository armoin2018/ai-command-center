# AI-ley Index Tool

Search, query, and transform AI-ley index files with powerful filtering and multiple output formats.

## Features

- **Multi-criteria search**: name, keywords, text, regex
- **Multiple output formats**: JSON, YAML, XML, CSV, Markdown, HTML, Prompt instructions
- **jq integration**: Advanced queries and transformations
- **Type filtering**: Search specific resource types
- **Names-only mode**: For scripting and automation

## Installation

```bash
cd .github/skills/ailey-admin-tools-index
npm install
npm run build
```

## Quick Start

```bash
# Search by keywords
node dist/search.js --keywords typescript testing

# Get markdown table
node dist/search.js --type skills --format markdown

# Export to HTML
node dist/search.js --format html --output report.html

# Get just names
node dist/search.js --keywords api --names-only
```

## Usage

```
Options:
  -n, --name <pattern>          Filter by name (regex)
  -k, --keywords <kw...>        Filter by keywords
  -s, --string <text>           Search in name/desc/keywords
  -r, --regex <pattern>         Advanced regex search
  -t, --type <types...>         Index types (agents, skills, personas, etc.)
  -f, --format <fmt>            Output format (default: json)
  -o, --output <file>           Write to file
  --jq <query>                  Apply jq query
  --jq-file <file>              Load jq query from file
  --jq-output <query>           Apply jq output transformation
  --jq-output-file <file>       Load jq output from file
  --names-only                  Return only resource names
```

## Output Formats

- `json` - Pretty-printed JSON (default)
- `json-array` - Compact JSON array
- `yaml` - YAML format
- `xml` - XML structure
- `txt` - Plain text list
- `csv` - CSV with headers
- `markdown` - Markdown table
- `html` - Interactive HTML report
- `prompt` - Formatted for AI prompts

## Examples

### Search by keyword

```bash
node dist/search.js --keywords seo-audit
```

### Multiple filters

```bash
node dist/search.js --type skills personas --keywords typescript --name ailey
```

### Export to CSV

```bash
node dist/search.js --type skills --format csv --output skills.csv
```

### jq queries

```bash
# High-quality resources
node dist/search.js --jq '.[] | select(.score >= 4.5)'

# Just names and scores
node dist/search.js --jq '.[] | {name, score}'
```

## Testing

```bash
npm run build
node dist/search.test.js
```

## Documentation

See [SKILL.md](SKILL.md) for complete documentation.

## Requirements

- Node.js 18+
- jq (for jq query support)

## License

Part of the AI-ley kit.
