import React, { useState, useMemo, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Loader2,
  Clock,
  FileJson
} from 'lucide-react';
import { ValidationResultList } from '../playground/Validation/ValidationResultList';
import { ValidationLayerInfo } from '../playground/Validation/ValidationLayerInfo';
import { ValidationSourceFilter, type SourceFilterState } from '../playground/Validation/ValidationSourceFilter';
import type { SystemRuleSuggestion } from '../../api/projects';
import { ValidationState } from '../../types/validationState';
import type { ValidationError } from '../../contexts/project-validation/useProjectValidation';
import { buildValidationUICounters } from '../../utils/validationUICounters';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { ValidationResponse as PublicValidationResponse } from '../../types/public-validation';

// Authoring validation result (from useProjectValidation)
interface AuthoringValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  timestamp: string;
  executionTimeMs: number;
  summary?: {
    total: number;
    errors: number;
    warnings: number;
    information: number;
    bySource: {
      structure?: number;
      firely: number;
      businessRules: number;
      codeMaster: number;
      reference: number;
      lint: number;
      specHint: number;
    };
  };
}

// Public validation response (convert to authoring format)
function convertPublicToAuthoring(publicResponse: PublicValidationResponse): AuthoringValidationResult {
  // Flatten all phase issues into a single errors array
  const errors: ValidationError[] = [];
  const byPhase = publicResponse.byPhase || {};
  
  Object.entries(byPhase).forEach(([phase, issues]) => {
    if (Array.isArray(issues)) {
      issues.forEach((issue) => {
        errors.push({
          source: phase.toUpperCase(), // lint → LINT, structure → STRUCTURE
          severity: issue.severity,
          message: issue.message,
          jsonPointer: issue.jsonPointer,
          path: issue.path,
          errorCode: issue.errorCode,
          details: issue,
        });
      });
    }
  });
  
  return {
    isValid: publicResponse.summary.byEnforcement.mustFix === 0,
    errors,
    timestamp: new Date().toISOString(),
    executionTimeMs: 0, // Not provided in public response
    summary: {
      total: publicResponse.summary.totalErrors + publicResponse.summary.totalWarnings,
      errors: publicResponse.summary.totalErrors,
      warnings: publicResponse.summary.totalWarnings,
      information: 0,
      bySource: {
        structure: Object.values(byPhase.structure || []).length,
        firely: Object.values(byPhase.firely || []).length,
        businessRules: Object.values(byPhase.rules || []).length,
        codeMaster: Object.values(byPhase.codeMaster || []).length,
        reference: Object.values(byPhase.references || []).length,
        lint: Object.values(byPhase.lint || []).length,
        specHint: Object.values(byPhase.specHint || []).length,
      },
    },
  };
}

interface ValidationWorkspaceProps {
  // ===== VALIDATION DATA (Data-Driven) =====
  // Accept both authoring and public validation responses
  validationResult?: AuthoringValidationResult | PublicValidationResponse | null;
  isValidating: boolean;
  validationError?: string | null;
  
  // ===== VALIDATION ACTIONS (Callback-Based) =====
  onValidate: (mode?: 'standard' | 'full') => Promise<void>;
  onReset?: () => void;
  
  // ===== BUNDLE CONTEXT =====
  bundleJson?: string;  // For path validation
  
  // ===== NAVIGATION (Callback-Based) =====
  onSelectError?: (error: ValidationError) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  
  // ===== AUTHORING-ONLY FEATURES (Optional) =====
  projectId?: string;               // For filter persistence
  bundleChanged?: boolean;          // For draft state guidance
  rulesChanged?: boolean;           // For draft state guidance
  onSuggestionsReceived?: (suggestions: SystemRuleSuggestion[]) => void;  // AI feature
  
  // ===== UI CUSTOMIZATION =====
  defaultOpen?: boolean;            // Initial panel state
  showExplanations?: boolean;       // Show AI explanations
}

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

/**
 * ValidationWorkspace Component
 * 
 * A reusable validation results UI that works in both authoring and public contexts.
 * 
 * ## Design Principles:
 * 1. **Data-Driven**: Renders based on validationResult, not on mode
 * 2. **Callback-Based**: Never makes API calls, uses onValidate/onReset
 * 3. **Optional Authoring**: projectId, draft state only used if provided
 * 4. **No Mode Branching**: Use composition, not if (mode === 'authoring')
 * 
 * ## Responsibilities:
 * - Render validation toolbar (Run Validation, Mode Toggle, Reset, Filters)
 * - Display validation results (ValidationResultList)
 * - Manage local UI state (isOpen, validationMode, sourceFilters)
 * - Persist filters to localStorage (if projectId provided)
 * - Show draft state guidance (if bundleChanged/rulesChanged provided)
 * - Trigger validation via callback (not direct API call)
 * 
 * ## Must NOT:
 * - Make API calls directly
 * - Know about routing or page structure
 * - Assume specific backend implementation
 * - Leak authoring state into public UI
 */
export const ValidationWorkspace: React.FC<ValidationWorkspaceProps> = ({ 
  validationResult: rawValidationResult = null,
  isValidating,
  validationError = null,
  onValidate,
  onReset,
  bundleJson = '',
  onSelectError,
  onNavigateToPath,
  projectId,
  bundleChanged = false,
  rulesChanged = false,
  onSuggestionsReceived,
  defaultOpen = false,
  showExplanations = false,
}) => {
  // Convert public validation response to authoring format if needed
  const validationResult = useMemo((): AuthoringValidationResult | null => {
    if (!rawValidationResult) return null;
    
    // Check if it's a public response (has byPhase property)
    if ('byPhase' in rawValidationResult) {
      return convertPublicToAuthoring(rawValidationResult as PublicValidationResponse);
    }
    
    // Already in authoring format
    return rawValidationResult as AuthoringValidationResult;
  }, [rawValidationResult]);
  
  // UI-only state (presentation, not validation lifecycle)
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [validationMode, setValidationMode] = useState<'standard' | 'full'>('standard'); // Default to Standard mode
  
  // Detect desktop layout for button text
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  
  // Derive validation state from current conditions (simplified, no useValidationState hook)
  const validationState = useMemo(() => {
    const hasBundle = bundleJson && bundleJson.trim() !== '' && bundleJson.trim() !== '{}';
    if (!hasBundle) return ValidationState.NoBundle;
    if (!validationResult) return ValidationState.NotValidated;
    
    // Check if draft changed (only relevant if props provided)
    if (bundleChanged || rulesChanged) return ValidationState.NotValidated;
    
    const hasBlockingErrors = validationResult.errors.some(
      e => e.severity === 'error' && e.source !== 'LINT' && e.source !== 'SPEC_HINT'
    );
    return hasBlockingErrors ? ValidationState.Failed : ValidationState.Validated;
  }, [bundleJson, validationResult, bundleChanged, rulesChanged]);
  
  // Check if we should show empty state
  const showNoBundleState = validationState === ValidationState.NoBundle;
  
  // Source filtering state with optional persistence
  const [sourceFilters, setSourceFilters] = useState<SourceFilterState>(() => {
    // Only load from localStorage if projectId provided (authoring mode)
    if (!projectId) {
      return {
        structure: true,
        lint: true,
        reference: true,
        firely: true,
        business: true,
        codeMaster: true,
        specHint: true,
      };
    }
    
    const stored = localStorage.getItem(`validation-filters-${projectId}`);
    return stored ? JSON.parse(stored) : {
      structure: true,
      lint: true,
      reference: true,
      firely: true,
      business: true,
      codeMaster: true,
      specHint: true,
    };
  });

  // Persist filter state (only if projectId provided)
  const handleFilterChange = (filters: SourceFilterState) => {
    setSourceFilters(filters);
    if (projectId) {
      localStorage.setItem(`validation-filters-${projectId}`, JSON.stringify(filters));
    }
  };
  
  /**
   * Run validation (via callback)
   * Uses current validationMode state (standard or full)
   * Resets source filters to show all
   */
  const handleRunValidation = async () => {
    // Reset filters to show all sources
    const allFilters: SourceFilterState = {
      structure: true,
      firely: true,
      business: true,
      codeMaster: true,
      specHint: true,
      lint: true,
      reference: true,
    };
    setSourceFilters(allFilters);
    
    // Persist reset filters (only if projectId provided)
    if (projectId) {
      localStorage.setItem(`validation-filters-${projectId}`, JSON.stringify(allFilters));
    }
    
    setIsOpen(true); // Auto-expand after validation
    await onValidate(validationMode);
  };

  /**
   * Reset validation results (via callback)
   */
  const handleReset = () => {
    onReset?.();
  };

  /**
   * Handle error selection
   */
  const handleErrorClick = (validationError: ValidationError) => {
    onSelectError?.(validationError);
  };

  const summary = validationResult?.summary;
  const hasErrors = (summary?.total || 0) > 0;
  
  // Build UI counters from visible errors only
  const uiCounters = useMemo(() => {
    if (!validationResult?.errors) {
      return { mustFix: 0, recommendations: 0, total: 0 };
    }
    return buildValidationUICounters(validationResult.errors, sourceFilters);
  }, [validationResult?.errors, sourceFilters]);

  // Render NoBundle empty state
  if (showNoBundleState) {
    return (
      <div className="flex flex-col h-full bg-white border-t">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Problems
            </span>
            <ValidationLayerInfo />
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <FileJson className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Bundle to Validate
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Load a FHIR bundle in the left panel to run validation.
              Validation will check your bundle against FHIR structural rules,
              business logic, and code system constraints.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Getting Started</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Load a sample bundle from the Bundle tab</li>
                    <li>Or paste your own FHIR bundle JSON</li>
                    <li>Then click "Run Validation" here</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-t">
      {/* Header with collapse toggle */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Problems
          </span>
          
          {/* Validation Layer Info Tooltip */}
          <ValidationLayerInfo />
          
          {/* UI Counters - match visible items only */}
          {validationResult && (
            <div className="flex items-center gap-2 ml-2">
              {uiCounters.mustFix > 0 && (
                <span 
                  className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full"
                  title="Issues that must be fixed for HL7 compliance"
                >
                  <AlertCircle className="w-3 h-3" />
                  {uiCounters.mustFix} must-fix
                </span>
              )}
              {uiCounters.recommendations > 0 && (
                <span 
                  className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"
                  title="Best-practice recommendations"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {uiCounters.recommendations} recommendations
                </span>
              )}
              {uiCounters.total === 0 && (
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  No issues
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp, FHIR version, and execution time */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {validationResult && (
            <>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last run: {formatTimestamp(validationResult.timestamp)}
              </span>
              <span>
                {validationResult.executionTimeMs}ms
              </span>
            </>
          )}
          <span 
            className="text-gray-600 font-medium"
            title="Validation performed against HL7 FHIR R4 (4.0.1)"
          >
            FHIR R4 (4.0.1)
          </span>
        </div>
      </div>

      {/* Collapsible content */}
      {isOpen && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRunValidation();
                }}
                disabled={isValidating}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isValidating ? 'Running...' : 'Run Validation'}
              </button>

              {/* Validation Mode Toggle */}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <span className="text-xs text-gray-600 mr-1">Mode:</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setValidationMode('standard');
                  }}
                  disabled={isValidating}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    validationMode === 'standard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Standard - Blocking checks only (recommended for submission)"
                >
                  Standard
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setValidationMode('full');
                  }}
                  disabled={isValidating}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    validationMode === 'full'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Full Analysis - Includes advisory lint and FHIR checks (recommended during authoring)"
                >
                  Full Analysis
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                disabled={isValidating || !validationResult}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>

              {/* Source filter dropdown */}
              {summary && hasErrors && (
                <ValidationSourceFilter
                  filters={sourceFilters}
                  onChange={handleFilterChange}
                  counts={{
                    structure: summary?.bySource?.structure || 0,
                    lint: summary?.bySource?.lint || 0,
                    reference: summary?.bySource?.reference || 0,
                    firely: summary?.bySource?.firely || 0,
                    business: summary?.bySource?.businessRules || 0,
                    codeMaster: summary?.bySource?.codeMaster || 0,
                    specHint: summary?.bySource?.specHint || 0,
                  }}
                />
              )}
            </div>
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-y-auto">
            {validationError && (
              <div className="p-4 m-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Validation Error</p>
                    <p className="text-sm text-red-700 mt-1">{validationError}</p>
                  </div>
                </div>
              </div>
            )}

            {!validationError && !validationResult && !isValidating && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <Play className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No validation results</p>
                <p className="text-xs mt-1">Click "Run Validation" to check your FHIR bundle</p>
                
                {/* Show additional guidance for NotValidated state (only if draft props provided) */}
                {validationState === ValidationState.NotValidated && (bundleChanged || rulesChanged) && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 text-left">
                        <p className="font-medium mb-1">
                          {bundleChanged && rulesChanged 
                            ? 'Bundle and rules have changed'
                            : bundleChanged
                            ? 'Bundle has changed'
                            : 'Rules have changed'}
                        </p>
                        <p>Run validation to see updated results.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isValidating && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <Loader2 className="w-12 h-12 mb-3 animate-spin" />
                <p className="text-sm font-medium">Running validation...</p>
                <p className="text-xs mt-1">Please wait</p>
              </div>
            )}

            {validationResult && validationResult.errors && validationResult.errors.length > 0 && (
              <ValidationResultList
                errors={validationResult.errors}
                onErrorClick={handleErrorClick}
                onNavigateToPath={onNavigateToPath}
                sourceFilters={sourceFilters}
                showExplanations={showExplanations}
                bundleJson={bundleJson}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
