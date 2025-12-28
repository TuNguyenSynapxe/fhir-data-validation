/**
 * QuestionAnswerConstraint - Constraint-driven authoring model
 * 
 * Authors define CONSTRAINTS (what must be true)
 * The system determines SCENARIOS (how it failed)
 * 
 * This replaces errorCode selection at design time.
 */

export type QuestionAnswerConstraint =
  | 'REQUIRED'
  | 'TYPE'
  | 'RANGE'
  | 'VALUESET'
  | 'CARDINALITY';

/**
 * Constraint to runtime errorCode mapping
 * The backend emits these errorCodes automatically based on validation results
 */
export const CONSTRAINT_TO_ERROR_CODE: Record<QuestionAnswerConstraint, string> = {
  REQUIRED: 'ANSWER_REQUIRED',
  TYPE: 'INVALID_ANSWER_TYPE',
  RANGE: 'ANSWER_OUT_OF_RANGE',
  VALUESET: 'ANSWER_NOT_IN_VALUESET',
  CARDINALITY: 'ANSWER_MULTIPLE_NOT_ALLOWED',
};

/**
 * Backward compatibility: infer constraint from legacy errorCode
 */
export const ERROR_CODE_TO_CONSTRAINT: Record<string, QuestionAnswerConstraint> = {
  ANSWER_REQUIRED: 'REQUIRED',
  INVALID_ANSWER_TYPE: 'TYPE',
  ANSWER_OUT_OF_RANGE: 'RANGE',
  ANSWER_NOT_IN_VALUESET: 'VALUESET',
  ANSWER_MULTIPLE_NOT_ALLOWED: 'CARDINALITY',
};

/**
 * Constraint metadata for UI
 */
export interface ConstraintMetadata {
  value: QuestionAnswerConstraint;
  label: string;
  description: string;
  requiresParams: boolean;
  paramFields?: string[];
}

export const CONSTRAINT_METADATA: ConstraintMetadata[] = [
  {
    value: 'REQUIRED',
    label: 'Required',
    description: 'Answer must be provided',
    requiresParams: false,
  },
  {
    value: 'TYPE',
    label: 'Type',
    description: 'Answer must be of the expected type',
    requiresParams: true,
    paramFields: ['expectedType'],
  },
  {
    value: 'RANGE',
    label: 'Range',
    description: 'Numeric answer must be within allowed range',
    requiresParams: true,
    paramFields: ['min', 'max'],
  },
  {
    value: 'VALUESET',
    label: 'ValueSet',
    description: 'Answer must be from allowed values',
    requiresParams: true,
    paramFields: ['valueSetUrl'],
  },
  {
    value: 'CARDINALITY',
    label: 'Cardinality',
    description: 'Only one answer allowed',
    requiresParams: true,
    paramFields: ['maxAnswers'],
  },
];
