import type { Rule } from '../../../../../types/rightPanelProps';
import type { TerminologyParams, ValidationType } from './TerminologyConfigSection';

/**
 * TERMINOLOGY RULE HELPERS
 * 
 * Build and parse functions for Terminology/CodeSystem rules.
 * 
 * Rule Schema:
 * - type: "CodeSystem"
 * - path: "{ResourceType}.{fieldPath}"
 * - errorCode: "CODESYSTEM_VIOLATION" (fixed)
 * - params: { system, codes? }
 * 
 * Validation Types:
 * - AllowedCode: Validates against project CodeSystem (uses system, optionally codes array)
 * - ExactSystemCode: Validates exact system + code pairing (uses system + codes with single code)
 * 
 * Backend Contract (from FhirPathRuleEngine.cs):
 * - params.system (required): The CodeSystem URL to validate against
 * - params.codes (optional): Array of allowed codes. If omitted, any code from the system is allowed.
 */

interface BuildTerminologyRuleData {
  resourceType: string;
  fieldPath: string;
  validationType: ValidationType;
  codeSystemUrl?: string;
  allowedCodes?: string[];
  system?: string;
  exactCode?: string;
  severity: 'error' | 'warning' | 'information';
  userHint?: string;
  ruleId?: string; // For edit mode
}

/**
 * Build a Terminology rule from UI data
 */
export function buildTerminologyRule(data: BuildTerminologyRuleData): Rule {
  const {
    resourceType,
    fieldPath,
    validationType,
    codeSystemUrl,
    allowedCodes,
    system,
    exactCode,
    severity,
    userHint,
    ruleId,
  } = data;

  // Compose FHIR path
  const path = `${resourceType}.${fieldPath}`;

  // Build params based on validation type
  const params: Record<string, any> = {};

  if (validationType === 'AllowedCode') {
    // Backend expects: params.system (required), params.codes (optional array)
    if (codeSystemUrl) {
      params.system = codeSystemUrl;
      if (allowedCodes && allowedCodes.length > 0) {
        params.codes = allowedCodes;
      }
    }
  } else if (validationType === 'ExactSystemCode') {
    // For exact match: system + codes array with single code
    if (system) params.system = system;
    if (exactCode) params.codes = [exactCode];
  }

  return {
    id: ruleId || `rule_${Date.now()}`,
    type: 'CodeSystem',
    resourceType,
    path,
    errorCode: 'CODESYSTEM_VIOLATION', // Fixed error code
    severity,
    userHint,
    enabled: true,
    params,
  };
}

/**
 * Parse a Terminology rule for edit mode
 */
export function parseTerminologyRule(rule: Rule): TerminologyParams {
  // Extract field path from rule.path (remove resourceType prefix)
  const pathParts = rule.path?.split('.') || [];
  const fieldPath = pathParts.slice(1).join('.');

  // Extract params from backend format
  const system = rule.params?.system as string | undefined;
  const codes = rule.params?.codes as string[] | undefined;
  
  // Infer validation type from params structure
  let validationType: ValidationType = 'AllowedCode';
  let codeSystemUrl: string | undefined;
  let allowedCodes: string[] | undefined;
  let exactCode: string | undefined;
  
  if (system) {
    if (codes && codes.length === 1) {
      // Exact system + code: single code in array
      validationType = 'ExactSystemCode';
      exactCode = codes[0];
    } else {
      // CodeSystem validation: system with optional codes array
      validationType = 'AllowedCode';
      codeSystemUrl = system;
      allowedCodes = codes && codes.length > 0 ? codes : undefined;
    }
  }

  return {
    fieldPath,
    validationType,
    codeSystemUrl,
    allowedCodes,
    system: validationType === 'ExactSystemCode' ? system : undefined,
    exactCode,
  };
}
