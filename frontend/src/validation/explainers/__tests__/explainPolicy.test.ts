import { describe, it, expect } from 'vitest';
import { explainPolicy, getPolicyLabel } from '../explainPolicy';
import type { ValidationResultSummary } from '../../model/ValidationResult';
import type { ValidationIssue } from '../../model/ValidationIssue';

describe('explainPolicy', () => {
  it('returns correct explanation for strict mode from summary', () => {
    const summary: ValidationResultSummary = {
      totalErrors: 3,
      totalWarnings: 1,
      totalInfo: 0,
      hasAmbiguity: true,
      policyMode: 'strict',
    };

    const explanation = explainPolicy(summary);

    expect(explanation).toContain('Strict mode');
    expect(explanation).toContain('Ambiguity treated as ERROR');
    expect(explanation).toContain('deterministically');
  });

  it('returns correct explanation for permissive mode from summary', () => {
    const summary: ValidationResultSummary = {
      totalErrors: 0,
      totalWarnings: 2,
      totalInfo: 1,
      hasAmbiguity: true,
      policyMode: 'permissive',
    };

    const explanation = explainPolicy(summary);

    expect(explanation).toContain('Permissive mode');
    expect(explanation).toContain('Ambiguity treated as WARNING');
    expect(explanation).toContain('continues with warnings');
  });

  it('returns correct explanation for strict mode from issue', () => {
    const issue: ValidationIssue = {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED',
      path: 'Bundle.entry[0].resource.code',
      message: 'Ambiguous validation',
      details: {
        violationReason: 'ValueSet cannot be expanded',
        policyMode: 'strict',
      },
    };

    const explanation = explainPolicy(issue);

    expect(explanation).toContain('Strict mode');
    expect(explanation).toContain('Ambiguity treated as ERROR');
  });

  it('returns unknown policy when policyMode is missing', () => {
    const issue: ValidationIssue = {
      source: 'Syntax',
      severity: 'error',
      errorCode: 'SYNTAX_ERROR',
      path: 'Bundle',
      message: 'Syntax error',
    };

    const explanation = explainPolicy(issue);

    expect(explanation).toBe('Policy mode: Unknown');
  });
});

describe('getPolicyLabel', () => {
  it('returns "Strict" for strict mode', () => {
    const label = getPolicyLabel('strict');
    expect(label).toBe('Strict');
  });

  it('returns "Permissive" for permissive mode', () => {
    const label = getPolicyLabel('permissive');
    expect(label).toBe('Permissive');
  });
});
