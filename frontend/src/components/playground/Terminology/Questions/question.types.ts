import type { QuestionDto, CreateQuestionDto } from '../../../../api/questionsApi';

export type QuestionAnswerType = 'Code' | 'Quantity' | 'Integer' | 'Decimal' | 'String' | 'Boolean';

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
