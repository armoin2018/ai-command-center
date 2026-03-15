/**
 * Action Framework Types
 * AICC-0214: ActionHandler interface and registry types
 */

export interface ActionContext {
  workspaceRoot: string;
  extensionPath: string;
  planPath: string;
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ActionHandler {
  /** Unique action identifier (e.g., 'plan.create', 'plan.updateStatus') */
  readonly id: string;

  /** Human-readable description */
  readonly description: string;

  /** Execute the action with given parameters */
  execute(params: Record<string, any>, context: ActionContext): Promise<ActionResult>;

  /** Validate parameters before execution */
  validate?(params: Record<string, any>): { valid: boolean; errors: string[] };

  /** Describe the action's parameters for documentation/UI */
  describe(): ActionParameterDescriptor[];
}

export interface ActionParameterDescriptor {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
}
