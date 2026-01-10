import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import StructureDefinitionList from './StructureDefinitionList';
import type { ProjectArtifactDto } from '../../types/projectImport';
import type { ProjectBundleDto, ProjectRuleDto } from '../../types/projectImport';
import type { BundleProfileStateDto } from '../../types/bundleProfile';

// Helper to create test wrapper with react-query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('StructureDefinitionList - SD-Centric Rendering', () => {
  const mockSDs: ProjectArtifactDto[] = [
    {
      artifactId: 'sd-1',
      type: 'StructureDefinition',
      name: 'PatientBundle',
      canonicalUrl: 'http://example.org/StructureDefinition/PatientBundle',
      resourceType: 'Bundle',
    },
    {
      artifactId: 'sd-2',
      type: 'StructureDefinition',
      name: 'ObservationBundle',
      canonicalUrl: 'http://example.org/StructureDefinition/ObservationBundle',
      resourceType: 'Bundle',
    },
  ];

  const mockBundles: ProjectBundleDto[] = [
    {
      bundleId: 'bundle-1',
      name: 'Patient Sample 1',
      uploadedAt: '2024-01-01T00:00:00Z',
      lastValidatedAt: null,
    },
    {
      bundleId: 'bundle-2',
      name: 'Patient Sample 2',
      uploadedAt: '2024-01-02T00:00:00Z',
      lastValidatedAt: null,
    },
    {
      bundleId: 'bundle-3',
      name: 'Observation Sample',
      uploadedAt: '2024-01-03T00:00:00Z',
      lastValidatedAt: null,
    },
  ];

  const mockRules: ProjectRuleDto[] = [
    {
      ruleId: 'rule-1',
      structureDefinitionId: 'sd-1',
      structureDefinitionName: 'PatientBundle',
      ruleCode: 'RULE001',
      description: 'Patient rule',
      fhirPath: 'Patient.name.exists()',
      severity: 'error',
      message: 'Patient must have name',
      provenance: 'IMPORTED',
    },
    {
      ruleId: 'rule-2',
      structureDefinitionId: 'sd-1',
      structureDefinitionName: 'PatientBundle',
      ruleCode: 'RULE002',
      description: 'Custom patient rule',
      fhirPath: 'Patient.birthDate.exists()',
      severity: 'warning',
      message: 'Patient should have birthDate',
      provenance: 'CUSTOM',
    },
  ];

  it('groups bundles by resolved SD', () => {
    const bundleProfiles: Record<string, BundleProfileStateDto> = {
      'bundle-1': {
        state: 'RESOLVED',
        structureDefinitionId: 'sd-1',
        structureDefinitionName: 'PatientBundle',
        source: 'AUTO_RESOLVED',
      },
      'bundle-2': {
        state: 'RESOLVED',
        structureDefinitionId: 'sd-1',
        structureDefinitionName: 'PatientBundle',
        source: 'AUTO_RESOLVED',
      },
      'bundle-3': {
        state: 'RESOLVED',
        structureDefinitionId: 'sd-2',
        structureDefinitionName: 'ObservationBundle',
        source: 'AUTO_RESOLVED',
      },
    };

    renderWithQueryClient(
      <StructureDefinitionList
        structureDefinitions={mockSDs}
        bundles={mockBundles}
        bundleProfiles={bundleProfiles}
        rules={mockRules}
        onValidateBundle={vi.fn()}
      />
    );

    // Should render both SDs
    expect(screen.getByText('PatientBundle')).toBeInTheDocument();
    expect(screen.getByText('ObservationBundle')).toBeInTheDocument();

    // PatientBundle should show 2 bundles
    const patientSection = screen.getByText('PatientBundle').closest('div');
    expect(patientSection).toHaveTextContent('Patient Sample 1');
    expect(patientSection).toHaveTextContent('Patient Sample 2');

    // ObservationBundle should show 1 bundle
    const observationSection = screen.getByText('ObservationBundle').closest('div');
    expect(observationSection).toHaveTextContent('Observation Sample');
  });

  it('displays unassigned bundles separately', () => {
    const bundleProfiles: Record<string, BundleProfileStateDto> = {
      'bundle-1': {
        state: 'RESOLVED',
        structureDefinitionId: 'sd-1',
        structureDefinitionName: 'PatientBundle',
        source: 'AUTO_RESOLVED',
      },
      'bundle-2': {
        state: 'UNRESOLVED',
        structureDefinitionId: null,
        structureDefinitionName: null,
        source: null,
      },
      'bundle-3': {
        state: 'UNPROFILED',
        structureDefinitionId: null,
        structureDefinitionName: null,
        source: 'MANUAL_CLEAR',
      },
    };

    renderWithQueryClient(
      <StructureDefinitionList
        structureDefinitions={mockSDs}
        bundles={mockBundles}
        bundleProfiles={bundleProfiles}
        rules={mockRules}
        onValidateBundle={vi.fn()}
      />
    );

    // Should have an "Unassigned Bundles" section
    expect(screen.getByText('Unassigned Bundles')).toBeInTheDocument();

    // Unassigned section should show 2 bundles
    const unassignedSection = screen.getByText('Unassigned Bundles').closest('div');
    expect(unassignedSection).toHaveTextContent('Patient Sample 2');
    expect(unassignedSection).toHaveTextContent('Observation Sample');
  });

  it('shows rule counts for each SD', () => {
    const bundleProfiles: Record<string, BundleProfileStateDto> = {
      'bundle-1': {
        state: 'RESOLVED',
        structureDefinitionId: 'sd-1',
        structureDefinitionName: 'PatientBundle',
        source: 'AUTO_RESOLVED',
      },
    };

    renderWithQueryClient(
      <StructureDefinitionList
        structureDefinitions={mockSDs}
        bundles={mockBundles}
        bundleProfiles={bundleProfiles}
        rules={mockRules}
        onValidateBundle={vi.fn()}
      />
    );

    // PatientBundle should show rule counts
    const patientSection = screen.getByText('PatientBundle').closest('div');
    expect(patientSection).toHaveTextContent('1 imported');
    expect(patientSection).toHaveTextContent('1 custom rule');
  });

  it('handles empty bundles gracefully', () => {
    renderWithQueryClient(
      <StructureDefinitionList
        structureDefinitions={mockSDs}
        bundles={[]}
        bundleProfiles={{}}
        rules={mockRules}
        onValidateBundle={vi.fn()}
      />
    );

    // Should show "No bundles" message
    expect(screen.getByText(/No bundles uploaded/)).toBeInTheDocument();
  });

  it('shows SD-centric architecture with nested structure', () => {
    const bundleProfiles: Record<string, BundleProfileStateDto> = {
      'bundle-1': {
        state: 'RESOLVED',
        structureDefinitionId: 'sd-1',
        structureDefinitionName: 'PatientBundle',
        source: 'AUTO_RESOLVED',
      },
    };

    const { container } = renderWithQueryClient(
      <StructureDefinitionList
        structureDefinitions={mockSDs}
        bundles={mockBundles}
        bundleProfiles={bundleProfiles}
        rules={mockRules}
        onValidateBundle={vi.fn()}
      />
    );

    // Verify hierarchical structure exists
    // SD card should contain bundles section
    const patientCard = screen.getByText('PatientBundle').closest('[class*="border"]');
    expect(patientCard).toBeInTheDocument();

    // Bundles should be nested inside SD card
    const bundleElement = screen.getByText('Patient Sample 1').closest('[class*="border"]');
    expect(bundleElement).toBeInTheDocument();

    // Verify nesting by checking that bundle is inside SD card
    expect(patientCard).toContainElement(bundleElement);
  });
});
