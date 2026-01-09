import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationCapabilitiesView } from '../ValidationCapabilitiesView';

describe('ValidationCapabilitiesView', () => {
  it('renders the main title', () => {
    render(<ValidationCapabilitiesView />);

    expect(screen.getByText('Validation Capabilities')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<ValidationCapabilitiesView />);

    expect(
      screen.getByText('Understanding what we validate and the boundaries of validation')
    ).toBeInTheDocument();
  });

  it('renders markdown content headings', () => {
    render(<ValidationCapabilitiesView />);

    expect(screen.getByText('What We Validate')).toBeInTheDocument();
    expect(screen.getByText('What We CAN Validate')).toBeInTheDocument();
    expect(screen.getByText('What We CANNOT Validate (Ambiguity Sources)')).toBeInTheDocument();
  });

  it('renders policy mode information', () => {
    render(<ValidationCapabilitiesView />);

    expect(screen.getByText('Policy Modes')).toBeInTheDocument();
    expect(screen.getByText('Strict Mode (Default)')).toBeInTheDocument();
    expect(screen.getByText('Permissive Mode')).toBeInTheDocument();
  });

  it('renders transparency guarantee section', () => {
    render(<ValidationCapabilitiesView />);

    expect(screen.getByText('Transparency Guarantee')).toBeInTheDocument();
  });

  it('renders important notes section', () => {
    render(<ValidationCapabilitiesView />);

    expect(screen.getByText('Important Notes')).toBeInTheDocument();
  });

  it('renders validation capabilities list', () => {
    render(<ValidationCapabilitiesView />);

    expect(screen.getByText(/Structure Definition Validation/)).toBeInTheDocument();
    expect(screen.getByText(/FHIRPath Business Rules/)).toBeInTheDocument();
    expect(screen.getByText(/Reference Validation/)).toBeInTheDocument();
    expect(screen.getByText(/Syntax Validation/)).toBeInTheDocument();
  });

  it('renders terminology limitations', () => {
    render(<ValidationCapabilitiesView />);

    expect(screen.getByText('Terminology Validation Limitations')).toBeInTheDocument();
  });

  it('does not crash with empty content', () => {
    // Test component robustness
    expect(() => {
      render(<ValidationCapabilitiesView />);
    }).not.toThrow();
  });

  it('has no interactive controls', () => {
    const { container } = render(<ValidationCapabilitiesView />);

    // Should not have buttons (except potentially navigation)
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);

    // Should not have inputs
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBe(0);

    // Should not have form elements
    const forms = container.querySelectorAll('form');
    expect(forms.length).toBe(0);
  });

  it('renders content in read-only format', () => {
    const { container } = render(<ValidationCapabilitiesView />);

    // Content should be static HTML
    const editableElements = container.querySelectorAll('[contenteditable="true"]');
    expect(editableElements.length).toBe(0);
  });
});
