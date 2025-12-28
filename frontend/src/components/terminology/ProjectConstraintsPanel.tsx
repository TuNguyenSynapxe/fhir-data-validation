/**
 * ProjectConstraintsPanel - Right column component
 * Displays constraints that reference the selected concept
 * Phase 3B: Stateless layout only (no navigation yet)
 */

import type { TerminologyConstraint } from '../../types/terminology';
import { EmptyState, PanelHeader } from './SupportingComponents';

interface ProjectConstraintsPanelProps {
  /** List of constraints to display */
  constraints: TerminologyConstraint[];
  /** System of the selected concept (for filtering) */
  conceptSystem?: string;
  /** Code of the selected concept (for filtering) */
  conceptCode?: string;
}

export function ProjectConstraintsPanel({
  constraints,
  conceptSystem,
  conceptCode,
}: ProjectConstraintsPanelProps) {
  // Filter constraints that reference the selected concept
  const relevantConstraints = conceptSystem && conceptCode
    ? constraints.filter((constraint) =>
        constraint.allowedAnswers.some(
          (answer) =>
            answer.system === conceptSystem && answer.code === conceptCode
        )
      )
    : [];

  const hasSelection = conceptSystem && conceptCode;

  if (!hasSelection) {
    return (
      <div className="flex flex-col h-full bg-white">
        <PanelHeader title="Constraints" />
        <EmptyState
          icon="🔗"
          message="Select a concept"
          subMessage="Constraints referencing the selected concept will appear here"
        />
      </div>
    );
  }

  if (relevantConstraints.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white">
        <PanelHeader
          title="Constraints"
          badge={{ label: '0', variant: 'default' }}
        />
        <EmptyState
          icon="✓"
          message="No constraints reference this concept"
          subMessage="This concept is not currently used in validation rules"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <PanelHeader
        title="Constraints"
        badge={{ label: String(relevantConstraints.length), variant: 'primary' }}
      />

      {/* Constraint List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {relevantConstraints.map((constraint) => (
            <ConstraintListItem
              key={constraint.id}
              constraint={constraint}
              highlightedCode={conceptCode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ConstraintListItem - Individual constraint card
 */
interface ConstraintListItemProps {
  constraint: TerminologyConstraint;
  highlightedCode: string;
}

function ConstraintListItem({ constraint, highlightedCode }: ConstraintListItemProps) {
  // Count how many times the highlighted code appears
  const usageCount = constraint.allowedAnswers.filter(
    (answer) => answer.code === highlightedCode
  ).length;

  return (
    <div className="p-4 border border-gray-200 rounded hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
      {/* Constraint ID */}
      <div className="flex items-center justify-between mb-2">
        <code className="text-sm font-mono font-medium text-gray-900">
          {constraint.id}
        </code>
        {usageCount > 1 && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
            Used {usageCount}×
          </span>
        )}
      </div>

      {/* Resource Type */}
      <div className="flex items-center text-sm text-gray-600 mb-1">
        <span className="font-medium mr-2">Resource:</span>
        <span>{constraint.resourceType}</span>
      </div>

      {/* Path (truncated) */}
      <div className="flex items-start text-sm text-gray-600 mb-3">
        <span className="font-medium mr-2 whitespace-nowrap">Path:</span>
        <code className="text-xs font-mono text-gray-700 break-all">
          {truncatePath(constraint.path, 40)}
        </code>
      </div>

      {/* Constraint Type & Binding Strength */}
      <div className="flex items-center space-x-2">
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            constraint.constraintType === 'binding'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {constraint.constraintType}
        </span>
        {constraint.bindingStrength && (
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
            {constraint.bindingStrength}
          </span>
        )}
      </div>

      {/* Allowed Answers Count */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        {constraint.allowedAnswers.length} allowed answer
        {constraint.allowedAnswers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

/**
 * Helper: Truncate path if too long
 */
function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) {
    return path;
  }
  return path.substring(0, maxLength) + '...';
}
