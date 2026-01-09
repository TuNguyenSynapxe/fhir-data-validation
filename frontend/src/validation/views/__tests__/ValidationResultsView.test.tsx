import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationResultsView } from '../ValidationResultsView';
import type { ValidationResultDto } from '../../api/ValidationApiTypes';
import { ValidationApiClient } from '../../api/ValidationApiClient';

// Mock the API client
vi.mock('../../api/ValidationApiClient');

describe('ValidationResultsView', () => {
  const mockProjectId = 'test-project-123';
  const mockValidationResult: ValidationResultDto = {
    issues: [
      {
        source: 'StructureDefinition',
        severity: 'error',
        errorCode: 'TEST_ERROR',
        path: 'Bundle.entry[0].resource.status',
        message: 'Test error message',
      },
    ],
    summary: {
      totalErrors: 1,
      totalWarnings: 0,
      totalInfo: 0,
      hasAmbiguity: false,
      policyMode: 'strict',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ValidationResultsView projectId={mockProjectId} />);

    expect(screen.getByText('Loading validation results...')).toBeInTheDocument();
  });

  it('shows empty state when projectId is null', () => {
    render(<ValidationResultsView projectId={null} />);

    expect(screen.getByText('No validation results available.')).toBeInTheDocument();
  });

  it('shows error state when API request fails', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockRejectedValue(
      new Error('Network error occurred')
    );

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Validation Results')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    expect(
      screen.getByText(/This does NOT mean the data is valid/)
    ).toBeInTheDocument();
  });

  it('renders validation results when API succeeds', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(mockValidationResult);

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    expect(screen.getByText('1')).toBeInTheDocument(); // Error count
    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });

  it('renders ValidationSummary with correct data', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue({
      issues: [],
      summary: {
        totalErrors: 5,
        totalWarnings: 2,
        totalInfo: 1,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    });

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });

  it('renders AmbiguityBanner when ambiguity exists', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'TEST_CODE',
          path: 'Bundle.entry[0]',
          message: 'Test',
          details: {
            violationReason: 'ValueSet cannot be expanded offline',
          },
        },
      ],
      summary: {
        totalErrors: 1,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: true,
        policyMode: 'strict',
      },
    });

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('AMBIGUITY DETECTED')).toBeInTheDocument();
    });
  });

  it('renders all issues as ValidationIssueRow', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'ERROR_1',
          path: 'Bundle.entry[0]',
          message: 'First error',
        },
        {
          source: 'FHIRPath',
          severity: 'warning',
          errorCode: 'WARNING_1',
          path: 'Bundle.entry[1]',
          message: 'First warning',
        },
      ],
      summary: {
        totalErrors: 1,
        totalWarnings: 1,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    });

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    expect(screen.getByText('First warning')).toBeInTheDocument();
  });

  it('shows no issues message when issues array is empty', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue({
      issues: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    });

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('No validation issues to display.')).toBeInTheDocument();
    });
  });

  it('does not show details panel initially', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(mockValidationResult);

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    expect(screen.queryByText('Issue Details')).not.toBeInTheDocument();
  });

  it('shows details panel when an issue is selected', async () => {
    const user = userEvent.setup();
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(mockValidationResult);

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    // Click the issue row
    const issueRow = screen.getByRole('button');
    await user.click(issueRow);

    // Details panel should appear
    expect(screen.getByText('Issue Details')).toBeInTheDocument();
  });

  it('closes details panel when close button is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue(mockValidationResult);

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    // Select issue
    const issueRow = screen.getByRole('button');
    await user.click(issueRow);

    expect(screen.getByText('Issue Details')).toBeInTheDocument();

    // Close panel
    const closeButton = screen.getByLabelText('Close details');
    await user.click(closeButton);

    expect(screen.queryByText('Issue Details')).not.toBeInTheDocument();
  });

  it('preserves policy mode from backend', async () => {
    vi.spyOn(ValidationApiClient, 'fetchValidationResult').mockResolvedValue({
      issues: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'permissive',
      },
    });

    render(<ValidationResultsView projectId={mockProjectId} />);

    await waitFor(() => {
      expect(screen.getByText(/Permissive/)).toBeInTheDocument();
    });
  });
});
