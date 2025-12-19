import type { RuleIntent } from '../types/ruleIntent';

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate a single RuleIntent
 */
export function validateRuleIntent(intent: RuleIntent): ValidationResult {
  const errors: string[] = [];

  if (intent.type === 'ARRAY_LENGTH' && intent.params && 'min' in intent.params) {
    const { min, max, nonEmpty } = intent.params;

    // Must have at least one constraint
    if (min === undefined && max === undefined && !nonEmpty) {
      errors.push(`${intent.path}: At least one constraint (min, max, or nonEmpty) must be set`);
    }

    // Min must be non-negative
    if (min !== undefined && min < 0) {
      errors.push(`${intent.path}: Min must be >= 0`);
    }

    // Max must be non-negative
    if (max !== undefined && max < 0) {
      errors.push(`${intent.path}: Max must be >= 0`);
    }

    // Max must be >= Min
    if (min !== undefined && max !== undefined && max < min) {
      errors.push(`${intent.path}: Max must be >= Min`);
    }
  }

  if (intent.type === 'CODE_SYSTEM') {
    const { system } = (intent.params as any) || {};

    // System must be a non-empty string
    if (!system || typeof system !== 'string' || system.trim() === '') {
      errors.push(`${intent.path}: Code system URI must be specified`);
    }
  }

  if (intent.type === 'ALLOWED_CODES') {
    const { codes } = (intent.params as any) || {};

    // Must have at least one code
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      errors.push(`${intent.path}: At least one allowed code must be specified`);
    }

    // No empty codes
    if (Array.isArray(codes)) {
      const emptyCodes = codes.filter((code) => !code || typeof code !== 'string' || code.trim() === '');
      if (emptyCodes.length > 0) {
        errors.push(`${intent.path}: Allowed codes cannot be empty`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all pending intents
 */
export function validateAllIntents(intents: RuleIntent[]): ValidationResult {
  const allErrors: string[] = [];

  for (const intent of intents) {
    const result = validateRuleIntent(intent);
    if (!result.isValid) {
      allErrors.push(...result.errors);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
