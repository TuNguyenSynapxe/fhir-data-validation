import { CheckCircle, AlertCircle, Activity } from 'lucide-react';
import type { ValidationResult, UnifiedError } from '../../types/validation';
import ErrorTable from './ErrorTable';

interface ValidationResultPanelProps {
  result: ValidationResult | undefined;
  onSelectError?: (error: UnifiedError) => void;
}

export default function ValidationResultPanel({ result, onSelectError }: ValidationResultPanelProps) {
  if (!result) {
    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Activity size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No validation run yet.</p>
          <p className="text-xs mt-1">Click "Run Validation" to start</p>
        </div>
      </div>
    );
  }

  const { errors, summary } = result;

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header with Summary Badges */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Validation Results</h3>
          {summary.isValid ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
              <CheckCircle size={12} />
              Valid
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
              <AlertCircle size={12} />
              {summary.totalErrors} Error{summary.totalErrors !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white border border-gray-200 rounded px-2 py-1.5">
            <div className="text-gray-500 text-[10px] uppercase font-medium mb-0.5">Total</div>
            <div className="text-gray-900 font-bold">{summary.totalErrors}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded px-2 py-1.5">
            <div className="text-purple-600 text-[10px] uppercase font-medium mb-0.5">Firely</div>
            <div className="text-purple-900 font-bold">{summary.firelyErrors}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
            <div className="text-blue-600 text-[10px] uppercase font-medium mb-0.5">Rules</div>
            <div className="text-blue-900 font-bold">{summary.ruleErrors}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5">
            <div className="text-green-600 text-[10px] uppercase font-medium mb-0.5">CodeMaster</div>
            <div className="text-green-900 font-bold">{summary.codeMasterErrors}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
            <div className="text-orange-600 text-[10px] uppercase font-medium mb-0.5">Reference</div>
            <div className="text-orange-900 font-bold">{summary.referenceErrors}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
            <div className="text-gray-500 text-[10px] uppercase font-medium mb-0.5">Time</div>
            <div className="text-gray-900 font-bold">{summary.processingTimeMs}ms</div>
          </div>
        </div>
      </div>

      {/* Error Table */}
      <div className="flex-1 overflow-hidden">
        <ErrorTable errors={errors} onSelectError={onSelectError} />
      </div>
    </div>
  );
}
