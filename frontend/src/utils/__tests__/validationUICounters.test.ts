/**
 * Tests for Validation UI Counters
 * 
 * Ensures counters match visible items and handle filtering correctly
 */

import { describe, it, expect } from 'vitest';
import {
  buildValidationUICounters,
  getValidationStatusText,
  isBlockingError,
  isQualityFinding,
  isGuidanceFinding,
  filterBlockingErrors,
  filterQualityFindings,
  filterGuidanceFindings,
} from '../validationUICounters';
import type { ValidationError } from '../../contexts/project-validation/useProjectValidation';

// Mock validation errors
const createError = (source: string, severity: string = 'error'): ValidationError => ({
  source,
  severity,
  resourceType: 'Patient',
  path: 'Patient.name',
  jsonPointer: '/entry/0/resource/name',
  errorCode: 'TEST_ERROR',
  message: 'Test error message',
  details: {},
  navigation: null,
});

describe('validationUICounters', () => {
  describe('isBlockingError', () => {
    it('identifies FHIR errors as blocking', () => {
      expect(isBlockingError(createError('FHIR'))).toBe(true);
    });

    it('identifies Business errors as blocking', () => {
      expect(isBlockingError(createError('Business'))).toBe(true);
    });

    it('identifies CodeMaster errors as blocking', () => {
      expect(isBlockingError(createError('CodeMaster'))).toBe(true);
    });

    it('identifies Reference errors as blocking', () => {
      expect(isBlockingError(createError('Reference'))).toBe(true);
    });

    it('identifies LINT as non-blocking', () => {
      expect(isBlockingError(createError('LINT'))).toBe(false);
    });

    it('identifies SPECHINT as non-blocking', () => {
      expect(isBlockingError(createError('SPECHINT'))).toBe(false);
    });
  });

  describe('isQualityFinding', () => {
    it('identifies LINT as quality finding', () => {
      expect(isQualityFinding(createError('LINT'))).toBe(true);
    });

    it('does not identify FHIR as quality finding', () => {
      expect(isQualityFinding(createError('FHIR'))).toBe(false);
    });
  });

  describe('isGuidanceFinding', () => {
    it('identifies SPECHINT as guidance', () => {
      expect(isGuidanceFinding(createError('SPECHINT'))).toBe(true);
    });

    it('does not identify LINT as guidance', () => {
      expect(isGuidanceFinding(createError('LINT'))).toBe(false);
    });
  });

  describe('buildValidationUICounters', () => {
    it('counts all visible errors by category', () => {
      const errors = [
        createError('FHIR'),
        createError('FHIR'),
        createError('Business'),
        createError('LINT'),
        createError('LINT'),
        createError('SPECHINT'),
      ];

      const counters = buildValidationUICounters(errors, {
        lint: true,
        reference: true,
        firely: true,
        business: true,
        codeMaster: true,
        specHint: true,
      });

      expect(counters.blocking).toBe(3); // 2 FHIR + 1 Business
      expect(counters.quality).toBe(2);  // 2 LINT
      expect(counters.guidance).toBe(1);  // 1 SPECHINT
      expect(counters.total).toBe(6);
    });

    it('excludes filtered sources from counts', () => {
      const errors = [
        createError('FHIR'),
        createError('LINT'),
        createError('SPECHINT'),
      ];

      const counters = buildValidationUICounters(errors, {
        lint: false,        // Filter out LINT
        reference: true,
        firely: true,
        business: true,
        codeMaster: true,
        specHint: false,    // Filter out SPECHINT
      });

      expect(counters.blocking).toBe(1); // Only FHIR
      expect(counters.quality).toBe(0);  // LINT filtered out
      expect(counters.guidance).toBe(0); // SPECHINT filtered out
      expect(counters.total).toBe(1);
    });

    it('returns zero counts for empty error list', () => {
      const counters = buildValidationUICounters([], {
        lint: true,
        reference: true,
        firely: true,
        business: true,
        codeMaster: true,
        specHint: true,
      });

      expect(counters.blocking).toBe(0);
      expect(counters.quality).toBe(0);
      expect(counters.guidance).toBe(0);
      expect(counters.total).toBe(0);
    });
  });

  describe('getValidationStatusText', () => {
    it('returns failed status when blocking issues exist', () => {
      const status = getValidationStatusText({
        blocking: 5,
        quality: 2,
        guidance: 1,
        total: 8,
      });

      expect(status.variant).toBe('failed');
      expect(status.label).toBe('Validation Failed');
      expect(status.message).toContain('5 blocking');
    });

    it('returns warning status when only advisory issues exist', () => {
      const status = getValidationStatusText({
        blocking: 0,
        quality: 3,
        guidance: 2,
        total: 5,
      });

      expect(status.variant).toBe('warning');
      expect(status.label).toBe('Validation Passed with Warnings');
      expect(status.message).toContain('5 advisory');
    });

    it('returns success status when no issues exist', () => {
      const status = getValidationStatusText({
        blocking: 0,
        quality: 0,
        guidance: 0,
        total: 0,
      });

      expect(status.variant).toBe('success');
      expect(status.label).toBe('Validation Passed');
      expect(status.message).toContain('No blocking or advisory');
    });
  });

  describe('filter functions', () => {
    const errors = [
      createError('FHIR'),
      createError('Business'),
      createError('LINT'),
      createError('SPECHINT'),
      createError('CodeMaster'),
    ];

    it('filterBlockingErrors returns only blocking sources', () => {
      const blocking = filterBlockingErrors(errors);
      expect(blocking).toHaveLength(3);
      expect(blocking.every(isBlockingError)).toBe(true);
    });

    it('filterQualityFindings returns only LINT', () => {
      const quality = filterQualityFindings(errors);
      expect(quality).toHaveLength(1);
      expect(quality[0].source).toBe('LINT');
    });

    it('filterGuidanceFindings returns only SPECHINT', () => {
      const guidance = filterGuidanceFindings(errors);
      expect(guidance).toHaveLength(1);
      expect(guidance[0].source).toBe('SPECHINT');
    });
  });

  describe('UI counter contract', () => {
    it('ensures counters match visible items when filters change', () => {
      const errors = [
        createError('FHIR'),
        createError('FHIR'),
        createError('LINT'),
        createError('LINT'),
        createError('LINT'),
      ];

      // All visible
      const allVisible = buildValidationUICounters(errors, {
        lint: true,
        reference: true,
        firely: true,
        business: true,
        codeMaster: true,
        specHint: true,
      });
      expect(allVisible.total).toBe(5);

      // Hide LINT
      const lintHidden = buildValidationUICounters(errors, {
        lint: false, // Hide LINT
        reference: true,
        firely: true,
        business: true,
        codeMaster: true,
        specHint: true,
      });
      expect(lintHidden.total).toBe(2); // Only FHIR errors visible
      expect(lintHidden.quality).toBe(0); // LINT hidden

      // Hide FHIR
      const fhirHidden = buildValidationUICounters(errors, {
        lint: true,
        reference: true,
        firely: false, // Hide FHIR
        business: true,
        codeMaster: true,
        specHint: true,
      });
      expect(fhirHidden.total).toBe(3); // Only LINT errors visible
      expect(fhirHidden.blocking).toBe(0); // FHIR hidden
    });
  });
});
