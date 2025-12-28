namespace Pss.FhirProcessor.Engine.Validation;

/// <summary>
/// GLOBAL ERROR CODE TAXONOMY
/// 
/// Centralized error codes for ALL validation rule types.
/// Backend returns only errorCode + structured data.
/// Frontend owns all human-readable messages.
/// 
/// Architecture Rules:
/// - ErrorCode REQUIRED on every rule
/// - UserHint OPTIONAL (max 60 chars, label only)
/// - Backend MUST NOT generate prose
/// - Frontend ERROR_MESSAGE_MAP owns all messages
/// </summary>
public static class ValidationErrorCodes
{
    // =========================================================================
    // REQUIRED / PRESENCE
    // =========================================================================
    
    /// <summary>Required field is missing</summary>
    public const string FIELD_REQUIRED = "FIELD_REQUIRED";
    
    /// <summary>Required array is missing or empty</summary>
    public const string ARRAY_REQUIRED = "ARRAY_REQUIRED";
    
    /// <summary>Minimum occurrences not met</summary>
    public const string MIN_OCCURS_NOT_MET = "MIN_OCCURS_NOT_MET";

    // =========================================================================
    // FIXED / EQUALITY
    // =========================================================================
    
    /// <summary>Value does not match expected fixed value</summary>
    public const string VALUE_NOT_EQUAL = "VALUE_NOT_EQUAL";
    
    /// <summary>System does not match expected value</summary>
    public const string SYSTEM_NOT_EQUAL = "SYSTEM_NOT_EQUAL";
    
    /// <summary>Code does not match expected value</summary>
    public const string CODE_NOT_EQUAL = "CODE_NOT_EQUAL";

    // =========================================================================
    // PATTERN / REGEX
    // =========================================================================
    
    /// <summary>Value does not match required pattern</summary>
    public const string PATTERN_MISMATCH = "PATTERN_MISMATCH";
    
    /// <summary>Value format is invalid</summary>
    public const string FORMAT_INVALID = "FORMAT_INVALID";

    // =========================================================================
    // RANGE / NUMERIC
    // =========================================================================
    
    /// <summary>Numeric value is outside allowed range</summary>
    public const string VALUE_OUT_OF_RANGE = "VALUE_OUT_OF_RANGE";
    
    /// <summary>Value is below minimum threshold</summary>
    public const string VALUE_BELOW_MIN = "VALUE_BELOW_MIN";
    
    /// <summary>Value is above maximum threshold</summary>
    public const string VALUE_ABOVE_MAX = "VALUE_ABOVE_MAX";

    // =========================================================================
    // ALLOWED VALUES / ENUM
    // =========================================================================
    
    /// <summary>Value is not in the list of allowed values</summary>
    public const string VALUE_NOT_ALLOWED = "VALUE_NOT_ALLOWED";
    
    /// <summary>Code is not in the list of allowed codes</summary>
    public const string CODE_NOT_ALLOWED = "CODE_NOT_ALLOWED";

    // =========================================================================
    // CODESYSTEM (Rule Type)
    // =========================================================================
    
    /// <summary>CodeSystem rule violation (system mismatch or code not allowed)</summary>
    public const string CODESYSTEM_VIOLATION = "CODESYSTEM_VIOLATION";

    // =========================================================================
    // TERMINOLOGY / VALUESET
    // =========================================================================
    
    /// <summary>Code is not found in the specified ValueSet</summary>
    public const string CODE_NOT_IN_VALUESET = "CODE_NOT_IN_VALUESET";
    
    /// <summary>Code system is not allowed for this binding</summary>
    public const string SYSTEM_NOT_ALLOWED = "SYSTEM_NOT_ALLOWED";
    
    /// <summary>Display text does not match the code definition</summary>
    public const string DISPLAY_MISMATCH = "DISPLAY_MISMATCH";
    
    /// <summary>Terminology service lookup failed</summary>
    public const string TERMINOLOGY_LOOKUP_FAILED = "TERMINOLOGY_LOOKUP_FAILED";

    // =========================================================================
    // REFERENCE
    // =========================================================================
    
    /// <summary>Required reference is missing</summary>
    public const string REFERENCE_REQUIRED = "REFERENCE_REQUIRED";
    
    /// <summary>Reference format or structure is invalid</summary>
    public const string REFERENCE_INVALID = "REFERENCE_INVALID";
    
    /// <summary>Reference target type does not match expected type</summary>
    public const string REFERENCE_TARGET_TYPE_MISMATCH = "REFERENCE_TARGET_TYPE_MISMATCH";
    
    /// <summary>Referenced resource not found in bundle</summary>
    public const string REFERENCE_NOT_FOUND = "REFERENCE_NOT_FOUND";
    
    /// <summary>Multiple references found when only one allowed</summary>
    public const string REFERENCE_MULTIPLE_NOT_ALLOWED = "REFERENCE_MULTIPLE_NOT_ALLOWED";

    // =========================================================================
    // ARRAY / CARDINALITY
    // =========================================================================
    
    /// <summary>Array has fewer elements than required minimum</summary>
    public const string ARRAY_TOO_SHORT = "ARRAY_TOO_SHORT";
    
    /// <summary>Array has more elements than allowed maximum</summary>
    public const string ARRAY_TOO_LONG = "ARRAY_TOO_LONG";
    
    /// <summary>Array length constraint violated (min or max)</summary>
    public const string ARRAY_LENGTH_VIOLATION = "ARRAY_LENGTH_VIOLATION";
    
    /// <summary>Array length is invalid</summary>
    public const string ARRAY_LENGTH_INVALID = "ARRAY_LENGTH_INVALID";
    
    /// <summary>Field value does not match the required fixed value</summary>
    public const string FIXED_VALUE_MISMATCH = "FIXED_VALUE_MISMATCH";
    
    /// <summary>Array contains duplicate values when uniqueness required</summary>
    public const string ARRAY_DUPLICATES_NOT_ALLOWED = "ARRAY_DUPLICATES_NOT_ALLOWED";

    // =========================================================================
    // CHOICE / value[x]
    // =========================================================================
    
    /// <summary>Choice type is not valid for this element</summary>
    public const string CHOICE_TYPE_INVALID = "CHOICE_TYPE_INVALID";
    
    /// <summary>Value type does not match expected type</summary>
    public const string VALUE_TYPE_MISMATCH = "VALUE_TYPE_MISMATCH";
    
    /// <summary>Value type is not supported</summary>
    public const string UNSUPPORTED_VALUE_TYPE = "UNSUPPORTED_VALUE_TYPE";

    // =========================================================================
    // FHIRPATH / EXPRESSION
    // =========================================================================
    
    /// <summary>FHIRPath expression evaluation failed</summary>
    public const string FHIRPATH_EXPRESSION_FAILED = "FHIRPATH_EXPRESSION_FAILED";
    
    /// <summary>FHIRPath evaluation encountered an error</summary>
    public const string FHIRPATH_EVALUATION_ERROR = "FHIRPATH_EVALUATION_ERROR";
    
    /// <summary>FHIRPath expression returned unexpected type</summary>
    public const string FHIRPATH_RETURN_TYPE_INVALID = "FHIRPATH_RETURN_TYPE_INVALID";

    // =========================================================================
    // STRUCTURAL / BUNDLE
    // =========================================================================
    
    /// <summary>Required resource is missing from bundle</summary>
    public const string RESOURCE_MISSING = "RESOURCE_MISSING";
    
    /// <summary>Multiple resources found when only one allowed</summary>
    public const string RESOURCE_MULTIPLE_NOT_ALLOWED = "RESOURCE_MULTIPLE_NOT_ALLOWED";
    
    /// <summary>Bundle entry structure is invalid</summary>
    public const string BUNDLE_ENTRY_INVALID = "BUNDLE_ENTRY_INVALID";
    
    /// <summary>Entry reference does not match bundle structure</summary>
    public const string ENTRY_REFERENCE_MISMATCH = "ENTRY_REFERENCE_MISMATCH";

    // =========================================================================
    // QUESTION / ANSWER (QuestionAnswer rule type)
    // =========================================================================
    
    /// <summary>Answer value does not match expected type or format</summary>
    public const string INVALID_ANSWER_VALUE = "INVALID_ANSWER_VALUE";
    
    /// <summary>Answer numeric value is outside allowed range</summary>
    public const string ANSWER_OUT_OF_RANGE = "ANSWER_OUT_OF_RANGE";
    
    /// <summary>Answer code is not in allowed ValueSet</summary>
    public const string ANSWER_NOT_IN_VALUESET = "ANSWER_NOT_IN_VALUESET";
    
    /// <summary>Required answer is missing</summary>
    public const string ANSWER_REQUIRED = "ANSWER_REQUIRED";
    
    /// <summary>Multiple answers provided when only one allowed</summary>
    public const string ANSWER_MULTIPLE_NOT_ALLOWED = "ANSWER_MULTIPLE_NOT_ALLOWED";
    
    /// <summary>Answer type is not recognized or supported</summary>
    public const string INVALID_ANSWER_TYPE = "INVALID_ANSWER_TYPE";
    
    /// <summary>Question identity could not be resolved in QuestionSet</summary>
    public const string QUESTION_NOT_FOUND = "QUESTION_NOT_FOUND";
    
    /// <summary>QuestionSet data could not be loaded</summary>
    public const string QUESTIONSET_DATA_MISSING = "QUESTIONSET_DATA_MISSING";

    // =========================================================================
    // SYSTEM / ENGINE
    // =========================================================================
    
    /// <summary>Rule configuration is invalid or incomplete</summary>
    public const string RULE_CONFIGURATION_INVALID = "RULE_CONFIGURATION_INVALID";
    
    /// <summary>Required rule parameter is missing</summary>
    public const string RULE_PARAM_MISSING = "RULE_PARAM_MISSING";
    
    /// <summary>Validation engine encountered an internal error</summary>
    public const string VALIDATION_ENGINE_ERROR = "VALIDATION_ENGINE_ERROR";
    
    /// <summary>Rule type is not supported by the engine</summary>
    public const string UNSUPPORTED_RULE_TYPE = "UNSUPPORTED_RULE_TYPE";
}
