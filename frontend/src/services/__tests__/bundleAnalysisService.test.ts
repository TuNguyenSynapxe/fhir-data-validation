/**
 * Unit Tests for bundleAnalysisService
 * 
 * Tests pure business logic for FHIR bundle analysis.
 */

import { describe, it, expect } from 'vitest';
import { analyzeFhirBundle, isRulePathObserved, type BundleAnalysisResult } from '../bundleAnalysisService';

describe('bundleAnalysisService', () => {
  describe('analyzeFhirBundle', () => {
    it('should return empty sets for null bundle', () => {
      const result = analyzeFhirBundle(null);
      expect(result.observedResourceTypes.size).toBe(0);
      expect(result.observedPaths.size).toBe(0);
    });

    it('should return empty sets for undefined bundle', () => {
      const result = analyzeFhirBundle(undefined);
      expect(result.observedResourceTypes.size).toBe(0);
      expect(result.observedPaths.size).toBe(0);
    });

    it('should return empty sets for non-object bundle', () => {
      const result = analyzeFhirBundle('invalid');
      expect(result.observedResourceTypes.size).toBe(0);
      expect(result.observedPaths.size).toBe(0);
    });

    it('should extract resource types from bundle entries', () => {
      const bundle = {
        entry: [
          { resource: { resourceType: 'Patient', id: '1' } },
          { resource: { resourceType: 'Observation', id: '2' } },
          { resource: { resourceType: 'Patient', id: '3' } }, // duplicate type
        ],
      };

      const result = analyzeFhirBundle(bundle);
      
      expect(result.observedResourceTypes.has('Patient')).toBe(true);
      expect(result.observedResourceTypes.has('Observation')).toBe(true);
      expect(result.observedResourceTypes.size).toBe(2); // Set deduplicates
    });

    it('should extract paths from simple resource', () => {
      const bundle = {
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'patient1',
              active: true,
            },
          },
        ],
      };

      const result = analyzeFhirBundle(bundle);
      
      expect(result.observedPaths.has('Patient.resourceType')).toBe(true);
      expect(result.observedPaths.has('Patient.id')).toBe(true);
      expect(result.observedPaths.has('Patient.active')).toBe(true);
    });

    it('should extract nested paths from complex resource', () => {
      const bundle = {
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              name: [
                {
                  given: ['John'],
                  family: 'Doe',
                },
              ],
            },
          },
        ],
      };

      const result = analyzeFhirBundle(bundle);
      
      expect(result.observedPaths.has('Patient.name')).toBe(true);
      expect(result.observedPaths.has('Patient.name.given')).toBe(true);
      expect(result.observedPaths.has('Patient.name.family')).toBe(true);
    });

    it('should handle deeply nested objects', () => {
      const bundle = {
        entry: [
          {
            resource: {
              resourceType: 'Observation',
              valueCodeableConcept: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '12345',
                  },
                ],
              },
            },
          },
        ],
      };

      const result = analyzeFhirBundle(bundle);
      
      expect(result.observedPaths.has('Observation.valueCodeableConcept')).toBe(true);
      expect(result.observedPaths.has('Observation.valueCodeableConcept.coding')).toBe(true);
      expect(result.observedPaths.has('Observation.valueCodeableConcept.coding.system')).toBe(true);
      expect(result.observedPaths.has('Observation.valueCodeableConcept.coding.code')).toBe(true);
    });

    it('should handle empty entries array', () => {
      const bundle = { entry: [] };
      const result = analyzeFhirBundle(bundle);
      
      expect(result.observedResourceTypes.size).toBe(0);
      expect(result.observedPaths.size).toBe(0);
    });

    it('should skip entries without resource', () => {
      const bundle = {
        entry: [
          { fullUrl: 'http://example.com/Patient/1' }, // no resource
          { resource: { resourceType: 'Patient', id: '1' } },
        ],
      };

      const result = analyzeFhirBundle(bundle);
      
      expect(result.observedResourceTypes.size).toBe(1);
      expect(result.observedResourceTypes.has('Patient')).toBe(true);
    });
  });

  describe('isRulePathObserved', () => {
    const mockAnalysis: BundleAnalysisResult = {
      observedResourceTypes: new Set(['Patient', 'Observation']),
      observedPaths: new Set([
        'Patient.id',
        'Patient.name',
        'Patient.name.given',
        'Patient.name.family',
        'Observation.status',
        'Observation.valueCodeableConcept',
        'Observation.valueCodeableConcept.coding',
      ]),
    };

    it('should return true for empty path', () => {
      expect(isRulePathObserved('', mockAnalysis)).toBe(true);
    });

    it('should return true for exact match', () => {
      expect(isRulePathObserved('Patient.name', mockAnalysis)).toBe(true);
      expect(isRulePathObserved('Observation.status', mockAnalysis)).toBe(true);
    });

    it('should return true when observed path is child of rule path', () => {
      // Rule targets parent, bundle has children
      expect(isRulePathObserved('Patient.name', mockAnalysis)).toBe(true); // has Patient.name.given
      expect(isRulePathObserved('Observation.valueCodeableConcept', mockAnalysis)).toBe(true); // has .coding
    });

    it('should return false when path not observed', () => {
      expect(isRulePathObserved('Patient.gender', mockAnalysis)).toBe(false);
      expect(isRulePathObserved('Condition.code', mockAnalysis)).toBe(false);
    });

    it('should return false when rule path is more specific than observed', () => {
      // Bundle has Patient.name but not Patient.name.use
      expect(isRulePathObserved('Patient.name.use', mockAnalysis)).toBe(false);
    });

    it('should handle partial path matches correctly', () => {
      // Should NOT match Patient.name.familyName when we have Patient.name.family
      expect(isRulePathObserved('Patient.name.familyName', mockAnalysis)).toBe(false);
    });
  });
});
