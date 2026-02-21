# Safety Feature Test

This document describes how to test the self-protection feature.

## Test Scenario: Prevent Self-Installation

### Setup

1. Ensure you're in the `ai-command-center` repository
2. Verify git remote exists:
   ```bash
   git remote -v
   ```

### Test 1: Attempt to Install from Same Repository

Assume the ai-command-center repo has a kit structure that points back to itself.

**Command:**
```bash
cd .github/skills/aicc-admin-catalog
npm run catalog install aicc-admin-catalog
```

**Expected Result:**
```
📦 Installing kit: aicc-admin-catalog

⛔ Operation not allowed:
Cannot install kit "aicc-admin-catalog" from the same repository.
This would modify the catalog manager itself and could cause conflicts.
Please run this operation from a different project.

Error: ...
```

### Test 2: Attempt to Update from Same Repository

**Command:**
```bash
npm run catalog update aicc-admin-catalog
```

**Expected Result:**
```
🔄 Updating kit: aicc-admin-catalog

⛔ Operation not allowed:
Cannot update kit "aicc-admin-catalog" from the same repository.
This would modify the catalog manager itself and could cause conflicts.
Please run this operation from a different project.

Error: ...
```

### Test 3: Attempt to Remove from Same Repository

**Command:**
```bash
npm run catalog remove aicc-admin-catalog
```

**Expected Result:**
```
🗑️  Removing kit: aicc-admin-catalog

⛔ Operation not allowed:
Cannot remove kit "aicc-admin-catalog" from the same repository.
This would delete parts of the catalog manager itself.
Please run this operation from a different project.

Error: ...
```

### Test 4: Operations on Different Repository (Should Work)

**Command:**
```bash
npm run catalog install ai-ley
```

**Expected Result:**
```
📦 Installing kit: ai-ley

📥 Cloning repository...
✓ Copied structure configuration
📂 Processing mapping: .github -> .github
✓ Copied 245 files
...
✨ Kit "ai-ley" installed successfully!
```

## URL Normalization Tests

The safety feature normalizes URLs for comparison:

### Test Cases

| Kit Repo URL | Current Repo URL | Should Match? |
|--------------|------------------|---------------|
| `https://github.com/user/repo` | `https://github.com/user/repo` | ✅ Yes |
| `git@github.com:user/repo` | `https://github.com/user/repo` | ✅ Yes |
| `https://github.com/user/repo.git` | `https://github.com/user/repo` | ✅ Yes |
| `git@github.com:user/repo.git` | `https://github.com/user/repo.git` | ✅ Yes |
| `https://github.com/user/repo` | `https://github.com/user/other` | ❌ No |
| `https://github.com/user/repo` | `https://gitlab.com/user/repo` | ❌ No |

### Implementation Notes

The `normalizeGitUrl()` function:
1. Removes `.git` suffix
2. Converts SSH format to HTTPS format
3. Removes protocol prefix
4. Converts to lowercase

This ensures consistent comparison regardless of how the git remote is configured.

## Manual Testing

### Check Current Repository URL

```bash
cd /path/to/ai-command-center
git remote get-url origin
```

### Test URL Normalization (Node REPL)

```javascript
// In .github/skills/aicc-admin-catalog
node --input-type=module
```

```javascript
import { normalizeGitUrl, getCurrentRepositoryUrl } from './scripts/git-operations.js';

// Test normalization
console.log(normalizeGitUrl('https://github.com/user/repo.git'));
// Expected: github.com/user/repo

console.log(normalizeGitUrl('git@github.com:user/repo'));
// Expected: github.com/user/repo

// Test current repo detection
const currentRepo = await getCurrentRepositoryUrl();
console.log('Current repo:', currentRepo);
// Expected: github.com/blainemcdonnell/ai-command-center (or your repo)
```

## Success Criteria

✅ Install operation blocks same-repository kits  
✅ Update operation blocks same-repository kits  
✅ Remove operation blocks same-repository kits  
✅ Error messages are clear and actionable  
✅ URL normalization handles SSH and HTTPS formats  
✅ Operations on different repositories work normally  

## Notes

- The protection applies at the repository level, not the kit name level
- Even if a kit has a different name but same repo URL, it will be blocked
- The check happens before any git operations, preventing wasted bandwidth
- If the current directory is not a git repository, the check is skipped (no protection needed)
