import { render, screen } from '@testing-library/react';
import ValidationScopeBanner from './ValidationScopeBanner';
import type { ValidationScope } from '../../types/bundleProfile';

describe('ValidationScopeBanner', () => {
  it('renders resolved scope correctly', () => {
    const scope: ValidationScope = {
      state: 'RESOLVED',
      structureDefinitionName: 'PatientBundle',
      structureDefinitionId: 'sd-1',
      ranBaseFhirValidation: true,
      ranProjectRules: true,
    };

    render(<ValidationScopeBanner validationScope={scope} />);

    expect(screen.getByText(/Base FHIR validation/)).toBeInTheDocument();
    expect(screen.getByText(/Project rules/)).toBeInTheDocument();
    expect(screen.getByText(/PatientBundle/)).toBeInTheDocument();
    
    // Should show checkmarks for both validations
    const checkmarks = screen.getAllByText(/✓/);
    expect(checkmarks).toHaveLength(2);
  });

  it('renders unresolved scope correctly', () => {
    const scope: ValidationScope = {
      state: 'UNRESOLVED',
      structureDefinitionName: null,
      structureDefinitionId: null,
      ranBaseFhirValidation: true,
      ranProjectRules: false,
    };

    render(<ValidationScopeBanner validationScope={scope} />);

    expect(screen.getByText(/Base FHIR validation/)).toBeInTheDocument();
    expect(screen.getByText(/Project rules/)).toBeInTheDocument();
    expect(screen.getByText(/no Bundle profile selected/)).toBeInTheDocument();
    
    // Should show checkmark for base and cross for rules
    expect(screen.getByText(/✓/)).toBeInTheDocument();
    expect(screen.getByText(/✗/)).toBeInTheDocument();
  });

  it('renders unprofiled scope correctly', () => {
    const scope: ValidationScope = {
      state: 'UNPROFILED',
      structureDefinitionName: null,
      structureDefinitionId: null,
      ranBaseFhirValidation: true,
      ranProjectRules: false,
    };

    render(<ValidationScopeBanner validationScope={scope} />);

    expect(screen.getByText(/Base FHIR validation/)).toBeInTheDocument();
    expect(screen.getByText(/explicitly no profile/)).toBeInTheDocument();
  });

  it('uses amber background for unresolved state', () => {
    const scope: ValidationScope = {
      state: 'UNRESOLVED',
      structureDefinitionName: null,
      structureDefinitionId: null,
      ranBaseFhirValidation: true,
      ranProjectRules: false,
    };

    const { container } = render(<ValidationScopeBanner validationScope={scope} />);
    
    // Check for amber background class
    const banner = container.firstChild;
    expect(banner).toHaveClass('bg-amber-50');
  });

  it('uses blue background for resolved state', () => {
    const scope: ValidationScope = {
      state: 'RESOLVED',
      structureDefinitionName: 'PatientBundle',
      structureDefinitionId: 'sd-1',
      ranBaseFhirValidation: true,
      ranProjectRules: true,
    };

    const { container } = render(<ValidationScopeBanner validationScope={scope} />);
    
    // Check for blue background class
    const banner = container.firstChild;
    expect(banner).toHaveClass('bg-blue-50');
  });
});
