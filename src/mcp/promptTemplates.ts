/**
 * MCP Prompt Templates
 * 
 * Predefined prompts for common planning workflows
 */

export interface PromptTemplate {
    name: string;
    description: string;
    arguments?: {
        name: string;
        description: string;
        required: boolean;
    }[];
    template: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        name: 'create_epic_flow',
        description: 'Guide user through creating a complete epic with stories and tasks',
        template: `I'll help you create a comprehensive epic. Let's break this down:

1. First, tell me about your epic:
   - What's the high-level goal?
   - What business value will it deliver?
   - What's the priority? (low/medium/high/critical)

2. Then we'll identify the user stories that make up this epic:
   - What user journeys need to be completed?
   - What are the acceptance criteria?
   - How many story points for each?

3. Finally, we'll break down each story into concrete tasks:
   - What implementation steps are needed?
   - What are the dependencies?
   - Estimated hours per task?

I'll use the available tools to create all items in the planning system.`,
    },
    {
        name: 'breakdown_story',
        description: 'Help break down a story into actionable tasks',
        arguments: [
            {
                name: 'epicId',
                description: 'The parent epic ID',
                required: true,
            },
            {
                name: 'storyName',
                description: 'The story to break down',
                required: true,
            },
        ],
        template: `Let's break down the story "{{storyName}}" into actionable tasks.

Consider these aspects:
1. **Setup & Preparation**: What infrastructure or setup is needed?
2. **Core Implementation**: What are the main coding tasks?
3. **Testing**: What tests need to be written?
4. **Documentation**: What docs need updating?
5. **Review & Polish**: Code review, refactoring, optimization?

I'll create tasks with estimated hours for each. What's your approach for this story?`,
    },
    {
        name: 'estimate_tasks',
        description: 'Help estimate story points and task hours',
        arguments: [
            {
                name: 'epicId',
                description: 'The epic ID to review',
                required: true,
            },
        ],
        template: `Let's estimate the work for epic {{epicId}}.

I'll review all stories and tasks, then help you:
1. Assign story points using Fibonacci scale (1, 2, 3, 5, 8, 13, 21)
2. Estimate task hours based on complexity
3. Identify dependencies and blockers
4. Calculate total effort and timeline

For each story, consider:
- Technical complexity
- Uncertainty/unknowns
- Dependencies on other work
- Testing requirements

Ready to start estimating?`,
    },
    {
        name: 'sprint_planning',
        description: 'Help plan a sprint by selecting stories',
        arguments: [
            {
                name: 'sprintCapacity',
                description: 'Available story points for the sprint',
                required: true,
            },
        ],
        template: `Let's plan a sprint with {{sprintCapacity}} story points capacity.

I'll help you:
1. Review all available stories (not completed)
2. Prioritize based on business value and dependencies
3. Select stories that fit within capacity
4. Identify potential risks or blockers
5. Create a sprint commitment

What are your priorities for this sprint?`,
    },
    {
        name: 'progress_report',
        description: 'Generate a progress report for all epics',
        template: `I'll generate a comprehensive progress report covering:

1. **Overall Status**:
   - Total epics, stories, tasks
   - Completion percentages
   - Story points burned vs. remaining

2. **Per-Epic Breakdown**:
   - Status and priority
   - Stories completed/in-progress/todo
   - Blockers or risks

3. **Timeline Analysis**:
   - On track vs. behind schedule
   - Estimated completion dates
   - Velocity trends

4. **Recommendations**:
   - What to prioritize next
   - Resource allocation suggestions
   - Risk mitigation strategies

Generating report now...`,
    },
    {
        name: 'dependency_analysis',
        description: 'Analyze dependencies between epics, stories, and tasks',
        template: `I'll analyze dependencies across your planning structure:

1. **Epic Dependencies**:
   - Which epics block others?
   - What's the critical path?

2. **Story Dependencies**:
   - Cross-epic dependencies
   - Sequential vs. parallel work

3. **Task Dependencies**:
   - Within-story ordering
   - Resource constraints

4. **Recommendations**:
   - Optimal execution order
   - Parallel work opportunities
   - Dependency risks

Let me examine your planning tree...`,
    },
    {
        name: 'refactor_epic',
        description: 'Help reorganize an epic by moving or splitting stories',
        arguments: [
            {
                name: 'epicId',
                description: 'The epic to refactor',
                required: true,
            },
        ],
        template: `Let's refactor epic {{epicId}} to better organize the work.

Options:
1. **Split Epic**: Break into smaller, more focused epics
2. **Merge Stories**: Combine related stories
3. **Reorder Stories**: Adjust priority and dependencies
4. **Move Stories**: Transfer to different epic
5. **Add Missing Stories**: Identify gaps in coverage

What reorganization are you considering?`,
    },
    {
        name: 'risk_assessment',
        description: 'Identify and assess risks across the planning structure',
        template: `I'll perform a risk assessment on your planning structure:

1. **Technical Risks**:
   - Complex/uncertain stories
   - New technology dependencies
   - Integration challenges

2. **Schedule Risks**:
   - Blocked items
   - Under-estimated work
   - Critical path items

3. **Resource Risks**:
   - Skill gaps
   - Capacity constraints
   - Single points of failure

4. **Mitigation Strategies**:
   - Spike tasks for research
   - Parallel work streams
   - Skill development plans

Analyzing risks now...`,
    },
];

/**
 * Get a prompt template by name
 */
export function getPromptTemplate(name: string): PromptTemplate | undefined {
    return PROMPT_TEMPLATES.find(t => t.name === name);
}

/**
 * Render a prompt template with arguments
 */
export function renderPrompt(template: PromptTemplate, args: Record<string, string> = {}): string {
    let rendered = template.template;
    
    // Replace template variables
    for (const [key, value] of Object.entries(args)) {
        rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    return rendered;
}
