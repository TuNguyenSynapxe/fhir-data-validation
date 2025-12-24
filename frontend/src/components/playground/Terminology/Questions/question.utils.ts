import type { QuestionFormData, QuestionValidationError, QuestionAnswerType } from './question.types';
import type { QuestionDto, CreateQuestionDto } from '../../../../api/questionsApi';

export const ANSWER_TYPES: QuestionAnswerType[] = [
  'Code',
  'Quantity',
  'Integer',
  'Decimal',
  'String',
  'String (Enumerated)',
  'Boolean',
];

export const COMMON_UCUM_UNITS = [
  { code: 'kg', display: 'kilograms' },
  { code: 'g', display: 'grams' },
  { code: 'mg', display: 'milligrams' },
  { code: 'cm', display: 'centimeters' },
  { code: 'm', display: 'meters' },
  { code: 'mm[Hg]', display: 'millimeters of mercury' },
  { code: 'Cel', display: 'degrees Celsius' },
  { code: '%', display: 'percent' },
  { code: 'min', display: 'minutes' },
  { code: 'h', display: 'hours' },
  { code: 'd', display: 'days' },
  { code: 'a', display: 'years' },
];

export function questionToFormData(question: QuestionDto): QuestionFormData {
  return {
    code: question.code.code,
    display: question.code.display || '',
    system: question.code.system,
    answerType: question.answerType as QuestionAnswerType,
    description: question.metadata.description || '',
    unitCode: question.unit?.code,
    unitDisplay: question.unit?.display,
    min: question.constraints?.min,
    max: question.constraints?.max,
    precision: question.constraints?.precision,
    maxLength: question.constraints?.maxLength,
    regex: question.constraints?.regex,
    valueSetUrl: question.valueSet?.url,
    bindingStrength: question.valueSet?.bindingStrength as 'required' | 'extensible' | 'preferred',
    // Determine mode based on presence of valueSet
    terminologyMode: question.valueSet?.url ? 'valueset' : undefined,
    allowedValues: undefined, // Backend doesn't store inline values yet
    enumeratedValues: undefined, // Backend doesn't store enumerated values yet (UI-only)
  };
}

export function formDataToCreateDto(formData: QuestionFormData, existingId?: string): CreateQuestionDto {
  const dto: CreateQuestionDto = {
    id: existingId,
    code: {
      system: formData.system || 'http://example.org/questions',
      code: formData.code,
      display: formData.display,
    },
    answerType: formData.answerType,
    text: formData.display,
    description: formData.description || undefined,
  };

  // Add type-specific fields
  if (formData.answerType === 'Quantity' && formData.unitCode) {
    dto.unit = {
      system: 'http://unitsofmeasure.org',
      code: formData.unitCode,
      display: formData.unitDisplay || formData.unitCode,
    };
  }

  if (formData.answerType === 'Code') {
    // Only send valueSet if using valueset mode
    const mode = formData.terminologyMode || 'valueset';
    if (mode === 'valueset' && formData.valueSetUrl) {
      dto.valueSet = {
        url: formData.valueSetUrl,
        bindingStrength: formData.bindingStrength || 'required',
      };
    }
    // Note: inline allowed values are not sent to backend (UI-only feature)
  }

  // Add constraints
  const hasConstraints =
    formData.min !== undefined ||
    formData.max !== undefined ||
    formData.precision !== undefined ||
    formData.maxLength !== undefined ||
    formData.regex;

  if (hasConstraints) {
    dto.constraints = {};
    if (formData.min !== undefined) dto.constraints.min = formData.min;
    if (formData.max !== undefined) dto.constraints.max = formData.max;
    if (formData.precision !== undefined) dto.constraints.precision = formData.precision;
    if (formData.maxLength !== undefined) dto.constraints.maxLength = formData.maxLength;
    if (formData.regex) dto.constraints.regex = formData.regex;
  }

  return dto;
}

export function validateQuestionForm(formData: QuestionFormData): QuestionValidationError[] {
  const errors: QuestionValidationError[] = [];

  // Common validations
  if (!formData.code.trim()) {
    errors.push({ field: 'code', message: 'Code is required' });
  }

  if (!formData.display.trim()) {
    errors.push({ field: 'display', message: 'Display is required' });
  }

  if (!formData.system.trim()) {
    errors.push({ field: 'system', message: 'System is required' });
  }

  if (!formData.answerType) {
    errors.push({ field: 'answerType', message: 'Answer type is required' });
  }

  // Type-specific validations
  switch (formData.answerType) {
    case 'Quantity':
      if (!formData.unitCode) {
        errors.push({ field: 'unitCode', message: 'Unit is required for Quantity questions' });
      }
      validateNumericConstraints(formData, errors, true);
      break;

    case 'Integer':
      validateNumericConstraints(formData, errors, false);
      if (formData.min !== undefined && !Number.isInteger(formData.min)) {
        errors.push({ field: 'min', message: 'Min must be a whole number for Integer questions' });
      }
      if (formData.max !== undefined && !Number.isInteger(formData.max)) {
        errors.push({ field: 'max', message: 'Max must be a whole number for Integer questions' });
      }
      break;

    case 'Decimal':
      validateNumericConstraints(formData, errors, true);
      break;

    case 'Code':
      const mode = formData.terminologyMode || 'valueset';
      if (mode === 'valueset') {
        if (!formData.valueSetUrl?.trim()) {
          errors.push({ field: 'valueSetUrl', message: 'Value Set is required for external ValueSet mode' });
        }
      } else if (mode === 'inline') {
        if (!formData.allowedValues || formData.allowedValues.length === 0) {
          errors.push({ field: 'allowedValues', message: 'At least one allowed value is required' });
        } else {
          // Validate each allowed value
          formData.allowedValues.forEach((value, index) => {
            if (!value.code.trim()) {
              errors.push({ field: `allowedValues[${index}].code`, message: `Code is required for value ${index + 1}` });
            }
            if (!value.display.trim()) {
              errors.push({ field: `allowedValues[${index}].display`, message: `Display is required for value ${index + 1}` });
            }
          });
        }
      }
      break;

    case 'String':
      if (formData.maxLength !== undefined && formData.maxLength <= 0) {
        errors.push({ field: 'maxLength', message: 'Max length must be positive' });
      }
      if (formData.regex) {
        try {
          new RegExp(formData.regex);
        } catch {
          errors.push({ field: 'regex', message: 'Invalid regular expression' });
        }
      }
      break;

    case 'String (Enumerated)':
      if (!formData.enumeratedValues || formData.enumeratedValues.length === 0) {
        errors.push({ field: 'enumeratedValues', message: 'At least one allowed value is required' });
      } else {
        // Check for empty values
        formData.enumeratedValues.forEach((value, index) => {
          if (!value.trim()) {
            errors.push({ field: `enumeratedValues[${index}]`, message: `Value ${index + 1} cannot be empty` });
          }
        });
        
        // Check for duplicates (case-sensitive)
        const duplicates = formData.enumeratedValues.filter((value, index, self) => 
          self.indexOf(value) !== index
        );
        if (duplicates.length > 0) {
          errors.push({ field: 'enumeratedValues', message: `Duplicate values found: ${duplicates.join(', ')}` });
        }
      }
      break;
  }

  return errors;
}

function validateNumericConstraints(
  formData: QuestionFormData,
  errors: QuestionValidationError[],
  allowPrecision: boolean
): void {
  if (formData.min !== undefined && formData.max !== undefined && formData.min > formData.max) {
    errors.push({ field: 'max', message: 'Max must be greater than or equal to Min' });
  }

  if (!allowPrecision && formData.precision !== undefined) {
    errors.push({ field: 'precision', message: 'Precision not allowed for this answer type' });
  }

  if (formData.precision !== undefined && formData.precision < 0) {
    errors.push({ field: 'precision', message: 'Precision must be non-negative' });
  }
}

export function getAnswerTypeDescription(answerType: QuestionAnswerType): string {
  switch (answerType) {
    case 'Code':
      return 'Coded value from a terminology';
    case 'Quantity':
      return 'Numeric value with a unit';
    case 'Integer':
      return 'Whole number';
    case 'Decimal':
      return 'Decimal number';
    case 'String':
      return 'Free text';
    case 'String (Enumerated)':
      return 'Fixed list of text values';
    case 'Boolean':
      return 'Yes/No answer';
    default:
      return '';
  }
}

export function testRegexPattern(pattern: string, testValue: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(testValue);
  } catch {
    return false;
  }
}
