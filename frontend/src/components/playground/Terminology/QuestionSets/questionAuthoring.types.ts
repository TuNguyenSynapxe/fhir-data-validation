/**
 * Question Authoring Types
 * Single Progressive Screen - Types and Interfaces
 */

import type { CodingDto } from '../../../../api/questionsApi';

/**
 * Answer types for questions
 */
export type AnswerType =
  | 'String'
  | 'Integer'
  | 'Decimal'
  | 'Boolean'
  | 'Date'
  | 'DateTime'
  | 'Time'
  | 'EnumeratedString'
  | 'Coded';

/**
 * Answer modes define how the answer value is configured
 */
export type AnswerMode =
  | 'enumerated-string' // Enumerated String - inline editable list (value required, label optional)
  | 'coded-manual' // Coded (manual) - show code + display, system optional
  | 'external-valueset' // External ValueSet - URL + binding strength
  | 'numeric' // Numeric - min/max constraints
  | 'string' // String - maxLength, regex
  | 'boolean' // Boolean - no configuration
  | 'date-time'; // Date/DateTime/Time - no configuration

/**
 * Answer option for enumerated strings
 * DEPRECATED: Use enumConfig instead
 */
export interface AnswerOption {
  value: string; // Required
  label?: string; // Optional
}

/**
 * Enum configuration for enumerated strings
 */
export interface EnumConfig {
  allowedValues: string[]; // REQUIRED: List of valid string values
  allowMultiple: boolean; // REQUIRED: Whether multiple values are allowed
  multipleValueSeparator?: ',' | '|' | ';'; // REQUIRED only if allowMultiple=true
}

/**
 * Coded answer configuration
 */
export interface CodedAnswerConfig {
  code: string;
  display: string;
  system?: string; // Optional for manual
}

/**
 * External ValueSet binding configuration
 */
export interface ExternalValueSetConfig {
  url: string;
  bindingStrength: 'Required' | 'Extensible' | 'Preferred' | 'Example';
}

/**
 * Numeric constraints
 */
export interface NumericConstraints {
  min?: number;
  max?: number;
  precision?: number; // For decimals
}

/**
 * String constraints
 */
export interface StringConstraints {
  maxLength?: number;
  regex?: string;
}

/**
 * Rule configuration (for future use)
 */
export interface QuestionRule {
  severity: 'Required' | 'Warning' | 'Advisory';
  message: string;
}

/**
 * A staged question before being committed to the backend
 */
export interface StagedQuestion {
  // Unique staging ID (not the backend ID)
  stagingId: string;

  // Question text (required)
  text: string;

  // Answer type (required)
  answerType: AnswerType;

  // Answer mode determines configuration UI
  answerMode: AnswerMode;

  // Coding information (for terminology-sourced questions)
  code?: CodingDto;

  // Answer configuration based on mode
  answerOptions?: AnswerOption[]; // DEPRECATED: For enumerated-string (backward compatibility)
  enumConfig?: EnumConfig; // For enumerated-string (new format)
  codedAnswer?: CodedAnswerConfig; // For coded-manual
  valueSetBinding?: ExternalValueSetConfig; // For external-valueset
  numericConstraints?: NumericConstraints; // For numeric
  stringConstraints?: StringConstraints; // For string

  // Rules (future)
  rules?: QuestionRule[];

  // Description (optional)
  description?: string;

  // Source information
  sourceType: 'terminology' | 'manual' | 'import';
  sourceId?: string; // ID from terminology if applicable

  // Lock state (from backend)
  isLocked?: boolean; // True if question is referenced by validation rules/mappings

  // UI state (not persisted)
  isNewlyAdded?: boolean; // Temporary flag for highlight animation
}

/**
 * Question Set metadata
 */
export interface QuestionSetMetadata {
  id?: string; // Only present after save
  name: string;
  description?: string;
}

/**
 * Form state for the entire authoring screen
 */
export interface QuestionAuthoringState {
  // Section A: Question Set Info
  questionSet: QuestionSetMetadata;
  isQuestionSetSaved: boolean;

  // Section B: Source selection
  activeTab: 'terminology' | 'manual' | 'import';

  // Section C: Staged questions
  stagedQuestions: StagedQuestion[];
}

/**
 * Validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}
