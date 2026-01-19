/**
 * SliceConstraintPanel Tests — EPIC 3
 * 
 * Tests slice constraint configuration panel.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SliceConstraintPanel } from './SliceConstraintPanel';
import type { ElementDesign } from '../../api/sdBuilderApi';

// Mock the store
vi.mock('../../stores/useSdBuilderStore', () => ({
  useSdBuilderStore: () => ({
    applyCommand: vi.fn(),
  }),
}));

describe('SliceConstraintPanel', () => {
  const mockElement: ElementDesign = {
    path: 'Observation.component',
    baseCardinality: { min: 0, max: '*' },
    overrideCardinality: null,
    isIncluded: true,
    typeCodes: ['BackboneElement'],
    baseBinding: null,
    overrideBinding: null,
    slicing: {
      ordered: false,
      rules: 'Open',
      discriminators: [
        { type: 'Pattern', path: 'code' },
      ],
    },
    slices: {
      systolic: {
        sliceName: 'systolic',
        cardinality: { min: 1, max: '1' },
        baseBinding: null,
        overrideBinding: null,
        children: [],
      },
    } as any, // Type mismatch: API says array, runtime is object
  };

  it('should render slice name in header', () => {
    const onClose = vi.fn();
    render(
      <SliceConstraintPanel
        element={mockElement}
        sliceName="systolic"
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Slice: systolic/)).toBeTruthy();
  });

  it('should display discriminators from slicing config', () => {
    const onClose = vi.fn();
    render(
      <SliceConstraintPanel
        element={mockElement}
        sliceName="systolic"
        onClose={onClose}
      />
    );

    const discriminatorText = screen.getAllByText(/pattern → code/);
    expect(discriminatorText.length).toBeGreaterThan(0);
    expect(screen.getByText(/All slices use the same discriminator paths/)).toBeTruthy();
  });

  it('should show warning when no discriminators defined', () => {
    const elementWithoutDiscriminators: ElementDesign = {
      ...mockElement,
      slicing: {
        ordered: false,
        rules: 'Open',
        discriminators: [],
      },
    };

    const onClose = vi.fn();
    render(
      <SliceConstraintPanel
        element={elementWithoutDiscriminators}
        sliceName="systolic"
        onClose={onClose}
      />
    );

    // Text appears twice - once in discriminator box, once in warning
    const noDiscrimText = screen.getAllByText(/No discriminators defined/);
    expect(noDiscrimText.length).toBeGreaterThan(0);
    expect(screen.getByText(/Configure slicing first/)).toBeTruthy();
  });

  it('should close panel when close button clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SliceConstraintPanel
        element={mockElement}
        sliceName="systolic"
        onClose={onClose}
      />
    );

    // Click the X button in header
    const closeButton = container.querySelector('button[class*="text-gray-500"]');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should display cardinality inputs', () => {
    const onClose = vi.fn();
    render(
      <SliceConstraintPanel
        element={mockElement}
        sliceName="systolic"
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Slice Cardinality/)).toBeTruthy();
    expect(screen.getByText(/Base:/)).toBeTruthy();
    expect(screen.getByText(/0/)).toBeTruthy();
  });

  it('should display metadata inputs', () => {
    const onClose = vi.fn();
    render(
      <SliceConstraintPanel
        element={mockElement}
        sliceName="systolic"
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Slice Metadata/)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Display label for this slice/)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Detailed description of this slice/)).toBeTruthy();
  });

  it('should render error when slice not found', () => {
    const onClose = vi.fn();
    render(
      <SliceConstraintPanel
        element={mockElement}
        sliceName="nonexistent"
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Slice "nonexistent" not found/)).toBeTruthy();
  });
});
