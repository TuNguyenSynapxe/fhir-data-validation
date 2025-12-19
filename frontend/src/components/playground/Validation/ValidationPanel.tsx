import React, { useState, useEffect } from 'react';
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
import { ValidationResultList } from './ValidationResultList';
import { ValidationLayerInfo } from './ValidationLayerInfo';
import { ValidationSourceFilter, type SourceFilterState } from './ValidationSourceFilter';
import type { SystemRuleSuggestion } from '../../../api/projects';
import { useValidationState } from '../../../hooks/useValidationState';
import { ValidationState } from '../../../types/validationState';

interface ValidationError {
  source: string; // FHIR, Business, CodeMaster, Reference
  severity: string; // error, warning, info
  resourceType?: string;
  path?: string;
  jsonPointer?: string;
  errorCode?: string;
  message: string;
  details?: Record<string, any>;
  navigation?: {
    jsonPointer?: string;
    breadcrumb?: string;
    resourceIndex?: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  timestamp: string;
  executionTimeMs: number;
  summary: {
    total: number;
    errors: number;
    warnings: number;
    information: number;
    bySource: {
      firely: number;
      businessRules: number;
      codeMaster: number;
      reference: number;
      lint: number;
      specHint: number;
    };
  };
}

interface ValidationPanelProps {
  projectId: string;
  onSelectError?: (error: ValidationError) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  onSuggestionsReceived?: (suggestions: SystemRuleSuggestion[]) => void;
  onValidationStart?: () => void; // Called when validation starts
  onValidationComplete?: (result: ValidationResult | null) => void; // Called when validation completes
  triggerValidation?: number; // External trigger to run validation (timestamp)
  
  // Inputs for ValidationState derivation
  bundleJson?: string; // Current bundle content
  bundleChanged?: boolean; // Whether bundle has changed since last validation
  rulesChanged?: boolean; // Whether rules have changed since last validation
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
 * ValidationPanel Component - VS Code Problems pane style
 */
export const ValidationPanel: React.FC<ValidationPanelProps> = ({ 
  projectId, 
  onSelectError,
  onNavigateToPath,
  onSuggestionsReceived,
  onValidationStart,
  onValidationComplete,
  triggerValidation,
  bundleJson = '',
  bundleChanged = false,
  rulesChanged = false,
}) => {
  const [results, setResults] = useState<ValidationResult | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationMode, setValidationMode] = useState<'fast' | 'debug'>('fast');
  const [lastTrigger, setLastTrigger] = useState(0);
  
  // Derive validation state from current conditions
  const { state: validationState } = useValidationState(
    bundleJson,
    results,
    bundleChanged,
    rulesChanged
  );
  
  // Check if we should show empty state
  const showNoBundleState = validationState === ValidationState.NoBundle;
  
  // Source filtering state
  const [sourceFilters, setSourceFilters] = useState<SourceFilterState>(() => {
    const stored = localStorage.getItem(`validation-filters-${projectId}`);
    return stored ? JSON.parse(stored) : {
      lint: true,
      reference: true,
      firely: true,
      business: true,
      codeMaster: true,
      specHint: true,
    };
  });

  // Explanations toggle state
  const [showExplanations, setShowExplanations] = useState<boolean>(() => {
    const stored = localStorage.getItem(`validation-explanations-${projectId}`);
    return stored === 'true';
  });

  // Persist filter state
  const handleFilterChange = (filters: SourceFilterState) => {
    setSourceFilters(filters);
    localStorage.setItem(`validation-filters-${projectId}`, JSON.stringify(filters));
  };

  // Persist explanations toggle
  const handleExplanationsToggle = () => {
    const newValue = !showExplanations;
    setShowExplanations(newValue);
    localStorage.setItem(`validation-explanations-${projectId}`, String(newValue));
  };
  
  // Respond to external validation trigger
  useEffect(() => {
    if (triggerValidation && triggerValidation > 0 && triggerValidation !== lastTrigger) {
      setLastTrigger(triggerValidation);
      handleRunValidation();
    }
  }, [triggerValidation]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Run validation
   */
  const handleRunValidation = async () => {
    setIsLoading(true);
    setError(null);
    
    // Notify parent that validation is starting (triggers mode switch)
    onValidationStart?.();

    const startTime = Date.now();

    try {
      const response = await fetch(`/api/projects/${projectId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validationMode: validationMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Validation failed' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const executionTimeMs = Date.now() - startTime;
      
      // Transform API response to ValidationResult format
      // Backend returns: { errors: [], summary: {...}, metadata: {...} }
      const errors = data.errors || [];
      const validationResult: ValidationResult = {
        isValid: errors.length === 0,
        errors: errors,
        timestamp: data.metadata?.timestamp || new Date().toISOString(),
        executionTimeMs: data.metadata?.processingTimeMs || executionTimeMs,
        summary: {
          total: data.summary?.totalErrors || errors.length,
          errors: data.summary?.errorCount || errors.filter((e: ValidationError) => e.severity === 'error').length,
          warnings: data.summary?.warningCount || errors.filter((e: ValidationError) => e.severity === 'warning').length,
          information: data.summary?.infoCount || errors.filter((e: ValidationError) => e.severity === 'info' || e.severity === 'information').length,
          bySource: {
            firely: data.summary?.fhirErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'fhir' || e.source?.toLowerCase() === 'firely').length,
            businessRules: data.summary?.businessErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'business' || e.source?.toLowerCase() === 'businessrules').length,
            codeMaster: data.summary?.codeMasterErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'codemaster').length,
            reference: data.summary?.referenceErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'reference').length,
            lint: data.summary?.lintErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'lint').length,
            specHint: errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'spec_hint' || e.source?.toLowerCase() === 'spechint').length,
          },
        },
      };

      setResults(validationResult);
      setIsOpen(true); // Auto-expand after validation
      
      // Notify parent of validation completion
      onValidationComplete?.(validationResult);
      
      // Notify parent component if suggestions are available
      if (data.suggestions && data.suggestions.length > 0 && onSuggestionsReceived) {
        onSuggestionsReceived(data.suggestions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      console.error('Validation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset validation results
   */
  const handleReset = () => {
    setResults(null);
    setError(null);
  };

  /**
   * Handle error selection
   */
  const handleErrorClick = (validationError: ValidationError) => {
    onSelectError?.(validationError);
  };

  const summary = results?.summary;
  const hasErrors = (summary?.total || 0) > 0;

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
          
          {/* Summary badges */}
          {summary && (
            <div className="flex items-center gap-2 ml-2">
              {summary.errors > 0 && (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {summary.errors}
                </span>
              )}
              {summary.warnings > 0 && (
                <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {summary.warnings}
                </span>
              )}
              {summary.information > 0 && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <Info className="w-3 h-3" />
                  {summary.information}
                </span>
              )}
              {!hasErrors && results && (
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
          {results && (
            <>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last run: {formatTimestamp(results.timestamp)}
              </span>
              <span>
                {results.executionTimeMs}ms
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
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isLoading ? 'Running...' : 'Run Validation'}
              </button>

              {/* Validation Mode Toggle */}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <span className="text-xs text-gray-600 mr-1">Mode:</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setValidationMode('fast');
                  }}
                  disabled={isLoading}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    validationMode === 'fast'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Fast mode - Production validation without lint checks"
                >
                  Fast
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setValidationMode('debug');
                  }}
                  disabled={isLoading}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    validationMode === 'debug'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Debug mode - Includes lint pre-validation checks"
                >
                  Debug
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                disabled={isLoading || !results}
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
                    lint: summary?.bySource?.lint || 0,
                    reference: summary?.bySource?.reference || 0,
                    firely: summary?.bySource?.firely || 0,
                    business: summary?.bySource?.businessRules || 0,
                    codeMaster: summary?.bySource?.codeMaster || 0,
                    specHint: summary?.bySource?.specHint || 0,
                  }}
                />
              )}

              {/* Show explanations toggle */}
              {results && hasErrors && (
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showExplanations}
                    onChange={handleExplanationsToggle}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>Show explanations</span>
                </label>
              )}
            </div>

            {/* Legacy source badges removed - now using ValidationSourceFilter */}
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-auto">
            {error && (
              <div className="p-4 m-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Validation Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {!error && !results && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <Play className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No validation results</p>
                <p className="text-xs mt-1">Click "Run Validation" to check your FHIR bundle</p>
                
                {/* Show additional guidance for NotValidated state */}
                {validationState === ValidationState.NotValidated && (bundleChanged || rulesChanged) && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 text-left">
                        <p className="font-medium mb-1">Bundle or rules have changed</p>
                        <p>Run validation to see updated results.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <Loader2 className="w-12 h-12 mb-3 animate-spin" />
                <p className="text-sm font-medium">Running validation...</p>
                <p className="text-xs mt-1">Please wait</p>
              </div>
            )}

            {results && results.errors && results.errors.length > 0 && (
              <ValidationResultList
                errors={results.errors}
                onErrorClick={handleErrorClick}
                onNavigateToPath={onNavigateToPath}
                sourceFilters={sourceFilters}
                showExplanations={showExplanations}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
