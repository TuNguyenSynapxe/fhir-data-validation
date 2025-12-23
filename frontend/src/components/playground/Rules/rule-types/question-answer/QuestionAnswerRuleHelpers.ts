/**
 * QuestionAnswerRuleHelpers - Helper functions for Question & Answer rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - FHIRPath composition with relative paths
 * - Resource-specific defaults
 */

interface QuestionAnswerRuleData {
  resourceType: string;
  instanceScope: 'all' | 'first';
  iterationScope: string;
  questionPath: string;
  answerPath: string;
  questionSetId: string;
  severity: 'error' | 'warning' | 'information';
  message?: string;
}

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  origin?: string;
  enabled?: boolean;
  isMessageCustomized?: boolean;
  questionPath?: string;
  answerPath?: string;
}

/**
 * Build a complete Question & Answer rule from form data
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
    message,
  } = data;

  // Compose FHIRPath: ResourceType[scope].iterationScope
  const scopedPath = composeScopedFhirPath(resourceType, instanceScope, iterationScope);

  return {
    id: `rule-${Date.now()}`,
    type: 'QuestionAnswer',
    resourceType,
    path: scopedPath,
    questionPath,
    answerPath,
    severity,
    message: message || getDefaultErrorMessage(),
    params: {
      questionSetId,
    },
    origin: 'manual',
    enabled: true,
    isMessageCustomized: !!message,
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
