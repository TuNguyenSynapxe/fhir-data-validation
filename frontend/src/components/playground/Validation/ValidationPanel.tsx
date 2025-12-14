import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';
import { ValidationResultList } from './ValidationResultList';

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
    };
  };
}

interface ValidationPanelProps {
  projectId: string;
  onSelectError?: (error: ValidationError) => void;
}

/**
 * Get color classes for source badge
 */
const getSourceBadgeColor = (source: string): string => {
  const normalizedSource = source.toLowerCase();
  
  if (normalizedSource === 'fhir' || normalizedSource === 'firely') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (normalizedSource === 'business' || normalizedSource === 'businessrules') {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  } else if (normalizedSource === 'codemaster') {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  } else if (normalizedSource === 'reference') {
    return 'bg-red-100 text-red-800 border-red-200';
  } else {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

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
  onSelectError 
}) => {
  const [results, setResults] = useState<ValidationResult | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationMode, setValidationMode] = useState<'fast' | 'debug'>('fast');

  /**
   * Run validation
   */
  const handleRunValidation = async () => {
    setIsLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/projects/${projectId}/validate`, {
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
          },
        },
      };

      setResults(validationResult);
      setIsOpen(true); // Auto-expand after validation
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

        {/* Timestamp and execution time */}
        {results && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last run: {formatTimestamp(results.timestamp)}
            </span>
            <span>
              {results.executionTimeMs}ms
            </span>
          </div>
        )}
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
            </div>

            {/* Source badges */}
            {summary && hasErrors && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 mr-1">By source:</span>
                {summary.bySource.firely > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${getSourceBadgeColor('Firely')}`}>
                    Firely: {summary.bySource.firely}
                  </span>
                )}
                {summary.bySource.businessRules > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${getSourceBadgeColor('BusinessRules')}`}>
                    Rules: {summary.bySource.businessRules}
                  </span>
                )}
                {summary.bySource.codeMaster > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${getSourceBadgeColor('CodeMaster')}`}>
                    CodeMaster: {summary.bySource.codeMaster}
                  </span>
                )}
                {summary.bySource.reference > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${getSourceBadgeColor('Reference')}`}>
                    Reference: {summary.bySource.reference}
                  </span>
                )}
              </div>
            )}
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
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <Loader2 className="w-12 h-12 mb-3 animate-spin" />
                <p className="text-sm font-medium">Running validation...</p>
                <p className="text-xs mt-1">Please wait</p>
              </div>
            )}

            {!error && !isLoading && results && (
              <ValidationResultList 
                errors={results.errors} 
                onErrorClick={handleErrorClick}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
