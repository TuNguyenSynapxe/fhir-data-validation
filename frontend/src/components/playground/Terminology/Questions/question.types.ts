import type { QuestionDto, CreateQuestionDto } from '../../../../api/questionsApi';

export type QuestionAnswerType = 'Code' | 'Quantity' | 'Integer' | 'Decimal' | 'String' | 'Boolean';

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
  
  // Code-specific
  valueSetUrl?: string;
  bindingStrength?: 'required' | 'extensible' | 'preferred';
}

export interface QuestionValidationError {
  field: string;
  message: string;
}

export type { QuestionDto, CreateQuestionDto };
