/**
 * Rule Message Template System
 * Provides tokenized message templates for FHIR validation rules
 * 
 * Tokens are resolved at runtime and never execute code
 */

export type RuleType = 
  | 'Required' 
  | 'FixedValue' 
  | 'AllowedValues' 
  | 'Regex' 
  | 'ArrayLength' 
  | 'CodeSystem' 
  | 'CustomFHIRPath'
  | string; // Allow other rule types

export interface Token {
  name: string;
  description: string;
  example: string;
}

export interface RuleContext {
  resourceType: string;
  path: string;
  ruleType: string;
  severity: string;
  params?: Record<string, any>;
  // Runtime context for preview
  actual?: any;
  result?: any;
}

/**
 * Global tokens available for all rule types
 */
export const GLOBAL_TOKENS: Token[] = [
  { name: 'resource', description: 'The FHIR resource type', example: 'Patient' },
  { name: 'path', description: 'The field path without resource', example: 'name.family' },
  { name: 'fullPath', description: 'The complete path with resource', example: 'Patient.name.family' },
  { name: 'ruleType', description: 'The type of validation rule', example: 'Required' },
  { name: 'severity', description: 'The severity level', example: 'error' },
];

/**
 * Rule-type-specific tokens
 */
export const RULE_TYPE_TOKENS: Record<string, Token[]> = {
  FixedValue: [
    { name: 'expected', description: 'The expected fixed value', example: '"active"' },
    { name: 'actual', description: 'The actual value found', example: '"inactive"' },
  ],
  AllowedValues: [
    { name: 'allowed', description: 'Comma-separated list of allowed values', example: '"male", "female", "other"' },
    { name: 'count', description: 'Number of allowed values', example: '3' },
    { name: 'actual', description: 'The actual value found', example: '"unknown"' },
  ],
  Regex: [
    { name: 'pattern', description: 'The regular expression pattern', example: '^[A-Z]{2}\\d{6}$' },
    { name: 'actual', description: 'The actual value that failed', example: 'ABC123' },
  ],
  ArrayLength: [
    { name: 'min', description: 'Minimum required items', example: '1' },
    { name: 'max', description: 'Maximum allowed items', example: '5' },
    { name: 'actual', description: 'Actual number of items', example: '0' },
  ],
  CodeSystem: [
    { name: 'system', description: 'The code system URL', example: 'http://loinc.org' },
    { name: 'code', description: 'The code value', example: '8867-4' },
    { name: 'display', description: 'The display name', example: 'Heart rate' },
  ],
  CustomFHIRPath: [
    { name: 'expression', description: 'The FHIRPath expression', example: 'name.exists()' },
    { name: 'result', description: 'The expression result', example: 'false' },
  ],
};

/**
 * Default message templates for each rule type
 */
export const DEFAULT_MESSAGE_TEMPLATES: Record<string, (context: RuleContext) => string> = {
  Required: () => '{fullPath} is required.',
  
  FixedValue: () => '{fullPath} must be exactly "{expected}".',
  
  AllowedValues: () => '{fullPath} must be one of the allowed values.',
  
  Regex: () => '{fullPath} does not match the required format.',
  
  ArrayLength: (context) => {
    const hasMin = context.params?.min !== undefined;
    const hasMax = context.params?.max !== undefined;
    
    if (hasMin && hasMax) {
      return '{fullPath} must contain between {min} and {max} items.';
    } else if (hasMin) {
      return '{fullPath} must contain at least {min} item(s).';
    } else if (hasMax) {
      return '{fullPath} must contain no more than {max} item(s).';
    }
    return '{fullPath} must have a valid number of items.';
  },
  
  CodeSystem: () => '{fullPath} must use a valid code from {system}.',
  
  CustomFHIRPath: () => '{fullPath} does not meet the required condition.',
};

/**
 * Get all available tokens for a specific rule type
 */
export function getAvailableTokens(ruleType: string): Token[] {
  const specificTokens = RULE_TYPE_TOKENS[ruleType] || [];
  return [...GLOBAL_TOKENS, ...specificTokens];
}

/**
 * Generate default message for a rule
 */
export function generateDefaultMessage(context: RuleContext): string {
  const generator = DEFAULT_MESSAGE_TEMPLATES[context.ruleType];
  if (generator) {
    return generator(context);
  }
  // Fallback for unknown rule types
  return '{fullPath} must meet the validation requirements.';
}

/**
 * Resolve tokens in a message template
 * Safe token resolution - never executes code
 */
export function resolveMessageTokens(template: string, context: RuleContext): string {
  let resolved = template;
  
  // Global tokens
  const fullPath = context.path ? `${context.resourceType}.${context.path}` : context.resourceType;
  resolved = resolved.replace(/\{resource\}/g, context.resourceType || '');
  resolved = resolved.replace(/\{path\}/g, context.path || '');
  resolved = resolved.replace(/\{fullPath\}/g, fullPath);
  resolved = resolved.replace(/\{ruleType\}/g, context.ruleType || '');
  resolved = resolved.replace(/\{severity\}/g, context.severity || '');
  
  // Rule-specific tokens
  const params = context.params || {};
  
  // FixedValue
  if (params.value !== undefined) {
    resolved = resolved.replace(/\{expected\}/g, String(params.value));
  }
  
  // AllowedValues
  if (params.values && Array.isArray(params.values)) {
    const allowed = params.values.map(v => `"${v}"`).join(', ');
    resolved = resolved.replace(/\{allowed\}/g, allowed);
    resolved = resolved.replace(/\{count\}/g, String(params.values.length));
  }
  if (params.codes && Array.isArray(params.codes)) {
    const allowed = params.codes.map((v: any) => `"${v}"`).join(', ');
    resolved = resolved.replace(/\{allowed\}/g, allowed);
    resolved = resolved.replace(/\{count\}/g, String(params.codes.length));
  }
  
  // Regex
  if (params.pattern) {
    resolved = resolved.replace(/\{pattern\}/g, String(params.pattern));
  }
  
  // ArrayLength
  if (params.min !== undefined) {
    resolved = resolved.replace(/\{min\}/g, String(params.min));
  }
  if (params.max !== undefined) {
    resolved = resolved.replace(/\{max\}/g, String(params.max));
  }
  
  // CodeSystem
  if (params.system) {
    const systemName = params.system.split('/').pop() || params.system;
    resolved = resolved.replace(/\{system\}/g, systemName);
  }
  if (params.code) {
    resolved = resolved.replace(/\{code\}/g, String(params.code));
  }
  if (params.display) {
    resolved = resolved.replace(/\{display\}/g, String(params.display));
  }
  
  // CustomFHIRPath
  if (params.expression) {
    resolved = resolved.replace(/\{expression\}/g, String(params.expression));
  }
  
  // Runtime context
  if (context.actual !== undefined) {
    const actualStr = typeof context.actual === 'string' ? context.actual : JSON.stringify(context.actual);
    resolved = resolved.replace(/\{actual\}/g, actualStr);
  }
  if (context.result !== undefined) {
    resolved = resolved.replace(/\{result\}/g, String(context.result));
  }
  
  // Remove any unresolved tokens (fail gracefully)
  resolved = resolved.replace(/\{[^}]+\}/g, '');
  
  return resolved;
}

/**
 * Check if a message should be auto-generated
 * Returns true if the message appears to be a default template or empty
 */
export function shouldAutoGenerateMessage(
  currentMessage: string,
  context: RuleContext
): boolean {
  if (!currentMessage || currentMessage.trim() === '') {
    return true;
  }
  
  // Check if it matches any default template
  const defaultTemplate = generateDefaultMessage(context);
  const resolvedDefault = resolveMessageTokens(defaultTemplate, context);
  
  // If current message matches resolved default, it's auto-generated
  if (currentMessage === resolvedDefault) {
    return true;
  }
  
  // If current message contains unresolved tokens, it's likely a template
  if (currentMessage.includes('{') && currentMessage.includes('}')) {
    return true;
  }
  
  return false;
}

/**
 * Format token for display in UI
 */
export function formatTokenDisplay(tokenName: string): string {
  return `{${tokenName}}`;
}
