/**
 * Integration test for Rule Review Engine with isPathObservedInBundle
 * Tests end-to-end PATH_NOT_OBSERVED detection
 */

import { describe, it, expect } from 'vitest';
import { reviewRules } from './ruleReviewEngine';
import type { Rule } from '../../types/rightPanelProps';

describe('Rule Review Engine - PATH_NOT_OBSERVED Integration', () => {
  const sampleBundle = JSON.stringify({
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'patient-001',
          name: [
            {
              family: 'Tan',
              given: ['John'],
            },
          ],
          telecom: [
            {
              system: 'phone',
              value: '+65-1234-5678',
            },
          ],
          gender: 'male',
          birthDate: '1990-01-01',
        },
      },
    ],
  });

  it('should NOT flag Patient.name.family (present via implicit traversal)', () => {
    const rules: Rule[] = [
      {
        id: 'rule-001',
        resourceType: 'Patient',
        path: 'Patient.name.family',
        type: 'required',
        message: 'Family name is required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    // Should NOT have PATH_NOT_OBSERVED issue
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-001'
    );
    expect(pathIssues).toHaveLength(0);
  });

  it('should NOT flag name.family without resourceType prefix (present via implicit traversal)', () => {
    const rules: Rule[] = [
      {
        id: 'rule-002',
        resourceType: 'Patient',
        path: 'name.family',
        type: 'required',
        message: 'Family name is required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    // Rule has resourceType field, so engine should use it even though path lacks prefix
    // With the fix, this should now correctly detect the path
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-002'
    );
    
    // Should NOT have PATH_NOT_OBSERVED issue - path exists in bundle
    expect(pathIssues).toHaveLength(0);
  });

  it('should flag Patient.language (optional field not present)', () => {
    const rules: Rule[] = [
      {
        id: 'rule-003',
        resourceType: 'Patient',
        path: 'Patient.language',
        type: 'required',
        message: 'Language is required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-003'
    );
    expect(pathIssues).toHaveLength(1);
    expect(pathIssues[0].reason).toBe('NOT_PRESENT_IN_SAMPLE');
    expect(pathIssues[0].severity).toBe('info');
  });

  it('should NOT flag Patient.telecom.system (implicit array traversal)', () => {
    const rules: Rule[] = [
      {
        id: 'rule-004',
        resourceType: 'Patient',
        path: 'Patient.telecom.system',
        type: 'required',
        message: 'System is required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-004'
    );
    expect(pathIssues).toHaveLength(0);
  });

  it('should NOT flag name[0].family (explicit index present)', () => {
    const rules: Rule[] = [
      {
        id: 'rule-005',
        resourceType: 'Patient',
        path: 'Patient.name[0].family',
        type: 'required',
        message: 'First name family is required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-005'
    );
    expect(pathIssues).toHaveLength(0);
  });

  it('should flag name[5].family (index out of bounds)', () => {
    const rules: Rule[] = [
      {
        id: 'rule-006',
        resourceType: 'Patient',
        path: 'Patient.name[5].family',
        type: 'required',
        message: 'Fifth name family is required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-006'
    );
    expect(pathIssues).toHaveLength(1);
    expect(pathIssues[0].reason).toBe('NOT_PRESENT_IN_SAMPLE');
  });

  it('should NOT run observation check for INTERNAL_SCHEMA_PATH', () => {
    const rules: Rule[] = [
      {
        id: 'rule-007',
        resourceType: 'Patient',
        path: 'Patient.id.id.extension.url',
        type: 'required',
        message: 'Internal path',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-007'
    );
    
    if (pathIssues.length > 0) {
      // If flagged, should be as INTERNAL_SCHEMA_PATH, not observation-based
      expect(pathIssues[0].reason).toBe('INTERNAL_SCHEMA_PATH');
      expect(pathIssues[0].severity).toBe('info');
    }
  });

  it('should flag Observation.valueQuantity (resource present but path not)', () => {
    const bundleWithObs = JSON.stringify({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-001',
            status: 'final',
            code: { coding: [{ code: '123' }] },
            // No valueQuantity
          },
        },
      ],
    });

    const rules: Rule[] = [
      {
        id: 'rule-008',
        resourceType: 'Observation',
        path: 'Observation.valueQuantity',
        type: 'required',
        message: 'Value is required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, bundleWithObs);
    
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-008'
    );
    expect(pathIssues).toHaveLength(1);
    expect(pathIssues[0].reason).toBe('NOT_PRESENT_IN_SAMPLE');
  });

  it('should flag rule for missing resource type', () => {
    const bundleWithoutPractitioner = JSON.stringify({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: 'p1',
          },
        },
      ],
    });

    const rules: Rule[] = [
      {
        id: 'rule-009',
        resourceType: 'Practitioner',
        path: 'Practitioner.name',
        type: 'required',
        message: 'Practitioner name required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, bundleWithoutPractitioner);
    
    const pathIssues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'rule-009'
    );
    expect(pathIssues).toHaveLength(1);
    expect(pathIssues[0].reason).toBe('RESOURCE_NOT_PRESENT');
    expect(pathIssues[0].severity).toBe('info');
  });

  it('should handle multiple rules efficiently', () => {
    const rules: Rule[] = [
      {
        id: 'r1',
        resourceType: 'Patient',
        path: 'Patient.name.family',
        type: 'required',
        message: 'Family required',
        severity: 'error',
      },
      {
        id: 'r2',
        resourceType: 'Patient',
        path: 'Patient.gender',
        type: 'required',
        message: 'Gender required',
        severity: 'error',
      },
      {
        id: 'r3',
        resourceType: 'Patient',
        path: 'Patient.maritalStatus',
        type: 'required',
        message: 'Status required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    // r1: name.family present (no issue)
    const r1Issues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'r1'
    );
    expect(r1Issues).toHaveLength(0);

    // r2: gender present (no issue)
    const r2Issues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'r2'
    );
    expect(r2Issues).toHaveLength(0);

    // r3: maritalStatus NOT present (issue)
    const r3Issues = result.issues.filter(
      (i) => i.type === 'PATH_NOT_OBSERVED' && i.ruleId === 'r3'
    );
    expect(r3Issues).toHaveLength(1);
    expect(r3Issues[0].reason).toBe('NOT_PRESENT_IN_SAMPLE');
  });

  it('should remain advisory-only (no errors, only info/warning)', () => {
    const rules: Rule[] = [
      {
        id: 'rule-010',
        resourceType: 'Patient',
        path: 'Patient.photo',
        type: 'required',
        message: 'Photo required',
        severity: 'error',
      },
    ];

    const result = reviewRules(rules, sampleBundle);
    
    // All issues should be info or warning, never error (RuleReview is advisory-only)
    // RuleReviewSeverity is 'info' | 'warning', so we check all issues are valid
    const allAdvisory = result.issues.every((i) => i.severity === 'info' || i.severity === 'warning');
    expect(allAdvisory).toBe(true);

    // PATH_NOT_OBSERVED should be info
    const pathIssues = result.issues.filter((i) => i.type === 'PATH_NOT_OBSERVED');
    pathIssues.forEach((issue) => {
      expect(['info', 'warning']).toContain(issue.severity);
    });
  });
});
