/**
 * Tests for Validation Severity Mapper
 * 
 * Ensures STRUCTURE errors are treated as blocking with red UI presentation
 */

import { describe, it, expect } from 'vitest';
import {
  mapFindingToUiPresentation,
  isBlockingError,
  filterBlockingErrors,
  filterAdvisoryFindings,
} from '../validationSeverityMapper';
import type { ValidationFinding } from '../validationSeverityMapper';

const createFinding = (source: string, severity: string = 'error'): ValidationFinding => ({
  source,
  severity,
  errorCode: 'TEST_ERROR',
  message: 'Test error message',
});

describe('validationSeverityMapper', () => {
  describe('mapFindingToUiPresentation', () => {
    it('maps STRUCTURE errors to red blocking presentation', () => {
      const finding = createFinding('STRUCTURE', 'error');
      const result = mapFindingToUiPresentation(finding);

      expect(result.isBlocking).toBe(true);
      expect(result.color).toBe('red');
      expect(result.icon).toBe('error');
      expect(result.displaySeverity).toBe('error');
    });

    it('maps FHIR errors to red blocking presentation', () => {
      const finding = createFinding('FHIR', 'error');
      const result = mapFindingToUiPresentation(finding);

      expect(result.isBlocking).toBe(true);
      expect(result.color).toBe('red');
      expect(result.icon).toBe('error');
    });

    it('maps Business errors to red blocking presentation', () => {
      const finding = createFinding('Business', 'error');
      const result = mapFindingToUiPresentation(finding);

      expect(result.isBlocking).toBe(true);
      expect(result.color).toBe('red');
    });

    it('maps LINT findings to amber advisory presentation', () => {
      const finding = createFinding('LINT', 'error');
      const result = mapFindingToUiPresentation(finding);

      expect(result.isBlocking).toBe(false);
      expect(result.color).toBe('amber');
      expect(result.icon).toBe('warning');
      expect(result.displaySeverity).toBe('warning');
    });

    it('maps SPEC_HINT findings to amber advisory presentation', () => {
      const finding = createFinding('SPEC_HINT', 'error');
      const result = mapFindingToUiPresentation(finding);

      expect(result.isBlocking).toBe(false);
      expect(result.color).toBe('amber'); // ADVISORY_SOURCES gets checked first
      expect(result.icon).toBe('warning');
      expect(result.displaySeverity).toBe('warning');
    });
  });

  describe('isBlockingError', () => {
    it('identifies STRUCTURE as blocking', () => {
      expect(isBlockingError(createFinding('STRUCTURE'))).toBe(true);
    });

    it('identifies FHIR as blocking', () => {
      expect(isBlockingError(createFinding('FHIR'))).toBe(true);
    });

    it('identifies Business as blocking', () => {
      expect(isBlockingError(createFinding('Business'))).toBe(true);
    });

    it('identifies CodeMaster as blocking', () => {
      expect(isBlockingError(createFinding('CodeMaster'))).toBe(true);
    });

    it('identifies Reference as blocking', () => {
      expect(isBlockingError(createFinding('Reference'))).toBe(true);
    });

    it('identifies LINT as non-blocking', () => {
      expect(isBlockingError(createFinding('LINT'))).toBe(false);
    });

    it('identifies SPEC_HINT as non-blocking', () => {
      expect(isBlockingError(createFinding('SPEC_HINT'))).toBe(false);
    });

    it('identifies HL7_SPEC_HINT as non-blocking', () => {
      expect(isBlockingError(createFinding('HL7_SPEC_HINT'))).toBe(false);
    });
  });

  describe('filterBlockingErrors', () => {
    it('filters to include only STRUCTURE and other blocking errors', () => {
      const findings: ValidationFinding[] = [
        createFinding('STRUCTURE'),
        createFinding('FHIR'),
        createFinding('Business'),
        createFinding('LINT'),
        createFinding('SPEC_HINT'),
      ];

      const blocking = filterBlockingErrors(findings);

      expect(blocking).toHaveLength(3);
      expect(blocking.map(f => f.source)).toEqual(['STRUCTURE', 'FHIR', 'Business']);
    });
  });

  describe('filterAdvisoryFindings', () => {
    it('filters to exclude STRUCTURE and other blocking errors', () => {
      const findings: ValidationFinding[] = [
        createFinding('STRUCTURE'),
        createFinding('FHIR'),
        createFinding('LINT'),
        createFinding('SPEC_HINT'),
      ];

      const advisory = filterAdvisoryFindings(findings);

      expect(advisory).toHaveLength(2);
      expect(advisory.map(f => f.source)).toEqual(['LINT', 'SPEC_HINT']);
    });
  });

  describe('STRUCTURE vs SPEC_HINT semantic distinction', () => {
    it('STRUCTURE errors are always blocking (must fix)', () => {
      const structureError = createFinding('STRUCTURE', 'error');
      const presentation = mapFindingToUiPresentation(structureError);

      expect(presentation.isBlocking).toBe(true);
      expect(presentation.label).toContain('Blocking');
    });

    it('SPEC_HINT findings are never blocking (advisory)', () => {
      const specHint = createFinding('SPEC_HINT', 'error');
      const presentation = mapFindingToUiPresentation(specHint);

      expect(presentation.isBlocking).toBe(false);
      expect(presentation.displaySeverity).not.toBe('error');
    });

    it('STRUCTURE and SPEC_HINT are visually distinct', () => {
      const structure = mapFindingToUiPresentation(createFinding('STRUCTURE'));
      const specHint = mapFindingToUiPresentation(createFinding('SPEC_HINT'));

      // STRUCTURE is red (blocking), SPEC_HINT is amber (advisory)
      expect(structure.color).toBe('red');
      expect(specHint.color).toBe('amber');

      // STRUCTURE uses error icon, SPEC_HINT uses warning icon
      expect(structure.icon).toBe('error');
      expect(specHint.icon).toBe('warning');
    });
  });
});
