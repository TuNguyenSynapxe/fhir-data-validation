/**
 * Validation Explanation Template Registry
 * 
 * Provides canonical "What this means" / "How to fix" content for validation errors.
 * Ensures consistent, clear, non-repetitive explanations across all validation sources.
 */

export interface ExplanationTemplate {
  whatThisMeans: string;
  howToFix: string[];
  note?: string;
  details?: string;
}

interface ExplanationContext {
  source: string;
  code: string;
  path?: string;
  message?: string;
}

/**
 * Explanation Template Registry
 * Maps source + code to structured explanation content
 */
const EXPLANATION_TEMPLATES: Record<string, Record<string, ExplanationTemplate>> = {
  // ============================================================
  // LINT Templates
  // ============================================================
  'LINT': {
    'UNKNOWN_ELEMENT': {
      whatThisMeans: 'The element shown is not defined in the FHIR R4 specification for this resource or type. This usually happens when the element belongs to a custom or external extension, or when the extension definition is not loaded in this project.',
      howToFix: [
        'This issue does not block validation.',
        'If portability is important, ensure the extension is defined and shared with the receiving system.',
        'Otherwise, this warning can be safely ignored if the target system accepts the extension.'
      ]
    },
    'LINT_EXPECTED_ARRAY': {
      whatThisMeans: 'FHIR defines this element as an array (0..*), but the payload uses a single object instead. Some FHIR engines may accept this, but others will reject it.',
      howToFix: [
        'Wrap the value in an array, even if only one item is present.',
        'Example: "performer": [ { … } ]'
      ]
    },
    'LINT_INVALID_CARDINALITY': {
      whatThisMeans: 'The element appears more times than allowed by the FHIR R4 specification.',
      howToFix: [
        'Check the specification for the correct cardinality (min..max).',
        'Remove extra occurrences or restructure the data to fit the allowed range.'
      ]
    },
    'LINT_TYPE_MISMATCH': {
      whatThisMeans: 'The value provided does not match the expected FHIR data type for this element.',
      howToFix: [
        'Verify the correct type in the FHIR R4 specification.',
        'Update the value to match the expected type (e.g., string, integer, boolean, etc.).'
      ]
    }
  },

  // ============================================================
  // Reference Validation Templates
  // ============================================================
  'Reference': {
    'REFERENCE_NOT_FOUND': {
      whatThisMeans: 'This element references another resource that does not exist in the current Bundle. All references in a Bundle must point to an existing entry.fullUrl.',
      howToFix: [
        'Add the referenced resource to the Bundle, or',
        'Update the reference to match an existing entry.fullUrl.',
        'Example: "reference": "urn:uuid:existing-entry-id"'
      ],
      details: 'This check ensures bundle integrity and blocks validation.'
    },
    'INVALID_REFERENCE_FORMAT': {
      whatThisMeans: 'The reference value does not follow the correct FHIR reference format.',
      howToFix: [
        'Use one of the allowed formats: "ResourceType/id", "urn:uuid:...", or absolute URL.',
        'Ensure there are no extra spaces or invalid characters.'
      ]
    },
    'REFERENCE_TYPE_MISMATCH': {
      whatThisMeans: 'The referenced resource type does not match what is expected for this field.',
      howToFix: [
        'Check the FHIR specification for allowed reference types.',
        'Update the reference to point to a resource of the correct type.'
      ]
    }
  },

  // ============================================================
  // HL7 / Firely Templates
  // ============================================================
  'FHIR': {
    'MISSING_REQUIRED_FIELD': {
      whatThisMeans: 'This element is required by the FHIR R4 specification but is missing from the payload.',
      howToFix: [
        'Add the missing field at the indicated path.'
      ]
    },
    'INVALID_VALUE': {
      whatThisMeans: 'The value provided does not conform to FHIR R4 specification constraints.',
      howToFix: [
        'Review the specification for this element.',
        'Ensure the value meets all constraints (format, vocabulary, etc.).'
      ]
    },
    'VOCABULARY_VALIDATION_FAILED': {
      whatThisMeans: 'The code or coding provided is not part of the expected value set.',
      howToFix: [
        'Check the binding strength (required, extensible, preferred).',
        'If required or extensible, use a code from the specified value set.',
        'Verify the system URI and code are correct.'
      ]
    },
    'CARDINALITY_VIOLATION': {
      whatThisMeans: 'The element appears more or fewer times than allowed by its cardinality constraint.',
      howToFix: [
        'Check the min..max cardinality in the specification.',
        'Adjust the number of occurrences to fit the allowed range.'
      ]
    }
  },

  // ============================================================
  // Project Rules (Business) Templates
  // ============================================================
  'BUSINESS': {
    'REQUIRED': {
      whatThisMeans: 'This field is required by project rules, even though it may be optional in the FHIR specification.',
      howToFix: [
        'Provide a value for this field to satisfy project validation requirements.'
      ]
    },
    'FIXED_VALUE': {
      whatThisMeans: 'This field must have a specific value as defined by project rules.',
      howToFix: [
        'Update the value to match the required constant.'
      ]
    },
    'ALLOWED_VALUES': {
      whatThisMeans: 'The value used is not part of the allowed set defined for this project.',
      howToFix: [
        'Replace the value with one of the allowed options listed.'
      ]
    },
    'PATTERN_MISMATCH': {
      whatThisMeans: 'The value does not match the required pattern defined in project rules.',
      howToFix: [
        'Review the pattern requirements.',
        'Update the value to conform to the expected format.'
      ]
    },
    'CONDITIONAL_REQUIRED': {
      whatThisMeans: 'Based on other field values, this field is now required by project rules.',
      howToFix: [
        'Provide the required value, or',
        'Adjust related fields to remove the requirement.'
      ]
    }
  },

  // ============================================================
  // CodeMaster Templates
  // ============================================================
  'CODEMASTER': {
    'CODE_NOT_FOUND': {
      whatThisMeans: 'The code provided is not found in the configured CodeMaster catalog.',
      howToFix: [
        'Verify the code exists in the active CodeMaster version.',
        'Check for typos in the code value.',
        'Ensure the correct code system is specified.'
      ]
    },
    'INVALID_CODE_SYSTEM': {
      whatThisMeans: 'The code system URI does not match the expected system for this catalog.',
      howToFix: [
        'Use the correct code system URI for this CodeMaster catalog.',
        'Verify the catalog configuration is up to date.'
      ]
    },
    'CODE_DEPRECATED': {
      whatThisMeans: 'The code is valid but marked as deprecated in CodeMaster.',
      howToFix: [
        'Use a current, non-deprecated code from the catalog.',
        'Consult the catalog documentation for replacement codes.'
      ]
    }
  },

  // ============================================================
  // Spec Hints Templates
  // ============================================================
  'SPEC_HINT': {
    'OPTIONAL_FIELD_RECOMMENDED': {
      whatThisMeans: 'This field is optional according to FHIR R4, but is recommended for better interoperability.',
      howToFix: [
        'Consider adding this field if the information is available.',
        'This is advisory only and does not block validation.'
      ],
      note: 'HL7 FHIR specifications define required fields to ensure interoperability. Some FHIR engines (including Firely) do not strictly enforce all required fields. These warnings help build portable, standards-aligned bundles but do not block validation.'
    },
    'EXTENSION_WITHOUT_URL': {
      whatThisMeans: 'An extension is present but lacks the required "url" field.',
      howToFix: [
        'Add the "url" field to the extension with the canonical URI.',
        'Extensions must have a URL to be valid and portable.'
      ]
    },
    'NARRATIVE_MISSING': {
      whatThisMeans: 'The resource lacks a human-readable narrative (text.div), which aids in displaying the resource.',
      howToFix: [
        'Consider adding a text.div element with an XHTML summary.',
        'This is not required but improves resource usability.'
      ]
    }
  }
};

/**
 * Get explanation template for a validation error
 * 
 * @param context - Error context (source, code, path, message)
 * @returns Structured explanation template
 */
export function getExplanationTemplate(context: ExplanationContext): ExplanationTemplate {
  const { source, code } = context;

  // Normalize source
  const normalizedSource = normalizeSourceForExplanation(source);
  
  // Look up template
  const sourceTemplates = EXPLANATION_TEMPLATES[normalizedSource];
  if (sourceTemplates && sourceTemplates[code]) {
    const template = sourceTemplates[code];
    
    // Apply contextual notes
    return applyContextualNotes(template, context);
  }

  // Fallback for unknown templates
  return getFallbackExplanation(context);
}

/**
 * Normalize source names for template lookup
 */
function normalizeSourceForExplanation(source: string): string {
  const normalized = source.toUpperCase();
  
  // Map variations to canonical names
  const sourceMap: Record<string, string> = {
    'LINT': 'LINT',
    'REFERENCE': 'Reference',
    'FHIR': 'FHIR',
    'FIRELY': 'FHIR',
    'HL7': 'FHIR',
    'BUSINESS': 'BUSINESS',
    'BUSINESSRULES': 'BUSINESS',
    'PROJECT_RULES': 'BUSINESS',
    'CODEMASTER': 'CODEMASTER',
    'SPEC_HINT': 'SPEC_HINT',
    'SPECHINT': 'SPEC_HINT'
  };

  return sourceMap[normalized] || normalized;
}

/**
 * Apply contextual notes based on path or other context
 */
function applyContextualNotes(
  template: ExplanationTemplate,
  context: ExplanationContext
): ExplanationTemplate {
  const result = { ...template };

  // Add extension note for UNKNOWN_ELEMENT if path contains .extension
  if (context.code === 'UNKNOWN_ELEMENT' && context.path && context.path.includes('.extension')) {
    result.note = 'This project does not load all HL7 extension definitions. Unknown extensions are allowed but may not validate consistently across FHIR engines.';
  }

  return result;
}

/**
 * Fallback explanation for unknown error codes
 */
function getFallbackExplanation(context: ExplanationContext): ExplanationTemplate {
  return {
    whatThisMeans: 'This validation issue was detected, but no specific explanation template is available.',
    howToFix: [
      'Review the error message for details.',
      'Consult the FHIR R4 specification for the affected element.',
      'If this is a project-specific rule, check the project documentation.'
    ],
    details: context.message || 'No additional diagnostic information available.'
  };
}

/**
 * Check if an explanation template exists for the given source and code
 */
export function hasExplanationTemplate(source: string, code: string): boolean {
  const normalizedSource = normalizeSourceForExplanation(source);
  const sourceTemplates = EXPLANATION_TEMPLATES[normalizedSource];
  return !!(sourceTemplates && sourceTemplates[code]);
}

/**
 * Get all available error codes for a given source
 */
export function getAvailableCodesForSource(source: string): string[] {
  const normalizedSource = normalizeSourceForExplanation(source);
  const sourceTemplates = EXPLANATION_TEMPLATES[normalizedSource];
  return sourceTemplates ? Object.keys(sourceTemplates) : [];
}
