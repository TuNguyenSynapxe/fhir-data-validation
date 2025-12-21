/**
 * Unit Tests for ProjectValidationContext
 * 
 * Tests React Context provider and consumer hook:
 * - Provider exposes correct values
 * - Consumer hook receives values
 * - Hook throws error outside provider
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  ProjectValidationProvider,
  useProjectValidationContext,
} from '../ProjectValidationContext';
import type { ValidationResult } from '../useProjectValidation';

describe('ProjectValidationContext', () => {
  // Mock validation state and actions
  const mockValidationResult: ValidationResult = {
    isValid: false,
    errors: [
      {
        source: 'FHIR',
        severity: 'error',
        message: 'Test error',
        path: 'Patient.name',
      },
    ],
    timestamp: '2025-12-19T10:00:00Z',
    executionTimeMs: 100,
    summary: {
      total: 1,
      errors: 1,
      warnings: 0,
      information: 0,
      bySource: {
        firely: 1,
        businessRules: 0,
        codeMaster: 0,
        reference: 0,
        lint: 0,
        specHint: 0,
      },
    },
  };

  const mockRunValidation = vi.fn();
  const mockClearValidationError = vi.fn();

  describe('ProjectValidationProvider', () => {
    it('should expose validation result to consumers', () => {
      // Test consumer component
      const TestConsumer: React.FC = () => {
        const { validationResult } = useProjectValidationContext();
        return (
          <div data-testid="validation-result">
            {validationResult?.errors[0].message}
          </div>
        );
      };

      render(
        <ProjectValidationProvider
          validationResult={mockValidationResult}
          isValidating={false}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      expect(screen.getByTestId('validation-result')).toHaveTextContent('Test error');
    });

    it('should expose isValidating state to consumers', () => {
      const TestConsumer: React.FC = () => {
        const { isValidating } = useProjectValidationContext();
        return <div data-testid="validating-state">{isValidating ? 'true' : 'false'}</div>;
      };

      render(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={true}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      expect(screen.getByTestId('validating-state')).toHaveTextContent('true');
    });

    it('should expose validation error to consumers', () => {
      const TestConsumer: React.FC = () => {
        const { validationError } = useProjectValidationContext();
        return <div data-testid="validation-error">{validationError}</div>;
      };

      render(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={false}
          validationError="Network error"
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      expect(screen.getByTestId('validation-error')).toHaveTextContent('Network error');
    });

    it('should expose runValidation action to consumers', () => {
      const TestConsumer: React.FC = () => {
        const { runValidation } = useProjectValidationContext();
        return (
          <button onClick={() => runValidation('standard')}>
            Run Validation
          </button>
        );
      };

      render(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={false}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      screen.getByText('Run Validation').click();

      expect(mockRunValidation).toHaveBeenCalledWith('standard');
    });

    it('should expose clearValidationError action to consumers', () => {
      const TestConsumer: React.FC = () => {
        const { clearValidationError } = useProjectValidationContext();
        return (
          <button onClick={clearValidationError}>
            Clear Error
          </button>
        );
      };

      render(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={false}
          validationError="Test error"
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      screen.getByText('Clear Error').click();

      expect(mockClearValidationError).toHaveBeenCalled();
    });

    it('should provide same function references across renders', () => {
      const capturedRefs: any[] = [];

      const TestConsumer: React.FC = () => {
        const context = useProjectValidationContext();
        capturedRefs.push(context);
        return null;
      };

      const { rerender } = render(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={false}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      // Force re-render with same props
      rerender(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={false}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      // Context value should be memoized (same reference)
      expect(capturedRefs[0]).toBe(capturedRefs[1]);
    });

    it('should update context value when props change', () => {
      const TestConsumer: React.FC = () => {
        const { isValidating } = useProjectValidationContext();
        return <div data-testid="validating">{isValidating ? 'true' : 'false'}</div>;
      };

      const { rerender } = render(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={false}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      expect(screen.getByTestId('validating')).toHaveTextContent('false');

      // Update isValidating prop
      rerender(
        <ProjectValidationProvider
          validationResult={null}
          isValidating={true}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      expect(screen.getByTestId('validating')).toHaveTextContent('true');
    });
  });

  describe('useProjectValidationContext hook', () => {
    it('should throw error when used outside provider', () => {
      const TestComponent: React.FC = () => {
        useProjectValidationContext();
        return null;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useProjectValidationContext must be used within ProjectValidationProvider');

      console.error = originalError;
    });

    it('should include helpful error message', () => {
      const TestComponent: React.FC = () => {
        useProjectValidationContext();
        return null;
      };

      const originalError = console.error;
      console.error = vi.fn();

      try {
        render(<TestComponent />);
      } catch (error) {
        expect((error as Error).message).toContain('Ensure the component is wrapped by <ProjectValidationProvider>');
      }

      console.error = originalError;
    });

    it('should return context value when used inside provider', () => {
      let capturedContext: any = null;

      const TestConsumer: React.FC = () => {
        capturedContext = useProjectValidationContext();
        return null;
      };

      render(
        <ProjectValidationProvider
          validationResult={mockValidationResult}
          isValidating={false}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <TestConsumer />
        </ProjectValidationProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext.validationResult).toEqual(mockValidationResult);
      expect(capturedContext.isValidating).toBe(false);
      expect(capturedContext.validationError).toBeNull();
      expect(capturedContext.runValidation).toBe(mockRunValidation);
      expect(capturedContext.clearValidationError).toBe(mockClearValidationError);
    });
  });

  describe('nested providers', () => {
    it('should support nested providers with different values', () => {
      const outerResult: ValidationResult = {
        isValid: true,
        errors: [],
        timestamp: '2025-12-19T10:00:00Z',
        executionTimeMs: 50,
        summary: {
          total: 0,
          errors: 0,
          warnings: 0,
          information: 0,
          bySource: {
            firely: 0,
            businessRules: 0,
            codeMaster: 0,
            reference: 0,
            lint: 0,
            specHint: 0,
          },
        },
      };

      const innerResult: ValidationResult = {
        isValid: false,
        errors: [{ source: 'FHIR', severity: 'error', message: 'Inner error' }],
        timestamp: '2025-12-19T11:00:00Z',
        executionTimeMs: 100,
        summary: {
          total: 1,
          errors: 1,
          warnings: 0,
          information: 0,
          bySource: {
            firely: 1,
            businessRules: 0,
            codeMaster: 0,
            reference: 0,
            lint: 0,
            specHint: 0,
          },
        },
      };

      const OuterConsumer: React.FC = () => {
        const { validationResult } = useProjectValidationContext();
        return <div data-testid="outer">{validationResult?.isValid ? 'valid' : 'invalid'}</div>;
      };

      const InnerConsumer: React.FC = () => {
        const { validationResult } = useProjectValidationContext();
        return <div data-testid="inner">{validationResult?.errors[0]?.message}</div>;
      };

      render(
        <ProjectValidationProvider
          validationResult={outerResult}
          isValidating={false}
          validationError={null}
          runValidation={mockRunValidation}
          clearValidationError={mockClearValidationError}
        >
          <OuterConsumer />
          <ProjectValidationProvider
            validationResult={innerResult}
            isValidating={false}
            validationError={null}
            runValidation={mockRunValidation}
            clearValidationError={mockClearValidationError}
          >
            <InnerConsumer />
          </ProjectValidationProvider>
        </ProjectValidationProvider>
      );

      expect(screen.getByTestId('outer')).toHaveTextContent('valid');
      expect(screen.getByTestId('inner')).toHaveTextContent('Inner error');
    });
  });
});
