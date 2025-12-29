/**
 * Rule Intent Types
 * 
 * Core Principle: Users mark intent on tree nodes.
 * The system owns rule creation and message generation.
 * 
 * NO direct rule creation - only intents that become rules on Apply.
 */

export type RuleIntentType = 'REQUIRED' | 'ARRAY_LENGTH' | 'CODE_SYSTEM' | 'ALLOWED_CODES';

/**
 * Parameters for Array Length rule intents
 */
export interface ArrayLengthParams {
  min?: number; // Minimum array length
  max?: number; // Maximum array length
  nonEmpty?: boolean; // For string arrays: all items must be non-empty
}

/**
 * Parameters for Code System rule intents
 * 
 * CONTRACT (Tier-1 Validation):
 * - codeSetId: Required - identifies the CodeSet in Terminology module
 * - system: Required - must match CodeSet canonical URL (governance validates)
 * - mode: Fixed at "codeset" for closed-world validation
 * - codes: Optional - ONLY for future "restrict further" scenarios (not Tier-1)
 * 
 * VALIDATION BEHAVIOR:
 * - Backend validates BOTH system AND code against CodeSet.concepts[]
 * - Any code NOT in CodeSet.concepts[] MUST FAIL
 * - No system-only validation - closed-world by default
 */
export interface CodeSystemParams {
  codeSetId: string; // Required: Identifies CodeSet in Terminology module
  system: string; // Required: CodeSystem canonical URL (must match CodeSet)
  mode: 'codeset'; // Fixed: Closed-world validation against CodeSet
  codes?: string[]; // Optional: For future "restrict further" scenarios (not required for normal validation)
}

/**
 * Parameters for Allowed Codes rule intents
 */
export interface AllowedCodesParams {
  system?: string; // Optional system (if codes are from specific system)
  codes: string[]; // Array of allowed code values
}

/**
 * Rule Intent - Pending user action on a tree node
 */
export interface RuleIntent {
  type: RuleIntentType;
  path: string; // Full FHIR path e.g., "Patient.gender"
  resourceType?: string; // Extracted from path
  params?: ArrayLengthParams | CodeSystemParams | AllowedCodesParams; // Type-specific params
}

/**
 * Generated message structure (system-owned)
 */
export interface RuleMessage {
  mode: 'SYSTEM'; // Only system-generated messages in v1
  text: string;
}

/**
 * Draft rule structure (matches backend schema)
 */
export interface DraftRule {
  id: string;
  type: 'Required' | 'ArrayLength' | 'CodeSystem' | 'AllowedCodes';
  resourceType: string;
  path: string;
  severity: 'error' | 'warning';
  message: string;
  status?: 'draft';
  params?: ArrayLengthParams | CodeSystemParams | AllowedCodesParams; // Type-specific params
}

/**
 * Bulk intent payload for backend
 */
export interface BulkRuleIntentRequest {
  intents: RuleIntent[];
}

/**
 * Backend response after bulk creation
 */
export interface BulkRuleIntentResponse {
  created: DraftRule[];
  errors?: Array<{
    path: string;
    reason: string;
  }>;
}
