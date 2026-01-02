/* ============================================
 * Validation Error Explanation Registry
 * --------------------------------------------
 * Rules:
 * - Switch ONLY on errorCode
 * - Read ONLY from details
 * - Never parse path / jsonPointer / FHIRPath
 * - Never throw
 * - Always return a valid explanation
 * ============================================ */

export interface ErrorExplanation {
  title: string;
  reason: string;
  whatWasFound?: string | any; // Can be structured object for bundle composition
  expected?: string | string[] | any; // Can be structured object for bundle composition
  howToFix?: string;
  whatThisMeans?: string; // Educational context explaining why the rule exists
  note?: string;
}

type ExplanationBuilder = (details?: Record<string, any>) => ErrorExplanation;

/* ---------- helpers ---------- */

const safeJoin = (values?: unknown[]): string | undefined => {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  return values.map(String).join(", ");
};

const safeValue = (value: unknown): string | undefined =>
  value === null || value === undefined ? undefined : String(value);

/* ---------- registry ---------- */

export const errorExplanationRegistry: Record<string, ExplanationBuilder> = {
  /* ============================
   * STRUCTURE
   * ============================ */

  INVALID_ENUM_VALUE: (details) => {
    const actual = safeValue(details?.actual);
    const allowed = safeJoin(details?.allowed);

    return {
      title: "Invalid value",
      reason: actual
        ? `The value "${actual}" is not allowed for this field.`
        : "This value is not allowed for this field.",
      whatWasFound: actual,
      expected: allowed ? allowed.split(',').map(v => v.trim()) : undefined,
      howToFix: allowed ? `Choose one of: ${allowed}` : "Choose a valid value for this field.",
      note: "Enum values ensure data consistency across systems."
    };
  },

  FIXED_VALUE_MISMATCH: (details) => {
    const expected = safeValue(details?.expected);
    const actual = safeValue(details?.actual);

    return {
      title: "Incorrect value",
      reason: "This field must have a specific value.",
      whatWasFound: actual,
      expected: expected,
      howToFix: expected ? `Change the value to exactly: ${expected}` : "Use the required fixed value for this field.",
      note: "Fixed values enforce structural integrity in FHIR resources."
    };
  },

  FHIR_INVALID_PRIMITIVE: (details) => {
    const actual = safeValue(details?.actual);
    const expectedType = safeValue(details?.expectedType);
    const reasonDetail = safeValue(details?.reason);

    return {
      title: "Invalid format",
      reason: actual
        ? `The value "${actual}" is not a valid ${expectedType ?? "value"}.`
        : "The value has an invalid format.",
      whatWasFound: actual,
      expected: reasonDetail || (expectedType ? `A valid ${expectedType} value` : "A valid value format"),
      howToFix: expectedType ? `Use a valid ${expectedType} value (e.g., dates: YYYY-MM-DD, URIs: http://...).` : "Use a valid value format.",
      note: "FHIR primitives (dates, URIs, etc.) have strict format requirements."
    };
  },

  FHIR_ARRAY_EXPECTED: (details) => {
    const actualType = safeValue(details?.actualType);

    return {
      title: "Incorrect structure",
      reason: actualType
        ? `This field must be a list, but a ${actualType} was provided.`
        : "This field must be a list.",
      whatWasFound: actualType,
      expected: "An array (list) of values",
      howToFix: "Wrap the value in square brackets: [value] or provide multiple values: [value1, value2]",
      note: "FHIR uses arrays for fields with cardinality 0..* or 1..*."
    };
  },

  REQUIRED_FIELD_MISSING: () => ({
    title: "Missing required field",
    reason: "This field is required but was not provided.",
    expected: "A value for this field",
    howToFix: "Add a value to this required field.",
    note: "Required fields have cardinality 1..1 or 1..* in FHIR."
  }),

  ARRAY_LENGTH_OUT_OF_RANGE: (details) => {
    const min = safeValue(details?.min);
    const max = safeValue(details?.max);
    const actual = safeValue(details?.actual);

    return {
      title: "Incorrect number of items",
      reason: "This field has an invalid number of entries.",
      whatWasFound: actual ? `${actual} items` : undefined,
      expected: min && max ? `Between ${min} and ${max} items` : (min ? `At least ${min} items` : (max ? `At most ${max} items` : "The correct number of items")),
      howToFix: min && max && actual ? (Number(actual) < Number(min) ? `Add ${Number(min) - Number(actual)} more items.` : `Remove ${Number(actual) - Number(max)} items.`) : "Adjust the number of items in the array."
    };
  },

  /* ============================
   * BUSINESS / PROJECT
   * ============================ */
  RESOURCE_REQUIREMENT_VIOLATION: (details) => {
    // Extract diff structure (backend-computed)
    const diff = details?.diff as { 
      missing?: Array<{ expectedId: string; resourceType: string; expectedMin: number; actualCount: number; filterLabel?: string }>;
      unexpected?: Array<{ resourceType: string; count: number; examples?: any[] }>;
    };
    
    const missing = diff?.missing || [];
    const unexpected = diff?.unexpected || [];
    
    // Build howToFix dynamically from diff
    const howToFixSteps: string[] = [];
    
    missing.forEach(m => {
      const label = m.filterLabel || m.resourceType;
      const needed = m.expectedMin - m.actualCount;
      if (needed > 0) {
        howToFixSteps.push(`Add ${needed} ${label} resource${needed > 1 ? 's' : ''} to the bundle`);
      }
    });
    
    unexpected.forEach(u => {
      howToFixSteps.push(`Remove ${u.count} ${u.resourceType} resource${u.count > 1 ? 's' : ''} from the bundle, or update your project rules to allow it`);
    });
    
    return {
      title: "Bundle composition does not meet project requirements",
      reason: "This project defines which FHIR resources are allowed in a bundle. The current bundle contains resources that are missing or not permitted.",
      whatThisMeans: "Your project configuration specifies exactly which types of FHIR resources must appear in a valid bundle (and how many of each). The bundle you submitted does not match these requirements.",
      howToFix: howToFixSteps.length > 0 ? howToFixSteps.join('; ') : "Review the expected bundle structure and adjust your bundle contents.",
      expected: details?.expected,
      whatWasFound: details?.actual,
      note: "This is a project-specific rule, not a FHIR standard validation error. The bundle may be valid FHIR but does not match your project configuration."
    };
  },
  VALUE_NOT_ALLOWED: (details) => {
    const actual = safeValue(details?.actual);
    const allowed = safeJoin(details?.allowed);

    return {
      title: "Value not permitted",
      reason: actual
        ? `The value "${actual}" is not allowed by the project rules.`
        : "This value is not allowed by the project rules.",
      whatWasFound: actual,
      expected: allowed ? allowed.split(',').map(v => v.trim()) : undefined,
      howToFix: allowed ? `Choose one of the allowed values: ${allowed}` : "Use a value permitted by the project rules.",
      note: "Project rules may restrict values beyond FHIR base requirements."
    };
  },

  CODE_NOT_IN_VALUESET: (details) => {
    const actual = safeValue(details?.actual);
    const examples = safeJoin(details?.examples);

    return {
      title: "Invalid code",
      reason: actual
        ? `The code "${actual}" is not allowed for this field.`
        : "The provided code is not allowed for this field.",
      whatWasFound: actual,
      expected: examples ? examples.split(',').map(v => v.trim()) : undefined,
      howToFix: examples ? `Use one of these valid codes: ${examples}` : "Use a code from the approved value set.",
      note: "ValueSets ensure terminology interoperability across healthcare systems."
    };
  },

  /* ============================
   * FALLBACK
   * ============================ */

  DEFAULT: () => getFallbackExplanation()
};

/* ---------- exported fallback ---------- */

export const getFallbackExplanation = (): ErrorExplanation => ({
  title: "Validation issue",
  reason: "This field does not meet the validation requirements.",
  expected: "A value that satisfies the validation rules",
  howToFix: "Review the field requirements and update the value accordingly."
});