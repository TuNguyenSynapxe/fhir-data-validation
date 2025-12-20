/**
 * Unit tests for isPathObservedInBundle
 * Tests implicit array traversal, explicit indexing, and edge cases
 */

import { describe, it, expect } from 'vitest';
import { isPathObservedInBundle } from './ruleReviewUtils';

describe('isPathObservedInBundle', () => {
  // Sample FHIR Bundle with Patient resource
  const sampleBundle = {
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
              given: ['John', 'David'],
            },
            {
              family: 'Lee',
              given: ['Jane'],
            },
          ],
          telecom: [
            {
              system: 'phone',
              value: '+65-1234-5678',
            },
            {
              system: 'email',
              value: 'john.tan@example.com',
            },
          ],
          gender: 'male',
          birthDate: '1990-01-01',
          address: [
            {
              line: ['123 Main St'],
              city: 'Singapore',
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-001',
          status: 'final',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '15074-8',
              },
            ],
          },
        },
      },
    ],
  };

  describe('Implicit Array Traversal', () => {
    it('should find Patient.name.family (implicit traversal)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.name.family',
      });
      expect(result).toBe(true);
    });

    it('should find name.family without resourceType prefix (implicit traversal)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name.family',
      });
      expect(result).toBe(true);
    });

    it('should find Patient.telecom.system (implicit traversal through array)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.telecom.system',
      });
      expect(result).toBe(true);
    });

    it('should find nested array element name.given (implicit traversal)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name.given',
      });
      expect(result).toBe(true);
    });

    it('should find Observation.code.coding.system (nested implicit traversal)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Observation',
        path: 'Observation.code.coding.system',
      });
      expect(result).toBe(true);
    });
  });

  describe('Explicit Array Indexing', () => {
    it('should find name[0].family with explicit index', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name[0].family',
      });
      expect(result).toBe(true);
    });

    it('should find name[1].family with explicit second index', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name[1].family',
      });
      expect(result).toBe(true);
    });

    it('should find telecom[0].system with explicit index', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'telecom[0].system',
      });
      expect(result).toBe(true);
    });

    it('should NOT find name[5].family (index out of bounds)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name[5].family',
      });
      expect(result).toBe(false);
    });

    it('should find name[0].given[1] (nested explicit indices)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name[0].given[1]',
      });
      expect(result).toBe(true);
    });
  });

  describe('Missing Paths', () => {
    it('should NOT find Patient.language (optional field not present)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.language',
      });
      expect(result).toBe(false);
    });

    it('should NOT find Patient.maritalStatus (field not present)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.maritalStatus',
      });
      expect(result).toBe(false);
    });

    it('should NOT find Patient.photo (array field not present)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.photo',
      });
      expect(result).toBe(false);
    });

    it('should NOT find Observation.valueQuantity (not present)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Observation',
        path: 'Observation.valueQuantity',
      });
      expect(result).toBe(false);
    });
  });

  describe('Simple Paths', () => {
    it('should find Patient.gender (simple string field)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.gender',
      });
      expect(result).toBe(true);
    });

    it('should find Patient.birthDate (simple date field)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.birthDate',
      });
      expect(result).toBe(true);
    });

    it('should find Observation.status', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Observation',
        path: 'status',
      });
      expect(result).toBe(true);
    });
  });

  describe('Resource Type Mismatch', () => {
    it('should NOT find path in non-existent resource type', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Practitioner',
        path: 'Practitioner.name',
      });
      expect(result).toBe(false);
    });

    it('should NOT find Patient path when checking Observation', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Observation',
        path: 'name.family',
      });
      expect(result).toBe(false);
    });
  });

  describe('Nested Object Navigation', () => {
    it('should find address.city (nested object)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'address.city',
      });
      expect(result).toBe(true);
    });

    it('should find address[0].line (array with nested array)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'address[0].line',
      });
      expect(result).toBe(true);
    });

    it('should find Observation.code.coding.code (deep nested)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Observation',
        path: 'code.coding.code',
      });
      expect(result).toBe(true);
    });
  });

  describe('Internal Schema Paths', () => {
    it('should NOT find Patient.id.id.extension.url (internal schema artifact)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'Patient.id.id.extension.url',
      });
      expect(result).toBe(false);
    });

    it('should NOT find name.extension.url (schema-level extension)', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name.extension.url',
      });
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bundle', () => {
      const emptyBundle = { resourceType: 'Bundle', entry: [] };
      const result = isPathObservedInBundle({
        bundle: emptyBundle,
        resourceType: 'Patient',
        path: 'Patient.name',
      });
      expect(result).toBe(false);
    });

    it('should handle null bundle', () => {
      const result = isPathObservedInBundle({
        bundle: null,
        resourceType: 'Patient',
        path: 'Patient.name',
      });
      expect(result).toBe(false);
    });

    it('should handle undefined bundle', () => {
      const result = isPathObservedInBundle({
        bundle: undefined,
        resourceType: 'Patient',
        path: 'Patient.name',
      });
      expect(result).toBe(false);
    });

    it('should handle empty path', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: '',
      });
      expect(result).toBe(false);
    });

    it('should handle missing resourceType', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: '',
        path: 'name.family',
      });
      expect(result).toBe(false);
    });

    it('should handle malformed bundle (no entry array)', () => {
      const malformedBundle = { resourceType: 'Bundle' };
      const result = isPathObservedInBundle({
        bundle: malformedBundle,
        resourceType: 'Patient',
        path: 'name',
      });
      expect(result).toBe(false);
    });

    it('should handle invalid array syntax gracefully', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name[].family', // Invalid: empty brackets
      });
      expect(result).toBe(false);
    });
  });

  describe('Mixed Traversal', () => {
    it('should handle mixed implicit and explicit: name.given[0]', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name.given[0]',
      });
      expect(result).toBe(true);
    });

    it('should handle mixed explicit and implicit: name[0].given', () => {
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name[0].given',
      });
      expect(result).toBe(true);
    });

    it('should find match in second array element via implicit traversal', () => {
      // name[1].family = "Lee", should be found via implicit traversal of "name.family"
      const result = isPathObservedInBundle({
        bundle: sampleBundle,
        resourceType: 'Patient',
        path: 'name.family',
      });
      expect(result).toBe(true);
    });
  });
});
