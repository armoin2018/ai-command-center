#!/usr/bin/env bash
# check-no-inline.sh — Lint HTML files for inline <script> and <style> blocks
# Usage: ./scripts/check-no-inline.sh
# Exit code 0 = clean, non-zero = violations found.
#
# Add to CI or pre-commit hooks:
#   - name: No inline JS/CSS
#     run: bash scripts/check-no-inline.sh

set -euo pipefail

MEDIA_DIR="$(cd "$(dirname "$0")/.." && pwd)/media"
EXIT_CODE=0

echo "Scanning media/**/*.html for inline <script> and <style> blocks..."

# --- Inline <script> (not <script src=...) ---
INLINE_SCRIPTS=$(grep -rn '<script>' "$MEDIA_DIR" --include='*.html' \
  | grep -v '<script\s\+src=' \
  | grep -v '<script\s\+nonce=' || true)

if [ -n "$INLINE_SCRIPTS" ]; then
  echo ""
  echo "ERROR: Inline <script> blocks found (extract to external .js files):"
  echo "$INLINE_SCRIPTS"
  EXIT_CODE=1
fi

# --- Inline <style> ---
INLINE_STYLES=$(grep -rn '<style>' "$MEDIA_DIR" --include='*.html' \
  | grep -v '<style\s\+nonce=' || true)

if [ -n "$INLINE_STYLES" ]; then
  echo ""
  echo "ERROR: Inline <style> blocks found (extract to external .css files):"
  echo "$INLINE_STYLES"
  EXIT_CODE=1
fi

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "OK — no inline <script> or <style> blocks found."
fi

exit $EXIT_CODE
