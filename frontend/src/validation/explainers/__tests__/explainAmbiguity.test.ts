import { describe, it, expect } from 'vitest';
import { explainAmbiguity } from '../explainAmbiguity';
import type { ValidationIssue } from '../../model/ValidationIssue';

describe('explainAmbiguity', () => {
  it('returns non-null explanation when violationReason exists', () => {
    const issue: ValidationIssue = {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED',
      path: 'Bundle.entry[0].resource.code',
      message: 'ValueSet cannot be expanded',
      details: {
        violationReason: 'ValueSet uses filter-based expansion which is not supported offline',
        valueSet: 'http://example.org/ValueSet/filtered-codes',
        policyMode: 'strict',
      },
    };

    const explanation = explainAmbiguity(issue);

    expect(explanation).not.toBeNull();
    expect(explanation!.what).toContain('Validation ambiguity detected');
    expect(explanation!.why).toContain('not be completed deterministically');
    expect(explanation!.context).toContain('ValueSet uses filter-based expansion');
    expect(explanation!.context).toContain('does NOT mean the data is valid');
    expect(explanation!.policy).toContain('Strict mode: Ambiguity treated as ERROR');
  });

  it('includes proper warning message that ambiguity is not validity', () => {
    const issue: ValidationIssue = {
      source: 'StructureDefinition',
      severity: 'warning',
      errorCode: 'SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED',
      path: 'Bundle.entry[1].resource.status',
      message: 'Ambiguous validation',
      details: {
        violationReason: 'CodeSystem not available offline',
        policyMode: 'permissive',
      },
    };

    const explanation = explainAmbiguity(issue);

    expect(explanation).not.toBeNull();
    expect(explanation!.context).toContain('does NOT mean the data is valid');
    expect(explanation!.context).toContain('cannot confirm validity');
    expect(explanation!.policy).toContain('Permissive mode: Ambiguity treated as WARNING');
  });

  it('returns null when violationReason is not present', () => {
    const issue: ValidationIssue = {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_REQUIRED_BINDING_INVALID_CODE',
      path: 'Bundle.entry[0].resource.status',
      message: 'Invalid code',
      details: {
        actual: 'invalid-code',
        valueSet: 'http://example.org/ValueSet/status-codes',
      },
    };

    const explanation = explainAmbiguity(issue);

    expect(explanation).toBeNull();
  });

  it('returns null when details are missing entirely', () => {
    const issue: ValidationIssue = {
      source: 'Syntax',
      severity: 'error',
      errorCode: 'SYNTAX_ERROR',
      path: 'Bundle',
      message: 'Syntax error',
    };

    const explanation = explainAmbiguity(issue);

    expect(explanation).toBeNull();
  });

  it('includes links to documentation', () => {
    const issue: ValidationIssue = {
      source: 'StructureDefinition',
      severity: 'error',
      errorCode: 'SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED',
      path: 'Bundle.entry[0].resource.code',
      message: 'ValueSet cannot be expanded',
      details: {
        violationReason: 'ValueSet uses entire-system includes',
        policyMode: 'strict',
      },
    };

    const explanation = explainAmbiguity(issue);

    expect(explanation).not.toBeNull();
    expect(explanation!.links).toBeDefined();
    expect(explanation!.links!.length).toBeGreaterThan(0);
    expect(explanation!.links!.some(link => link.href === '/validation/capabilities')).toBe(true);
  });
});
