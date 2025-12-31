/**
 * GLOBAL FRONTEND FALLBACK RULE - Unit Tests
 * 
 * Tests the fallback behavior for unknown or malformed validation errors.
 * 
 * Rules:
 * 1. If errorCode is unknown → show generic validation message
 * 2. If details are missing or invalid → show generic validation message
 * 3. UI MUST NEVER:
 *    - throw
 *    - render empty panel
 *    - depend on backend message text
 * 
 * Fallback Message:
 * - Title: "Validation error"
 * - Description: "This item does not meet validation requirements."
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getErrorMessage, renderErrorMessage, DEFAULT_ERROR_MESSAGE } from '../errorMessages';
import type { ValidationIssue } from '../errorMessages';

describe('GLOBAL FRONTEND FALLBACK RULE', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console.warn to verify warning is logged
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('getErrorMessage - Unknown errorCode', () => {
    it('should return fallback message for unknown errorCode', () => {
      const message = getErrorMessage('UNKNOWN_ERROR_CODE_XYZ');

      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
      expect(message.title).toBe('Validation error');
      expect(message.summary).toBe('This item does not meet validation requirements.');
    });

    it('should log console warning for unknown errorCode', () => {
      getErrorMessage('UNKNOWN_ERROR_CODE_XYZ');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ValidationError] Unknown errorCode: "UNKNOWN_ERROR_CODE_XYZ". Using fallback message.'
      );
    });

    it('should return fallback message for empty errorCode', () => {
      const message = getErrorMessage('');

      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
      expect(message.title).toBe('Validation error');
      expect(message.summary).toBe('This item does not meet validation requirements.');
    });

    it('should return fallback message for null-ish errorCode', () => {
      // @ts-expect-error Testing runtime safety
      const message = getErrorMessage(null);

      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
    });
  });

  describe('renderErrorMessage - Fallback behavior', () => {
    it('should render fallback message for unknown errorCode', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN'
      };

      const result = renderErrorMessage(issue, 'summary');

      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
      expect(result.userHint).toBeUndefined();
    });

    it('should render fallback message in detailed mode', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN'
      };

      const result = renderErrorMessage(issue, 'detailed');

      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
      expect(result.details).toEqual([]);
      expect(result.remediation).toBe('Review the validation requirements and correct the issue');
    });

    it('should render fallback even with missing details property', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN',
        details: undefined // Missing details
      };

      const result = renderErrorMessage(issue, 'detailed');

      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
      expect(result.details).toEqual([]);
    });

    it('should render fallback even with invalid details structure', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN',
        details: { invalid: 'structure', missing: 'expected keys' }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Should not throw, should return safe fallback
      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
    });

    it('should preserve userHint even with unknown errorCode', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN',
        userHint: 'Custom user hint from backend'
      };

      const result = renderErrorMessage(issue, 'summary');

      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
      expect(result.userHint).toBe('Custom user hint from backend');
    });
  });

  describe('Fallback never throws', () => {
    it('should not throw for completely malformed issue', () => {
      const issue = {
        errorCode: 'UNKNOWN',
        severity: 'error',
        source: 'UNKNOWN',
        // @ts-expect-error Testing runtime safety
        details: null,
        path: undefined,
        resourceType: undefined
      } as ValidationIssue;

      expect(() => renderErrorMessage(issue, 'detailed')).not.toThrow();
    });

    it('should not throw for multiple unknown errorCodes in sequence', () => {
      const unknownCodes = [
        'UNKNOWN_1',
        'UNKNOWN_2',
        'UNKNOWN_3',
        'MADE_UP_ERROR',
        'TYPO_ERROR_CODE'
      ];

      unknownCodes.forEach(code => {
        expect(() => getErrorMessage(code)).not.toThrow();
      });

      // Should have logged 5 warnings (one per unknown code)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('Fallback message contract', () => {
    it('should have exact title: "Validation error"', () => {
      const message = getErrorMessage('UNKNOWN_ERROR_CODE');
      expect(message.title).toBe('Validation error');
    });

    it('should have exact summary: "This item does not meet validation requirements."', () => {
      const message = getErrorMessage('UNKNOWN_ERROR_CODE');
      expect(message.summary).toBe('This item does not meet validation requirements.');
    });

    it('should provide empty details array', () => {
      const message = getErrorMessage('UNKNOWN_ERROR_CODE');
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN',
        severity: 'error',
        source: 'UNKNOWN'
      };
      expect(message.details?.(issue)).toEqual([]);
    });

    it('should provide safe remediation text', () => {
      const message = getErrorMessage('UNKNOWN_ERROR_CODE');
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN',
        severity: 'error',
        source: 'UNKNOWN'
      };
      expect(message.remediation?.(issue)).toBe('Review the validation requirements and correct the issue');
    });
  });

  describe('Known errorCodes should NOT trigger fallback', () => {
    it('should return specific message for VALUE_NOT_ALLOWED', () => {
      const message = getErrorMessage('VALUE_NOT_ALLOWED');

      expect(message).not.toBe(DEFAULT_ERROR_MESSAGE);
      expect(message.title).not.toBe('Validation error');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return specific message for FIELD_REQUIRED', () => {
      const message = getErrorMessage('FIELD_REQUIRED');

      expect(message).not.toBe(DEFAULT_ERROR_MESSAGE);
      expect(message.title).not.toBe('Validation error');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return specific message for REFERENCE_NOT_FOUND', () => {
      const message = getErrorMessage('REFERENCE_NOT_FOUND');

      expect(message).not.toBe(DEFAULT_ERROR_MESSAGE);
      expect(message.title).not.toBe('Validation error');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('DO NOT behaviors', () => {
    it('should NOT attempt to infer meaning from unknown errorCode', () => {
      // If errorCode contains "required", should NOT automatically treat as required error
      const message = getErrorMessage('SOME_UNKNOWN_REQUIRED_ERROR');
      
      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
      expect(message.title).toBe('Validation error'); // Generic, not inferred
    });

    it('should NOT parse jsonPointer from fallback', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN',
        navigation: {
          jsonPointer: '/entry/0/resource/identifier/1/system'
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Fallback should NOT include jsonPointer parsing
      expect(result.details).toEqual([]);
    });

    it('should NOT inspect bundle JSON from fallback', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN',
        details: {
          bundleJson: '{"resourceType": "Bundle"}', // Should ignore
          someBundleData: { entry: [] } // Should ignore
        }
      };

      const result = renderErrorMessage(issue, 'detailed');

      // Fallback should NOT attempt to parse bundle
      expect(result.details).toEqual([]);
    });

    it('should NOT depend on backend message text', () => {
      const issue: ValidationIssue = {
        errorCode: 'UNKNOWN_ERROR_CODE',
        severity: 'error',
        source: 'UNKNOWN',
        details: {
          message: 'Some backend error message', // Should ignore
          errorMessage: 'Another backend message' // Should ignore
        }
      };

      const result = renderErrorMessage(issue);

      // Should use fallback, NOT backend message
      expect(result.title).toBe('Validation error');
      expect(result.summary).toBe('This item does not meet validation requirements.');
      expect(result.summary).not.toContain('Some backend error message');
    });
  });
});
