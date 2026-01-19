/**
 * SliceConstraintPanel - Advanced Features Tests
 * 
 * Tests for:
 * - Context-specific value editors
 * - Cardinality validation
 * - Backend command integration
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SliceConstraintPanel } from './SliceConstraintPanel';
import type { ElementDesign } from '../../api/sdBuilderApi';

const mockApplyCommand = vi.fn();

vi.mock('../../stores/useSdBuilderStore', () => ({
  useSdBuilderStore: () => ({
    applyCommand: mockApplyCommand,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SliceConstraintPanel - Advanced Features', () => {
  beforeEach(() => {
    mockApplyCommand.mockClear();
  });

  const mockElement: ElementDesign = {
    path: 'Observation.component',
    baseCardinality: { min: 0, max: '3' },
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
    } as any,
  };

  describe('Cardinality Validation', () => {
    it('should validate min cardinality is within base range', () => {
      const onClose = vi.fn();
      render(
        <SliceConstraintPanel
          element={mockElement}
          sliceName="systolic"
          onClose={onClose}
        />
      );

      const minInput = screen.getByPlaceholderText('min') as HTMLInputElement;
      
      // Try to set min below base min (0)
      fireEvent.change(minInput, { target: { value: '-1' } });
      
      // Should show error
      expect(screen.queryByText(/cannot be less than base min/)).toBeTruthy();
    });

    it('should validate max cardinality is within base range', () => {
      const onClose = vi.fn();
      render(
        <SliceConstraintPanel
          element={mockElement}
          sliceName="systolic"
          onClose={onClose}
        />
      );

      const maxInput = screen.getByPlaceholderText('max') as HTMLInputElement;
      
      // Try to set max above base max (3)
      fireEvent.change(maxInput, { target: { value: '5' } });
      
      // Should show error
      expect(screen.queryByText(/cannot be greater than base max/)).toBeTruthy();
    });

    it('should validate min <= max', () => {
      const onClose = vi.fn();
      render(
        <SliceConstraintPanel
          element={mockElement}
          sliceName="systolic"
          onClose={onClose}
        />
      );

      const minInput = screen.getByPlaceholderText('min') as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText('max') as HTMLInputElement;
      
      fireEvent.change(minInput, { target: { value: '3' } });
      fireEvent.change(maxInput, { target: { value: '1' } });
      
      // Should show error
      expect(screen.queryByText(/Min .* cannot be greater than max/)).toBeTruthy();
    });

    it('should disable save button when cardinality error exists', () => {
      const onClose = vi.fn();
      render(
        <SliceConstraintPanel
          element={mockElement}
          sliceName="systolic"
          onClose={onClose}
        />
      );

      const minInput = screen.getByPlaceholderText('min') as HTMLInputElement;
      fireEvent.change(minInput, { target: { value: '10' } }); // Exceeds base max of 3
      
      const saveButton = screen.getByText('Save Slice Constraints') as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });
  });

  describe('Context-Specific Value Editors', () => {
    it('should show Coding editor for code discriminator', async () => {
      const onClose = vi.fn();
      render(
        <SliceConstraintPanel
          element={mockElement}
          sliceName="systolic"
          onClose={onClose}
        />
      );

      // Select condition type
      const selects = screen.getAllByRole('combobox');
      const typeSelect = selects[0] as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'pattern' } });

      // Should show code and system inputs for Coding
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Code/)).toBeTruthy();
        expect(screen.getByPlaceholderText(/System/)).toBeTruthy();
      });
    });

    it('should display element type hints', () => {
      const onClose = vi.fn();
      render(
        <SliceConstraintPanel
          element={mockElement}
          sliceName="systolic"
          onClose={onClose}
        />
      );

      // Should show discriminator path
      const discriminators = screen.getAllByText(/pattern → code/i);
      expect(discriminators.length).toBeGreaterThan(0);
    });
  });

  describe('Backend Command Integration', () => {
    it('should call applyCommand when save is clicked', async () => {
      mockApplyCommand.mockResolvedValue({});
      
      const onClose = vi.fn();
      render(
        <SliceConstraintPanel
          element={mockElement}
          sliceName="systolic"
          onClose={onClose}
        />
      );

      // Click save
      const saveButton = screen.getByText('Save Slice Constraints');
      fireEvent.click(saveButton);

      // Should call command
      await waitFor(() => {
        expect(mockApplyCommand).toHaveBeenCalled();
      }, { timeout: 3000 });
      
      // Verify command structure
      const call = mockApplyCommand.mock.calls[0][0];
      expect(call.commandType).toBe('SetSliceConstraint');
      expect(call.path).toBe('Observation.component');
      expect(call.sliceName).toBe('systolic');
    });

    it('should disable save button when no discriminators', () => {
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

      const saveButton = screen.getByText('Save Slice Constraints') as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });
  });
});
