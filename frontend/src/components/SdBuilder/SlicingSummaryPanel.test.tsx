/**
 * SlicingSummaryPanel Tests — EPIC 2
 * 
 * Tests read-only slicing summary display.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlicingSummaryPanel } from './SlicingSummaryPanel';

describe('SlicingSummaryPanel', () => {
  it('should render slicing metadata correctly', () => {
    const slicing = {
      rules: 'Open' as const,
      ordered: false,
      discriminators: [
        { type: 'Pattern', path: 'code' },
      ],
    };
    const sliceNames = ['systolic', 'diastolic'];

    render(<SlicingSummaryPanel slicing={slicing} sliceNames={sliceNames} />);

    expect(screen.getByText('SLICING')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
  });

  it('should render discriminators with arrow notation', () => {
    const slicing = {
      rules: 'Closed' as const,
      ordered: true,
      discriminators: [
        { type: 'Pattern', path: 'code' },
        { type: 'Value', path: 'use' },
      ],
    };
    const sliceNames: string[] = [];

    render(<SlicingSummaryPanel slicing={slicing} sliceNames={sliceNames} />);

    expect(screen.getByText('pattern')).toBeTruthy();
    expect(screen.getByText('code')).toBeTruthy();
    expect(screen.getByText('value')).toBeTruthy();
    expect(screen.getByText('use')).toBeTruthy();
  });

  it('should sort slice names alphabetically', () => {
    const slicing = {
      rules: 'Open' as const,
      ordered: false,
      discriminators: [],
    };
    const sliceNames = ['diastolic', 'systolic', 'alert'];

    const { container } = render(
      <SlicingSummaryPanel slicing={slicing} sliceNames={sliceNames} />
    );

    const sliceItems = container.querySelectorAll('.slice-name-list li');
    expect(sliceItems[0].textContent).toContain('alert');
    expect(sliceItems[1].textContent).toContain('diastolic');
    expect(sliceItems[2].textContent).toContain('systolic');
  });

  it('should display mandatory helper text', () => {
    const slicing = {
      rules: 'Open' as const,
      ordered: false,
      discriminators: [],
    };
    const sliceNames: string[] = [];

    render(<SlicingSummaryPanel slicing={slicing} sliceNames={sliceNames} />);

    expect(
      screen.getByText(/Slicing defines how repeated elements are grouped/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Constraints such as fixed values, cardinality, and bindings are configured per slice/)
    ).toBeTruthy();
  });

  it('should not render discriminators section when empty', () => {
    const slicing = {
      rules: 'Open' as const,
      ordered: false,
      discriminators: [],
    };
    const sliceNames: string[] = [];

    const { container } = render(
      <SlicingSummaryPanel slicing={slicing} sliceNames={sliceNames} />
    );

    expect(container.querySelector('.slicing-discriminators')).toBeNull();
  });

  it('should not render slices section when empty', () => {
    const slicing = {
      rules: 'Open' as const,
      ordered: false,
      discriminators: [{ type: 'Pattern', path: 'code' }],
    };
    const sliceNames: string[] = [];

    const { container } = render(
      <SlicingSummaryPanel slicing={slicing} sliceNames={sliceNames} />
    );

    expect(container.querySelector('.slicing-slices')).toBeNull();
  });
});
