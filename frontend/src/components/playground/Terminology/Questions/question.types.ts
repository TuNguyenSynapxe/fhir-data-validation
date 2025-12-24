import type { QuestionDto, CreateQuestionDto } from '../../../../api/questionsApi';

export type QuestionAnswerType = 'Code' | 'Quantity' | 'Integer' | 'Decimal' | 'String' | 'String (Enumerated)' | 'Boolean';

export type TerminologyMode = 'inline' | 'valueset';

export interface InlineAllowedValue {
  code: string;
  display: string;
  system?: string;
}

export interface QuestionFormData {
  code: string;
  display: string;
  system: string;
  answerType: QuestionAnswerType;
  description: string;
  
  // Quantity-specific
  unitCode?: string;
  unitDisplay?: string;
  
  // Numeric constraints
  min?: number;
  max?: number;
  precision?: number;
  
  // String constraints
  maxLength?: number;
  regex?: string;
  
  // String (Enumerated) - PSS-specific pattern
  enumeratedValues?: string[]; // Array of allowed string values (NOT codes)
  
  // Code-specific - terminology configuration
  terminologyMode?: TerminologyMode; // 'inline' or 'valueset'
  allowedValues?: InlineAllowedValue[]; // For inline mode
  valueSetUrl?: string; // For valueset mode
  bindingStrength?: 'required' | 'extensible' | 'preferred'; // For valueset mode only
}

export interface QuestionValidationError {
  field: string;
  message: string;
}

export type { QuestionDto, CreateQuestionDto };
