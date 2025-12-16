import { describe, it, expect } from 'vitest';
import { 
  formatSmartPath, 
  getScopedSegments, 
  extractFullJsonPath,
  renderBreadcrumb
} from '../smartPathFormatting';

describe('Smart Path Formatting', () => {
  describe('formatSmartPath', () => {
    it('should parse simple path without indices', () => {
      const result = formatSmartPath('Patient.name.given', 'Patient');
      
      expect(result.segments).toHaveLength(3);
      expect(result.segments[0]).toEqual({ name: 'Patient', isLast: false });
      expect(result.segments[1]).toEqual({ name: 'name', isLast: false });
      expect(result.segments[2]).toEqual({ name: 'given', isLast: true });
      expect(result.scopedPath).toBe('name.given');
    });

    it('should parse path with array indices', () => {
      const result = formatSmartPath('Patient.extension[2].valueCodeableConcept');
      
      expect(result.segments).toHaveLength(3);
      expect(result.segments[1]).toEqual({ name: 'extension', index: 2, isLast: false });
      expect(result.segments[2]).toEqual({ name: 'valueCodeableConcept', isLast: true });
    });

    it('should handle Unknown path', () => {
      const result = formatSmartPath('Unknown');
      
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toEqual({ name: 'Unknown', isLast: true });
      expect(result.scopedPath).toBe('Unknown');
    });

    it('should scope path correctly when resource matches', () => {
      const result = formatSmartPath('Location.address.city', 'Location');
      expect(result.scopedPath).toBe('address.city');
    });

    it('should not scope when resource does not match', () => {
      const result = formatSmartPath('Patient.name.family', 'Location');
      expect(result.scopedPath).toBe('Patient.name.family');
    });
  });

  describe('getScopedSegments', () => {
    it('should remove resource prefix when it matches', () => {
      const segments = formatSmartPath('Patient.name.given', 'Patient').segments;
      const scoped = getScopedSegments(segments, 'Patient');
      
      expect(scoped).toHaveLength(2);
      expect(scoped[0]).toEqual({ name: 'name', isLast: false });
      expect(scoped[1]).toEqual({ name: 'given', isLast: true });
    });

    it('should keep all segments when resource does not match', () => {
      const segments = formatSmartPath('Patient.name.given', 'Patient').segments;
      const scoped = getScopedSegments(segments, 'Location');
      
      expect(scoped).toHaveLength(3);
    });

    it('should handle empty resource type', () => {
      const segments = formatSmartPath('Patient.name.given').segments;
      const scoped = getScopedSegments(segments);
      
      expect(scoped).toHaveLength(3);
    });
  });

  describe('extractFullJsonPath', () => {
    it('should convert JSON pointer to dot notation with indices', () => {
      const result = extractFullJsonPath('/entry/0/resource/extension/2/valueCodeableConcept');
      expect(result).toBe('entry[0].resource.extension[2].valueCodeableConcept');
    });

    it('should handle simple JSON pointer', () => {
      const result = extractFullJsonPath('/Patient/name/given');
      expect(result).toBe('Patient.name.given');
    });

    it('should return empty string for undefined', () => {
      const result = extractFullJsonPath(undefined);
      expect(result).toBe('');
    });

    it('should handle consecutive indices', () => {
      const result = extractFullJsonPath('/entry/5/resource/identifier/0/value');
      expect(result).toBe('entry[5].resource.identifier[0].value');
    });
  });

  describe('renderBreadcrumb', () => {
    it('should render segments with default separator', () => {
      const segments = [
        { name: 'extension', index: 2, isLast: false },
        { name: 'valueCodeableConcept', isLast: true }
      ];
      
      const result = renderBreadcrumb(segments);
      expect(result).toBe('extension[2] ▸ valueCodeableConcept');
    });

    it('should render segments with custom separator', () => {
      const segments = [
        { name: 'name', isLast: false },
        { name: 'given', isLast: true }
      ];
      
      const result = renderBreadcrumb(segments, '>');
      expect(result).toBe('name > given');
    });

    it('should handle single segment', () => {
      const segments = [{ name: 'status', isLast: true }];
      const result = renderBreadcrumb(segments);
      expect(result).toBe('status');
    });
  });
});
