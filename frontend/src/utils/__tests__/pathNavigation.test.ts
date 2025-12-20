/**
 * Tests for Path Navigation Utilities
 */

import { describe, it, expect } from 'vitest';
import { validateJsonPointer, findNearestValidPath, canNavigate } from '../pathNavigation';

const testBundle = JSON.stringify({
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      resource: {
        resourceType: 'Patient',
        id: 'patient-1',
        name: [
          {
            family: 'Doe',
            given: ['John']
          }
        ],
        gender: 'male'
      }
    },
    {
      resource: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '1234-5'
            }
          ]
        }
      }
    }
  ]
});

describe('pathNavigation', () => {
  describe('validateJsonPointer', () => {
    it('should validate existing paths', () => {
      expect(validateJsonPointer(testBundle, '/entry/0/resource/name/0/family')).toBe(true);
      expect(validateJsonPointer(testBundle, '/entry/0/resource/gender')).toBe(true);
      expect(validateJsonPointer(testBundle, '/entry/1/resource/code/coding/0/system')).toBe(true);
    });

    it('should reject non-existent paths', () => {
      expect(validateJsonPointer(testBundle, '/entry/0/resource/birthDate')).toBe(false);
      expect(validateJsonPointer(testBundle, '/entry/0/resource/name/0/suffix')).toBe(false);
      expect(validateJsonPointer(testBundle, '/entry/5/resource/id')).toBe(false);
    });

    it('should handle empty or invalid inputs', () => {
      expect(validateJsonPointer('', '/entry/0')).toBe(false);
      expect(validateJsonPointer(testBundle, '')).toBe(true); // Empty path = root
      expect(validateJsonPointer(testBundle, undefined)).toBe(false);
    });

    it('should handle array indices correctly', () => {
      expect(validateJsonPointer(testBundle, '/entry/0')).toBe(true);
      expect(validateJsonPointer(testBundle, '/entry/1')).toBe(true);
      expect(validateJsonPointer(testBundle, '/entry/2')).toBe(false); // Out of bounds
    });
  });

  describe('findNearestValidPath', () => {
    it('should return exact path if it exists', () => {
      const result = findNearestValidPath(testBundle, '/entry/0/resource/gender');
      expect(result).toEqual({
        path: '/entry/0/resource/gender',
        isExact: true
      });
    });

    it('should find nearest parent when path does not exist', () => {
      // birthDate doesn't exist, should return resource
      const result1 = findNearestValidPath(testBundle, '/entry/0/resource/birthDate');
      expect(result1?.isExact).toBe(false);
      expect(result1?.path).toBe('/entry/0/resource');

      // suffix doesn't exist in name[0], should return name[0]
      const result2 = findNearestValidPath(testBundle, '/entry/0/resource/name/0/suffix');
      expect(result2?.isExact).toBe(false);
      expect(result2?.path).toBe('/entry/0/resource/name/0');
    });

    it('should handle deeply nested non-existent paths', () => {
      const result = findNearestValidPath(
        testBundle,
        '/entry/0/resource/extension/0/valueCodeableConcept/coding/0/display'
      );
      
      expect(result?.isExact).toBe(false);
      // Should walk up to resource level (extension doesn't exist)
      expect(result?.path).toBe('/entry/0/resource');
    });

    it('should return root for completely invalid paths', () => {
      const result = findNearestValidPath(testBundle, '/invalidTopLevel/something');
      expect(result?.isExact).toBe(false);
      expect(result?.path).toBe('');
    });

    it('should handle array index out of bounds', () => {
      const result = findNearestValidPath(testBundle, '/entry/5/resource/id');
      expect(result?.isExact).toBe(false);
      expect(result?.path).toBe('/entry'); // Falls back to entry array
    });

    it('should return null for invalid inputs', () => {
      expect(findNearestValidPath('', '/entry/0')).toBeNull();
      expect(findNearestValidPath(testBundle, '')).toEqual({ path: '', isExact: true });
      expect(findNearestValidPath(testBundle, undefined)).toBeNull();
    });
  });

  describe('canNavigate', () => {
    it('should return true for valid paths', () => {
      expect(canNavigate(testBundle, '/entry/0/resource/gender')).toBe(true);
      expect(canNavigate(testBundle, '/entry/0/resource/birthDate')).toBe(true); // Has parent
    });

    it('should return false for invalid inputs', () => {
      expect(canNavigate('', '/entry/0')).toBe(false);
      expect(canNavigate(testBundle, undefined)).toBe(false);
    });
  });

  describe('JSON pointer edge cases', () => {
    it('should handle special characters in paths', () => {
      const specialBundle = JSON.stringify({
        'resource~type': 'Patient',
        'path/with/slashes': 'value'
      });

      // Escaped: ~ becomes ~0, / becomes ~1
      expect(validateJsonPointer(specialBundle, '/resource~0type')).toBe(true);
      expect(validateJsonPointer(specialBundle, '/path~1with~1slashes')).toBe(true);
    });

    it('should handle nested arrays', () => {
      expect(validateJsonPointer(testBundle, '/entry/0/resource/name/0/given/0')).toBe(true);
      expect(validateJsonPointer(testBundle, '/entry/0/resource/name/0/given/1')).toBe(false);
    });
  });
});
