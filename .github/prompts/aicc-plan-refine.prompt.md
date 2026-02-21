---
name: AI-CC Plan Item Refiner
description: Refine and enhance one or more planning items (epic/story/task/bug) with improved clarity, detail, and actionability through interactive analysis
agent: AI-ley Orchestrator
tools: []
---

# AI-CC Plan Item Refiner

Intelligently refine and enhance planning items with improved clarity, detail, and actionability through interactive user engagement.

## Goal

Given one or more planning item IDs from `.project/PLAN.json`, analyze and refine each item to improve:
- Summary clarity and conciseness
- Description completeness and detail
- Acceptance criteria specificity
- Technical feasibility and approach
- Dependencies and relationships
- Estimation accuracy
- AI execution settings (agent, instructions, personas, context)
- Comment relevance and value

## Process

### 1. Parse Input IDs

Accept comma-separated list of IDs:
- Single ID: `AICC-123`
- Multiple IDs: `AICC-123, AICC-124, AICC-125`

For each ID provided, execute refinement workflow.

### 2. Load Planning Item(s)

```bash
# Use ailey-admin-manage-plan skill to load each item
cd .github/skills/ailey-admin-manage-plan
npm run plan get {{id}}
```

### 3. Interactive Analysis & Questions

For each planning item, engage user with targeted questions:

**Clarity Questions:**
- What is the primary goal or outcome?
- Who is the intended user or beneficiary?
- What problem does this solve?

**Technical Questions:**
- What are the key technical components involved?
- Are there specific frameworks or tools required?
- What are potential technical risks or blockers?

**Scope Questions:**
- What is explicitly in scope?
- What is explicitly out of scope?
- Should this be broken down into smaller items?

**Context Questions:**
- What files or components are affected?
- Are there dependencies on other work items?
- What existing functionality is this related to?

**Quality Questions:**
- How will success be measured?
- What are the acceptance criteria?
- How should this be tested?

**AI Execution Questions:**
- Which AI agent should execute this? (Options: AI-ley Orchestrator, AI-ley Architect, AI-ley Bug Fixer, etc.)
- What specialized instructions are needed? (Suggest from `.github/ai-ley/instructions/**/*.md`)
- What personas would provide valuable perspective? (Suggest from `.github/ai-ley/personas/**/*.md`)
- What additional context is needed? (Files, folders, documentation)

**Comment Review:**
- Review existing comments for relevance to execution
- Identify comments that should be skipped (toggle `enabled: false`)
- Suggest removing outdated or non-actionable comments

### 4. Generate Refinements

Based on user responses, propose comprehensive improvements:

**Summary Enhancement:**
- Improve clarity and conciseness
- Add missing context
- Ensure actionability
- Follow pattern: `[Action] [Target] to [Outcome]`

**Description Enhancement:**
- Add technical details from conversation
- Include implementation approach
- Note edge cases and considerations
- Reference related files/components
- Include code examples if applicable

**Acceptance Criteria Enhancement:**
- Make criteria specific and measurable (Given-When-Then format)
- Add test scenarios
- Include error handling requirements
- Specify user-facing behavior
- Define performance expectations

**Variables Creation:**
- Extract key configuration values as variables
- Define variable structure: `{ "key": "value" }`
- Document variable purpose

**Instructions Assignment:**
- Add relevant instruction files from `.github/ai-ley/instructions/**/*.md`
- Prioritize domain-specific instructions
- Include cross-cutting concerns (testing, documentation, security)

**Personas Assignment:**
- Add relevant personas from `.github/ai-ley/personas/**/*.md`
- Consider multiple perspectives (developer, user, architect)
- Include stakeholder perspectives

**Context Assignment:**
- Add file paths affected by this work
- Include documentation references
- Link related folders or components

**Agent Assignment:**
- Assign appropriate AI agent based on work type:
  - Architecture/Design → AI-ley Architect
  - Bug fixes → AI-ley Bug Fixer
  - Feature development → AI-ley Orchestrator
  - Testing → AI-ley Tester
  - Documentation → AI-ley Documentation

#### Description
**Additions:**
- {{new detail 1}}
- {{new detail 2}}
- {{new detail 3}}

**Technical Approach:**
{{suggested implementation approach}}

**Edge Cases:**
- {{edge case 1}}
- {{edge case 2}}

#### Acceptance Criteria
**Current:**
{{current criteria}}

**Proposed:**
1. {{criterion 1 - specific and testable}}
2. {{criterion 2 - specific and testable}}
3. {{criterion 3 - specific and testable}}

**Test Scenarios:**
- Happy path: {{test 1}}
- Error case: {{test 2}}
- Edge case: {{test 3}}

### Dependencies
- {{dependency 1}} ({{reason}})
- {{dependency 2}} ({{reason}})

### Estimated Complexity
**Original:** {{original estimate}}
**Revised:** {{revised estimate}}
**Rationale:** {{reasoning for change}}

### Files/Components Affected
- {{file/component 1}}
- {{file/component 2}}
```

### 5. Apply Refinements

After user approval, update the planning item:

```bash
# Update with refined values
npm run plan update {{id}} -- \
  --summary "{{refined summary}}" \
  --description "{{refined description}}" \
  --acceptanceCriteria "{{refined criteria}}"
```

## Examples

### Example 1: Epic Refinement

**Input ID:** EPIC-001

**Current:**
```
Summary: User authentication
Description: Add user auth
Acceptance Criteria: Users can log in
```

**Refined:**
```
Summary: Implement OAuth 2.0 user authentication with SSO support
Description: Implement secure user authentication using OAuth 2.0 protocol with support for social login (Google, GitHub) and enterprise SSO providers (Azure AD, Okta). Include session management, token refresh, and secure credential storage.

Technical Approach:
- Integrate Passport.js for OAuth 2.0 flows
- Implement JWT-based session tokens with refresh mechanism
- Add Redis for session store
- Create user profile service for SSO data mapping

Edge Cases:
- Handle expired OAuth provider tokens
- Manage concurrent login sessions
- Address SSO provider downtime gracefully

Acceptance Criteria:
1. Users can authenticate via Google OAuth with profile sync
2. Users can authenticate via GitHub OAuth with email verification
3. Users can authenticate via Azure AD SSO for enterprise domains
4. Sessions persist for 24 hours with automatic refresh
5. Failed authentication shows appropriate error messages
6. Multi-device login supported with session management UI
7. Logout invalidates all active sessions for the user

Dependencies:
- STORY-012 (User profile data model)
- STORY-034 (API security middleware)

Estimated Complexity: 5 story points → 8 story points
Rationale: SSO integration and multi-provider support adds complexity

Files/Components Affected:
- src/auth/oauth.ts
- src/auth/session-manager.ts
- src/api/auth-routes.ts
- src/middleware/auth.ts
```

### Example 2: Story Refinement

**Input ID:** STORY-042

**Current:**
```
Summary: Add search
Description: Users need search
Acceptance Criteria: Search works
```

**Refined:**
```
Summary: Implement full-text search with filters and sorting
Description: Add full-text search capability to the content repository with support for advanced filters (type, date range, author) and multiple sort options (relevance, date, title). Search should support partial matching, highlighting, and pagination for large result sets.

Technical Approach:
- Integrate Elasticsearch for full-text indexing
- Create search API endpoint with query parser
- Implement filter and sort query builders
- Add result highlighting and pagination
- Create reusable search UI component

Edge Cases:
- Handle special characters in search queries
- Manage empty/no results state
- Address Elasticsearch connection failures
- Optimize for large datasets (100k+ items)

Acceptance Criteria:
1. Search returns results for partial keyword matches
2. Results can be filtered by type, date range, and author
3. Results can be sorted by relevance, date (asc/desc), or title (a-z)
4. Search highlights matching terms in result snippets
5. Pagination supports 10/25/50/100 results per page
6. Search completes in <500ms for 95th percentile
7. Error message shown when search service unavailable

Test Scenarios:
- Happy path: Search "authentication" returns all auth-related items
- Filter: Search with date range returns only items in range
- Sort: Sort by date returns newest first
- Error: Elasticsearch down shows graceful error
- Edge: Special chars (!@#$) don't break search

Dependencies:
- TASK-087 (Elasticsearch cluster setup)
- TASK-099 (Search UI component design)

Estimated Complexity: 3 story points → 5 story points
Rationale: Elasticsearch integration and advanced features add complexity

Files/Components Affected:
- src/search/elasticsearch-client.ts
- src/search/query-builder.ts
- src/api/search-routes.ts
- src/components/SearchBar.tsx
- src/components/SearchResults.tsx
```

### Example 3: Task Refinement

**Input ID:** TASK-156

**Current:**
```
Summary: Fix button
Description: Button doesn't work
Acceptance Criteria: Button fixed
```

**Refined:**
```
Summary: Fix submit button click handler in user profile form
Description: The submit button in the user profile form (ProfileForm.tsx) is not triggering the save handler when clicked. Investigation shows the onClick event is not properly bound to the handler function. Fix involves updating the event binding and adding proper error handling.

Technical Approach:
- Update onClick binding to use arrow function or .bind()
- Add error boundary around form component
- Implement loading state during submission
- Add success/error toast notifications

Root Cause:
The onClick handler was losing its `this` context due to how it was bound. The handler needs to be either an arrow function or explicitly bound in the constructor.

Acceptance Criteria:
1. Clicking submit button triggers form validation
2. Valid form data is sent to API endpoint
3. Loading spinner appears during submission
4. Success toast shows "Profile updated successfully"
5. Error toast shows appropriate error message on failure
6. Form fields are disabled during submission
7. Submit button prevents double-click submissions

Test Scenarios:
- Happy path: Click submit with valid data → profile updates
- Validation: Click submit with invalid email → error message
- Network: Simulate API failure → error toast shown
- Edge: Double-click submit → only one request sent

Dependencies: None

Estimated Complexity: 1 story point (no change)
Rationale: Straightforward bug fix with clear solution

Files/Components Affected:
- src/components/ProfileForm.tsx (event handler binding)
- src/components/ProfileForm.test.tsx (add test cases)
```

## Best Practices

1. **Be Specific**: Vague requirements lead to unclear implementations
2. **Consider Edge Cases**: Think beyond happy path scenarios
3. **Add Context**: Include technical details and rationale
4. **Make Testable**: Criteria should be verifiable
5. **Identify Dependencies**: Note related work items
6. **Estimate Realistically**: Adjust complexity based on refined scope
7. **Reference Code**: Link to affected files/components
8. **Think User-Centric**: Focus on user outcomes

## Notes

- Refinement should enhance, not completely rewrite
- Preserve original intent while adding clarity
- Ask clarifying questions if intent is unclear
- Suggest breaking down items that are too large
- Flag technical risks and unknowns
- Use consistent terminology from project glossary
- Review comments for execution value, mark non-relevant ones as skip
- Assign appropriate AI agent based on work type
- Add instructions and personas for specialized guidance
- Extract configuration values as variables
- Define context for AI execution (files, folders, docs)

## Application

After user confirms refinements:

```bash
cd .github/skills/ailey-admin-manage-plan

# Update each planning item
npm run plan update {{id}} -- \
  --summary "{{refined}}" \
  --description "{{enhanced}}" \
  --acceptanceCriteria "{{specific}}" \
  --agent "{{assigned}}" \
  --instructions '{{json_array}}' \
  --personas '{{json_array}}' \
  --contexts '{{json_array}}' \
  --variables '{{json_object}}'

# Skip non-valuable comments
npm run plan update {{id}} -- \
  --comment {{index}} \
  --enabled false
```

---

version: 1.1.0
updated: 2026-02-04
reviewed: 2026-02-04
score: 4.8
---
