# Contributing to AI Command Center

Thank you for your interest in contributing to AI Command Center! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Issues

Before creating an issue, please check if it already exists:

1. Search existing issues in the [issue tracker](https://github.com/your-org/ai-command-center/issues)
2. If your issue is unique, create a new one with:
   - Clear, descriptive title
   - Detailed description of the problem
   - Steps to reproduce (if applicable)
   - Expected vs actual behavior
   - Environment details (OS, VS Code version, extension version)
   - Relevant logs or error messages

### Suggesting Features

Feature requests are welcome! When suggesting a feature:

1. Explain the problem it solves
2. Provide use cases
3. Consider backwards compatibility
4. Be open to discussion and iteration

### Pull Requests

We actively welcome pull requests!

#### Before You Start

1. **Check for existing work**: Look for related issues or PRs
2. **Discuss major changes**: Open an issue first for significant changes
3. **Follow the project structure**: Maintain consistency with existing code

#### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/ai-command-center.git
cd ai-command-center

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ... code ...

# Run tests
npm test

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

#### Coding Standards

**TypeScript**
- Use TypeScript strict mode
- Provide type annotations for all public APIs
- Avoid `any` unless absolutely necessary
- Use interfaces for data structures
- Use enums for fixed sets of values

**Code Style**
- Follow existing code formatting
- Use ESLint rules (automatically enforced)
- Maximum line length: 120 characters
- Use meaningful variable names
- Add comments for complex logic

**Documentation**
- Add JSDoc comments for all public methods
- Include `@param`, `@returns`, `@throws` annotations
- Provide usage examples for complex APIs
- Update README.md if adding features

**Testing**
- Write unit tests for new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

#### PR Guidelines

1. **One feature per PR**: Keep PRs focused and atomic
2. **Clear title**: Use conventional commit format (see below)
3. **Description**: Explain what, why, and how
4. **Link issues**: Reference related issues with `#123`
5. **Tests**: Include tests for new functionality
6. **Documentation**: Update docs as needed
7. **Clean history**: Squash commits if needed

#### Conventional Commits

Use conventional commit messages:

```
feat: add user authentication system
fix: resolve memory leak in tree builder
docs: update configuration guide
refactor: simplify epic manager logic
test: add validation tests
chore: update dependencies
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code restructuring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Development Workflow

#### 1. Set Up Environment

```bash
# Install Node.js 18+ and VS Code 1.85.0+
# Install dependencies
npm install

# Configure VS Code settings
code .
```

#### 2. Make Changes

```typescript
// Add new feature
// src/features/myFeature.ts

/**
 * My new feature description.
 * 
 * @param input - Input parameter
 * @returns Output value
 */
export function myFeature(input: string): string {
    // Implementation
    return processInput(input);
}
```

#### 3. Add Tests

```typescript
// test/features/myFeature.test.ts

import { myFeature } from '../../src/features/myFeature';

describe('myFeature', () => {
    it('should process input correctly', () => {
        const result = myFeature('test');
        expect(result).toBe('processed-test');
    });

    it('should handle edge cases', () => {
        expect(() => myFeature('')).toThrow();
    });
});
```

#### 4. Update Documentation

```markdown
## My Feature

Usage:

\`\`\`typescript
import { myFeature } from './features/myFeature';

const result = myFeature('input');
console.log(result); // 'processed-input'
\`\`\`
```

#### 5. Run Quality Checks

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Run tests
npm test

# Check coverage
npm run test:coverage

# Compile TypeScript
npm run compile
```

#### 6. Submit PR

```bash
# Commit changes
git add .
git commit -m "feat: add my feature"

# Push to fork
git push origin feature/my-feature

# Open PR on GitHub
# Fill out PR template
# Request review
```

## Project Structure

```
ai-command-center/
├── src/                        # Source code
│   ├── extension.ts            # Entry point
│   ├── logger.ts               # Logging system
│   ├── errorHandler.ts         # Error handling
│   ├── configManager.ts        # Configuration
│   ├── config/                 # Configuration modules
│   ├── planning/               # Planning system
│   ├── api/                    # External API clients
│   ├── panels/                 # WebView panels
│   └── types/                  # TypeScript types
├── test/                       # Test files
├── docs/                       # Documentation
├── media/                      # WebView assets
├── package.json                # Extension manifest
├── tsconfig.json               # TypeScript config
└── README.md                   # Main documentation
```

## Architecture Guidelines

### Manager Pattern

Use managers for coordinating related functionality:

```typescript
export class FeatureManager {
    private logger: Logger;
    private config: ConfigManager;

    constructor(logger: Logger) {
        this.logger = logger;
        this.config = ConfigManager.getInstance();
    }

    public async performOperation(): Promise<void> {
        try {
            this.logger.info('Starting operation');
            // Implementation
        } catch (error) {
            await ErrorHandler.handleError(error, 'FeatureManager.performOperation');
            throw error;
        }
    }
}
```

### Singleton Pattern

Use singletons for shared state:

```typescript
export class SharedService {
    private static instance: SharedService;

    private constructor() {
        // Private constructor
    }

    public static getInstance(): SharedService {
        if (!SharedService.instance) {
            SharedService.instance = new SharedService();
        }
        return SharedService.instance;
    }
}
```

### Error Handling

Always use the ErrorHandler:

```typescript
try {
    await riskyOperation();
} catch (error) {
    await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        'ComponentName.methodName'
    );
    throw error;
}
```

### Logging

Use structured logging:

```typescript
this.logger.info('Operation completed', {
    component: 'MyComponent',
    duration: Date.now() - startTime,
    itemCount: items.length
});
```

## Testing Guidelines

### Unit Tests

Test individual functions and methods:

```typescript
describe('ConfigValidator', () => {
    let validator: ConfigValidator;

    beforeEach(() => {
        validator = new ConfigValidator();
    });

    it('should validate valid configuration', () => {
        const config = { /* valid config */ };
        const result = validator.validate(config);
        expect(result.isValid).toBe(true);
    });
});
```

### Integration Tests

Test component interactions:

```typescript
describe('PlanningManager Integration', () => {
    it('should create epic with stories and tasks', async () => {
        const manager = new PlanningManager(workspaceRoot, logger);
        const epic = await manager.createEpic({ /* ... */ });
        const story = await manager.createStory(epic.id, { /* ... */ });
        const task = await manager.createTask(epic.id, story.id, { /* ... */ });
        
        expect(task.storyId).toBe(story.id);
    });
});
```

### Test Coverage

Aim for:
- 80%+ overall coverage
- 90%+ for critical paths
- 100% for public APIs

## Performance Guidelines

### Optimization Tips

1. **Async Operations**: Use `Promise.all()` for parallel operations
2. **Caching**: Cache expensive computations
3. **Debouncing**: Debounce frequent operations
4. **Lazy Loading**: Load resources on demand

### Performance Targets

- Extension activation: ≤ 500ms (P95)
- Configuration load: ≤ 100ms (P95)
- Tree building: ≤ 500ms for 100 epics (P95)
- File operations: Atomic writes with fsync

## Release Process

Releases are handled by maintainers:

1. Version bump (semantic versioning)
2. Update CHANGELOG.md
3. Create release tag
4. Publish to marketplace
5. Create GitHub release

## Getting Help

- 📖 [Documentation](docs/)
- 💬 [Discussions](https://github.com/your-org/ai-command-center/discussions)
- 🐛 [Issues](https://github.com/your-org/ai-command-center/issues)
- 📧 Email: support@ai-command-center.dev

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to AI Command Center! 🎉
