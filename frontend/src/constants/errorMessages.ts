/**
 * ERROR MESSAGE MAPPING
 * 
 * Centralized error message rendering for validation errors.
 * Backend returns errorCode + structured data, frontend renders messages.
 * 
 * Architecture:
 * - Backend: Zero prose, only errorCode + structured fields
 * - Frontend: Owns all user-facing messages
 * - Benefits: Consistent messages, easy localization, themeable, testable
 */

export interface ValidationIssue {
  errorCode: string;
  userHint?: string;
  severity: string;
  source: string;
  resourceType?: string;
  path?: string;
  details?: Record<string, any>;
  navigation?: {
    jsonPointer?: string;
    breadcrumb?: string;
    resourceIndex?: number;
  };
}

export interface ErrorMessageDefinition {
  title: string;
  summary: string;
  details?: (issue: ValidationIssue) => string[];
  remediation?: (issue: ValidationIssue) => string;
}

// ============================================================================
// REQUIRED / PRESENCE
// ============================================================================

export const RequiredErrorMessages: Record<string, ErrorMessageDefinition> = {
  FIELD_REQUIRED: {
    title: 'Required Field Missing',
    summary: 'A required field is missing or empty.',
    details: (issue) => issue.path ? [`Field: ${issue.path}`] : [],
    remediation: () => 'Provide a value for the required field'
  },

  ARRAY_REQUIRED: {
    title: 'Required Array Missing',
    summary: 'A required array is missing or empty.',
    details: (issue) => issue.path ? [`Field: ${issue.path}`] : [],
    remediation: () => 'Provide at least one element in the array'
  },

  MIN_OCCURS_NOT_MET: {
    title: 'Minimum Occurrences Not Met',
    summary: 'The element appears fewer times than required.',
    details: (issue) => {
      const min = issue.details?.expected?.minOccurs;
      const actual = issue.details?.actual?.count;
      return [
        min !== undefined ? `Minimum required: ${min}` : '',
        actual !== undefined ? `Actual count: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const min = issue.details?.expected?.minOccurs;
      return min ? `Provide at least ${min} occurrence(s)` : 'Add more occurrences';
    }
  }
};

// ============================================================================
// FIXED / EQUALITY
// ============================================================================

export const FixedValueErrorMessages: Record<string, ErrorMessageDefinition> = {
  VALUE_NOT_EQUAL: {
    title: 'Value Mismatch',
    summary: 'The value does not match the expected fixed value.',
    details: (issue) => {
      const expected = issue.details?.expected?.value;
      const actual = issue.details?.actual?.value;
      return [
        expected !== undefined ? `Expected: ${JSON.stringify(expected)}` : '',
        actual !== undefined ? `Actual: ${JSON.stringify(actual)}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.value;
      return expected !== undefined ? `Set value to ${JSON.stringify(expected)}` : 'Correct the value';
    }
  },

  SYSTEM_NOT_EQUAL: {
    title: 'System Mismatch',
    summary: 'The code system does not match the expected value.',
    details: (issue) => {
      const expected = issue.details?.expected?.system;
      const actual = issue.details?.actual?.system;
      return [
        expected ? `Expected system: ${expected}` : '',
        actual ? `Actual system: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.system;
      return expected ? `Use system: ${expected}` : 'Correct the code system';
    }
  },

  CODE_NOT_EQUAL: {
    title: 'Code Mismatch',
    summary: 'The code does not match the expected value.',
    details: (issue) => {
      const expected = issue.details?.expected?.code;
      const actual = issue.details?.actual?.code;
      return [
        expected ? `Expected code: ${expected}` : '',
        actual ? `Actual code: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.code;
      return expected ? `Use code: ${expected}` : 'Correct the code value';
    }
  }
};

// ============================================================================
// PATTERN / REGEX
// ============================================================================

export const PatternErrorMessages: Record<string, ErrorMessageDefinition> = {
  PATTERN_MISMATCH: {
    title: 'Pattern Mismatch',
    summary: 'The value does not match the required pattern.',
    details: (issue) => {
      const pattern = issue.details?.expected?.pattern;
      const value = issue.details?.actual?.value;
      return [
        pattern ? `Required pattern: ${pattern}` : '',
        value ? `Actual value: ${value}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Provide a value matching the required pattern'
  },

  FORMAT_INVALID: {
    title: 'Invalid Format',
    summary: 'The value format is invalid.',
    details: (issue) => {
      const format = issue.details?.expected?.format;
      const value = issue.details?.actual?.value;
      return [
        format ? `Expected format: ${format}` : '',
        value ? `Actual value: ${value}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const format = issue.details?.expected?.format;
      return format ? `Format the value as: ${format}` : 'Correct the value format';
    }
  }
};

// ============================================================================
// RANGE / NUMERIC
// ============================================================================

export const RangeErrorMessages: Record<string, ErrorMessageDefinition> = {
  VALUE_OUT_OF_RANGE: {
    title: 'Value Out of Range',
    summary: 'The numeric value is outside the allowed range.',
    details: (issue) => {
      const min = issue.details?.expected?.min;
      const max = issue.details?.expected?.max;
      const value = issue.details?.actual?.value;
      return [
        min !== undefined ? `Minimum: ${min}` : '',
        max !== undefined ? `Maximum: ${max}` : '',
        value !== undefined ? `Actual: ${value}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const min = issue.details?.expected?.min;
      const max = issue.details?.expected?.max;
      if (min !== undefined && max !== undefined) {
        return `Provide a value between ${min} and ${max}`;
      } else if (min !== undefined) {
        return `Provide a value ≥ ${min}`;
      } else if (max !== undefined) {
        return `Provide a value ≤ ${max}`;
      }
      return 'Provide a value within the allowed range';
    }
  },

  VALUE_BELOW_MIN: {
    title: 'Value Below Minimum',
    summary: 'The value is below the minimum threshold.',
    details: (issue) => {
      const min = issue.details?.expected?.min;
      const value = issue.details?.actual?.value;
      return [
        min !== undefined ? `Minimum: ${min}` : '',
        value !== undefined ? `Actual: ${value}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const min = issue.details?.expected?.min;
      return min !== undefined ? `Provide a value ≥ ${min}` : 'Increase the value';
    }
  },

  VALUE_ABOVE_MAX: {
    title: 'Value Above Maximum',
    summary: 'The value is above the maximum threshold.',
    details: (issue) => {
      const max = issue.details?.expected?.max;
      const value = issue.details?.actual?.value;
      return [
        max !== undefined ? `Maximum: ${max}` : '',
        value !== undefined ? `Actual: ${value}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const max = issue.details?.expected?.max;
      return max !== undefined ? `Provide a value ≤ ${max}` : 'Decrease the value';
    }
  }
};

// ============================================================================
// ALLOWED VALUES / ENUM
// ============================================================================

export const AllowedValuesErrorMessages: Record<string, ErrorMessageDefinition> = {
  VALUE_NOT_ALLOWED: {
    title: 'Value Not Allowed',
    summary: 'The value is not in the list of allowed values.',
    details: (issue) => {
      // Canonical schema: { actual, allowed, valueType }
      const actual = issue.details?.actual;
      const allowed = issue.details?.allowed;
      return [
        actual !== undefined ? `Actual: ${JSON.stringify(actual)}` : '',
        allowed ? `Allowed: ${JSON.stringify(allowed)}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Select a value from the allowed list'
  },

  CODE_NOT_ALLOWED: {
    title: 'Code Not Allowed',
    summary: 'The code is not in the list of allowed codes.',
    details: (issue) => {
      const allowed = issue.details?.expected?.allowedCodes;
      const code = issue.details?.actual?.code;
      return [
        allowed ? `Allowed codes: ${JSON.stringify(allowed)}` : '',
        code ? `Actual code: ${code}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Select a code from the allowed list'
  }
};

// ============================================================================
// TERMINOLOGY / VALUESET
// ============================================================================

export const TerminologyErrorMessages: Record<string, ErrorMessageDefinition> = {
  CODE_NOT_IN_VALUESET: {
    title: 'Code Not in ValueSet',
    summary: 'The code is not found in the specified ValueSet.',
    details: (issue) => {
      const valueSet = issue.details?.expected?.valueSetUrl;
      const code = issue.details?.actual?.code;
      const system = issue.details?.actual?.system;
      return [
        valueSet ? `ValueSet: ${valueSet}` : '',
        system ? `System: ${system}` : '',
        code ? `Code: ${code}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Select a code from the specified ValueSet'
  },

  SYSTEM_NOT_ALLOWED: {
    title: 'System Not Allowed',
    summary: 'The code system is not allowed for this binding.',
    details: (issue) => {
      const allowed = issue.details?.expected?.allowedSystems;
      const actual = issue.details?.actual?.system;
      return [
        allowed ? `Allowed: ${JSON.stringify(allowed)}` : '',
        actual ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Use a code from an allowed system'
  },

  DISPLAY_MISMATCH: {
    title: 'Display Text Mismatch',
    summary: 'The display text does not match the code definition.',
    details: (issue) => {
      const expected = issue.details?.expected?.display;
      const actual = issue.details?.actual?.display;
      return [
        expected ? `Expected: ${expected}` : '',
        actual ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.display;
      return expected ? `Use display: "${expected}"` : 'Correct the display text';
    }
  },

  TERMINOLOGY_LOOKUP_FAILED: {
    title: 'Terminology Lookup Failed',
    summary: 'The terminology service lookup failed.',
    details: (issue) => {
      const error = issue.details?.error;
      return error ? [`Error: ${error}`] : [];
    },
    remediation: () => 'Verify the terminology service is accessible and try again'
  }
};

// ============================================================================
// REFERENCE
// ============================================================================

export const ReferenceErrorMessages: Record<string, ErrorMessageDefinition> = {
  REFERENCE_REQUIRED: {
    title: 'Required Reference Missing',
    summary: 'A required reference is missing.',
    details: (issue) => issue.path ? [`Field: ${issue.path}`] : [],
    remediation: () => 'Provide a reference to the required resource'
  },

  REFERENCE_INVALID: {
    title: 'Invalid Reference',
    summary: 'The reference format or structure is invalid.',
    details: (issue) => {
      const ref = issue.details?.actual?.reference;
      return ref ? [`Reference: ${ref}`] : [];
    },
    remediation: () => 'Provide a valid FHIR reference (e.g., "Patient/123")'
  },

  REFERENCE_TARGET_TYPE_MISMATCH: {
    title: 'Reference Type Mismatch',
    summary: 'The referenced resource type does not match the expected type.',
    details: (issue) => {
      const expected = issue.details?.expected?.targetTypes;
      const actual = issue.details?.actual?.targetType;
      return [
        expected ? `Expected: ${JSON.stringify(expected)}` : '',
        actual ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.targetTypes;
      return expected ? `Reference a resource of type: ${JSON.stringify(expected)}` : 'Correct the reference type';
    }
  },

  REFERENCE_NOT_FOUND: {
    title: 'Referenced Resource Not Found',
    summary: 'The referenced resource is not found in the bundle.',
    details: (issue) => {
      const ref = issue.details?.actual?.reference;
      return ref ? [`Reference: ${ref}`] : [];
    },
    remediation: () => 'Ensure the referenced resource exists in the bundle'
  },

  REFERENCE_MULTIPLE_NOT_ALLOWED: {
    title: 'Multiple References Not Allowed',
    summary: 'Multiple references found when only one is allowed.',
    details: (issue) => {
      const count = issue.details?.actual?.count;
      return count ? [`Found: ${count} references`] : [];
    },
    remediation: () => 'Provide only one reference'
  }
};

// ============================================================================
// ARRAY / CARDINALITY
// ============================================================================

export const ArrayErrorMessages: Record<string, ErrorMessageDefinition> = {
  ARRAY_TOO_SHORT: {
    title: 'Array Too Short',
    summary: 'The array has fewer elements than required.',
    details: (issue) => {
      const min = issue.details?.expected?.minLength;
      const actual = issue.details?.actual?.length;
      return [
        min !== undefined ? `Minimum: ${min}` : '',
        actual !== undefined ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const min = issue.details?.expected?.minLength;
      return min !== undefined ? `Provide at least ${min} element(s)` : 'Add more elements';
    }
  },

  ARRAY_TOO_LONG: {
    title: 'Array Too Long',
    summary: 'The array has more elements than allowed.',
    details: (issue) => {
      const max = issue.details?.expected?.maxLength;
      const actual = issue.details?.actual?.length;
      return [
        max !== undefined ? `Maximum: ${max}` : '',
        actual !== undefined ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const max = issue.details?.expected?.maxLength;
      return max !== undefined ? `Provide at most ${max} element(s)` : 'Remove extra elements';
    }
  },

  ARRAY_LENGTH_INVALID: {
    title: 'Invalid Array Length',
    summary: 'The array length is invalid.',
    details: (issue) => {
      const expected = issue.details?.expected?.length;
      const actual = issue.details?.actual?.length;
      return [
        expected !== undefined ? `Expected: ${expected}` : '',
        actual !== undefined ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.length;
      return expected !== undefined ? `Provide exactly ${expected} element(s)` : 'Correct the array length';
    }
  },

  ARRAY_DUPLICATES_NOT_ALLOWED: {
    title: 'Duplicate Values Not Allowed',
    summary: 'The array contains duplicate values when uniqueness is required.',
    details: (issue) => {
      const duplicates = issue.details?.actual?.duplicates;
      return duplicates ? [`Duplicates: ${JSON.stringify(duplicates)}`] : [];
    },
    remediation: () => 'Remove duplicate values from the array'
  }
};

// ============================================================================
// CHOICE / value[x]
// ============================================================================

export const ChoiceTypeErrorMessages: Record<string, ErrorMessageDefinition> = {
  CHOICE_TYPE_INVALID: {
    title: 'Invalid Choice Type',
    summary: 'The choice type is not valid for this element.',
    details: (issue) => {
      const allowed = issue.details?.expected?.allowedTypes;
      const actual = issue.details?.actual?.type;
      return [
        allowed ? `Allowed: ${JSON.stringify(allowed)}` : '',
        actual ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const allowed = issue.details?.expected?.allowedTypes;
      return allowed ? `Use one of: ${JSON.stringify(allowed)}` : 'Use a valid choice type';
    }
  },

  VALUE_TYPE_MISMATCH: {
    title: 'Value Type Mismatch',
    summary: 'The value type does not match the expected type.',
    details: (issue) => {
      const expected = issue.details?.expected?.type;
      const actual = issue.details?.actual?.type;
      return [
        expected ? `Expected: ${expected}` : '',
        actual ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.type;
      return expected ? `Provide a value of type: ${expected}` : 'Correct the value type';
    }
  },

  UNSUPPORTED_VALUE_TYPE: {
    title: 'Unsupported Value Type',
    summary: 'The value type is not supported.',
    details: (issue) => {
      const type = issue.details?.actual?.type;
      return type ? [`Type: ${type}`] : [];
    },
    remediation: () => 'Use a supported FHIR value type'
  }
};

// ============================================================================
// FHIRPATH / EXPRESSION
// ============================================================================

export const FhirPathErrorMessages: Record<string, ErrorMessageDefinition> = {
  FHIRPATH_EXPRESSION_FAILED: {
    title: 'FHIRPath Expression Failed',
    summary: 'The FHIRPath expression evaluation failed.',
    details: (issue) => {
      const expression = issue.details?.expected?.expression;
      const error = issue.details?.error;
      return [
        expression ? `Expression: ${expression}` : '',
        error ? `Error: ${error}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Verify the FHIRPath expression is correct and the data structure is valid'
  },

  FHIRPATH_EVALUATION_ERROR: {
    title: 'FHIRPath Evaluation Error',
    summary: 'An error occurred while evaluating the FHIRPath expression.',
    details: (issue) => {
      const expression = issue.details?.expected?.expression;
      const error = issue.details?.error;
      return [
        expression ? `Expression: ${expression}` : '',
        error ? `Error: ${error}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Check the FHIRPath syntax and data structure'
  },

  FHIRPATH_RETURN_TYPE_INVALID: {
    title: 'Invalid FHIRPath Return Type',
    summary: 'The FHIRPath expression returned an unexpected type.',
    details: (issue) => {
      const expected = issue.details?.expected?.returnType;
      const actual = issue.details?.actual?.returnType;
      return [
        expected ? `Expected: ${expected}` : '',
        actual ? `Actual: ${actual}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const expected = issue.details?.expected?.returnType;
      return expected ? `Expression must return: ${expected}` : 'Correct the expression return type';
    }
  }
};

// ============================================================================
// STRUCTURAL / BUNDLE
// ============================================================================

export const StructuralErrorMessages: Record<string, ErrorMessageDefinition> = {
  RESOURCE_MISSING: {
    title: 'Required Resource Missing',
    summary: 'A required resource is missing from the bundle.',
    details: (issue) => {
      const resourceType = issue.resourceType;
      return resourceType ? [`Resource type: ${resourceType}`] : [];
    },
    remediation: (issue) => {
      const resourceType = issue.resourceType;
      return resourceType ? `Add a ${resourceType} resource to the bundle` : 'Add the required resource';
    }
  },

  RESOURCE_MULTIPLE_NOT_ALLOWED: {
    title: 'Multiple Resources Not Allowed',
    summary: 'Multiple resources found when only one is allowed.',
    details: (issue) => {
      const count = issue.details?.actual?.count;
      const resourceType = issue.resourceType;
      return [
        resourceType ? `Resource type: ${resourceType}` : '',
        count !== undefined ? `Found: ${count}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Keep only one resource of this type'
  },

  BUNDLE_ENTRY_INVALID: {
    title: 'Invalid Bundle Entry',
    summary: 'The bundle entry structure is invalid.',
    details: (issue) => {
      const index = issue.details?.actual?.entryIndex;
      return index !== undefined ? [`Entry index: ${index}`] : [];
    },
    remediation: () => 'Ensure the bundle entry follows the FHIR Bundle specification'
  },

  ENTRY_REFERENCE_MISMATCH: {
    title: 'Entry Reference Mismatch',
    summary: 'The entry reference does not match the bundle structure.',
    details: (issue) => {
      const ref = issue.details?.actual?.reference;
      return ref ? [`Reference: ${ref}`] : [];
    },
    remediation: () => 'Verify that references match the fullUrl values in the bundle'
  }
};

// ============================================================================
// QUESTION / ANSWER
// ============================================================================

export const QuestionAnswerErrorMessages: Record<string, ErrorMessageDefinition> = {
  INVALID_ANSWER_VALUE: {
    title: 'Invalid Answer Value',
    summary: 'The answer value does not match the expected type or format.',
    details: (issue) => {
      const expected = issue.details?.expected;
      const actual = issue.details?.actual;
      const details: string[] = [];
      
      if (expected?.answerType) {
        details.push(`Expected type: ${expected.answerType}`);
      }
      if (actual?.answerType) {
        details.push(`Actual type: ${actual.answerType}`);
      }
      if (actual?.value !== undefined) {
        details.push(`Actual value: ${JSON.stringify(actual.value)}`);
      }
      
      return details;
    },
    remediation: (issue) => {
      const expected = issue.details?.expected;
      return `Update the answer to match the expected type: ${expected?.answerType || 'see question definition'}`;
    }
  },

  ANSWER_OUT_OF_RANGE: {
    title: 'Answer Out of Range',
    summary: 'The numeric answer value is outside the allowed range.',
    details: (issue) => {
      const expected = issue.details?.expected;
      const actual = issue.details?.actual;
      const constraints = expected?.constraints;
      const details: string[] = [];
      
      if (constraints?.min !== undefined) {
        details.push(`Minimum: ${constraints.min}`);
      }
      if (constraints?.max !== undefined) {
        details.push(`Maximum: ${constraints.max}`);
      }
      if (actual?.value !== undefined) {
        details.push(`Actual value: ${actual.value}`);
      }
      
      return details;
    },
    remediation: (issue) => {
      const constraints = issue.details?.expected?.constraints;
      const min = constraints?.min;
      const max = constraints?.max;
      
      if (min !== undefined && max !== undefined) {
        return `Provide a value between ${min} and ${max}`;
      } else if (min !== undefined) {
        return `Provide a value greater than or equal to ${min}`;
      } else if (max !== undefined) {
        return `Provide a value less than or equal to ${max}`;
      }
      return 'Provide a value within the allowed range';
    }
  },

  ANSWER_NOT_IN_VALUESET: {
    title: 'Answer Not in ValueSet',
    summary: 'The coded answer is not found in the allowed ValueSet.',
    details: (issue) => {
      const expected = issue.details?.expected;
      const actual = issue.details?.actual;
      const details: string[] = [];
      
      if (expected?.constraints?.valueSetUrl) {
        details.push(`ValueSet: ${expected.constraints.valueSetUrl}`);
      }
      if (actual?.value?.code) {
        details.push(`Code: ${actual.value.code}`);
      }
      if (actual?.value?.system) {
        details.push(`System: ${actual.value.system}`);
      }
      
      return details;
    },
    remediation: () => 'Select a code from the allowed ValueSet'
  },

  ANSWER_REQUIRED: {
    title: 'Required Answer Missing',
    summary: 'A required answer is missing or empty.',
    details: (issue) => {
      const expected = issue.details?.expected;
      const question = issue.details?.question;
      const details: string[] = [];
      
      if (question?.display) {
        details.push(`Question: ${question.display}`);
      }
      if (expected?.answerType) {
        details.push(`Expected answer type: ${expected.answerType}`);
      }
      
      return details;
    },
    remediation: () => 'Provide the required answer'
  },

  ANSWER_MULTIPLE_NOT_ALLOWED: {
    title: 'Multiple Answers Not Allowed',
    summary: 'Multiple answers provided but only one is allowed.',
    details: (issue) => {
      const actual = issue.details?.actual;
      return actual?.count !== undefined ? [`Found ${actual.count} answers`] : [];
    },
    remediation: () => 'Remove extra answers, keep only one'
  },

  QUESTION_NOT_FOUND: {
    title: 'Question Not Found',
    summary: 'The question identity could not be resolved in the QuestionSet.',
    details: (issue) => {
      const question = issue.details?.question;
      const details: string[] = [];
      
      if (question?.code) {
        details.push(`Code: ${question.code}`);
      }
      if (question?.system) {
        details.push(`System: ${question.system}`);
      }
      
      return details;
    },
    remediation: () => 'Verify the question exists in the QuestionSet or update the question code'
  },

  QUESTIONSET_DATA_MISSING: {
    title: 'QuestionSet Data Missing',
    summary: 'QuestionSet data could not be loaded.',
    details: (issue) => {
      const questionSetId = issue.details?.questionSetId;
      return questionSetId ? [`QuestionSet ID: ${questionSetId}`] : [];
    },
    remediation: () => 'Verify the QuestionSet exists and is properly configured for this project'
  },

  INVALID_ANSWER_TYPE: {
    title: 'Invalid Answer Type',
    summary: 'The answer type is not recognized or supported.',
    details: (issue) => {
      const actual = issue.details?.actual;
      return actual?.answerType ? [`Type: ${actual.answerType}`] : [];
    },
    remediation: () => 'Use a valid FHIR answer type (coding, quantity, string, integer, decimal, boolean)'
  }
};

// ============================================================================
// SYSTEM / ENGINE
// ============================================================================

export const SystemErrorMessages: Record<string, ErrorMessageDefinition> = {
  RULE_CONFIGURATION_INVALID: {
    title: 'Invalid Rule Configuration',
    summary: 'The rule configuration is invalid or incomplete.',
    details: (issue) => {
      const ruleId = issue.details?.ruleId;
      const error = issue.details?.error;
      return [
        ruleId ? `Rule ID: ${ruleId}` : '',
        error ? `Error: ${error}` : ''
      ].filter(Boolean);
    },
    remediation: () => 'Check the rule definition in rules.json for missing or invalid parameters'
  },

  RULE_PARAM_MISSING: {
    title: 'Required Rule Parameter Missing',
    summary: 'A required rule parameter is missing.',
    details: (issue) => {
      const param = issue.details?.expected?.paramName;
      const ruleId = issue.details?.ruleId;
      return [
        ruleId ? `Rule ID: ${ruleId}` : '',
        param ? `Missing parameter: ${param}` : ''
      ].filter(Boolean);
    },
    remediation: (issue) => {
      const param = issue.details?.expected?.paramName;
      return param ? `Add the required parameter: ${param}` : 'Add the missing parameter';
    }
  },

  VALIDATION_ENGINE_ERROR: {
    title: 'Validation Engine Error',
    summary: 'The validation engine encountered an internal error.',
    details: (issue) => {
      const error = issue.details?.error;
      return error ? [`Error: ${error}`] : [];
    },
    remediation: () => 'Report this error to the system administrator'
  },

  UNSUPPORTED_RULE_TYPE: {
    title: 'Unsupported Rule Type',
    summary: 'The rule type is not supported by the validation engine.',
    details: (issue) => {
      const ruleType = issue.details?.actual?.ruleType;
      return ruleType ? [`Rule type: ${ruleType}`] : [];
    },
    remediation: () => 'Use a supported rule type (Required, FixedValue, Pattern, etc.)'
  }
};

// ============================================================================
// DEFAULT MESSAGE
// ============================================================================

/**
 * DEFAULT MESSAGE for unknown error codes
 * 
 * GLOBAL FRONTEND FALLBACK RULE:
 * - If errorCode is unknown → show generic validation message
 * - If details are missing or invalid → show generic validation message
 * - UI MUST NEVER throw, render empty panel, or depend on backend message text
 * 
 * Fallback Message:
 * - Title: "Validation error"
 * - Description: "This item does not meet validation requirements."
 */
export const DEFAULT_ERROR_MESSAGE: ErrorMessageDefinition = {
  title: 'Validation error',
  summary: 'This item does not meet validation requirements.',
  details: () => [],
  remediation: () => 'Review the validation requirements and correct the issue'
};

// ============================================================================
// MASTER ERROR MESSAGE MAP
// ============================================================================

/**
 * MASTER ERROR MESSAGE MAP
 * Combine all error message definitions for ALL rule types
 */
export const ERROR_MESSAGE_MAP: Record<string, ErrorMessageDefinition> = {
  // Required / Presence
  ...RequiredErrorMessages,
  
  // Fixed / Equality
  ...FixedValueErrorMessages,
  
  // Pattern / Regex
  ...PatternErrorMessages,
  
  // Range / Numeric
  ...RangeErrorMessages,
  
  // Allowed Values / Enum
  ...AllowedValuesErrorMessages,
  
  // Terminology / ValueSet
  ...TerminologyErrorMessages,
  
  // Reference
  ...ReferenceErrorMessages,
  
  // Array / Cardinality
  ...ArrayErrorMessages,
  
  // Choice / value[x]
  ...ChoiceTypeErrorMessages,
  
  // FHIRPath / Expression
  ...FhirPathErrorMessages,
  
  // Structural / Bundle
  ...StructuralErrorMessages,
  
  // Question / Answer
  ...QuestionAnswerErrorMessages,
  
  // System / Engine
  ...SystemErrorMessages
};

/**
 * Get error message definition for an error code
 * 
 * GLOBAL FRONTEND FALLBACK RULE:
 * - If errorCode is unknown, log warning and return safe fallback
 * - Never throw, never render empty, never depend on backend text
 */
export function getErrorMessage(errorCode: string): ErrorMessageDefinition {
  const message = ERROR_MESSAGE_MAP[errorCode];
  
  if (!message) {
    // Log warning for unknown errorCode (development aid)
    console.warn(`[ValidationError] Unknown errorCode: "${errorCode}". Using fallback message.`);
    return DEFAULT_ERROR_MESSAGE;
  }
  
  return message;
}

/**
 * Render a full error message from a validation issue
 */
export function renderErrorMessage(issue: ValidationIssue, verbosity: 'summary' | 'detailed' = 'summary'): {
  title: string;
  summary: string;
  userHint?: string;
  details?: string[];
  remediation?: string;
} {
  const messageDef = getErrorMessage(issue.errorCode);
  
  const result: ReturnType<typeof renderErrorMessage> = {
    title: messageDef.title,
    summary: messageDef.summary,
    userHint: issue.userHint
  };
  
  if (verbosity === 'detailed') {
    if (messageDef.details) {
      result.details = messageDef.details(issue);
    }
    if (messageDef.remediation) {
      result.remediation = messageDef.remediation(issue);
    }
  }
  
  return result;
}
