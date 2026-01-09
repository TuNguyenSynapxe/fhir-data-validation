import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationIssueRow } from '../ValidationIssueRow';
import type { ValidationIssue } from '../../model/ValidationIssue';

describe('ValidationIssueRow', () => {
  const createIssue = (overrides?: Partial<ValidationIssue>): ValidationIssue => ({
    source: 'StructureDefinition',
    severity: 'error',
    errorCode: 'TEST_ERROR_CODE',
    path: 'Bundle.entry[0].resource.status',
    message: 'Test validation error',
    ...overrides,
  });

  it('displays error code', () => {
    const issue = createIssue();
    render(<ValidationIssueRow issue={issue} />);

    expect(screen.getByText('TEST_ERROR_CODE')).toBeInTheDocument();
  });

  it('displays message', () => {
    const issue = createIssue({ message: 'Custom error message' });
    render(<ValidationIssueRow issue={issue} />);

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('displays path', () => {
    const issue = createIssue({ path: 'Bundle.entry[2].resource.code' });
    render(<ValidationIssueRow issue={issue} />);

    expect(screen.getByText('Bundle.entry[2].resource.code')).toBeInTheDocument();
  });

  it('displays source', () => {
    const issue = createIssue({ source: 'FHIRPath' });
    render(<ValidationIssueRow issue={issue} />);

    expect(screen.getByText('FHIRPath')).toBeInTheDocument();
  });

  it('renders error severity icon', () => {
    const issue = createIssue({ severity: 'error' });
    const { container } = render(<ValidationIssueRow issue={issue} />);

    expect(container.textContent).toContain('🔴');
  });

  it('renders warning severity icon', () => {
    const issue = createIssue({ severity: 'warning' });
    const { container } = render(<ValidationIssueRow issue={issue} />);

    expect(container.textContent).toContain('🟡');
  });

  it('renders info severity icon', () => {
    const issue = createIssue({ severity: 'info' });
    const { container } = render(<ValidationIssueRow issue={issue} />);

    expect(container.textContent).toContain('🔵');
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const issue = createIssue();

    render(<ValidationIssueRow issue={issue} onSelect={onSelect} />);

    const row = screen.getByRole('button');
    await user.click(row);

    expect(onSelect).toHaveBeenCalledWith(issue);
  });

  it('calls onSelect when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const issue = createIssue();

    render(<ValidationIssueRow issue={issue} onSelect={onSelect} />);

    const row = screen.getByRole('button');
    row.focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(issue);
  });

  it('calls onSelect when Space key is pressed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const issue = createIssue();

    render(<ValidationIssueRow issue={issue} onSelect={onSelect} />);

    const row = screen.getByRole('button');
    row.focus();
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledWith(issue);
  });

  it('is not interactive when onSelect is not provided', () => {
    const issue = createIssue();
    render(<ValidationIssueRow issue={issue} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
