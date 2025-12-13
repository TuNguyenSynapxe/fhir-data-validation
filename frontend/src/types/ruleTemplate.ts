/**
 * Rule Template & Suggestion Engine Types
 * 
 * Phase 1: Deterministic rule suggestions (NO AI)
 * 
 * CONSTRAINTS:
 * - No AI/ML
 * - No auto-creation
 * - No bundle mutation
 * - No persistence
 * - Deterministic logic only
 */

/**
 * Rule input parameter definition
 */
export interface RuleInput {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'fhirpath' | 'code';
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  description?: string;
}

/**
 * Rule template definition
 */
export interface RuleTemplate {
  id: string;
  name: string;
  category: 'validation' | 'business' | 'reference' | 'cardinality';
  description: string;
  inputs: RuleInput[];
  
  /**
   * Generate rule configuration from inputs
   */
  generateRule: (inputs: Record<string, any>) => {
    fhirPath: string;
    operator: string;
    value?: any;
    message?: string;
  };
}

/**
 * Confidence level for rule suggestions
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Rule suggestion with reasoning
 */
export interface RuleSuggestion {
  id: string; // Unique suggestion ID
  templateId: string; // Which template to use
  templateName: string; // Human-readable template name
  confidence: ConfidenceLevel;
  reason: string; // Explanation of why this is suggested
  
  // Pre-filled inputs for the template
  suggestedInputs: Record<string, any>;
  
  // Preview of the generated rule
  preview: {
    fhirPath: string;
    operator: string;
    value?: any;
    message?: string;
  };
  
  // Context from analysis
  context: {
    resourceType?: string;
    fieldPath?: string;
    sampleValue?: any;
    occurrences?: number;
  };
}

/**
 * Context for rule suggestion engine
 */
export interface RuleSuggestionContext {
  resourceType: string;
  projectBundle?: any;
  selectedSample?: any;
  existingRules?: any[]; // Avoid duplicate suggestions
}

/**
 * Rule Template Catalog
 * 
 * Phase 1: 5 basic templates
 * - Required
 * - FixedValue
 * - CodeSystem
 * - ArrayLength
 * - ReferenceExists
 */
export const RULE_TEMPLATES: Record<string, RuleTemplate> = {
  // 1. Required Field Template
  required: {
    id: 'required',
    name: 'Required Field',
    category: 'validation',
    description: 'Ensure a field is present and not empty',
    inputs: [
      {
        name: 'fieldPath',
        label: 'Field Path',
        type: 'fhirpath',
        required: true,
        placeholder: 'e.g., identifier, name.family',
        description: 'FHIRPath to the field that must be present',
      },
      {
        name: 'message',
        label: 'Error Message',
        type: 'string',
        required: false,
        placeholder: 'Field is required',
        description: 'Custom error message',
      },
    ],
    generateRule: (inputs) => ({
      fhirPath: inputs.fieldPath,
      operator: 'exists',
      message: inputs.message || `${inputs.fieldPath} is required`,
    }),
  },

  // 2. Fixed Value Template
  fixedValue: {
    id: 'fixedValue',
    name: 'Fixed Value',
    category: 'validation',
    description: 'Ensure a field has a specific value',
    inputs: [
      {
        name: 'fieldPath',
        label: 'Field Path',
        type: 'fhirpath',
        required: true,
        placeholder: 'e.g., status, active',
      },
      {
        name: 'expectedValue',
        label: 'Expected Value',
        type: 'string',
        required: true,
        placeholder: 'e.g., active, final',
      },
      {
        name: 'message',
        label: 'Error Message',
        type: 'string',
        required: false,
      },
    ],
    generateRule: (inputs) => ({
      fhirPath: inputs.fieldPath,
      operator: 'equals',
      value: inputs.expectedValue,
      message: inputs.message || `${inputs.fieldPath} must be '${inputs.expectedValue}'`,
    }),
  },

  // 3. CodeSystem Validation Template
  codeSystem: {
    id: 'codeSystem',
    name: 'Code System Validation',
    category: 'validation',
    description: 'Validate coded values against a code system',
    inputs: [
      {
        name: 'fieldPath',
        label: 'Field Path',
        type: 'fhirpath',
        required: true,
        placeholder: 'e.g., code.coding.system',
      },
      {
        name: 'codeSystemUrl',
        label: 'Code System URL',
        type: 'string',
        required: true,
        placeholder: 'e.g., http://loinc.org',
      },
      {
        name: 'message',
        label: 'Error Message',
        type: 'string',
        required: false,
      },
    ],
    generateRule: (inputs) => ({
      fhirPath: inputs.fieldPath,
      operator: 'equals',
      value: inputs.codeSystemUrl,
      message: inputs.message || `${inputs.fieldPath} must use code system ${inputs.codeSystemUrl}`,
    }),
  },

  // 4. Array Length Template
  arrayLength: {
    id: 'arrayLength',
    name: 'Array Length Constraint',
    category: 'cardinality',
    description: 'Ensure an array has a minimum or maximum number of elements',
    inputs: [
      {
        name: 'fieldPath',
        label: 'Array Field Path',
        type: 'fhirpath',
        required: true,
        placeholder: 'e.g., identifier, name',
      },
      {
        name: 'constraint',
        label: 'Constraint Type',
        type: 'string',
        required: true,
        defaultValue: 'min',
        placeholder: 'min or max',
      },
      {
        name: 'count',
        label: 'Count',
        type: 'number',
        required: true,
        defaultValue: 1,
        placeholder: 'e.g., 1, 5',
      },
      {
        name: 'message',
        label: 'Error Message',
        type: 'string',
        required: false,
      },
    ],
    generateRule: (inputs) => ({
      fhirPath: `${inputs.fieldPath}.count()`,
      operator: inputs.constraint === 'min' ? 'greaterThanOrEqual' : 'lessThanOrEqual',
      value: inputs.count,
      message: inputs.message || 
        `${inputs.fieldPath} must have ${inputs.constraint === 'min' ? 'at least' : 'at most'} ${inputs.count} element(s)`,
    }),
  },

  // 5. Reference Exists Template
  referenceExists: {
    id: 'referenceExists',
    name: 'Reference Exists',
    category: 'reference',
    description: 'Ensure a reference points to a valid resource',
    inputs: [
      {
        name: 'fieldPath',
        label: 'Reference Field Path',
        type: 'fhirpath',
        required: true,
        placeholder: 'e.g., subject.reference, performer.reference',
      },
      {
        name: 'targetResourceType',
        label: 'Target Resource Type',
        type: 'string',
        required: false,
        placeholder: 'e.g., Patient, Practitioner',
        description: 'Optional: specify expected resource type',
      },
      {
        name: 'message',
        label: 'Error Message',
        type: 'string',
        required: false,
      },
    ],
    generateRule: (inputs) => ({
      fhirPath: inputs.fieldPath,
      operator: 'exists',
      message: inputs.message || 
        `${inputs.fieldPath} must reference a valid ${inputs.targetResourceType || 'resource'}`,
    }),
  },
};

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  const categories = new Set<string>();
  Object.values(RULE_TEMPLATES).forEach(template => {
    categories.add(template.category);
  });
  return Array.from(categories);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): RuleTemplate[] {
  return Object.values(RULE_TEMPLATES).filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): RuleTemplate | undefined {
  return RULE_TEMPLATES[id];
}
