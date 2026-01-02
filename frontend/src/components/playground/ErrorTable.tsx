import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { UnifiedError } from '../../types/validation';
import { parseFhirPathComponents } from '../../utils/smartPathFormatting';

interface ErrorTableProps {
  errors: UnifiedError[];
  onSelectError?: (error: UnifiedError) => void;
}

/**
 * Derives breadcrumbs from FHIRPath
 * Phase 1 Audit (Dec 2025): Replaced navigation.breadcrumbs with path-derived breadcrumbs
 */
function pathToBreadcrumbs(path: string | undefined): string[] {
  if (!path) return [];
  
  const parsed = parseFhirPathComponents(path);
  const breadcrumbs: string[] = [parsed.resourceType];
  
  if (parsed.scopeSelector) {
    breadcrumbs.push(`where(${parsed.scopeSelector})`);
  }
  
  if (parsed.structuralPath) {
    breadcrumbs.push(...parsed.structuralPath.split('.').filter(Boolean));
  }
  
  return breadcrumbs;
}

export default function ErrorTable({ errors, onSelectError }: ErrorTableProps) {
  if (errors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No errors found</p>
        </div>
      </div>
    );
  }

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'info':
        return <Info size={14} className="text-blue-500" />;
      default:
        return <AlertCircle size={14} className="text-gray-500" />;
    }
  };

  const getSeverityBadgeColor = (severity?: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Code
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
              Severity
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Message
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Path
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {errors.map((error, index) => (
            <tr
              key={index}
              onClick={() => onSelectError?.(error)}
              className="hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                  {error.errorCode}
                </code>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  {getSeverityIcon(error.severity)}
                  <span className={`inline-block text-xs px-2 py-0.5 rounded border font-medium ${getSeverityBadgeColor(error.severity)}`}>
                    {error.severity || 'error'}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2">
                {/* Phase 7: Use canonical explanation */}
                <div className="text-sm text-gray-900">
                  {error.errorCode || 'Unknown error'}
                </div>
                {(() => {
                  // Phase 1 Audit (Dec 2025): Derive breadcrumbs from path, not navigation.breadcrumbs
                  const breadcrumbs = pathToBreadcrumbs(error.path);
                  return breadcrumbs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {breadcrumbs.map((crumb, i) => (
                        <span
                          key={i}
                          className="inline-block text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          {crumb}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </td>
              <td className="px-3 py-2">
                <code className="text-xs text-gray-600 font-mono block truncate max-w-xs">
                  {error.path || '-'}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
