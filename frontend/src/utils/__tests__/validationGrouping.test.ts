/**
 * Tests for Validation Issue Grouping
 * 
 * Critical requirement: Each issue retains its own message within groups.
 */

import { describe, it, expect } from 'vitest';
import { groupValidationIssues, convertToIssue } from '../validationGrouping';
import type { ValidationError } from '../../contexts/project-validation/useProjectValidation';

describe('validationGrouping', () => {
  describe('convertToIssue', () => {
    it('should preserve individual error message', () => {
      const error: ValidationError = {
        source: 'Business',
        severity: 'error',
        resourceType: 'Patient',
        path: 'gender',
        errorCode: 'MANDATORY_MISSING',
        message: 'Patient.gender is required.',
        details: { ruleId: 'rule-001' },
      };

      const issue = convertToIssue(error, 0);

      expect(issue.message).toBe('Patient.gender is required.');
      expect(issue.source).toBe('PROJECT');
      expect(issue.code).toBe('MANDATORY_MISSING');
      expect(issue.ruleId).toBe('rule-001');
    });
  });

  describe('groupValidationIssues', () => {
    it('should group errors with same source+code but preserve different messages', () => {
      const errors: ValidationError[] = [
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'gender',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.gender is required.',
          details: { ruleId: 'rule-001' },
        },
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'language',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.language is required.',
          details: { ruleId: 'rule-001' },
        },
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'name',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.name is required.',
          details: { ruleId: 'rule-001' },
        },
      ];

      const { grouped, ungrouped } = groupValidationIssues(errors);

      expect(grouped).toHaveLength(1);
      expect(ungrouped).toHaveLength(0);

      const group = grouped[0];
      expect(group.count).toBe(3);
      expect(group.items).toHaveLength(3);

      // CRITICAL: Each item must have its own message
      expect(group.items[0].message).toBe('Patient.gender is required.');
      expect(group.items[1].message).toBe('Patient.language is required.');
      expect(group.items[2].message).toBe('Patient.name is required.');
    });

    it('should not group errors with different messages as duplicates', () => {
      const errors: ValidationError[] = [
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'gender',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.gender is required.',
          details: { ruleId: 'rule-001' },
        },
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'language',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.language is required.',
          details: { ruleId: 'rule-001' },
        },
      ];

      const { grouped } = groupValidationIssues(errors);
      const group = grouped[0];

      // Should have 2 distinct items, not treat them as duplicates
      expect(group.items).toHaveLength(2);
      expect(group.count).toBe(2);
    });

    it('should handle single errors as ungrouped', () => {
      const errors: ValidationError[] = [
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'gender',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.gender is required.',
          details: { ruleId: 'rule-001' },
        },
      ];

      const { grouped, ungrouped } = groupValidationIssues(errors);

      expect(grouped).toHaveLength(0);
      expect(ungrouped).toHaveLength(1);
      expect(ungrouped[0].message).toBe('Patient.gender is required.');
    });

    it('should group by ruleId for PROJECT source', () => {
      const errors: ValidationError[] = [
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'gender',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.gender is required.',
          details: { ruleId: 'rule-001' },
        },
        {
          source: 'Business',
          severity: 'error',
          resourceType: 'Patient',
          path: 'birthDate',
          errorCode: 'MANDATORY_MISSING',
          message: 'Patient.birthDate is required.',
          details: { ruleId: 'rule-002' }, // Different ruleId
        },
      ];

      const { grouped, ungrouped } = groupValidationIssues(errors);

      // Should create 2 separate groups because different ruleIds
      expect(grouped).toHaveLength(0);
      expect(ungrouped).toHaveLength(2);
    });

    it('should handle FHIR structural errors correctly', () => {
      const errors: ValidationError[] = [
        {
          source: 'FHIR',
          severity: 'error',
          resourceType: 'Patient',
          path: 'gender',
          errorCode: 'STRUCTURE',
          message: 'Type checking the data: Encountered unknown element "gender"',
          details: {},
        },
        {
          source: 'FHIR',
          severity: 'error',
          resourceType: 'Patient',
          path: 'identifier',
          errorCode: 'STRUCTURE',
          message: 'Type checking the data: Encountered unknown element "identifier"',
          details: {},
        },
      ];

      const { grouped, ungrouped } = groupValidationIssues(errors);

      // FHIR errors group by source+code only
      expect(grouped).toHaveLength(1);
      const group = grouped[0];
      expect(group.source).toBe('FHIR');
      expect(group.code).toBe('STRUCTURE');
      expect(group.items).toHaveLength(2);

      // Each item has different message
      expect(group.items[0].message).toContain('"gender"');
      expect(group.items[1].message).toContain('"identifier"');
    });
  });
});
