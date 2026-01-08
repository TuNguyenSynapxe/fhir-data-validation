import { describe, it, expect } from 'vitest';
import {
  getRegistry,
  registerExplanation,
  createDefaultExplanation,
  getExplanationForCode,
} from '../explanationRegistry';
import type { ValidationIssue } from '../../model/ValidationIssue';

describe('explanationRegistry', () => {
  describe('getRegistry', () => {
    it('returns registry with known error codes', () => {
      const registry = getRegistry();

      expect(registry).toHaveProperty('SD_REQUIRED_BINDING_INVALID_CODE');
      expect(registry).toHaveProperty('SD_CARDINALITY_MIN_VIOLATION');
      expect(registry).toHaveProperty('SD_CARDINALITY_MAX_VIOLATION');
      expect(registry).toHaveProperty('SD_FIXED_VALUE_MISSING');
      expect(registry).toHaveProperty('SD_FIXED_VALUE_MISMATCH');
      expect(registry).toHaveProperty('SD_PATTERN_MISSING');
      expect(registry).toHaveProperty('SD_PATTERN_MISMATCH');
      expect(registry).toHaveProperty('SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED');
      expect(registry).toHaveProperty('SD_REQUIRED_BINDING_MISSING');
    });
  });

  describe('registerExplanation', () => {
    it('allows registering custom explanation', () => {
      const customIssue: ValidationIssue = {
        source: 'FHIRPath',
        severity: 'error',
        errorCode: 'CUSTOM_ERROR_CODE',
        path: 'Bundle.entry[0]',
        message: 'Custom error',
      };

      registerExplanation('CUSTOM_ERROR_CODE', (issue) => ({
        what: 'Custom what',
        why: 'Custom why',
        context: `Path: ${issue.path}`,
      }));

      const explanation = getExplanationForCode(customIssue);

      expect(explanation.what).toBe('Custom what');
      expect(explanation.why).toBe('Custom why');
      expect(explanation.context).toContain('Bundle.entry[0]');
    });
  });

  describe('createDefaultExplanation', () => {
    it('creates fallback explanation using issue fields', () => {
      const issue: ValidationIssue = {
        source: 'Reference',
        severity: 'warning',
        errorCode: 'UNKNOWN_ERROR',
        path: 'Bundle.entry[3].resource.subject',
        message: 'Reference cannot be resolved',
        details: {
          policyMode: 'permissive',
        },
      };

      const explanation = createDefaultExplanation(issue);

      expect(explanation.what).toBe('Reference cannot be resolved');
      expect(explanation.why).toContain('Bundle.entry[3].resource.subject');
      expect(explanation.context).toContain('Source: Reference');
      expect(explanation.context).toContain('Error code: UNKNOWN_ERROR');
      expect(explanation.policy).toContain('Policy: permissive');
    });

    it('handles missing details gracefully', () => {
      const issue: ValidationIssue = {
        source: 'Syntax',
        severity: 'error',
        errorCode: 'SYNTAX_ERROR',
        path: 'Bundle',
        message: 'JSON parse error',
      };

      const explanation = createDefaultExplanation(issue);

      expect(explanation.what).toBe('JSON parse error');
      expect(explanation.why).toContain('Bundle');
      expect(explanation.context).toBeDefined();
      expect(explanation.policy).toBeUndefined();
    });
  });

  describe('getExplanationForCode', () => {
    it('returns registry explanation for known code', () => {
      const issue: ValidationIssue = {
        source: 'StructureDefinition',
        severity: 'error',
        errorCode: 'SD_FIXED_VALUE_MISMATCH',
        path: 'Bundle.type',
        message: 'Fixed value mismatch',
        details: {
          expected: 'collection',
          actual: 'document',
        },
      };

      const explanation = getExplanationForCode(issue);

      expect(explanation.what).toContain('does not match fixed value constraint');
      expect(explanation.why).toContain('collection');
      expect(explanation.why).toContain('document');
    });

    it('returns default explanation for unknown code', () => {
      const issue: ValidationIssue = {
        source: 'FHIRPath',
        severity: 'error',
        errorCode: 'COMPLETELY_UNKNOWN_CODE',
        path: 'Bundle.entry[0]',
        message: 'Unknown validation error',
      };

      const explanation = getExplanationForCode(issue);

      // Should use default explanation
      expect(explanation.what).toBe('Unknown validation error');
      expect(explanation.why).toContain('Bundle.entry[0]');
    });
  });
});
