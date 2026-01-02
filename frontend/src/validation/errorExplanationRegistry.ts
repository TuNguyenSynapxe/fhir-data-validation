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
   * LINT - Array vs Single Value
   * ============================ */

  LINT_EXPECTED_ARRAY: (details) => {
    const field = safeValue(details?.field) || "this property";
    const providedType = safeValue(details?.providedType) || "single object";
    
    return {
      title: "Single value used where FHIR defines an array",
      reason: `FHIR defines ${field} as an array (0..*), but this payload provides ${providedType}.`,
      whatWasFound: "A single object instead of an array",
      expected: "An array of values, even if only one value is present",
      howToFix: `Wrap the value in square brackets to create an array:\n\n"${field}": [{ ... }]\n\nEven a single value must be wrapped in array brackets when FHIR defines the cardinality as 0..* or 1..*.`,
      whatThisMeans: "FHIR defines certain properties as arrays to allow multiple values. Some FHIR servers are permissive and may accept a single object, but strict implementations may reject it or behave inconsistently. Using arrays ensures portability across all FHIR systems.",
      note: "This is a best-practice recommendation for portability. The payload may be accepted by some engines but could cause interoperability issues."
    };
  },

  LINT_EXPECTED_OBJECT: (details) => {
    const field = safeValue(details?.field) || "this property";
    
    return {
      title: "Array used where FHIR defines a single value",
      reason: `FHIR defines ${field} as a single object (max cardinality = 1), but this payload provides an array.`,
      whatWasFound: "An array of values",
      expected: "A single object (not wrapped in array brackets)",
      howToFix: `Remove the array brackets and provide only one value:\n\n"${field}": { ... }\n\nWhen FHIR defines max cardinality as 1, the value should not be an array.`,
      whatThisMeans: "FHIR distinguishes between single-value properties (0..1 or 1..1) and array properties (0..* or 1..*). Wrapping a single-value property in an array violates the specification and may cause parsing errors in strict FHIR implementations.",
      note: "This is a best-practice recommendation. Some permissive engines may accept arrays where objects are expected, but this reduces portability."
    };
  },

  /* ============================
   * LINT - JSON/Structure Issues
   * ============================ */

  LINT_EMPTY_INPUT: () => ({
    title: "Empty or whitespace-only input",
    reason: "The input provided is empty, null, or contains only whitespace characters.",
    whatWasFound: "Empty or whitespace-only content",
    expected: "Valid JSON content representing a FHIR resource or Bundle",
    howToFix: "Provide valid FHIR JSON content. Ensure the input is not empty and contains properly formatted JSON.",
    whatThisMeans: "Before FHIR validation can proceed, the input must contain parseable content. Empty inputs cannot be validated against FHIR specifications.",
    note: "This is a pre-validation check. Resolve this before FHIR structural validation can begin."
  }),

  LINT_INVALID_JSON: () => ({
    title: "Malformed JSON syntax",
    reason: "The JSON syntax is malformed and cannot be parsed by a JSON parser.",
    whatWasFound: "Syntactically invalid JSON",
    expected: "Well-formed JSON with balanced braces, proper quoting, and valid escape sequences",
    howToFix: "Use a JSON validator or linter to identify syntax errors. Common issues include:\n\n• Missing or extra commas\n• Unmatched braces or brackets\n• Unescaped quotes in strings\n• Trailing commas (not allowed in JSON)\n• Invalid escape sequences",
    whatThisMeans: "JSON is a strict syntax. Before FHIR validation can check the content, the JSON structure itself must be parseable. Malformed JSON prevents any further processing.",
    note: "This is a pre-validation check. Fix JSON syntax errors before proceeding with FHIR validation."
  }),

  LINT_ROOT_NOT_OBJECT: () => ({
    title: "JSON root must be an object",
    reason: "FHIR JSON resources must start with a JSON object ({ }), not an array or primitive value.",
    whatWasFound: "An array or primitive value at the root level",
    expected: "A JSON object starting with { and ending with }",
    howToFix: "Wrap the content in curly braces to create a JSON object:\n\n{\n  \"resourceType\": \"...\",\n  ...\n}\n\nFHIR resources are always JSON objects, never arrays or primitives.",
    whatThisMeans: "FHIR defines all resources as JSON objects with a resourceType property. Arrays or primitives at the root level violate the FHIR JSON representation and will be rejected by all FHIR engines.",
    note: "This structural requirement is fundamental to FHIR JSON representation and cannot be bypassed."
  }),

  /* ============================
   * LINT - FHIR Structure
   * ============================ */

  LINT_MISSING_RESOURCE_TYPE: () => ({
    title: "Missing resourceType property",
    reason: "Every FHIR resource must include a 'resourceType' property to identify what kind of resource it represents.",
    whatWasFound: "A JSON object without a resourceType property",
    expected: "A resourceType property at the root level (e.g., \"resourceType\": \"Patient\")",
    howToFix: "Add the resourceType property as the first property in your resource:\n\n{\n  \"resourceType\": \"Patient\",\n  ...\n}\n\nThe resourceType must match one of the defined FHIR resource types (Patient, Observation, etc.).",
    whatThisMeans: "The resourceType property tells FHIR parsers and servers what kind of resource they are processing. Without it, the resource cannot be validated or processed correctly. All FHIR engines require this property.",
    note: "This is a mandatory FHIR requirement and will cause validation failures in all implementations."
  }),

  LINT_NOT_BUNDLE: (details) => {
    const actual = safeValue(details?.actual);
    
    return {
      title: "Expected Bundle, found different resource type",
      reason: `This validation requires a Bundle resource, but found resourceType: "${actual || 'unknown'}".`,
      whatWasFound: `A ${actual || 'non-Bundle'} resource`,
      expected: "A resource with \"resourceType\": \"Bundle\"",
      howToFix: "Ensure the root resource is a Bundle. If you need to submit a single resource, wrap it in a Bundle:\n\n{\n  \"resourceType\": \"Bundle\",\n  \"type\": \"collection\",\n  \"entry\": [\n    {\n      \"resource\": { /* your resource here */ }\n    }\n  ]\n}",
      whatThisMeans: "FHIR Bundles are containers that hold multiple resources. Many FHIR operations (like batch processing or document submissions) require Bundle resources. A single resource without a Bundle wrapper may not be processable in these contexts.",
      note: "This check is context-dependent. Some FHIR endpoints accept individual resources, while others require Bundles."
    };
  },

  LINT_ENTRY_NOT_ARRAY: () => ({
    title: "Bundle.entry must be an array",
    reason: "FHIR defines Bundle.entry as an array (0..*), but this payload provides a single object.",
    whatWasFound: "A single object for Bundle.entry",
    expected: "An array of entry objects",
    howToFix: "Wrap the entry in square brackets:\n\n\"entry\": [\n  {\n    \"resource\": { ... }\n  }\n]\n\nEven a single entry must be wrapped in an array.",
    whatThisMeans: "Bundles can contain zero or more entries. FHIR specifies entry as an array to support this. Providing a single object instead of an array breaks Bundle processing logic in FHIR libraries and servers.",
    note: "This is a portability issue. Some permissive parsers may accept a single object, but strict implementations will reject it."
  }),

  LINT_ENTRY_NOT_OBJECT: () => ({
    title: "Each Bundle.entry must be an object",
    reason: "Items in the Bundle.entry array must be JSON objects containing resource and optional metadata.",
    whatWasFound: "A primitive value or malformed structure in the entry array",
    expected: "Each array item should be an object like { \"resource\": {...} }",
    howToFix: "Ensure each entry in the array is a proper object:\n\n\"entry\": [\n  {\n    \"fullUrl\": \"urn:uuid:...\",\n    \"resource\": { ... }\n  }\n]\n\nEach entry object should contain at least a 'resource' property.",
    whatThisMeans: "Bundle entries have a specific structure defined by FHIR. They must be objects containing the resource being bundled, plus optional metadata like fullUrl or search information. Primitive values or arrays are not valid entries.",
    note: "This is a structural requirement of FHIR Bundles and will cause parsing failures."
  }),

  LINT_ENTRY_MISSING_RESOURCE: () => ({
    title: "Bundle.entry missing resource property",
    reason: "Each Bundle.entry must contain a 'resource' property with the actual FHIR resource.",
    whatWasFound: "An entry object without a resource property",
    expected: "Each entry should have: { \"resource\": { \"resourceType\": \"...\", ... } }",
    howToFix: "Add the resource property to the entry:\n\n{\n  \"fullUrl\": \"urn:uuid:...\",\n  \"resource\": {\n    \"resourceType\": \"Patient\",\n    ...\n  }\n}",
    whatThisMeans: "Bundle entries exist to carry resources. The 'resource' property contains the actual FHIR resource being bundled. Without it, the entry serves no purpose and will be ignored or cause errors in FHIR processing.",
    note: "There are specialized bundle types (like search result bundles) where entries may have different structures, but collection and transaction bundles always require the resource property."
  }),

  LINT_RESOURCE_NOT_OBJECT: () => ({
    title: "Resource property must be an object",
    reason: "The 'resource' property in a Bundle.entry must be a JSON object representing a FHIR resource.",
    whatWasFound: "An array or primitive value for the resource property",
    expected: "A JSON object: { \"resourceType\": \"...\", ... }",
    howToFix: "Ensure the resource is a proper JSON object:\n\n\"resource\": {\n  \"resourceType\": \"Patient\",\n  \"id\": \"example\",\n  ...\n}\n\nResources are always objects, never arrays or strings.",
    whatThisMeans: "FHIR resources have a defined structure as JSON objects with specific properties. Arrays or primitive values cannot represent resources and will cause FHIR parsers to fail.",
    note: "This is a fundamental FHIR requirement and is enforced by all compliant implementations."
  }),

  LINT_RESOURCE_MISSING_TYPE: () => ({
    title: "Resource missing resourceType",
    reason: "The resource object in Bundle.entry must include a 'resourceType' property.",
    whatWasFound: "A resource object without resourceType",
    expected: "A resourceType property identifying the resource (e.g., \"resourceType\": \"Observation\")",
    howToFix: "Add the resourceType as the first property:\n\n\"resource\": {\n  \"resourceType\": \"Observation\",\n  \"id\": \"example\",\n  ...\n}",
    whatThisMeans: "Every FHIR resource must declare its type. This allows parsers and processors to apply the correct validation rules and business logic. Without resourceType, the resource cannot be processed.",
    note: "This is mandatory for all FHIR resources and will cause validation to fail."
  }),

  LINT_RESOURCE_TYPE_NOT_STRING: () => ({
    title: "resourceType must be a string",
    reason: "The 'resourceType' property must be a string value, not a number, boolean, object, or array.",
    whatWasFound: "A non-string value for resourceType",
    expected: "A string matching a FHIR resource type (e.g., \"Patient\", \"Observation\")",
    howToFix: "Ensure resourceType is a quoted string:\n\n\"resourceType\": \"Patient\"\n\nNot: \"resourceType\": 123 or \"resourceType\": true",
    whatThisMeans: "FHIR resource types are defined as string constants. Using any other data type breaks the FHIR specification and will cause parsing errors in all implementations.",
    note: "This is a fundamental JSON type requirement for FHIR."
  }),

  /* ============================
   * LINT - Primitive Types
   * ============================ */

  LINT_INVALID_DATE: (details) => {
    const actual = safeValue(details?.actual);
    
    return {
      title: "Date format does not match FHIR pattern",
      reason: `FHIR date values must follow the pattern YYYY, YYYY-MM, or YYYY-MM-DD. The value "${actual || 'provided'}" does not match this format.`,
      whatWasFound: actual || "A date value that doesn't match FHIR patterns",
      expected: "One of these formats: \"2024\", \"2024-01\", \"2024-01-15\"",
      howToFix: "Use one of the allowed FHIR date formats:\n\n• Year only: \"2024\"\n• Year-Month: \"2024-01\"\n• Full date: \"2024-01-15\"\n\nDo not include time components in a date field.",
      whatThisMeans: "FHIR distinguishes between 'date' (no time) and 'dateTime' (with time). Date fields accept partial dates for cases where precision is unknown. Some FHIR engines are permissive with date formats, but strict implementations will reject non-conforming values.",
      note: "This is a portability check. Malformed dates may work in some systems but fail in others, causing interoperability issues."
    };
  },

  LINT_INVALID_DATETIME: (details) => {
    const actual = safeValue(details?.actual);
    
    return {
      title: "DateTime format does not match FHIR pattern",
      reason: `FHIR dateTime values must follow ISO 8601 format. The value "${actual || 'provided'}" does not match this format.`,
      whatWasFound: actual || "A dateTime value that doesn't match ISO 8601",
      expected: "ISO 8601 format with optional timezone: \"2024-01-15T14:30:00Z\" or \"2024-01-15T14:30:00+08:00\"",
      howToFix: "Use ISO 8601 datetime format:\n\n• With UTC: \"2024-01-15T14:30:00Z\"\n• With timezone: \"2024-01-15T14:30:00+08:00\"\n• Without timezone: \"2024-01-15T14:30:00\" (assumes local time)\n\nInclude the 'T' separator between date and time.",
      whatThisMeans: "DateTime values in FHIR must be unambiguous and consistently formatted. ISO 8601 is an international standard that ensures dates and times are interpreted correctly across systems. Malformed datetimes can cause data loss or misinterpretation, especially with timezone handling.",
      note: "This is a portability check. Some engines may parse non-standard formats, but strict implementations will reject them."
    };
  },

  LINT_BOOLEAN_AS_STRING: (details) => {
    const actual = safeValue(details?.actual);
    
    return {
      title: "Boolean provided as string instead of JSON boolean",
      reason: `FHIR boolean properties must use JSON boolean types (true/false), not strings. Found: "${actual || 'true/false'}" (in quotes).`,
      whatWasFound: "A string value like \"true\" or \"false\"",
      expected: "A JSON boolean: true or false (without quotes)",
      howToFix: "Remove the quotes around boolean values:\n\nCorrect: \"active\": true\nIncorrect: \"active\": \"true\"\n\nJSON booleans are written without quotes.",
      whatThisMeans: "JSON distinguishes between the string \"true\" and the boolean true. Most FHIR parsers expect boolean types for boolean properties and will reject string booleans. While some lenient systems may attempt type coercion, this is not portable and reduces interoperability.",
      note: "This is a type correctness check. String booleans in boolean fields will cause issues in most FHIR implementations."
    };
  },

  /* ============================
   * LINT - Schema Shape & Elements
   * ============================ */

  UNKNOWN_ELEMENT: (details) => {
    const element = safeValue(details?.element);
    const resourceType = safeValue(details?.resourceType);
    
    return {
      title: "Element not defined in FHIR specification",
      reason: `The element "${element || 'unknown'}" does not exist in the FHIR R4 specification for ${resourceType || 'this resource'}.`,
      whatWasFound: `An element named "${element || 'unknown'}" in the resource`,
      expected: "Only elements defined in the FHIR specification or properly defined extensions",
      howToFix: "If this is a typo, correct the element name. If this is meant to be an extension:\n\n1. Use the 'extension' property with a proper extension definition\n2. Ensure the extension has a 'url' property pointing to its definition\n3. Example:\n\n\"extension\": [\n  {\n    \"url\": \"http://example.org/fhir/extension-name\",\n    \"valueString\": \"...\"\n  }\n]",
      whatThisMeans: "FHIR resources have a defined structure. Unknown elements could be typos, belong to extensions not loaded in this system, or represent custom fields. Some FHIR servers are permissive and may accept unknown elements, but strict implementations will reject them. This affects portability.",
      note: "This is a best-practice warning. The resource may still be valid FHIR if the element is a properly formatted extension, but unknown elements reduce portability and may indicate structural issues."
    };
  },

  MISSING_REQUIRED_FIELD: (details) => {
    const field = safeValue(details?.field);
    const resourceType = safeValue(details?.resourceType);
    
    return {
      title: "Recommended field is missing",
      reason: `FHIR defines "${field || 'this field'}" with minimum cardinality greater than 0 for ${resourceType || 'this resource'}, but it is not present.`,
      whatWasFound: "The field is absent from the resource",
      expected: `A value for "${field || 'the required field'}"`,
      howToFix: `Add the field to the resource with an appropriate value. Check the FHIR specification for ${resourceType || 'this resource type'} to understand what values are valid for "${field || 'this field'}".`,
      whatThisMeans: "FHIR specifications define minimum cardinality (min > 0) for fields that are essential for resource semantics. However, some FHIR engines (including Firely) do not strictly enforce all required fields during parsing. Missing required fields reduce interoperability and may cause issues when exchanging data with strict implementations.",
      note: "This is a portability check. Your bundle may be accepted by some FHIR engines but could be rejected by others. Adding the field improves compliance and interoperability."
    };
  },

  /* ============================
   * LINT - Compatibility & Versioning
   * ============================ */

  LINT_INTERNAL_ERROR: () => ({
    title: "Lint validation encountered an error",
    reason: "The lint validation layer encountered an unexpected internal error while processing this resource.",
    whatWasFound: "An internal error in the lint validation system",
    expected: "Normal lint validation processing",
    howToFix: "This error is not caused by your FHIR content. The issue should be reported to the system administrators. Your bundle may still be valid FHIR and can proceed with core validation.",
    whatThisMeans: "The lint layer performs best-effort pre-validation checks before FHIR parsing. An internal error means these checks could not complete, but it does not indicate a problem with your FHIR content itself. Core FHIR validation will still run.",
    note: "This error originates from the validation tooling, not your content. Report this to system administrators if it persists."
  }),

  LINT_R5_FIELD_IN_R4: (details) => {
    const field = safeValue(details?.field);
    
    return {
      title: "Field only available in FHIR R5",
      reason: `The field "${field || 'detected'}" is part of FHIR R5 specification but you are validating against FHIR R4.`,
      whatWasFound: `An R5-specific field: "${field || 'unknown'}"`,
      expected: "Only fields defined in FHIR R4 specification",
      howToFix: "Choose one of these options:\n\n1. Remove the R5 field if R4 compatibility is required\n2. Use an R4-compatible alternative if one exists\n3. Change your validation target to FHIR R5 if your system supports it\n\nConsult the FHIR version comparison guide to identify R4 equivalents.",
      whatThisMeans: "FHIR R5 introduced new fields and capabilities not present in R4. Using R5 fields in R4 resources causes compatibility issues. R4-only systems will not understand these fields and may ignore them or reject the resource entirely. This creates interoperability problems in mixed-version environments.",
      note: "This is a version compatibility check. If all systems in your ecosystem support R5, this warning can be safely ignored."
    };
  },

  LINT_DEPRECATED_R4_FIELD: (details) => {
    const field = safeValue(details?.field);
    const replacement = safeValue(details?.replacement);
    
    return {
      title: "Field deprecated in FHIR R5",
      reason: `The field "${field || 'detected'}" is deprecated in FHIR R5. It still works in R4 but may be removed in future versions.`,
      whatWasFound: `A deprecated field: "${field || 'unknown'}"`,
      expected: replacement ? `The replacement field: "${replacement}"` : "A non-deprecated alternative",
      howToFix: replacement 
        ? `Replace "${field}" with "${replacement}" to future-proof your resources. Consult the FHIR R5 migration guide for exact syntax.`
        : `Consult the FHIR R5 specification for the recommended alternative to "${field}".`,
      whatThisMeans: "FHIR evolves between versions, and some fields are deprecated when better alternatives are introduced. Deprecated fields still work but are discouraged. Using deprecated fields increases technical debt and may cause compatibility issues when systems upgrade to newer FHIR versions.",
      note: "This is a future-compatibility advisory. The field works now but may cause issues during future upgrades."
    };
  },

  /* ============================
   * LINT - Choice Types (value[x])
   * ============================ */

  LINT_INVALID_CARDINALITY: (details) => {
    const field = safeValue(details?.field);
    const min = safeValue(details?.min);
    const max = safeValue(details?.max);
    const actual = safeValue(details?.actual);
    
    return {
      title: "Element count outside allowed range",
      reason: `FHIR defines "${field || 'this element'}" with cardinality ${min}..${max || '*'}, but ${actual || 'a different number'} occurrences were found.`,
      whatWasFound: `${actual || 'An incorrect number of'} occurrences of the element`,
      expected: min && max ? `Between ${min} and ${max} occurrences` : (min ? `At least ${min} occurrence(s)` : (max ? `At most ${max} occurrence(s)` : "The correct number of occurrences")),
      howToFix: `Adjust the number of "${field || 'this element'}" occurrences to match the cardinality constraint. ${min && actual && Number(actual) < Number(min) ? `Add ${Number(min) - Number(actual)} more occurrence(s).` : ''}${max && actual && Number(actual) > Number(max) ? `Remove ${Number(actual) - Number(max)} occurrence(s).` : ''}`,
      whatThisMeans: "FHIR defines how many times an element can appear using cardinality constraints (min..max). Violating these constraints creates invalid FHIR. Some engines may be lenient, but strict implementations will reject resources with cardinality violations.",
      note: "This is a portability check. Cardinality violations may be accepted by permissive engines but will cause failures in strict implementations."
    };
  },

  LINT_TYPE_MISMATCH: (details) => {
    const field = safeValue(details?.field);
    const expected = safeValue(details?.expected);
    const actual = safeValue(details?.actual);
    
    return {
      title: "Value type does not match FHIR definition",
      reason: `FHIR defines "${field || 'this element'}" as ${expected || 'a specific type'}, but ${actual || 'a different type'} was provided.`,
      whatWasFound: actual || "A value with incorrect type",
      expected: expected || "A value matching the FHIR-defined type",
      howToFix: `Provide a ${expected || 'correct type'} value for "${field || 'this element'}". Check the FHIR specification to understand the expected data type and format.`,
      whatThisMeans: "FHIR elements have strongly defined types (string, integer, CodeableConcept, etc.). Providing a value of the wrong type violates the specification. While some FHIR engines attempt type coercion, this is not guaranteed and reduces portability.",
      note: "This is a type safety check. Type mismatches may work in lenient systems but will cause failures in strict implementations."
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