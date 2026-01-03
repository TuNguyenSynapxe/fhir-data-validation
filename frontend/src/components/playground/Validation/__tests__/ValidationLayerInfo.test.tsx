/**
 * Snapshot Tests for ValidationLayerInfo Component
 * 
 * Ensures STRUCTURE semantics remain consistent in the UI:
 * - STRUCTURE is shown as "Must fix" / Red / Blocking
 * - SPEC_HINT is shown as "Recommended" / Blue / Advisory
 * - Clear distinction between mandatory and advisory
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ValidationLayerInfo } from '../ValidationLayerInfo';

describe('ValidationLayerInfo', () => {
  describe('STRUCTURE semantic consistency', () => {
    it('renders STRUCTURE as blocking/must-fix', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Check for "FHIR Structure" heading
      expect(html).toContain('FHIR Structure');
      
      // Check for "Must fix" label (blocking indicator)
      expect(html).toContain('Must fix');
      
      // Check for red color classes (blocking styling)
      expect(html).toContain('border-red-500');
      expect(html).toContain('text-red-700');
    });

    it('renders SPEC_HINT explanation as advisory/recommended', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Check for SPEC_HINT explanation
      expect(html).toContain('SPEC_HINT');
      expect(html).toContain('advisory');
      
      // Check for "Recommended" label (advisory indicator)
      expect(html).toContain('Recommended');
      
      // Check for blue color classes (advisory styling)
      expect(html).toContain('text-blue-');
    });

    it('includes STRUCTURE vs SPEC_HINT distinction', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Check for explanatory text
      expect(html).toContain('STRUCTURE');
      expect(html).toContain('must be fixed');
      expect(html).toContain('advisory recommendations');
      expect(html).toContain('do not block validation');
    });

    it('includes link to STRUCTURE validation documentation', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Check for documentation link
      expect(html).toContain('/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md');
      expect(html).toContain('Learn more about STRUCTURE validation');
    });

    it('snapshot: full component rendering', () => {
      const { container } = render(<ValidationLayerInfo />);
      
      // Create snapshot to prevent accidental changes to STRUCTURE semantics
      expect(container).toMatchSnapshot();
    });
  });

  describe('blocking vs advisory visual distinction', () => {
    it('uses distinct colors for blocking sources', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Blocking sources should use red
      expect(html).toContain('border-red-500'); // FHIR Structure
      expect(html).toContain('border-purple-500'); // Project Rules
    });

    it('uses distinct colors for advisory sources', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Advisory sources should use amber/blue
      expect(html).toContain('border-amber-400'); // Best Practice
      expect(html).toContain('border-blue-400'); // HL7 Advisory
    });

    it('uses XCircle icon for blocking, CheckCircle for advisory', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Should contain both icon types
      expect(html).toContain('Must fix'); // Blocking
      expect(html).toContain('Recommended'); // Advisory
    });
  });

  describe('regression prevention', () => {
    it('ensures STRUCTURE is never labeled as optional', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // These terms should NOT appear near STRUCTURE
      const structureSection = html.split('FHIR Structure')[1]?.split('HL7 Spec')[0] || '';
      
      expect(structureSection).not.toContain('optional');
      expect(structureSection).not.toContain('advisory');
      expect(structureSection).not.toContain('quality');
      expect(structureSection).not.toContain('recommended only');
    });

    it('ensures STRUCTURE always has blocking indicators', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      const structureSection = html.split('FHIR Structure')[1]?.split('HL7 Spec')[0] || '';
      
      // Must contain at least one of these blocking terms
      const hasBlockingTerm = 
        structureSection.includes('Must fix') ||
        structureSection.includes('must be fixed') ||
        structureSection.includes('blocking');
      
      expect(hasBlockingTerm).toBe(true);
    });

    it('ensures SPEC_HINT never has blocking indicators', () => {
      const { container } = render(<ValidationLayerInfo />);
      const html = container.innerHTML;

      // Find the explanation box that mentions SPEC_HINT
      expect(html).toContain('SPEC_HINT');
      expect(html).toContain('advisory recommendations');
      expect(html).toContain('do not block validation');
      
      // Extract just the explanation section (before the layer list starts)
      const explanationSection = html.split('Understanding Validation Layers')[1]?.split('FHIR Structure')[0] || '';
      
      // The explanation section should NOT use blocking language for SPEC_HINT
      expect(explanationSection).toContain('SPEC_HINT');
      expect(explanationSection).toContain('advisory');
      
      // Only STRUCTURE should have "must be fixed" in the explanation box
      const structurePart = explanationSection.split('STRUCTURE')[1]?.split('SPEC_HINT')[0] || '';
      const specHintPart = explanationSection.split('SPEC_HINT')[1] || '';
      expect(structurePart).toContain('must be fixed');
      expect(specHintPart).not.toContain('must be fixed');
    });
  });
});
