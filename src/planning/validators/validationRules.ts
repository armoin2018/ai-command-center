/**
 * Validation Rules - Define validation constraints for planning entities.
 */

export interface ValidationRule<T = any> {
    field: string;
    validate: (value: T) => boolean;
    message: string;
}

export interface ValidationSchema {
    required: string[];
    rules: ValidationRule[];
}

// ========== COMMON VALIDATION FUNCTIONS ==========

export const isNotEmpty = (value: string): boolean => {
    return typeof value === 'string' && value.trim().length > 0;
};

export const isValidLength = (value: string, min: number, max: number): boolean => {
    return value.length >= min && value.length <= max;
};

export const isValidStoryPoints = (value: number): boolean => {
    const validPoints = [0, 1, 2, 3, 5, 8, 13, 21];
    return validPoints.includes(value);
};

export const isValidDate = (value: Date): boolean => {
    return value instanceof Date && !isNaN(value.getTime());
};

export const isValidUrl = (value: string): boolean => {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

export const isValidId = (value: string, prefix: string): boolean => {
    // Sanitize prefix to prevent ReDoS — only allow alphanumeric + hyphen
    const safePrefix = prefix.replace(/[^a-zA-Z0-9-]/g, '');
    const pattern = new RegExp(`^${safePrefix}-\\d{3}$`);
    return pattern.test(value);
};

export const isValidSlug = (value: string): boolean => {
    const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return pattern.test(value);
};

export const isValidEmail = (value: string): boolean => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value);
};

export const isValidStatus = <T extends string>(value: T, allowedStatuses: readonly T[]): boolean => {
    return allowedStatuses.includes(value);
};

export const isValidPriority = (value: string): boolean => {
    return ['high', 'medium', 'low'].includes(value);
};

// ========== EPIC VALIDATION SCHEMA ==========

export const epicValidationSchema: ValidationSchema = {
    required: ['id', 'name', 'description', 'status', 'priority', 'createdAt', 'updatedAt'],
    rules: [
        {
            field: 'id',
            validate: (value: string) => isValidId(value, 'epic'),
            message: 'Epic ID must be in format epic-XXX (e.g., epic-001)'
        },
        {
            field: 'name',
            validate: (value: string) => isNotEmpty(value) && isValidLength(value, 3, 100),
            message: 'Epic name must be 3-100 characters'
        },
        {
            field: 'description',
            validate: (value: string) => isNotEmpty(value) && isValidLength(value, 10, 5000),
            message: 'Epic description must be 10-5000 characters'
        },
        {
            field: 'status',
            validate: (value: string) => isValidStatus(value, ['todo', 'in-progress', 'done', 'pending'] as const),
            message: 'Epic status must be: not-started, in-progress, completed, or blocked'
        },
        {
            field: 'priority',
            validate: (value: string) => isValidPriority(value),
            message: 'Epic priority must be: high, medium, or low'
        },
        {
            field: 'createdAt',
            validate: (value: Date) => isValidDate(value),
            message: 'Epic createdAt must be a valid date'
        },
        {
            field: 'updatedAt',
            validate: (value: Date) => isValidDate(value),
            message: 'Epic updatedAt must be a valid date'
        }
    ]
};

// ========== STORY VALIDATION SCHEMA ==========

export const storyValidationSchema: ValidationSchema = {
    required: ['id', 'epicId', 'name', 'description', 'status', 'storyPoints', 'priority', 'createdAt', 'updatedAt'],
    rules: [
        {
            field: 'id',
            validate: (value: string) => isValidId(value, 'story'),
            message: 'Story ID must be in format story-XXX (e.g., story-001)'
        },
        {
            field: 'epicId',
            validate: (value: string) => isValidId(value, 'epic'),
            message: 'Epic ID must be in format epic-XXX'
        },
        {
            field: 'name',
            validate: (value: string) => isNotEmpty(value) && isValidLength(value, 3, 100),
            message: 'Story name must be 3-100 characters'
        },
        {
            field: 'description',
            validate: (value: string) => isNotEmpty(value) && isValidLength(value, 10, 3000),
            message: 'Story description must be 10-3000 characters'
        },
        {
            field: 'status',
            validate: (value: string) => isValidStatus(value, ['todo', 'in-progress', 'done', 'pending'] as const),
            message: 'Story status must be: not-started, in-progress, completed, or blocked'
        },
        {
            field: 'storyPoints',
            validate: (value: number) => isValidStoryPoints(value),
            message: 'Story points must be: 0, 1, 2, 3, 5, 8, 13, or 21'
        },
        {
            field: 'priority',
            validate: (value: string) => isValidPriority(value),
            message: 'Story priority must be: high, medium, or low'
        },
        {
            field: 'createdAt',
            validate: (value: Date) => isValidDate(value),
            message: 'Story createdAt must be a valid date'
        },
        {
            field: 'updatedAt',
            validate: (value: Date) => isValidDate(value),
            message: 'Story updatedAt must be a valid date'
        }
    ]
};

// ========== TASK VALIDATION SCHEMA ==========

export const taskValidationSchema: ValidationSchema = {
    required: ['id', 'storyId', 'name', 'description', 'status', 'storyPoints', 'priority', 'createdAt', 'updatedAt'],
    rules: [
        {
            field: 'id',
            validate: (value: string) => isValidId(value, 'task'),
            message: 'Task ID must be in format task-XXX (e.g., task-001)'
        },
        {
            field: 'storyId',
            validate: (value: string) => isValidId(value, 'story'),
            message: 'Story ID must be in format story-XXX'
        },
        {
            field: 'name',
            validate: (value: string) => isNotEmpty(value) && isValidLength(value, 3, 100),
            message: 'Task name must be 3-100 characters'
        },
        {
            field: 'description',
            validate: (value: string) => isNotEmpty(value) && isValidLength(value, 10, 2000),
            message: 'Task description must be 10-2000 characters'
        },
        {
            field: 'status',
            validate: (value: string) => isValidStatus(value, ['todo', 'in-progress', 'done', 'pending'] as const),
            message: 'Task status must be: not-started, in-progress, completed, or blocked'
        },
        {
            field: 'storyPoints',
            validate: (value: number) => isValidStoryPoints(value),
            message: 'Task story points must be: 0, 1, 2, 3, 5, 8, 13, or 21'
        },
        {
            field: 'priority',
            validate: (value: string) => isValidPriority(value),
            message: 'Task priority must be: high, medium, or low'
        },
        {
            field: 'assignee',
            validate: (value: string | undefined) => {
                if (value === undefined) return true;
                return isNotEmpty(value) && isValidLength(value, 2, 50);
            },
            message: 'Task assignee must be 2-50 characters if provided'
        },
        {
            field: 'createdAt',
            validate: (value: Date) => isValidDate(value),
            message: 'Task createdAt must be a valid date'
        },
        {
            field: 'updatedAt',
            validate: (value: Date) => isValidDate(value),
            message: 'Task updatedAt must be a valid date'
        }
    ]
};
