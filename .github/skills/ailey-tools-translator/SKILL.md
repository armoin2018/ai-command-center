---
id: ailey-tools-translator
name: ailey-tools-translator
description: Comprehensive offline-first language translation toolkit with local translation via Argos Translate or LibreTranslate, batch file translation (md, txt, json, yaml, csv, po, xliff, srt), auto-detect source language, 30+ language pairs, and smart format preservation. Use when translating text strings, translating files or folders, localizing documentation, batch translating content, detecting languages, or listing available translation pairs.
keywords: [translate, translation, language, argos, libretranslate, batch, localize, i18n, l10n, multilingual, offline, locale, subtitle]
tools: [commander, axios, glob, dotenv]
---

# AI-ley Translator Tool

Offline-first language translation toolkit for text, files, and batch content using local translation backends.

## Overview

- **Offline-First**: Argos Translate (local CLI) as primary backend — no API keys, no cloud
- **LibreTranslate Fallback**: Self-hosted or cloud LibreTranslate as secondary backend
- **Auto-Detection**: Detect source language automatically before translating
- **Smart Format Preservation**: Translates content while preserving markdown syntax, JSON keys, YAML structure
- **Batch Translation**: Glob-based multi-file translation with parallel processing
- **Incremental Mode**: Skip already-translated segments to avoid redundant work
- **8+ File Formats**: md, txt, json, yaml, csv, po/pot, xliff, srt
- **30+ Language Pairs**: Common pairs via Argos; 50+ via LibreTranslate

## When to Use

- Translating a text string or snippet between languages
- Translating documentation files (README, guides, changelogs)
- Batch localizing a folder of content files
- Detecting the language of unknown text or files
- Translating subtitle files (srt) for video content
- Localizing JSON/YAML configuration or i18n resource files
- Translating PO/XLIFF translation catalog files
- Listing available language pairs for a backend

## Installation

```bash
cd .github/skills/ailey-tools-translator
npm install
```

### Prerequisites

**Argos Translate** (preferred — offline, free):

| Platform | Install Command |
|----------|----------------|
| **macOS** | `pip install argostranslate` |
| **Linux** | `pip3 install argostranslate` (Ubuntu/Debian) or `pip install argostranslate` |
| **Windows** | `pip install argostranslate` (requires [Python](https://www.python.org/downloads/); use `py -m pip install argostranslate` if `pip` not on PATH) |

```bash
# Install language packages (all platforms)
argospm install translate-en_es
argospm install translate-es_en
argospm install translate-en_fr
# List available packages
argospm list
```

**LibreTranslate** (alternative — self-hosted or cloud):

```bash
# Run locally via Docker
docker run -d -p 5000:5000 libretranslate/libretranslate

# Or install directly
pip install libretranslate
libretranslate --host 0.0.0.0 --port 5000
```

### Environment Setup

```bash
# .env, .env.local, or ~/.vscode/.env

# LibreTranslate (only if using LibreTranslate backend)
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=              # optional, for hosted instances

# Argos Translate
ARGOS_PATH=                          # optional, custom argostranslate binary path

# Defaults
DEFAULT_SOURCE_LANG=en
DEFAULT_TARGET_LANG=es
```

## Quick Start

```bash
# Check backend availability
npm run translate status

# Translate a text string
npm run translate text -s en -t es "Hello, world!"

# Detect language of text
npm run translate detect "Bonjour le monde"

# Translate a file
npm run translate file -i README.md -o README.es.md -s en -t es

# Batch translate a folder
npm run translate batch -i "docs/**/*.md" -t es

# List available language pairs
npm run translate languages
```

---

## Backend Detection

On first run, the skill auto-detects available translation backends.

### Detection Order

```
1. Argos Translate CLI → check `argostranslate` binary on PATH
2. LibreTranslate API  → check LIBRETRANSLATE_URL health endpoint
3. None found          → display setup instructions
```

### Tier Overview

| Tier | Backend | Connectivity | Languages | Cost |
|------|---------|-------------|-----------|------|
| **Tier 1** | Argos Translate | Offline (local CLI) | ~30 pairs | Free |
| **Tier 2** | LibreTranslate | Local or network API | 50+ languages | Free (self-hosted) |
| **Tier 3** | None detected | — | — | — |

### Tier 1: Argos Translate (Preferred)

- Fully offline — no network required
- Language models installed locally via `argospm`
- ~30 common language pairs
- No API key, no rate limits

```bash
# Verify
argostranslate --version

# Install a language pair
argospm install translate-en_de

# List installed pairs
argospm list
```

### Tier 2: LibreTranslate

- Self-hosted Docker or pip install
- 50+ languages, auto-detect support
- Optional API key for hosted instances
- REST API at `LIBRETRANSLATE_URL`

```bash
# Health check
curl http://localhost:5000/frontend/index.html

# List languages
curl http://localhost:5000/languages
```

### Tier 3: No Backend Found

If neither backend is detected, the skill outputs setup instructions:

```
❌ No translation backend found.

Install one of the following:

  Option A (recommended): Argos Translate
    # macOS / Linux
    pip install argostranslate
    argospm install translate-en_es

    # Windows
    py -m pip install argostranslate
    argospm install translate-en_es

  Option B: LibreTranslate (Docker — all platforms)
    docker run -d -p 5000:5000 libretranslate/libretranslate
    echo 'LIBRETRANSLATE_URL=http://localhost:5000' >> .env
```

---

## Commands

All commands use the `npm run translate` prefix.

### translate text

Translate a text string inline.

```bash
# Basic
npm run translate text -s en -t es "Hello, how are you?"

# Auto-detect source language
npm run translate text -t fr "Good morning"

# Output to file
npm run translate text -t de "Welcome" -o greeting.txt
```

### translate file

Translate a single file with format-aware processing.

```bash
# Markdown file
npm run translate file -i README.md -o README.es.md -s en -t es

# JSON (translates values, preserves keys)
npm run translate file -i en.json -o es.json -s en -t es

# YAML (translates values, preserves keys)
npm run translate file -i messages.yml -o messages.es.yml -t es

# Subtitle file
npm run translate file -i captions.srt -o captions.fr.srt -t fr

# CSV (translates specified columns)
npm run translate file -i data.csv -o data.de.csv -t de --columns "description,title"

# PO translation catalog
npm run translate file -i messages.po -o messages.es.po -t es

# XLIFF
npm run translate file -i app.xliff -o app.es.xliff -t es
```

### translate batch

Translate multiple files using glob patterns.

```bash
# All markdown in docs/
npm run translate batch -i "docs/**/*.md" -t es

# Multiple formats
npm run translate batch -i "i18n/**/*.{json,yaml}" -t fr -t de -t ja

# With output directory
npm run translate batch -i "content/**/*.md" -t pt --outdir localized/pt

# Incremental (skip already translated)
npm run translate batch -i "docs/**/*.md" -t es --incremental

# Dry run (preview files without translating)
npm run translate batch -i "src/**/*.json" -t fr --dry-run
```

### translate detect

Auto-detect the language of text or a file.

```bash
# Detect from text
npm run translate detect "Bonjour le monde"

# Detect from file
npm run translate detect -i document.txt

# JSON output
npm run translate detect "こんにちは世界" --format json
```

**Output:**

```json
{
  "language": "ja",
  "confidence": 0.98,
  "name": "Japanese"
}
```

### translate languages

List available language pairs for the active backend.

```bash
# List all
npm run translate languages

# Filter by source
npm run translate languages --source en

# Filter by target
npm run translate languages --target es

# JSON output
npm run translate languages --format json
```

### translate status

Check backend health and availability.

```bash
npm run translate status
```

**Output:**

```
Translation Backend Status
─────────────────────────
Backend:     Argos Translate (Tier 1)
Version:     1.9.1
Status:      ✅ Available
Languages:   32 pairs installed
Path:        /usr/local/bin/argostranslate

LibreTranslate:
Status:      ⚠️ Not configured
URL:         (not set)
```

---

## Supported Formats

| Format | Extension | Translate Scope | Notes |
|--------|-----------|----------------|-------|
| Markdown | .md | Full text | Preserves headings, links, code blocks, tables |
| Plain Text | .txt | Full text | Line-by-line translation |
| JSON | .json | Values only | Keys preserved, nested objects supported |
| YAML | .yml/.yaml | Values only | Keys preserved, structure maintained |
| CSV | .csv | Specified columns | Header row preserved, `--columns` flag |
| PO/POT | .po/.pot | msgstr entries | Standard gettext format |
| XLIFF | .xliff/.xlf | target elements | XML-based localization interchange |
| SRT | .srt | Subtitle text | Timestamps and sequence numbers preserved |

### Format Preservation Rules

**Markdown:**
- Code blocks (`` ``` ``) — never translated
- Inline code (`` ` ``) — never translated
- Links `[text](url)` — text translated, URL preserved
- Image alt text translated, paths preserved
- HTML tags preserved
- Front matter (YAML) — optionally translated

**JSON:**
```json
{
  "app_name": "Mi Aplicación",     // ← translated
  "settings": {                     // ← key preserved
    "language": "Idioma",           // ← value translated
    "count": 42                     // ← numbers preserved
  }
}
```

**SRT:**
```srt
1
00:00:01,000 --> 00:00:04,000      // ← timestamps preserved
Hola, bienvenidos al tutorial       // ← translated

2
00:00:04,500 --> 00:00:08,000
Hoy aprenderemos sobre traducción   // ← translated
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIBRETRANSLATE_URL` | `http://localhost:5000` | LibreTranslate API endpoint |
| `LIBRETRANSLATE_API_KEY` | (none) | API key for hosted LibreTranslate instances |
| `ARGOS_PATH` | (auto-detect) | Path to argostranslate binary |
| `DEFAULT_SOURCE_LANG` | `en` | Default source language code |
| `DEFAULT_TARGET_LANG` | `es` | Default target language code |
| `TRANSLATE_BACKEND` | (auto) | Force backend: `argos` or `libretranslate` |
| `TRANSLATE_TIMEOUT` | `30000` | Request timeout in milliseconds |
| `TRANSLATE_CONCURRENCY` | `4` | Max parallel translations for batch |

### Language Codes

Standard ISO 639-1 codes:

| Code | Language | Code | Language |
|------|----------|------|----------|
| `en` | English | `ja` | Japanese |
| `es` | Spanish | `ko` | Korean |
| `fr` | French | `zh` | Chinese |
| `de` | German | `ar` | Arabic |
| `it` | Italian | `hi` | Hindi |
| `pt` | Portuguese | `ru` | Russian |
| `nl` | Dutch | `tr` | Turkish |
| `pl` | Polish | `vi` | Vietnamese |

Full list: run `npm run translate languages`

---

## API Reference

### Core Functions

```typescript
import { getTranslatorClient } from './scripts/translator-client';

const client = getTranslatorClient();
```

**detectBackend(): Promise\<BackendInfo\>**

```typescript
const backend = await client.detectBackend();
// { type: 'argos' | 'libretranslate', version: string, languages: number }
```

**translateText(text, source, target): Promise\<string\>**

```typescript
const result = await client.translateText('Hello world', 'en', 'es');
// "Hola mundo"
```

**translateFile(input, output, options): Promise\<TranslationResult\>**

```typescript
await client.translateFile('README.md', 'README.es.md', {
  source: 'en',
  target: 'es',
  format: 'md',
  incremental: false,
});
```

**translateBatch(pattern, options): Promise\<BatchResult\>**

```typescript
const result = await client.translateBatch('docs/**/*.md', {
  target: 'fr',
  outdir: 'localized/fr',
  concurrency: 4,
  incremental: true,
});
// { translated: 12, skipped: 3, errors: 0 }
```

**detectLanguage(text): Promise\<Detection\>**

```typescript
const detection = await client.detectLanguage('Bonjour le monde');
// { language: 'fr', confidence: 0.97, name: 'French' }
```

**listLanguages(filter?): Promise\<LanguagePair[]\>**

```typescript
const pairs = await client.listLanguages({ source: 'en' });
// [{ source: 'en', target: 'es' }, { source: 'en', target: 'fr' }, ...]
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `❌ No translation backend found` | Neither Argos nor LibreTranslate available | Install Argos: `pip install argostranslate` |
| `❌ Language pair not installed` | Missing Argos language package | `argospm install translate-en_XX` |
| `❌ LibreTranslate connection refused` | Server not running or wrong URL | Start server or check `LIBRETRANSLATE_URL` |
| `❌ Unsupported file format` | File extension not recognized | Use a supported format or convert first |
| `❌ API key required` | Hosted LibreTranslate needs key | Set `LIBRETRANSLATE_API_KEY` in .env |
| `⚠️ Detection confidence low` | Ambiguous or short input text | Provide more text or specify `-s` manually |

### Error Recovery

```bash
# Check what's available
npm run translate status

# Install missing language pair
argospm install translate-en_de

# Verify pair works
npm run translate text -s en -t de "test"
```

---

## Examples

### Example 1: Translate Project README

```bash
# Translate English README to Spanish
npm run translate file \
  -i README.md \
  -o README.es.md \
  -s en -t es

# Verify output
head -20 README.es.md
```

### Example 2: Batch Localize Documentation

```bash
# Translate all docs to French and German
npm run translate batch \
  -i "docs/**/*.md" \
  -t fr \
  --outdir docs/fr

npm run translate batch \
  -i "docs/**/*.md" \
  -t de \
  --outdir docs/de

# Incremental update (only new/changed files)
npm run translate batch \
  -i "docs/**/*.md" \
  -t fr \
  --outdir docs/fr \
  --incremental
```

### Example 3: Translate Subtitles

```bash
# Translate English SRT to Spanish
npm run translate file \
  -i video/captions.en.srt \
  -o video/captions.es.srt \
  -s en -t es

# Batch translate subtitles to multiple languages
# macOS / Linux (bash/zsh)
for lang in es fr de ja; do
  npm run translate file \
    -i video/captions.en.srt \
    -o "video/captions.${lang}.srt" \
    -s en -t "$lang"
done

# Windows (PowerShell)
foreach ($lang in 'es','fr','de','ja') {
  npm run translate file -i video/captions.en.srt -o "video/captions.$lang.srt" -s en -t $lang
}
```

### Example 4: Localize i18n JSON Resources

```bash
# Translate i18n keys
npm run translate file \
  -i src/i18n/en.json \
  -o src/i18n/es.json \
  -s en -t es

# Batch all locale files
npm run translate batch \
  -i "src/i18n/en.json" \
  -t es -t fr -t de -t ja -t pt \
  --outdir src/i18n
```

---

## Integration with AI-ley Ecosystem

### With ailey-tools-audio

Transcribe then translate:

```bash
# Transcribe audio
cd ../ailey-tools-audio
npm run audio transcribe file -i lecture.mp3 -o transcript.txt

# Translate transcript
cd ../ailey-tools-translator
npm run translate file -i ../ailey-tools-audio/transcript.txt -o transcript.es.txt -t es
```

### With ailey-tools-video

Translate subtitles extracted from video:

```bash
# Extract subtitles
cd ../ailey-tools-video
npm run video extract-subs -i video.mkv -o subs.srt

# Translate
cd ../ailey-tools-translator
npm run translate file -i ../ailey-tools-video/subs.srt -o subs.es.srt -t es
```

### With ailey-tools-data-converter

Convert translated output between data formats:

```bash
# Translate JSON
npm run translate file -i data.json -o data.es.json -t es

# Convert to YAML
cd ../ailey-tools-data-converter
npm run convert file data.es.json data.es.yaml json yaml
```

---

version: 1.1.0
updated: 2026-03-03
reviewed: 2026-03-03
score: 4.5
---
