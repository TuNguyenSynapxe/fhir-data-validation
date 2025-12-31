/**
 * Phase 7 - ValidationErrorExplanation Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationErrorExplanation, ValidationErrorDescription, ValidationErrorTitle } from '../ValidationErrorExplanation';
import type { ValidationError } from '../../../validation';

describe('ValidationErrorExplanation', () => {
  it('renders title and description for valid error', () => {
    const error: ValidationError = {
      errorCode: 'VALUE_NOT_ALLOWED',
      details: {
        actual: 'invalid',
        allowed: ['valid1', 'valid2'],
        valueType: 'string',
      },
    };

    render(<ValidationErrorExplanation error={error} />);

    expect(screen.getByText('Value not allowed')).toBeInTheDocument();
    expect(screen.getByText(/The value "invalid" is not permitted/)).toBeInTheDocument();
  });

  it('renders only title when showDescription is false', () => {
    const error: ValidationError = {
      errorCode: 'VALUE_NOT_ALLOWED',
      details: {
        actual: 'test',
        allowed: ['valid'],
        valueType: 'string',
      },
    };

    render(<ValidationErrorExplanation error={error} showDescription={false} />);

    expect(screen.getByText('Value not allowed')).toBeInTheDocument();
    expect(screen.queryByText(/The value "test"/)).not.toBeInTheDocument();
  });

  it('renders only description when showTitle is false', () => {
    const error: ValidationError = {
      errorCode: 'REQUIRED_FIELD_MISSING',
      details: { required: true },
    };

    render(<ValidationErrorExplanation error={error} showTitle={false} />);

    expect(screen.queryByText('Missing required field')).not.toBeInTheDocument();
    expect(screen.getByText(/This field is required/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const error: ValidationError = {
      errorCode: 'FIXED_VALUE_MISMATCH',
      details: { actual: 'wrong', expected: 'correct' },
    };

    const { container } = render(
      <ValidationErrorExplanation error={error} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('gracefully handles malformed error', () => {
    const error = {} as ValidationError;

    render(<ValidationErrorExplanation error={error} />);

    expect(screen.getByText('Validation issue')).toBeInTheDocument();
    expect(screen.getByText(/does not meet validation requirements/)).toBeInTheDocument();
  });

  it('gracefully handles null error', () => {
    const error = null as any;

    render(<ValidationErrorExplanation error={error} />);

    expect(screen.getByText('Validation issue')).toBeInTheDocument();
  });

  it('gracefully handles undefined error', () => {
    const error = undefined as any;

    render(<ValidationErrorExplanation error={error} />);

    expect(screen.getByText('Validation issue')).toBeInTheDocument();
  });

  it('does NOT access error.message', () => {
    const error: any = {
      errorCode: 'VALUE_NOT_ALLOWED',
      message: 'Legacy message should not be shown',
      details: {
        actual: 'test',
        allowed: ['valid'],
        valueType: 'string',
      },
    };

    render(<ValidationErrorExplanation error={error} />);

    expect(screen.queryByText('Legacy message should not be shown')).not.toBeInTheDocument();
  });

  it('does NOT access error.path', () => {
    const error: any = {
      errorCode: 'VALUE_NOT_ALLOWED',
      path: 'Resource.field',
      details: {
        actual: 'test',
        allowed: ['valid'],
        valueType: 'string',
      },
    };

    render(<ValidationErrorExplanation error={error} />);

    expect(screen.queryByText(/Resource\.field/)).not.toBeInTheDocument();
  });

  it('does NOT access error.jsonPointer', () => {
    const error: any = {
      errorCode: 'VALUE_NOT_ALLOWED',
      jsonPointer: '/entry/0/resource/field',
      details: {
        actual: 'test',
        allowed: ['valid'],
        valueType: 'string',
      },
    };

    render(<ValidationErrorExplanation error={error} />);

    expect(screen.queryByText(/\/entry\/0/)).not.toBeInTheDocument();
  });
});

describe('ValidationErrorDescription', () => {
  it('renders only description text', () => {
    const error: ValidationError = {
      errorCode: 'PATTERN_MISMATCH',
      details: {
        actual: 'abc',
        pattern: '^[0-9]+$',
        description: 'Must be numeric',
      },
    };

    render(<ValidationErrorDescription error={error} />);

    expect(screen.getByText('Must be numeric')).toBeInTheDocument();
    expect(screen.queryByText('Invalid format')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const error: ValidationError = {
      errorCode: 'REQUIRED_FIELD_MISSING',
      details: { required: true },
    };

    const { container } = render(
      <ValidationErrorDescription error={error} className="text-red-600" />
    );

    const span = container.querySelector('span.text-red-600');
    expect(span).toBeInTheDocument();
  });
});

describe('ValidationErrorTitle', () => {
  it('renders only title text', () => {
    const error: ValidationError = {
      errorCode: 'FIXED_VALUE_MISMATCH',
      details: { actual: 'wrong', expected: 'correct' },
    };

    render(<ValidationErrorTitle error={error} />);

    expect(screen.getByText('Incorrect value')).toBeInTheDocument();
    expect(screen.queryByText(/Expected "correct"/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const error: ValidationError = {
      errorCode: 'VALUE_NOT_ALLOWED',
      details: { actual: 'test', allowed: ['valid'], valueType: 'string' },
    };

    const { container } = render(
      <ValidationErrorTitle error={error} className="font-bold" />
    );

    const span = container.querySelector('span.font-bold');
    expect(span).toBeInTheDocument();
  });
});
