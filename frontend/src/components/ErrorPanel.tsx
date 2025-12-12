import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { ValidationResponse } from '../api/projects';

interface ErrorPanelProps {
  validationResult: ValidationResponse;
  onClose: () => void;
}

export default function ErrorPanel({ validationResult, onClose }: ErrorPanelProps) {
  const { errors, summary, metadata } = validationResult;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'info':
        return <Info className="text-blue-500" size={16} />;
      default:
        return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Validation Results</h2>
            {summary.totalErrors === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-medium">No errors found</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle size={20} />
                <span className="font-medium">{summary.totalErrors} issue{summary.totalErrors !== 1 ? 's' : ''} found</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Errors</div>
              <div className="text-lg font-bold text-red-600">{summary.errorCount}</div>
            </div>
            <div>
              <div className="text-gray-600">Warnings</div>
              <div className="text-lg font-bold text-yellow-600">{summary.warningCount}</div>
            </div>
            <div>
              <div className="text-gray-600">Info</div>
              <div className="text-lg font-bold text-blue-600">{summary.infoCount}</div>
            </div>
            <div>
              <div className="text-gray-600">Processing Time</div>
              <div className="text-lg font-bold text-gray-900">{metadata.processingTimeMs}ms</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-gray-600">FHIR: {summary.fhirErrorCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-gray-600">Business: {summary.businessErrorCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-600">CodeMaster: {summary.codeMasterErrorCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span className="text-gray-600">Reference: {summary.referenceErrorCount}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {errors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">All validation checks passed!</p>
              <p className="text-sm mt-2">Your FHIR bundle is valid according to all configured rules.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getSeverityColor(error.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getSeverityIcon(error.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white rounded border border-gray-300">
                          {error.source}
                        </span>
                        {error.errorCode && (
                          <span className="inline-block px-2 py-0.5 text-xs font-mono bg-gray-100 rounded">
                            {error.errorCode}
                          </span>
                        )}
                        {error.resourceType && (
                          <span className="text-xs text-gray-600">
                            {error.resourceType}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {error.message}
                      </p>
                      
                      {error.path && (
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">Path:</span> {error.path}
                        </div>
                      )}
                      
                      {error.jsonPointer && (
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">Pointer:</span> {error.jsonPointer}
                        </div>
                      )}
                      
                      {error.details && Object.keys(error.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                            Show details
                          </summary>
                          <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      {error.navigation && error.navigation.breadcrumbs?.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Breadcrumbs:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {error.navigation.breadcrumbs.map((crumb, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 bg-white rounded border border-gray-200"
                              >
                                {crumb}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
