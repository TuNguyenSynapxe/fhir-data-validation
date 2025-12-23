import type { QuestionSetDto, CreateQuestionSetDto, QuestionSetQuestionRefDto } from '../../../../api/questionSetsApi';

export interface QuestionSetFormState {
  id: string;
  name: string;
  description: string;
  terminologyUrl: string;
  questions: QuestionSetQuestionRefDto[];
}

export interface QuestionSetValidationError {
  field: string;
  message: string;
}

export type { QuestionSetDto, CreateQuestionSetDto, QuestionSetQuestionRefDto };
