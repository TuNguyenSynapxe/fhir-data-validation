import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AmbiguityBanner } from '../AmbiguityBanner';
import type { ValidationIssue } from '../../model/ValidationIssue';
import * as explainPolicyModule from '../../explainers/explainPolicy';

describe('AmbiguityBanner', () => {
  const createIssue = (overrides?: Partial<ValidationIssue>): ValidationIssue => ({
    source: 'StructureDefinition',
    severity: 'error',
    errorCode: 'TEST_ERROR_CODE',
    path: 'Bundle.entry[0].resource.status',
    message: 'Test validation error',
    ...overrides,
  });

  beforeEach(() => {
    vi.spyOn(explainPolicyModule, 'explainPolicy').mockReturnValue(
      'Strict mode: Ambiguity treated as ERROR'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no ambiguous issues exist', () => {
    const issues = [createIssue()];
    const { container } = render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    expect(container.firstChild).toBeNull();
  });

  it('displays banner when ambiguous issues exist', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'ValueSet cannot be expanded offline',
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    expect(screen.getByText('AMBIGUITY DETECTED')).toBeInTheDocument();
  });

  it('displays main warning message', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'ValueSet uses filter-based expansion',
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    expect(
      screen.getByText('This validation could not be completed deterministically.')
    ).toBeInTheDocument();
  });

  it('displays critical warning that ambiguity does not mean valid', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'CodeSystem not available',
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    expect(screen.getByText(/This does NOT mean the data is valid/)).toBeInTheDocument();
    expect(screen.getByText(/cannot confirm validity/)).toBeInTheDocument();
  });

  it('displays violation reasons', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'ValueSet uses filter-based expansion',
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    expect(screen.getByText('ValueSet uses filter-based expansion')).toBeInTheDocument();
  });

  it('displays multiple unique violation reasons', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'ValueSet uses filter-based expansion',
        },
      }),
      createIssue({
        details: {
          violationReason: 'CodeSystem not available offline',
        },
      }),
      createIssue({
        details: {
          violationReason: 'ValueSet uses filter-based expansion', // Duplicate
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    expect(screen.getByText('ValueSet uses filter-based expansion')).toBeInTheDocument();
    expect(screen.getByText('CodeSystem not available offline')).toBeInTheDocument();
    // Should only appear once (deduplicated)
    expect(screen.getAllByText('ValueSet uses filter-based expansion')).toHaveLength(1);
  });

  it('displays policy explanation', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'Test reason',
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    expect(screen.getByText(/Strict mode: Ambiguity treated as ERROR/)).toBeInTheDocument();
  });

  it('calls explainPolicy with correct policy mode', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'Test reason',
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="permissive" />);

    expect(explainPolicyModule.explainPolicy).toHaveBeenCalledWith({ policyMode: 'permissive' });
  });

  it('includes link to capabilities page', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'Test reason',
        },
      }),
    ];

    render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    const link = screen.getByRole('link', { name: /Learn more about what we validate/i });
    expect(link).toHaveAttribute('href', '/validation/capabilities');
  });

  it('has appropriate ARIA attributes for accessibility', () => {
    const issues = [
      createIssue({
        details: {
          violationReason: 'Test reason',
        },
      }),
    ];

    const { container } = render(<AmbiguityBanner issues={issues} policyMode="strict" />);

    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });
});
