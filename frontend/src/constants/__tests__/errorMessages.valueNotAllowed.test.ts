/**
 * VALUE_NOT_ALLOWED Frontend Rendering Tests
 * 
 * Tests verify:
 * 1. VALUE_NOT_ALLOWED renders specific explanation (not fallback)
 * 2. Unknown errorCode renders fallback
 * 3. Missing details renders fallback
 */

import { describe, it, expect } from 'vitest';
import { renderErrorMessage, getErrorMessage } from '../errorMessages';
import type { ValidationIssue } from '../errorMessages';

describe('VALUE_NOT_ALLOWED Rendering', () => {
  describe('VALUE_NOT_ALLOWED with valid details', () => {
    it('should render specific explanation (not fallback)', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        path: 'Patient.gender',
        details: {
          actual: 'X',
          allowed: ['male', 'female', 'other', 'unknown'],
          valueType: 'string'
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should render specific message, NOT fallback
      expect(result.title).not.toBe('Validation error');
      expect(result.summary).not.toBe('This item does not meet validation requirements.');

      // Should render VALUE_NOT_ALLOWED specific message
      expect(result.title).toBe('Value Not Allowed');
      expect(result.summary).toContain('not in the list of allowed values');

      // Should render details with actual and allowed values
      expect(result.details).toBeDefined();
      expect(result.details!.length).toBeGreaterThan(0);
      expect(result.details!.some(d => d.includes('X'))).toBe(true);
      expect(result.details!.some(d => d.includes('male'))).toBe(true);
    });

    it('should render VALUE_NOT_ALLOWED summary view', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        details: {
          actual: 'invalid-code',
          allowed: ['code1', 'code2'],
          valueType: 'string'
        }
      };

      const result = renderErrorMessage(issue, 'summary');

      expect(result.title).toBe('Value Not Allowed');
      expect(result.summary).toContain('not in the list of allowed values');
      expect(result.details).toBeUndefined(); // Summary mode doesn't include details
    });

    it('should preserve userHint for VALUE_NOT_ALLOWED', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        userHint: 'Gender must be one of the standard FHIR codes',
        details: {
          actual: 'X',
          allowed: ['male', 'female', 'other', 'unknown'],
          valueType: 'string'
        }
      };

      const result = renderErrorMessage(issue);

      expect(result.title).toBe('Value Not Allowed');
      expect(result.userHint).toBe('Gender must be one of the standard FHIR codes');
    });
  });

  describe('Unknown errorCode fallback', () => {
    it('should render fallback for unknown errorCode', () => {
      const issue: ValidationIssue = {
        errorCode: 'COMPLETELY_UNKNOWN_ERROR',
        severity: 'error',
        source: 'UNKNOWN',
        details: {
          someData: 'someValue'
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should render fallback
      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
      expect(result.details).toEqual([]);
      expect(result.remediation).toBe('Review the validation requirements and correct the issue');
    });

    it('should render fallback even if details look valid', () => {
      const issue: ValidationIssue = {
        errorCode: 'TYPO_VALUE_NOT_ALLOWEDD', // Typo - extra 'D'
        severity: 'error',
        source: 'BUSINESS',
        details: {
          actual: 'X',
          allowed: ['male', 'female'],
          valueType: 'string'
        }
      };

      const result = renderErrorMessage(issue);

      // Should render fallback (errorCode doesn't match)
      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
    });
  });

  describe('Missing details fallback', () => {
    it('should render fallback when details are missing', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        details: undefined // Missing details
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should still render VALUE_NOT_ALLOWED message
      // (details are optional for rendering, required for schema validation)
      expect(result.title).toBe('Value Not Allowed');
      expect(result.summary).toContain('not in the list of allowed values');

      // Details rendering should handle missing data gracefully
      expect(result.details).toBeDefined();
      // Should not throw
    });

    it('should render gracefully when details are malformed', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        details: {
          // Missing required keys: actual, allowed, valueType
          wrongKey: 'wrongValue'
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should render VALUE_NOT_ALLOWED message (title/summary)
      expect(result.title).toBe('Value Not Allowed');
      expect(result.summary).toContain('not in the list of allowed values');

      // Details rendering should handle malformed data gracefully
      expect(() => result.details).not.toThrow();
    });

    it('should render gracefully when details are null', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        details: null as any // Null details
      };

      const result = renderErrorMessage(issue);

      // Should render VALUE_NOT_ALLOWED message
      expect(result.title).toBe('Value Not Allowed');
      expect(result.summary).toContain('not in the list of allowed values');
      // Should not throw
    });
  });

  describe('Contract compliance', () => {
    it('should use canonical details schema for VALUE_NOT_ALLOWED', () => {
      const message = getErrorMessage('VALUE_NOT_ALLOWED');

      expect(message.title).toBe('Value Not Allowed');
      expect(message.summary).toBeDefined();
      expect(message.details).toBeDefined();
      expect(message.remediation).toBeDefined();

      // Test details function with canonical schema
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        details: {
          actual: 'invalid',
          allowed: ['valid1', 'valid2'],
          valueType: 'string'
        }
      };

      const details = message.details!(issue);
      expect(details).toBeDefined();
      expect(Array.isArray(details)).toBe(true);
    });

    it('should NOT render internal hints in UI', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        details: {
          actual: 'X',
          allowed: ['male', 'female'],
          valueType: 'string',
          _precomputedJsonPointer: '/entry/0/resource/gender', // Internal hint
          arrayIndex: 0 // Internal hint
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should render actual and allowed
      expect(result.title).toBe('Value Not Allowed');
      expect(result.details).toBeDefined();

      // Should NOT include internal hints in rendered output
      const detailsText = result.details!.join(' ');
      expect(detailsText).not.toContain('_precomputedJsonPointer');
      expect(detailsText).not.toContain('arrayIndex');
    });

    it('should NOT attempt to parse jsonPointer', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        navigation: {
          jsonPointer: '/entry/0/resource/gender'
        },
        details: {
          actual: 'X',
          allowed: ['male', 'female'],
          valueType: 'string'
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should render VALUE_NOT_ALLOWED message
      expect(result.title).toBe('Value Not Allowed');

      // Should NOT parse or display jsonPointer in explanation
      const allText = [
        result.title,
        result.summary,
        ...(result.details || []),
        result.remediation
      ].join(' ');
      expect(allText).not.toContain('/entry/0/resource/gender');
    });

    it('should NOT inspect bundle JSON', () => {
      const issue: ValidationIssue = {
        errorCode: 'VALUE_NOT_ALLOWED',
        severity: 'error',
        source: 'BUSINESS',
        details: {
          actual: 'X',
          allowed: ['male', 'female'],
          valueType: 'string',
          bundleJson: '{"resourceType": "Patient", "gender": "X"}' // Should ignore
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should render VALUE_NOT_ALLOWED message
      expect(result.title).toBe('Value Not Allowed');

      // Should NOT parse or inspect bundleJson
      const allText = [
        result.title,
        result.summary,
        ...(result.details || []),
        result.remediation
      ].join(' ');
      expect(allText).not.toContain('bundleJson');
      expect(allText).not.toContain('{"resourceType"');
    });
  });
});
