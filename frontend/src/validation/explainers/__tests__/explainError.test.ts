import { describe, it, expect } from 'vitest';
import { explainError } from '../explainError';
import type { ValidationIssue } from '../../model/ValidationIssue';

describe('explainError', () => {
  it('returns registry explanation for SD_REQUIRED_BINDING_INVALID_CODE', () => {
    const issue: ValidationIssue = {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_REQUIRED_BINDING_INVALID_CODE',
      path: 'Bundle.entry[0].resource.status',
      message: 'Invalid code',
      details: {
        actual: 'invalid-code',
        valueSet: 'http://example.org/ValueSet/status-codes',
        profile: 'http://example.org/StructureDefinition/MyBundle',
        policyMode: 'strict',
      },
    };

    const explanation = explainError(issue);

    expect(explanation.what).toContain("Code 'invalid-code'");
    expect(explanation.what).toContain('not in required ValueSet');
    expect(explanation.why).toContain('http://example.org/ValueSet/status-codes');
    expect(explanation.context).toContain('Binding: Required');
    expect(explanation.policy).toContain('Always an error in strict mode');
  });

  it('returns registry explanation for SD_CARDINALITY_MIN_VIOLATION', () => {
    const issue: ValidationIssue = {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_CARDINALITY_MIN_VIOLATION',
      path: 'Bundle.entry[0].resource.identifier',
      message: 'Missing required element',
      details: {
        expected: 1,
        profile: 'http://example.org/StructureDefinition/MyBundle',
      },
    };

    const explanation = explainError(issue);

    expect(explanation.what).toBe('Required element is missing');
    expect(explanation.why).toContain('at least 1 time(s)');
    expect(explanation.context).toContain('Profile: http://example.org/StructureDefinition/MyBundle');
    expect(explanation.policy).toContain('Always an error');
  });

  it('returns fallback explanation for unknown errorCode', () => {
    const issue: ValidationIssue = {
      source: 'FHIRPath',
      severity: 'warning',
      errorCode: 'UNKNOWN_ERROR_CODE',
      path: 'Bundle.entry[5].resource.name',
      message: 'Some validation error occurred',
      details: {
        policyMode: 'permissive',
      },
    };

    const explanation = explainError(issue);

    // Fallback should use message as "what"
    expect(explanation.what).toBe('Some validation error occurred');
    expect(explanation.why).toContain('Bundle.entry[5].resource.name');
    expect(explanation.context).toContain('Source: FHIRPath');
    expect(explanation.context).toContain('Error code: UNKNOWN_ERROR_CODE');
    expect(explanation.policy).toContain('Policy: permissive');
  });

  it('returns explanation without optional fields when details are missing', () => {
    const issue: ValidationIssue = {
      source: 'Syntax',
      severity: 'error',
      errorCode: 'UNKNOWN_SYNTAX_ERROR',
      path: 'Bundle',
      message: 'Syntax error',
    };

    const explanation = explainError(issue);

    expect(explanation.what).toBe('Syntax error');
    expect(explanation.why).toContain('Bundle');
    expect(explanation.context).toBeDefined();
    expect(explanation.policy).toBeUndefined(); // No policy mode in details
  });
});
