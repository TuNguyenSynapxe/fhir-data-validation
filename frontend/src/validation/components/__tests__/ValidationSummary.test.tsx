import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationSummary } from '../ValidationSummary';
import type { ValidationResult } from '../../model/ValidationResult';

describe('ValidationSummary', () => {
  it('displays error count', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 5,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });

  it('displays warning count', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 3,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'permissive',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/Warning/)).toBeInTheDocument();
  });

  it('displays info count', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 2,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('displays policy mode', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.getByText(/Policy:/)).toBeInTheDocument();
    expect(screen.getByText(/Strict/)).toBeInTheDocument();
  });

  it('shows ambiguity warning when hasAmbiguity is true', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 1,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: true,
        policyMode: 'strict',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.getByText(/Validation completed with ambiguity/)).toBeInTheDocument();
    expect(screen.getByText(/could not be verified deterministically/)).toBeInTheDocument();
  });

  it('does not show ambiguity warning when hasAmbiguity is false', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 1,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.queryByText(/Validation completed with ambiguity/)).not.toBeInTheDocument();
  });

  it('shows message when no issues detected', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.getByText('No validation issues detected')).toBeInTheDocument();
  });

  it('displays multiple counts together', () => {
    const result: ValidationResult = {
      issues: [],
      summary: {
        totalErrors: 10,
        totalWarnings: 5,
        totalInfo: 2,
        hasAmbiguity: false,
        policyMode: 'permissive',
      },
    };

    render(<ValidationSummary result={result} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
