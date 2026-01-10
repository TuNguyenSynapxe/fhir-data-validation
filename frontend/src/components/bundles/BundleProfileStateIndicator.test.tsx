import { render, screen } from '@testing-library/react';
import BundleProfileStateIndicator from './BundleProfileStateIndicator';
import type { BundleProfileStateDto } from '../../types/bundleProfile';

describe('BundleProfileStateIndicator', () => {
  it('renders resolved state correctly', () => {
    const state: BundleProfileStateDto = {
      state: 'RESOLVED',
      structureDefinitionName: 'PatientBundle',
      structureDefinitionId: 'sd-1',
      source: 'AUTO_RESOLVED',
    };

    render(<BundleProfileStateIndicator state={state} />);

    expect(screen.getByText(/Profile linked:/)).toBeInTheDocument();
    expect(screen.getByText(/PatientBundle/)).toBeInTheDocument();
    expect(screen.getByText('Auto-resolved')).toBeInTheDocument();
  });

  it('renders unresolved state correctly', () => {
    const state: BundleProfileStateDto = {
      state: 'UNRESOLVED',
      structureDefinitionName: null,
      structureDefinitionId: null,
      source: null,
    };

    render(<BundleProfileStateIndicator state={state} />);

    expect(screen.getByText('No profile selected')).toBeInTheDocument();
    expect(screen.getByText(/Cannot apply project rules/)).toBeInTheDocument();
  });

  it('renders unprofiled state correctly', () => {
    const state: BundleProfileStateDto = {
      state: 'UNPROFILED',
      structureDefinitionName: null,
      structureDefinitionId: null,
      source: 'MANUAL_CLEAR',
    };

    render(<BundleProfileStateIndicator state={state} />);

    expect(screen.getByText('Explicitly no profile')).toBeInTheDocument();
    expect(screen.getByText(/Project rules not applied/)).toBeInTheDocument();
  });

  it('renders manual override source correctly', () => {
    const state: BundleProfileStateDto = {
      state: 'RESOLVED',
      structureDefinitionName: 'ObservationBundle',
      structureDefinitionId: 'sd-2',
      source: 'MANUAL_OVERRIDE',
    };

    render(<BundleProfileStateIndicator state={state} />);

    expect(screen.getByText('Manual override')).toBeInTheDocument();
  });
});
