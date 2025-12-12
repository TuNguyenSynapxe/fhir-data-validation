import { ChevronRight, AlertCircle, Layers, Info } from 'lucide-react';
import type { UnifiedError } from '../../types/validation';

interface SmartPathPanelProps {
  error: UnifiedError | undefined;
}

export default function SmartPathPanel({ error }: SmartPathPanelProps) {
  if (!error) {
    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Layers size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select an error to view navigation</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Layers size={16} />
          Smart Path Navigation
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Code Badge */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
            Error Code
          </label>
          <code className="inline-block bg-gray-100 text-gray-900 px-3 py-1.5 rounded border border-gray-300 font-mono text-sm">
            {error.errorCode}
          </code>
        </div>

        {/* Severity Badge */}
        {error.severity && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              Severity
            </label>
            <span className={`inline-block px-3 py-1.5 rounded border text-sm font-medium ${getSeverityColor(error.severity)}`}>
              {error.severity}
            </span>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
            Message
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <p className="text-sm text-gray-900">{error.message}</p>
          </div>
        </div>

        {/* Breadcrumb Trail */}
        {error.breadcrumbs && error.breadcrumbs.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              Navigation Path
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex flex-wrap items-center gap-2">
                {error.breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="inline-block bg-white text-blue-900 px-3 py-1.5 rounded border border-blue-300 font-medium text-sm">
                      {crumb}
                    </span>
                    {index < error.breadcrumbs!.length - 1 && (
                      <ChevronRight size={16} className="text-blue-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Missing Parents */}
        {error.missingParents !== undefined && error.missingParents > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              Missing Parents
            </label>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start gap-3">
              <Info size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-900 font-medium mb-1">
                  {error.missingParents} parent resource{error.missingParents !== 1 ? 's' : ''} missing
                </p>
                <p className="text-xs text-yellow-700">
                  Some parent resources in the navigation path could not be resolved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* JSON Path */}
        {error.path && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              JSON Path
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <code className="text-xs font-mono text-gray-900 break-all">
                {error.path}
              </code>
            </div>
          </div>
        )}

        {/* Additional Info */}
        {!error.breadcrumbs?.length && !error.missingParents && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">
              No navigation path information available for this error.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
