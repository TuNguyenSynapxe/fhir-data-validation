import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationResultsView } from '../ValidationResultsView';
import type { ValidationResult } from '../../model/ValidationResult';

describe('ValidationResultsView', () => {
  const createResult = (overrides?: Partial<ValidationResult>): ValidationResult => ({
    issues: [],
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      totalInfo: 0,
      hasAmbiguity: false,
      policyMode: 'strict',
    },
    ...overrides,
  });

  it('renders ValidationSummary', () => {
    const result = createResult({
      summary: {
        totalErrors: 5,
        totalWarnings: 2,
        totalInfo: 1,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    });

    render(<ValidationResultsView result={result} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });

  it('renders AmbiguityBanner when ambiguity exists', () => {
    const result = createResult({
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

    render(<ValidationResultsView result={result} />);

    expect(screen.getByText('AMBIGUITY DETECTED')).toBeInTheDocument();
  });

  it('renders all issues as ValidationIssueRow', () => {
    const result = createResult({
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
        {
          source: 'Reference',
          severity: 'info',
          errorCode: 'INFO_1',
          path: 'Bundle.entry[2]',
          message: 'First info',
        },
      ],
      summary: {
        totalErrors: 1,
        totalWarnings: 1,
        totalInfo: 1,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    });

    render(<ValidationResultsView result={result} />);

    expect(screen.getByText('First error')).toBeInTheDocument();
    expect(screen.getByText('First warning')).toBeInTheDocument();
    expect(screen.getByText('First info')).toBeInTheDocument();
  });

  it('shows no issues message when issues array is empty', () => {
    const result = createResult();

    render(<ValidationResultsView result={result} />);

    expect(screen.getByText('No validation issues to display.')).toBeInTheDocument();
  });

  it('does not show details panel initially', () => {
    const result = createResult({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'TEST_CODE',
          path: 'Bundle.entry[0]',
          message: 'Test error',
        },
      ],
    });

    render(<ValidationResultsView result={result} />);

    expect(screen.queryByText('Issue Details')).not.toBeInTheDocument();
  });

  it('shows details panel when an issue is selected', async () => {
    const user = userEvent.setup();
    const result = createResult({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'TEST_CODE',
          path: 'Bundle.entry[0].resource.status',
          message: 'Test error message',
        },
      ],
    });

    render(<ValidationResultsView result={result} />);

    // Click the issue row
    const issueRow = screen.getByRole('button');
    await user.click(issueRow);

    // Details panel should appear
    expect(screen.getByText('Issue Details')).toBeInTheDocument();
  });

  it('closes details panel when close button is clicked', async () => {
    const user = userEvent.setup();
    const result = createResult({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'TEST_CODE',
          path: 'Bundle.entry[0]',
          message: 'Test error',
        },
      ],
    });

    render(<ValidationResultsView result={result} />);

    // Select issue
    const issueRow = screen.getByRole('button');
    await user.click(issueRow);

    expect(screen.getByText('Issue Details')).toBeInTheDocument();

    // Close panel
    const closeButton = screen.getByLabelText('Close details');
    await user.click(closeButton);

    expect(screen.queryByText('Issue Details')).not.toBeInTheDocument();
  });

  it('renders issues in order without filtering', () => {
    const result = createResult({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'info',
          errorCode: 'INFO_1',
          path: 'Bundle.entry[0]',
          message: 'Info message',
        },
        {
          source: 'FHIRPath',
          severity: 'error',
          errorCode: 'ERROR_1',
          path: 'Bundle.entry[1]',
          message: 'Error message',
        },
        {
          source: 'Reference',
          severity: 'warning',
          errorCode: 'WARNING_1',
          path: 'Bundle.entry[2]',
          message: 'Warning message',
        },
      ],
    });

    render(<ValidationResultsView result={result} />);

    const messages = screen.getAllByText(/message$/);
    expect(messages[0]).toHaveTextContent('Info message');
    expect(messages[1]).toHaveTextContent('Error message');
    expect(messages[2]).toHaveTextContent('Warning message');
  });
});
