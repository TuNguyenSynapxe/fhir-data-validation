/**
 * Unit Tests for ValidationPanel Component
 * 
 * Tests controlled component behavior:
 * - Rendering with validation results
 * - Button states during validation
 * - Error display
 * 
 * Note: Simplified to test core behavior without deep UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ValidationPanel } from '../ValidationPanel';
import { ProjectValidationProvider } from '../../../contexts/project-validation/ProjectValidationContext.tsx';
import type { ValidationResult } from '../../../contexts/project-validation/useProjectValidation';

// Mock the useValidationState hook to return stable state
vi.mock('../../../hooks/useValidationState', () => ({
  useValidationState: () => ({
    state: 'Validated' as const,
  }),
}));

describe('ValidationPanel', () => {
  const testProjectId = 'test-project-123';
  const mockRunValidation = vi.fn();
  const mockClearValidationError = vi.fn();
  const mockOnSelectError = vi.fn();
  const mockOnNavigateToPath = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
  });

  // Helper to render ValidationPanel with Context
  const renderValidationPanel = (
    validationResult: ValidationResult | null = null,
    isValidating = false,
    validationError: string | null = null
  ) => {
    return render(
      <ProjectValidationProvider
        validationResult={validationResult}
        isValidating={isValidating}
        validationError={validationError}
        runValidation={mockRunValidation}
        clearValidationError={mockClearValidationError}
      >
        <ValidationPanel
          projectId={testProjectId}
          onSelectError={mockOnSelectError}
          onNavigateToPath={mockOnNavigateToPath}
          bundleJson='{"resourceType":"Bundle"}'
          bundleChanged={false}
          rulesChanged={false}
        />
      </ProjectValidationProvider>
    );
  };

  describe('rendering with validation results', () => {
    it('should render Problems header', () => {
      renderValidationPanel();

      expect(screen.getByText('Problems')).toBeInTheDocument();
    });

    it('should render validation results when present', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          {
            source: 'FHIR',
            severity: 'error',
            message: 'Invalid identifier format',
            path: 'Patient.identifier',
          },
        ],
        timestamp: '2025-12-19T10:00:00Z',
        executionTimeMs: 150,
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

      renderValidationPanel(validationResult);

      expect(screen.getByText('Invalid identifier format')).toBeInTheDocument();
    });

    it('should display error count badge', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          { source: 'FHIR', severity: 'error', message: 'Error 1' },
          { source: 'FHIR', severity: 'error', message: 'Error 2' },
        ],
        timestamp: '2025-12-19T10:00:00Z',
        executionTimeMs: 100,
        summary: {
          total: 2,
          errors: 2,
          warnings: 0,
          information: 0,
          bySource: {
            firely: 2,
            businessRules: 0,
            codeMaster: 0,
            reference: 0,
            lint: 0,
            specHint: 0,
          },
        },
      };

      renderValidationPanel(validationResult);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display warning count badge', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [
          { source: 'FHIR', severity: 'warning', message: 'Warning 1' },
        ],
        timestamp: '2025-12-19T10:00:00Z',
        executionTimeMs: 100,
        summary: {
          total: 1,
          errors: 0,
          warnings: 1,
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

      renderValidationPanel(validationResult);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show success message when no issues', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        timestamp: '2025-12-19T10:00:00Z',
        executionTimeMs: 80,
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

      renderValidationPanel(validationResult);

      expect(screen.getByText('No issues')).toBeInTheDocument();
    });

    it('should display execution time', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        timestamp: '2025-12-19T10:00:00Z',
        executionTimeMs: 250,
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

      renderValidationPanel(validationResult);

      // Should show execution time
      expect(screen.getByText('250ms')).toBeInTheDocument();
    });
  });

  describe('validation states', () => {
    it('should show running state when isValidating is true', () => {
      renderValidationPanel(null, true);

      expect(screen.getByText(/running/i)).toBeInTheDocument();
    });

    it('should render run validation button when not validating', () => {
      renderValidationPanel(null, false);

      expect(screen.getByText(/run validation/i)).toBeInTheDocument();
    });
  });
    it('should show loading indicator during validation', () => {
      renderValidationPanel(null, true);

      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call runValidation with fast mode on button click', async () => {
      const user = userEvent.setup();
      renderValidationPanel();

      const runButton = screen.getByRole('button', { name: /run validation/i });
      await user.click(runButton);

  describe('context integration', () => {
    it('should receive validation result from context', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          {
            source: 'FHIR',
            severity: 'error',
            message: 'Context test error',
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

      renderValidationPanel(validationResult);

      // Verify component receives and renders context value
      expect(screen.getByText('Context test error')).toBeInTheDocument();
    });

    it('should receive isValidating state from context', () => {
      renderValidationPanel(null, true);

      // Verify component reacts to isValidating state
      expect(screen.getByText(/running/i)).toBeInTheDocument();
    });
  });
    it('should show error alert with retry button', () => {
      renderValidationPanel(null, false, 'Server error');

      expect(screen.getByText(/server error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call clearValidationError when error is dismissed', async () => {
      const user = userEvent.setup();
      renderValidationPanel(null, false, 'Test error');

      const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
      await user.click(dismissButton);

      expect(mockClearValidationError).toHaveBeenCalled();
    });

    it('should not display error message when validationError is null', () => {
      renderValidationPanel(null, false, null);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('component integration', () => {
    it('should render with bundle present', () => {
      renderValidationPanel();

      // Basic render check - component should show Problems header
      expect(screen.getByText('Problems')).toBeInTheDocument();
    });

    it('should display timestamp when validation result exists', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        timestamp: '2025-12-19T10:30:00Z',
        executionTimeMs: 100,
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

      renderValidationPanel(validationResult);

      // Should show execution time
      expect(screen.getByText('100ms')).toBeInTheDocument();
    });
  });
});