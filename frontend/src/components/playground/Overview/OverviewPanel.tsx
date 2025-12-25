import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  FileJson,
  Target,
  ArrowRight,
  Info,
  AlertTriangle
} from 'lucide-react';
import { ValidationState } from '../../../types/validationState';
import { useProjectValidationContext } from '../../../contexts/project-validation/ProjectValidationContext';
import { useRuleReview } from '../../../playground/rule-review/hooks/useRuleReview';
import { getIssueCounts, formatRuleReviewMessage } from '../../../playground/rule-review';
import { buildValidationUICounters, getValidationStatusText } from '../../../utils/validationUICounters';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  origin?: 'manual' | 'system-suggested' | 'ai-suggested';
  enabled?: boolean;
  isMessageCustomized?: boolean;
}

interface OverviewPanelProps {
  validationState?: string;
  rules?: Rule[];
  bundleJson?: string;
  ruleAlignmentStats?: {
    observed: number;
    notObserved: number;
    total: number;
  };
  bundleSanityState?: {
    isValid: boolean;
    errors: string[];
  };
  onNavigateToValidation?: () => void;
  onNavigateToRules?: () => void;
  onTabChange?: (tab: 'rules' | 'codemaster' | 'metadata' | 'settings' | 'bundle') => void;
  onOpenBundleTab?: () => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  validationState,
  rules = [],
  bundleJson,
  ruleAlignmentStats,
  bundleSanityState,
  onNavigateToRules,
  onTabChange,
  onOpenBundleTab,
}) => {
  // Get validation result and action from Context
  const { validationResult, runValidation } = useProjectValidationContext();
  
  // Parse bundle for Rule Review (only if bundle exists)
  const parsedBundle = React.useMemo(() => {
    if (!bundleJson) return undefined;
    try {
      return typeof bundleJson === 'string' ? JSON.parse(bundleJson) : bundleJson;
    } catch {
      return undefined;
    }
  }, [bundleJson]);
  
  // Run Rule Review (advisory only, non-blocking)
  const ruleReviewResult = useRuleReview({
    rules: rules.length > 0 && bundleJson ? rules : [], // Only run if both rules and bundle exist
    bundle: parsedBundle,
  });
  
  const ruleReviewCounts = getIssueCounts(ruleReviewResult);
  
  // Build UI counters from validation result (matching visible items)
  const uiCounters = React.useMemo(() => {
    if (!validationResult?.errors) {
      return { blocking: 0, quality: 0, guidance: 0, total: 0 };
    }
    // Use all sources visible (no filters on Overview page)
    return buildValidationUICounters(validationResult.errors, {
      lint: true,
      reference: true,
      firely: true,
      business: true,
      codeMaster: true,
      specHint: true,
    });
  }, [validationResult?.errors]);
  
  const statusText = getValidationStatusText(uiCounters);
  
  // Compute statistics
  const ruleCount = rules.length;
  const enabledRuleCount = rules.filter(r => r.enabled !== false).length;
  const disabledRuleCount = ruleCount - enabledRuleCount;
  
  // Rule breakdown by origin
  const manualRules = rules.filter(r => !r.origin || r.origin === 'manual').length;
  const systemRules = rules.filter(r => r.origin === 'system-suggested').length;
  const aiRules = rules.filter(r => r.origin === 'ai-suggested').length;
  
  // Last validation timestamp
  const lastValidation = validationResult?.timestamp 
    ? new Date(validationResult.timestamp).toLocaleString()
    : null;

  // Get status configuration
  const getStatusConfig = () => {
    switch (validationState) {
      case ValidationState.NoBundle:
        return {
          icon: FileJson,
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          label: 'No Bundle',
          message: 'Load a FHIR bundle to begin validation',
        };
      case ValidationState.NotValidated:
        return {
          icon: Clock,
          color: 'amber',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-700',
          label: 'Not Validated',
          message: 'Bundle loaded but not yet validated',
        };
      case ValidationState.Validated:
        return {
          icon: CheckCircle,
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          label: 'Validated',
          message: 'Bundle passed validation successfully',
        };
      case ValidationState.Failed:
        return {
          icon: XCircle,
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          label: 'Failed',
          message: 'Bundle contains validation errors',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          label: 'Unknown',
          message: 'Status unavailable',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-900">Project Overview</h2>
        <p className="text-sm text-gray-600 mt-1">
          Current status and configuration summary
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Bundle Sanity Blocking Card - Only shown when bundle structure is invalid */}
        {bundleSanityState && !bundleSanityState.isValid && (
          <div className="bg-amber-50 rounded-lg border-2 border-amber-300 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  Rules Authoring Locked
                </h3>
                <p className="text-sm text-amber-800 mb-3 leading-relaxed">
                  A valid FHIR Bundle is required before rules can be created. Fix the following structural issues in your bundle:
                </p>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside mb-4">
                  {bundleSanityState.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
                <button
                  onClick={() => onOpenBundleTab?.()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-900 bg-amber-200 rounded-lg hover:bg-amber-300 transition-colors"
                >
                  <FileJson className="w-4 h-4" />
                  Open Bundle Editor
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation Status Card - Neutral explanatory copy only */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <StatusIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Validation Status</h3>
            </div>
          </div>

          <div className="space-y-3">
            {validationState === ValidationState.NoBundle && (
              <p className="text-sm text-gray-700 leading-relaxed">
                No bundle is currently loaded. Load a FHIR bundle in the left panel to enable validation and rule authoring.
              </p>
            )}
            
            {validationState === ValidationState.NotValidated && (
              <>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Bundle is loaded but has not been validated.
                  Validation is required to enable project-aware rules, terminology checks, and advanced constraints.
                </p>
                {lastValidation && (
                  <p className="text-xs text-gray-500">
                    Previously validated: {lastValidation}
                  </p>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => runValidation('full')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Target className="w-4 h-4" />
                    Run Validation
                  </button>
                </div>
              </>
            )}
            
            {validationState === ValidationState.Failed && (
              <>
                <div className={`p-4 rounded-lg border ${statusText.variant === 'failed' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-start gap-3">
                    {statusText.variant === 'failed' ? (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${statusText.variant === 'failed' ? 'text-red-900' : 'text-amber-900'} mb-1`}>
                        {statusText.label}
                      </p>
                      <p className={`text-sm ${statusText.variant === 'failed' ? 'text-red-700' : 'text-amber-700'} leading-relaxed`}>
                        {statusText.message}
                      </p>
                      {/* Breakdown */}
                      {(uiCounters.blocking > 0 || uiCounters.quality > 0 || uiCounters.guidance > 0) && (
                        <div className="mt-3 flex gap-3 text-xs">
                          {uiCounters.blocking > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-red-800">{uiCounters.blocking}</span>
                              <span className="text-red-700">blocking</span>
                            </div>
                          )}
                          {uiCounters.quality > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-amber-800">{uiCounters.quality}</span>
                              <span className="text-amber-700">quality</span>
                            </div>
                          )}
                          {uiCounters.guidance > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-blue-800">{uiCounters.guidance}</span>
                              <span className="text-blue-700">guidance</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {lastValidation && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last validated: {lastValidation}
                  </p>
                )}
              </>
            )}
            
            {validationState === ValidationState.Validated && (
              <>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Bundle passed validation successfully. All project-aware features are enabled, including rule path observation and terminology validation.
                </p>
                {lastValidation && (
                  <p className="text-xs text-gray-500">
                    Validated: {lastValidation}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Rules Summary Card */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Target className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Rules Summary</h3>
            </div>
          </div>

          {/* High-level counts */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{ruleCount}</p>
              <p className="text-xs text-gray-600 mt-1">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{enabledRuleCount}</p>
              <p className="text-xs text-gray-600 mt-1">Active</p>
            </div>
            {disabledRuleCount > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{disabledRuleCount}</p>
                <p className="text-xs text-gray-600 mt-1">Disabled</p>
              </div>
            )}
          </div>

          {/* Rule breakdown */}
          <div className="space-y-1.5 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Project Rules</span>
              <span className="font-medium text-gray-900">{manualRules}</span>
            </div>
            {systemRules > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">HL7 Advisory</span>
                <span className="font-medium text-gray-900">{systemRules}</span>
              </div>
            )}
            {aiRules > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">AI Suggested</span>
                <span className="font-medium text-gray-900">{aiRules}</span>
              </div>
            )}
          </div>

          {/* Alignment warning if applicable */}
          {validationState === ValidationState.Validated && ruleAlignmentStats && ruleAlignmentStats.notObserved > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
              <p className="text-xs text-amber-800">
                ⚠ {ruleAlignmentStats.notObserved} rule(s) target fields not observed in the sample bundle
              </p>
            </div>
          )}

          <button
            onClick={onNavigateToRules}
            className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            Manage Rules
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Rule Review Card (Advisory) */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Rule Review (Advisory)</h3>
              <p className="text-xs text-gray-500">Non-blocking quality checks</p>
            </div>
          </div>

          {ruleReviewCounts.total === 0 ? (
            // No issues detected
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">No advisory issues detected</p>
                <p className="text-xs text-green-700 mt-0.5">All rules look good for the current bundle</p>
              </div>
            </div>
          ) : (
            // Issues detected
            <div className="space-y-3">
              {/* Issue counts */}
              <div className="flex gap-3">
                {ruleReviewCounts.warning > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{ruleReviewCounts.warning}</p>
                      <p className="text-xs text-amber-700">Warning{ruleReviewCounts.warning !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
                {ruleReviewCounts.info > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded">
                    <Info className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">{ruleReviewCounts.info}</p>
                      <p className="text-xs text-blue-700">Info</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Top 3 issues preview */}
              <div className="space-y-2">
                {ruleReviewResult.issues.slice(0, 3).map((issue, idx) => (
                  <div 
                    key={`${issue.ruleId}-${idx}`}
                    className={`p-2 rounded text-xs ${
                      issue.severity === 'warning' 
                        ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                        : 'bg-blue-50 text-blue-800 border border-blue-100'
                    }`}
                  >
                    <p className="font-medium">{formatRuleReviewMessage(issue)}</p>
                  </div>
                ))}
                {ruleReviewResult.issues.length > 3 && (
                  <p className="text-xs text-gray-500 italic">
                    +{ruleReviewResult.issues.length - 3} more issue{ruleReviewResult.issues.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Link to Rules tab */}
              <button
                onClick={onNavigateToRules}
                className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-2 border border-blue-200"
              >
                Review all issues
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Project Configuration */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileJson className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Project Configuration</h3>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => onTabChange?.('settings')}
              className="w-full px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors text-sm text-left flex items-center justify-between"
            >
              <span>Configure Validation Settings</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onTabChange?.('codemaster')}
              className="w-full px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors text-sm text-left flex items-center justify-between"
            >
              <span>Manage CodeMaster</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onTabChange?.('metadata')}
              className="w-full px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors text-sm text-left flex items-center justify-between"
            >
              <span>View Project Metadata</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Readiness Checklist */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Project Readiness</h3>
          </div>
          
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2">
              {validationState === ValidationState.Validated ? (
                <span className="text-green-600">✓</span>
              ) : validationState === ValidationState.Failed ? (
                <span className="text-red-600">✗</span>
              ) : (
                <span className="text-amber-600">⚠</span>
              )}
              <span className="text-gray-700">Bundle validated</span>
            </div>
            
            <div className="flex items-center gap-2">
              {ruleCount > 0 ? (
                <span className="text-green-600">✓</span>
              ) : (
                <span className="text-gray-400">○</span>
              )}
              <span className="text-gray-700">Rules defined</span>
            </div>
            
            {validationState === ValidationState.Validated && ruleAlignmentStats && (
              <div className="flex items-center gap-2">
                {ruleAlignmentStats.notObserved === 0 ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-amber-600">⚠</span>
                )}
                <span className="text-gray-700">Rule–sample alignment checked</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};