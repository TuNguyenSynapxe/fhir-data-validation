import React from 'react';
import { IssueCard } from './IssueCard';
import { CheckCircle2 } from 'lucide-react';
import { normalizeSource, getLayerSortPriority } from '../../../utils/validationLayers';
import { convertToIssue } from '../../../utils/validationGrouping';
import type { SourceFilterState } from './ValidationSourceFilter';
import type { ValidationIssue } from '../../../types/validationIssues';

interface ValidationError {
  source: string; // LINT, SPEC_HINT, FHIR, Business, CodeMaster, Reference
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

interface ValidationResultListProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  sourceFilters?: SourceFilterState;
  showExplanations?: boolean;
  bundleJson?: string; // For path validation
}

export const ValidationResultList: React.FC<ValidationResultListProps> = ({ 
  errors, 
  onErrorClick,
  onNavigateToPath,
  sourceFilters,
  showExplanations = false,
  bundleJson
}) => {
  // Apply source filtering
  const filteredErrors = sourceFilters ? errors.filter(error => {
    const source = normalizeSource(error.source);
    const filterMap: Record<string, keyof SourceFilterState> = {
      'STRUCTURE': 'structure',
      'LINT': 'lint',
      'Reference': 'reference',
      'FHIR': 'firely',
      'PROJECT': 'business',
      'CodeMaster': 'codeMaster',
      'SPEC_HINT': 'specHint',
    };
    const filterKey = filterMap[source];
    return filterKey ? sourceFilters[filterKey] : true;
  }) : errors;

  if (filteredErrors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-3" />
        <p className="text-sm font-medium text-green-700">
          {errors.length === 0 ? 'Validation Passed' : 'No Matching Results'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {errors.length === 0 
            ? 'No issues found in your FHIR bundle' 
            : 'All findings filtered out by current source selection'}
        </p>
      </div>
    );
  }

  // Option A: Convert all errors to issues (no grouping)
  // All validation issues render as individual rows
  const allIssues = filteredErrors.map((error, index) => convertToIssue(error, index));
  
  // Sort by layer priority for consistent ordering
  const sortedIssues = allIssues.sort((a, b) => 
    getLayerSortPriority(a.source) - getLayerSortPriority(b.source)
  );

  // === 3-TIER HIERARCHICAL GROUPING ===
  // Tier 1: Project Rules (Must Fix)
  const projectRulesIssues = sortedIssues.filter(i => 
    i.source === 'PROJECT' || i.source === 'Business' || i.details?.source === 'ProjectRule'
  );

  // Tier 2: FHIR Correctness (Must Fix)
  //   Sub-group A: FHIR Structure (STRUCTURE source)
  const fhirStructureIssues = sortedIssues.filter(i => i.source === 'STRUCTURE');
  //   Sub-group B: FHIR Model Validation (FHIR/Firely source)
  const fhirModelIssues = sortedIssues.filter(i => i.source === 'FHIR');

  // Tier 3: Governance Review (Recommended)
  //   Sub-group A: HL7 Advisory (SPEC_HINT source)
  const hl7AdvisoryIssues = sortedIssues.filter(i => i.source === 'SPEC_HINT');
  //   Sub-group B: Best Practice (LINT source)
  const bestPracticeIssues = sortedIssues.filter(i => i.source === 'LINT');

  // Other sources (CodeMaster, Reference) - shown under appropriate tier
  const codeMasterIssues = sortedIssues.filter(i => i.source === 'CodeMaster');
  const referenceIssues = sortedIssues.filter(i => i.source === 'Reference');

  // Handler to convert ValidationIssue click to ValidationError click
  const handleIssueClick = (issue: ValidationIssue) => {
    if (onErrorClick) {
      // Convert ValidationIssue to ValidationError (no message field used)
      const error: ValidationError = {
        source: issue.source,
        severity: issue.severity,
        resourceType: issue.resourceType,
        path: issue.location,
        jsonPointer: issue.jsonPointer ?? undefined,
        errorCode: issue.code,
        message: '', // Legacy field - not used for display
        details: issue.details,
      };
      onErrorClick(error);
    }
  };

  const hasFhirCorrectness = fhirStructureIssues.length > 0 || fhirModelIssues.length > 0 || codeMasterIssues.length > 0 || referenceIssues.length > 0;
  const hasGovernanceReview = hl7AdvisoryIssues.length > 0 || bestPracticeIssues.length > 0;

  return (
    <div className="p-4 space-y-6">
      {/* ===== TIER 1: Project Rules (Must Fix) ===== */}
      {projectRulesIssues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-lg font-bold">❌</span>
            <h3 className="text-base font-bold text-gray-900">Project Rules</h3>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
              Must fix
            </span>
          </div>
          <p className="text-sm text-gray-600 ml-7">
            Issues that violate project-specific business rules and policies.
          </p>
          
          <div className="space-y-2 ml-7">
            {projectRulesIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClick={handleIssueClick}
                onNavigateToPath={onNavigateToPath}
                showExplanations={showExplanations}
                bundleJson={bundleJson}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== TIER 2: FHIR Correctness (Must Fix) ===== */}
      {hasFhirCorrectness && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-lg font-bold">❌</span>
            <h3 className="text-base font-bold text-gray-900">FHIR Correctness</h3>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
              Must fix
            </span>
          </div>
          <p className="text-sm text-gray-600 ml-7">
            Structural and model validation issues that prevent HL7 FHIR compliance.
          </p>

          {/* Sub-group A: FHIR Structure (Pre-Parse) */}
          {fhirStructureIssues.length > 0 && (
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2 mt-4">
                <div className="w-0.5 h-6 bg-red-300"></div>
                <h4 className="text-sm font-semibold text-gray-700">FHIR Structure (Pre-Parse)</h4>
                <span className="text-xs text-gray-500">({fhirStructureIssues.length})</span>
              </div>
              <p className="text-xs text-gray-600 ml-3 mb-2">
                JSON structural validation performed before FHIR model parsing
              </p>
              <div className="ml-3 space-y-2">
                {fhirStructureIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={handleIssueClick}
                    onNavigateToPath={onNavigateToPath}
                    showExplanations={showExplanations}
                    bundleJson={bundleJson}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sub-group B: FHIR Model Validation */}
          {fhirModelIssues.length > 0 && (
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2 mt-4">
                <div className="w-0.5 h-6 bg-red-300"></div>
                <h4 className="text-sm font-semibold text-gray-700">FHIR Model Validation</h4>
                <span className="text-xs text-gray-500">({fhirModelIssues.length})</span>
              </div>
              <div className="ml-3 space-y-2">
                {fhirModelIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={handleIssueClick}
                    onNavigateToPath={onNavigateToPath}
                    showExplanations={showExplanations}
                    bundleJson={bundleJson}
                  />
                ))}
              </div>
            </div>
          )}

          {/* CodeMaster validation (also must-fix) */}
          {codeMasterIssues.length > 0 && (
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2 mt-4">
                <div className="w-0.5 h-6 bg-red-300"></div>
                <h4 className="text-sm font-semibold text-gray-700">Terminology Validation</h4>
                <span className="text-xs text-gray-500">({codeMasterIssues.length})</span>
              </div>
              <div className="ml-3 space-y-2">
                {codeMasterIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={handleIssueClick}
                    onNavigateToPath={onNavigateToPath}
                    showExplanations={showExplanations}
                    bundleJson={bundleJson}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Reference validation (also must-fix) */}
          {referenceIssues.length > 0 && (
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2 mt-4">
                <div className="w-0.5 h-6 bg-red-300"></div>
                <h4 className="text-sm font-semibold text-gray-700">Reference Validation</h4>
                <span className="text-xs text-gray-500">({referenceIssues.length})</span>
              </div>
              <div className="ml-3 space-y-2">
                {referenceIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={handleIssueClick}
                    onNavigateToPath={onNavigateToPath}
                    showExplanations={showExplanations}
                    bundleJson={bundleJson}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TIER 3: Governance Review (Recommended) ===== */}
      {hasGovernanceReview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-lg font-bold">⚠️</span>
            <h3 className="text-base font-bold text-gray-900">Governance Review</h3>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
              Recommended
            </span>
          </div>
          <p className="text-sm text-gray-600 ml-7">
            Best-practice recommendations and advisory notices. Addressing these improves quality but does not affect HL7 validity.
          </p>

          {/* Sub-group A: HL7 Advisory */}
          {hl7AdvisoryIssues.length > 0 && (
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2 mt-4">
                <div className="w-0.5 h-6 bg-blue-300"></div>
                <h4 className="text-sm font-semibold text-gray-700">HL7 Advisory</h4>
                <span className="text-xs text-gray-500">({hl7AdvisoryIssues.length})</span>
              </div>
              <div className="ml-3 space-y-2">
                {hl7AdvisoryIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={handleIssueClick}
                    onNavigateToPath={onNavigateToPath}
                    showExplanations={showExplanations}
                    bundleJson={bundleJson}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sub-group B: Best Practice */}
          {bestPracticeIssues.length > 0 && (
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2 mt-4">
                <div className="w-0.5 h-6 bg-blue-300"></div>
                <h4 className="text-sm font-semibold text-gray-700">Best Practice</h4>
                <span className="text-xs text-gray-500">({bestPracticeIssues.length})</span>
              </div>
              <div className="ml-3 space-y-2">
                {bestPracticeIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onClick={handleIssueClick}
                    onNavigateToPath={onNavigateToPath}
                    showExplanations={showExplanations}
                    bundleJson={bundleJson}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
