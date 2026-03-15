/**
 * Actions Framework — barrel export
 * AICC-0077: Unified Actions Framework
 */

export { ActionRegistry } from './actionRegistry';
export { initBuiltinActions } from './builtinActions';
export type {
  ActionContext,
  ActionHandler,
  ActionParameterDescriptor,
  ActionResult
} from './types';
