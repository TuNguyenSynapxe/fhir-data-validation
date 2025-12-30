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
 * - params: { codeSetId, system, mode, codes? }
 * 
 * Validation Types:
 * - AllowedCode: Validates against project CodeSystem (uses codeSetId, system, mode)
 * - ExactSystemCode: Validates exact system + code pairing (uses codeSetId, system, mode, codes with single code)
 * 
 * Backend Contract (from FhirPathRuleEngine.cs):
 * - params.codeSetId (required): The CodeSet identifier from Terminology module
 * - params.system (required): The CodeSystem URL to validate against
 * - params.mode (required): Fixed at "codeset" for closed-world validation
 * - params.codes (optional): Array of allowed codes for further restriction beyond CodeSet
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

  // Build params based on validation type
  const params: Record<string, any> = {};

  if (validationType === 'AllowedCode') {
    // Backend expects: params.codeSetId, params.system (both required), params.mode ("codeset"), params.codes (optional)
    if (codeSystemUrl) {
      // Extract codeSetId from CodeSystem URL (last segment)
      const urlParts = codeSystemUrl.split('/');
      const codeSetId = urlParts[urlParts.length - 1];
      
      params.codeSetId = codeSetId;
      params.system = codeSystemUrl;
      params.mode = 'codeset';
      if (allowedCodes && allowedCodes.length > 0) {
        params.codes = allowedCodes;
      }
    }
  } else if (validationType === 'ExactSystemCode') {
    // For exact match: codeSetId, system, mode, codes array with single code
    if (system) {
      // Extract codeSetId from system URL (last segment)
      const urlParts = system.split('/');
      const codeSetId = urlParts[urlParts.length - 1];
      
      params.codeSetId = codeSetId;
      params.system = system;
      params.mode = 'codeset';
      if (exactCode) params.codes = [exactCode];
    }
  }

  return {
    id: ruleId || `rule_${Date.now()}`,
    type: 'CodeSystem',
    resourceType,
    fieldPath,
    errorCode: 'CODESYSTEM_VIOLATION',
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
  // fieldPath is already resource-relative
  const fieldPath = rule.fieldPath || '';

  // Extract params from backend format
  const codeSetId = rule.params?.codeSetId as string | undefined;
  const system = rule.params?.system as string | undefined;
  const mode = rule.params?.mode as string | undefined;
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
