/**
 * QuestionAnswerRuleHelpers - Helper functions for Question & Answer rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - FHIRPath composition with relative paths
 * - Resource-specific defaults
 * - ErrorCode-first architecture (Phase 3)
 */

interface QuestionAnswerRuleData {
  resourceType: string;
  instanceScope: 'all' | 'first';
  iterationScope: string;
  questionPath: string;
  answerPath: string;
  questionSetId: string;
  severity: 'error' | 'warning' | 'information';
  errorCode: string;            // PHASE 3: errorCode is now primary
  userHint?: string;            // PHASE 3: optional short hint
  message?: string;             // DEPRECATED: backward compat only
}

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  errorCode: string;            // PHASE 3: errorCode is now primary
  userHint?: string;            // PHASE 3: optional short hint
  message?: string;             // DEPRECATED: backward compat only
  params?: Record<string, any>;
  origin?: string;
  enabled?: boolean;
  isMessageCustomized?: boolean;
  questionPath?: string;
  answerPath?: string;
}

/**
 * Build a complete Question & Answer rule from form data
 * 
 * CRITICAL CONTRACT (Phase 3):
 * - questionPath and answerPath MUST be in rule.params
 * - Backend no longer infers or guesses paths
 * - Missing params = validation skipped
 * - errorCode is now primary (PHASE 3)
 */
export function buildQuestionAnswerRule(data: QuestionAnswerRuleData): Rule {
  const {
    resourceType,
    instanceScope,
    iterationScope,
    questionPath,
    answerPath,
    questionSetId,
    severity,
    errorCode,
    userHint,
    message,
  } = data;

  // Compose FHIRPath: ResourceType[scope].iterationScope
  const scopedPath = composeScopedFhirPath(resourceType, instanceScope, iterationScope);

  return {
    id: `rule-${Date.now()}`,
    type: 'QuestionAnswer',
    resourceType,
    path: scopedPath,
    severity,
    errorCode,                    // PHASE 3: errorCode is primary
    userHint: userHint || undefined, // PHASE 3: optional short hint
    message: message || undefined,   // DEPRECATED: backward compat only
    // CRITICAL: questionPath and answerPath MUST be in params (backend contract)
    params: {
      questionSetId,
      questionPath,   // ← Backend reads from here (not top-level)
      answerPath,     // ← Backend reads from here (not top-level)
    },
    origin: 'manual',
    enabled: true,
    isMessageCustomized: false,      // No longer applicable with errorCode-first
  };
}

/**
 * Compose scoped FHIRPath for iteration
 * Example: Observation[*].component[*]
 */
export function composeScopedFhirPath(
  resourceType: string,
  instanceScope: 'all' | 'first',
  iterationScope: string
): string {
  const scope = instanceScope === 'all' ? '[*]' : '[0]';
  
  // Clean iteration scope (remove leading dots or slashes)
  const cleanScope = iterationScope.replace(/^[./]+/, '');
  
  return `${resourceType}${scope}.${cleanScope}`;
}

/**
 * Get default question path based on resource type
 */
export function getDefaultQuestionPath(resourceType: string): string {
  const defaults: Record<string, string> = {
    Observation: 'code.coding',
    QuestionnaireResponse: 'linkId',
    Condition: 'code.coding',
    Procedure: 'code.coding',
    MedicationStatement: 'medication.coding',
  };
  
  return defaults[resourceType] || 'code.coding';
}

/**
 * Get default answer path based on resource type
 */
export function getDefaultAnswerPath(resourceType: string): string {
  const defaults: Record<string, string> = {
    Observation: 'value[x]',
    QuestionnaireResponse: 'answer[0].value[x]',
    Condition: 'severity.coding',
    Procedure: 'outcome.coding',
    MedicationStatement: 'dosage[0].route.coding',
  };
  
  return defaults[resourceType] || 'value[x]';
}

/**
 * Get default iteration scope based on resource type
 */
export function getDefaultIterationScope(resourceType: string): string {
  const defaults: Record<string, string> = {
    Observation: 'component[*]',
    QuestionnaireResponse: 'item[*]',
    Condition: 'evidence[*]',
    Procedure: 'complication[*]',
  };
  
  return defaults[resourceType] || 'component[*]';
}

/**
 * Generate default error message for Question & Answer rule
 */
export function getDefaultErrorMessage(): string {
  return 'Answer for {question.code} is not allowed';
}

/**
 * Validate that a path is relative (no absolute paths allowed)
 */
export function validateRelativePath(path: string): string | null {
  if (!path) return null;
  
  // Check for absolute paths
  if (path.startsWith('/')) {
    return 'Path cannot start with /';
  }
  
  // Check for resource type prefix (common mistake)
  const resourcePrefixes = [
    'Patient.',
    'Observation.',
    'Condition.',
    'Procedure.',
    'Medication.',
    'Encounter.',
    'QuestionnaireResponse.',
  ];
  
  for (const prefix of resourcePrefixes) {
    if (path.startsWith(prefix)) {
      return `Path must be relative (remove "${prefix}")`;
    }
  }
  
  return null;
}

/**
 * Validate that paths align with iteration scope (Phase 3.x requirement)
 * Returns warning message if paths may not align with backend traversal
 */
export function validatePathAlignment(
  iterationScope: string,
  questionPath: string,
  answerPath: string
): string | null {
  if (!iterationScope || (!questionPath && !answerPath)) return null;
  
  // Extract iteration root (e.g., "component[*]" -> "component")
  const iterationRoot = iterationScope.replace(/\[[^\]]*\]/g, '').split('.')[0];
  
  // Check if paths incorrectly reference the iteration scope itself
  const questionStartsWithRoot = questionPath.startsWith(iterationRoot + '.');
  const answerStartsWithRoot = answerPath.startsWith(iterationRoot + '.');
  
  if (questionStartsWithRoot || answerStartsWithRoot) {
    return `Paths should be relative to ${iterationRoot}, not include it. Remove "${iterationRoot}." prefix.`;
  }
  
  return null;
}

/**
 * Auto-derive question path from resource type and iteration context
 */
export function deriveQuestionPath(resourceType: string, _iterationScope: string): string {
  // Default patterns based on resource type
  const defaults: Record<string, string> = {
    Observation: 'code.coding',
    QuestionnaireResponse: 'linkId',
    Condition: 'code.coding',
    Procedure: 'code.coding',
    MedicationStatement: 'medication.coding',
  };
  
  return defaults[resourceType] || 'code.coding';
}

/**
 * Auto-derive answer path from resource type and iteration context
 */
export function deriveAnswerPath(resourceType: string, _iterationScope: string): string {
  // Default patterns based on resource type
  const defaults: Record<string, string> = {
    Observation: 'value[x]',
    QuestionnaireResponse: 'answer[0].value[x]',
    Condition: 'severity.coding',
    Procedure: 'outcome.coding',
    MedicationStatement: 'dosage[0].route.coding',
  };
  
  return defaults[resourceType] || 'value[x]';
}

/**
 * Get list of common FHIR resource types that support Q&A patterns
 */
export const QA_RESOURCE_TYPES = [
  'Observation',
  'QuestionnaireResponse',
  'Condition',
  'Procedure',
  'MedicationStatement',
  'DiagnosticReport',
] as const;

/**
 * Get list of severity levels
 */
export const SEVERITY_LEVELS = [
  { value: 'error', label: 'Error', description: 'Validation must pass' },
  { value: 'warning', label: 'Warning', description: 'Should be fixed' },
  { value: 'information', label: 'Information', description: 'Advisory only' },
] as const;
