import { Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import type { ValidationSummary } from '../../types/validation';

interface ValidationRunBarProps {
  onRunValidation: () => void;
  isValidating?: boolean;
  lastRunTime?: string;
  summary?: ValidationSummary;
}

export default function ValidationRunBar({
  onRunValidation,
  isValidating,
  lastRunTime,
  summary,
}: ValidationRunBarProps) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onRunValidation}
          disabled={isValidating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Play size={18} />
          )}
          Run Validation
        </button>

        {summary && (
          <div className="flex items-center gap-2">
            {summary.isValid ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md border border-green-200">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">Valid</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-md border border-red-200">
                <XCircle size={16} />
                <span className="text-sm font-medium">{summary.totalErrors} Error{summary.totalErrors !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {lastRunTime && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={14} />
            <span>Last run: {lastRunTime}</span>
          </div>
        )}

        {summary && (
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>Firely: {summary.firelyErrors}</span>
            <span>Rules: {summary.ruleErrors}</span>
            <span>CodeMaster: {summary.codeMasterErrors}</span>
            <span>Reference: {summary.referenceErrors}</span>
            <span className="text-gray-400">•</span>
            <span>{summary.processingTimeMs}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}
