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
  id: string;
  severity: 'error' | 'warning' | 'information';
  source: 'Firely' | 'BusinessRules' | 'CodeMaster' | 'Reference';
  message: string;
  location?: string;
  fhirPath?: string;
  details?: string;
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
const getSourceBadgeColor = (source: ValidationError['source']): string => {
  switch (source) {
    case 'Firely':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'BusinessRules':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'CodeMaster':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Reference':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
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

  /**
   * Run validation
   */
  const handleRunValidation = async () => {
    setIsLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const response = await fetch(`/api/projects/${projectId}/validate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Validation failed' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const executionTimeMs = Date.now() - startTime;
      
      // Transform API response to ValidationResult format
      const validationResult: ValidationResult = {
        isValid: data.isValid || false,
        errors: data.errors || [],
        timestamp: new Date().toISOString(),
        executionTimeMs: data.executionTimeMs || executionTimeMs,
        summary: {
          total: data.errors?.length || 0,
          errors: data.errors?.filter((e: ValidationError) => e.severity === 'error').length || 0,
          warnings: data.errors?.filter((e: ValidationError) => e.severity === 'warning').length || 0,
          information: data.errors?.filter((e: ValidationError) => e.severity === 'information').length || 0,
          bySource: {
            firely: data.errors?.filter((e: ValidationError) => e.source === 'Firely').length || 0,
            businessRules: data.errors?.filter((e: ValidationError) => e.source === 'BusinessRules').length || 0,
            codeMaster: data.errors?.filter((e: ValidationError) => e.source === 'CodeMaster').length || 0,
            reference: data.errors?.filter((e: ValidationError) => e.source === 'Reference').length || 0,
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
