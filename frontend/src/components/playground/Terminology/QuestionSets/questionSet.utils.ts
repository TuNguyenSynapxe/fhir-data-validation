import type { QuestionSetFormState, QuestionSetValidationError, QuestionSetDto, CreateQuestionSetDto } from './questionSet.types';

export function questionSetToFormState(questionSet: QuestionSetDto): QuestionSetFormState {
  return {
    id: questionSet.id,
    name: questionSet.name,
    description: questionSet.description || '',
    terminologyUrl: questionSet.terminologyUrl,
    questions: questionSet.questions,
  };
}

export function formStateToCreateDto(formState: QuestionSetFormState, existingId?: string): CreateQuestionSetDto {
  return {
    id: existingId,
    name: formState.name,
    description: formState.description || undefined,
    terminologyUrl: formState.terminologyUrl,
    questions: formState.questions,
  };
}

export function validateQuestionSetForm(formState: QuestionSetFormState): QuestionSetValidationError[] {
  const errors: QuestionSetValidationError[] = [];

  if (!formState.id.trim()) {
    errors.push({ field: 'id', message: 'ID is required' });
  }

  if (!formState.name.trim()) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!formState.terminologyUrl.trim()) {
    errors.push({ field: 'terminologyUrl', message: 'Terminology is required' });
  }

  if (formState.questions.length === 0) {
    errors.push({ field: 'questions', message: 'At least one question is required' });
  }

  return errors;
}
