---
id: ailey-add-instruction
name: addInstruction
description: AI-ley prompt for update instructions
keywords: [update, instructions, prompt, ailey]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator
---

## Objective

Systematically scan, analyze, and enhance all instruction files in `.github/ai-ley/instructions/**/*.md` to ensure they are accurate, comprehensive, and optimally structured for AI agent integration. This process includes automated scanning, quality assessment, content enhancement, and maintenance tracking.

---

## Inputs
- Filename, directory path, or glob pattern specifying which instruction files to update
- Type: add | update | optimize
- Optional: Specific update level (1, 2, or 3) to control depth of updates

## File Locations
- Instruction files are located in `.github/ai-ley/instructions/**/*.md``

## Critical Includes
- Follow the "AI-ley Admin Tools Builder Instructions" found in `.github/ai-ley/instructions/_general/admin-tools.instructions.md` for formatting and structuring guidelines.

## Execution Strategy

- Document progress to enable resuming work across sessions
- All should follow the Optimization Instructions whether adding, updating or optimizing. 
- Evolve the insructions
- Verify improvements after each cycle 
- Benchmarking & Measurement

### Add Instruction


### Update Instructions


### Optimize Instructions


### Evolve
- Continuously refine the process based on outcomes and feedback
- Discover potentential imporvments for future iterations
- Multipass enhancements for deeper optimization.  Take 3 passess at minimum:
  - Pass 1: Critical fixes and accuracy
  - Pass 2: Structural standardization
  - Pass 3: Content enrichment and AI optimization

### Benchmarking & Measurement
- Measure quality scores pre- and post-enhancement
- Test Token usage, efficiency and accuracy 
  - with and without optimizations
  - pre and post enhancements
- Ensure measurable improvement in accuracy, relevance, and AI usability

### Batch Processing Approach
- Focus on high-impact improvements first (accuracy, effectiveness,completeness)
- **Small Batches**: Process 5-10 files per session to maintain quality
- **Priority Ordering**: Start with high-impact, frequently-used instructions
- **Iterative Improvement**: Multiple passes for deeper optimization


### Progressive Enhancement Levels

**Level 1 - Critical Fixes** (Priority 1)

- Fix broken code examples and syntax errors
- Add missing YAML frontmatter
- Remove placeholder content
- Correct factual inaccuracies

**Level 2 - Structure & Standards** (Priority 2)

- Align with template formatting
- Standardize section headers and organization
- Implement consistent cross-referencing
- Add required metadata fields

**Level 3 - Content Enhancement** (Priority 3)

- Expand superficial sections with detailed guidance
- Add practical examples and use cases
- Optimize for AI readability and parsing
- Create comprehensive cross-reference networks

## Effort Estimation

**Per File Estimates:**

- Simple fixes (Level 1): 5-10 minutes
- Standard updates (Level 2): 15-25 minutes
- Major enhancements (Level 3): 30-60 minutes

**Project Phases:**

- Discovery & Scanning: 1-2 hours for entire repository
- Level 1 fixes: 50% of total files per week
- Level 2 standardization: 25% of total files per week
- Level 3 enhancement: 10-15% of total files per week

---

## Phase 1: Discovery & Scanning

### Automated Directory Scan

1. **Inventory All Instructions**

   - Recursively scan `.github/ai-ley/instructions/**/*.md` for all instruction files
   - Generate a complete inventory with file paths, sizes, and last modified dates
   - Identify empty files, partial files, and potential duplicates
   - Check for orphaned files that don't follow naming conventions

2. **Structure Analysis**

   - Map the current folder hierarchy and categorization system
   - Identify gaps in coverage (missing domains, frameworks, or tools)
   - Analyze naming consistency and organizational patterns
   - Detect potential reorganization opportunities

3. **Content Scanning**
   - Perform initial content analysis for each file:
     - Word count and content density
     - Presence of required sections (purpose, skills, context, etc.)
     - Code examples and practical implementations
     - Cross-references to other instructions or personas
   - Flag files requiring immediate attention (empty, malformed, outdated references)

---

## Phase 2: Quality Assessment & Scoring

**For each instruction file, perform detailed evaluation:**

1. **Accuracy Verification**

   - Cross-reference technical details against current industry standards
   - Validate code examples, API references, and tool configurations
   - Check for deprecated practices, outdated syntax, or obsolete technologies
   - Ensure compatibility with modern development environments
   - Limit examples to what is necessary for understanding, avoiding unnecessary complexity

2. **Relevance & Utility Assessment**

   - Evaluate practical applicability in current AI agent workflows
   - Assess alignment with modern development practices and methodologies
   - Check for redundancy with other instructions or unnecessary overlap
   - Ensure content directly supports intended use cases

3. **Completeness & Detail Analysis**

   - Verify presence of all required sections per template standards
   - Assess depth of technical detail and practical guidance
   - Check for missing prerequisites, dependencies, or context
   - Evaluate example quality and comprehensiveness

4. **AI Usability & Integration**

   - Ensure structure is machine-readable and consistently formatted
   - Verify tone is appropriate for AI processing (clear, directive, unambiguous)
   - Check for proper use of markdown formatting and sections
   - Assess compatibility with AI parsing and understanding

5. **Consistency & Standards Compliance**

   - Compare against template files in `{{folders.templates.instructions}}/`
   - Verify adherence to established naming conventions and folder structure
   - Check for consistent field names, formatting, and section ordering
   - Ensure proper cross-referencing and metadata inclusion

6. **For each instruction file, perform streamlined evaluation:**

**Technical Quality** (Accuracy + Completeness)

- Verify technical details, code examples, and comprehensive coverage
- **Score: 1-5** (1 = Inaccurate/incomplete, 5 = Accurate and comprehensive)

**AI Usability** (Structure + Consistency + Relevance)

- Assess machine readability, template compliance, and practical utility
- **Score: 1-5** (1 = Poor AI compatibility, 5 = Optimal for AI processing)

---

## Phase 3: Content Enhancement & Optimization

**Systematic Improvement Process:**

1. **Content Accuracy & Currency**

   - Cross-check all technical details, APIs, and syntax against current documentation
   - Update deprecated practices, obsolete tools, and outdated methodologies
   - Verify code examples compile and execute correctly
   - Ensure compatibility with latest versions of referenced technologies

2. **Relevance & Practical Utility**

   - Align content with current AI agent workflows and use cases
   - Remove or consolidate redundant information across related instructions
   - Ensure every section directly contributes to practical implementation
   - Add missing context for when and why to apply these instructions

3. **Detail Enhancement & Expansion**

   - Expand vague or superficial sections with specific, actionable guidance
   - Add concrete examples, code snippets, and step-by-step workflows
   - Include prerequisite knowledge, dependencies, and environmental setup
   - Provide troubleshooting guides and common pitfall avoidance

4. **AI Optimization & Machine Readability**

   - Structure content for optimal AI parsing and understanding
   - Use clear, directive language that eliminates ambiguity
   - Implement consistent formatting with proper markdown hierarchy
   - Add metadata tags and cross-reference markers for AI navigation

5. **Template Compliance & Standardization**

   - Align all instructions with templates in `{{folders.templates.instructions}}/`
   - Standardize section headers, field names, and structural organization
   - Ensure consistent tone and style across all instruction categories
   - Implement proper tagging and categorization systems

6. **Integration & Cross-Referencing**
   - Establish clear links between related instructions and personas
   - Create dependency maps for complex multi-instruction workflows
   - Add navigation aids and quick-reference sections
   - Ensure seamless integration with the broader AI agent framework

---

## Phase 4: Advanced Enhancement Strategies

**Deep Optimization Techniques:**

1. **Semantic Analysis & Enhancement**

   - Analyze instruction clarity using readability metrics
   - Optimize keyword density for AI comprehension
   - Ensure logical flow and coherent structure
   - Add semantic markers for improved AI understanding

2. **Practical Application Validation**

   - Test instructions in real-world scenarios
   - Validate code examples in actual development environments
   - Verify workflow completeness through practical implementation
   - Gather feedback from AI agent performance metrics

3. **Continuous Improvement Framework**

   - Establish version tracking for instruction evolution
   - Implement feedback loops from AI agent usage patterns
   - Monitor performance metrics and optimization opportunities
   - Create maintenance schedules for regular updates

4. **Quality Assurance & Testing**
   - Implement automated validation for syntax and formatting
   - Create test cases for instruction effectiveness
   - Establish peer review processes for content accuracy
   - Develop metrics for measuring instruction utility

---

## Phase 5: Documentation & Maintenance

**Tracking & Reporting System:**

1. **Comprehensive Change Documentation**

   - Record all modifications in `.github/ai-ley/instructions/CHANGES.md`
   - Include before/after comparisons for significant updates
   - Document reasoning behind major structural changes
   - Track performance improvements and measurable outcomes

2. **Scoring & Metrics Dashboard**

   - Maintain detailed scoring matrices for all instructions
   - Track improvement trends over time
   - Identify high-priority optimization targets
   - Generate summary reports for overall instruction quality

3. **Index Generation & Maintenance**

   - Create comprehensive index in `{{files.indexes.instructions}}`
   - Include categorization, tagging, and cross-reference systems
   - Maintain dependency maps and relationship diagrams
   - Provide quick-access navigation for AI agents

4. **MD5 Verification & Integrity**
   - Generate checksums in `{{files.md5sums.instructions}}`
   - Implement integrity verification for critical instructions
   - Track file modifications and version histories
   - Ensure consistency across distributed AI agent systems

---

## Output Format & Deliverables

### Enhanced Instruction Files

   - All instruction files in `.github/ai-ley/instructions/**/*.md` updated and optimized
   - Each file conforming to template standards and quality benchmarks
     - Example templates found under `.github/ai-ley/templates/instructions.template.md`
   - Improved content accuracy, relevance, clarity, conciseness, and AI usability
   - Consistent formatting and cross-referencing throughout
   - Add external links to relevant resources if available
   - Create or update a header section for each instruction file based on the following format

```yaml
---
id: {{instruction.id}}
name: {{instruction.name}}
description: {{instruction.description}}
keywords: [{{instruction.keywords}}]
tools: [execute, read, edit, search, web, agent, todo]
agent: AI-ley Orchestrator Agent
---
```
   - create or update a footer section for each instruction file based on the following format
```yaml
---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: {{instruction.qualityScore}}
---   
```


2. **Comprehensive Change Documentation**

   - Detailed change log in `.github/ai-ley/instructions/CHANGES.md` including:
     - File-by-file modification summaries
     - Before/after quality scores (1-5 scale)
     - Specific improvements made and rationale
     - Performance impact assessments
     - Recommended follow-up actions

3. **Master Index & Navigation**

Use the skill `.github/skills/ailey-admin-tools-index` to regenerate the indexs

4. **Quality Metrics & Analytics**

   - Scoring dashboard with aggregate quality metrics
   - Improvement trend analysis and optimization opportunities
   - Priority ranking for future enhancement cycles
   - Performance benchmarks and success indicators

5. **Integrity & Verification Systems**
   - MD5 checksums in `{{files.md5sums.instructions}}` for version control
   - File modification tracking and audit trails
   - Validation reports for template compliance
   - Integration testing results for AI agent compatibility

---

## Success Criteria:

- **Quality Baseline**: 80% of instructions achieve scores ≥ 4/5 in both categories
- **Template Compliance**: 100% of files include required YAML frontmatter and conform to established template standards
- **Functionality**: All code examples compile/execute successfully
- **Coverage Completeness**: 100% of discovered instruction files reviewed and enhanced. Zero empty or placeholder files remain
- **Integration**: All cross-references resolve correctly
- **Cross-Reference Integrity**: All internal links and dependencies verified and functional
- **AI Readiness**: Instructions optimized for AI parsing with consistent structure and clear directives

---

## Maintenance Schedule:

- **Monthly**: Quick scans for outdated content and broken references
- **Quarterly**: Comprehensive quality assessment and scoring updates
- **Annually**: Full template compliance review and structural optimization
- **As-needed**: Immediate updates for critical technology changes or framework updates

## Automation Opportunities

### Automated Tasks

- File inventory and basic statistics generation
- YAML frontmatter validation and standardization
- Broken link detection and reporting
- Basic markdown formatting compliance checks
- MD5 checksum generation

### Manual Review Required

- Content accuracy and technical validation
- Practical utility assessment
- AI optimization and clarity improvements
- Cross-reference relationship mapping

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.4
---