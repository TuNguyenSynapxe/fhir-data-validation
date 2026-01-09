import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationIssueDetails } from '../ValidationIssueDetails';
import type { ValidationIssue } from '../../model/ValidationIssue';
import * as explainErrorModule from '../../explainers/explainError';
import * as explainAmbiguityModule from '../../explainers/explainAmbiguity';

describe('ValidationIssueDetails', () => {
  const createIssue = (overrides?: Partial<ValidationIssue>): ValidationIssue => ({
    source: 'StructureDefinition',
    severity: 'error',
    errorCode: 'TEST_ERROR_CODE',
    path: 'Bundle.entry[0].resource.status',
    message: 'Test validation error',
    ...overrides,
  });

  beforeEach(() => {
    // Mock explainError to return predictable explanation
    vi.spyOn(explainErrorModule, 'explainError').mockReturnValue({
      what: 'Test what failed',
      why: 'Test why it failed',
      context: 'Test context',
      policy: 'Test policy',
      links: [{ label: 'Test Link', href: '/test' }],
    });

    // Mock explainAmbiguity to return null by default
    vi.spyOn(explainAmbiguityModule, 'explainAmbiguity').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses explainError to get explanation', () => {
    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(explainErrorModule.explainError).toHaveBeenCalledWith(issue);
  });

  it('displays what failed section', () => {
    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('What Failed')).toBeInTheDocument();
    expect(screen.getByText('Test what failed')).toBeInTheDocument();
  });

  it('displays error code from issue', () => {
    const issue = createIssue({ errorCode: 'SD_CARDINALITY_MIN_VIOLATION' });
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('SD_CARDINALITY_MIN_VIOLATION')).toBeInTheDocument();
  });

  it('displays path from issue', () => {
    const issue = createIssue({ path: 'Bundle.entry[5].resource.code' });
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('Bundle.entry[5].resource.code')).toBeInTheDocument();
  });

  it('displays source from issue', () => {
    const issue = createIssue({ source: 'FHIRPath' });
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('FHIRPath')).toBeInTheDocument();
  });

  it('displays why it failed section', () => {
    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('Why It Failed')).toBeInTheDocument();
    expect(screen.getByText('Test why it failed')).toBeInTheDocument();
  });

  it('displays context section when present', () => {
    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('Test context')).toBeInTheDocument();
  });

  it('displays policy section when present', () => {
    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('Policy Impact')).toBeInTheDocument();
    expect(screen.getByText('Test policy')).toBeInTheDocument();
  });

  it('displays links when present', () => {
    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText('Related Documentation')).toBeInTheDocument();
    expect(screen.getByText('Test Link')).toBeInTheDocument();
  });

  it('does not display context section when not present', () => {
    vi.spyOn(explainErrorModule, 'explainError').mockReturnValue({
      what: 'Test what',
      why: 'Test why',
    });

    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.queryByText('Context')).not.toBeInTheDocument();
  });

  it('displays ambiguity section when issue is ambiguous', () => {
    vi.spyOn(explainAmbiguityModule, 'explainAmbiguity').mockReturnValue({
      what: 'Ambiguity detected',
      why: 'Cannot be verified',
      context: 'This does NOT mean the data is valid',
      policy: 'Strict mode: treated as ERROR',
    });

    const issue = createIssue({
      details: {
        violationReason: 'ValueSet cannot be expanded offline',
      },
    });

    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.getByText(/Ambiguity detected/)).toBeInTheDocument();
    expect(screen.getByText(/does NOT mean the data is valid/)).toBeInTheDocument();
  });

  it('does not display ambiguity section when issue is not ambiguous', () => {
    const issue = createIssue();
    render(<ValidationIssueDetails issue={issue} />);

    expect(screen.queryByText(/Ambiguity detected/)).not.toBeInTheDocument();
  });
});
