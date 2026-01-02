/**
 * BundleDiffDisplay Component
 * 
 * Pure presentational component for rendering bundle composition validation errors.
 * Displays expected vs actual resources with clear visual indicators.
 * 
 * Requirements:
 * - No backend calls
 * - No state mutation
 * - Tables, not prose
 * - Collapsible for large bundles
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ResourceRequirement {
  id: string;
  resourceType: string;
  min: number;
  max: number | string;
  filter?: {
    kind: string;
    expression: string;
    label: string;
  };
}

interface ActualResource {
  id: string;
  resourceType: string;
  count: number;
  filter?: {
    kind: string;
    expression: string;
    label: string;
  };
  examples?: Array<{
    jsonPointer?: string;
    fullUrl?: string | null;
    resourceId?: string | null;
  }>;
}

interface DiffItem {
  expectedId?: string;
  resourceType: string;
  expectedMin?: number;
  actualCount?: number;
  filterLabel?: string;
  count?: number;
  examples?: any[];
}

interface Diff {
  missing: DiffItem[];
  unexpected: DiffItem[];
}

interface BundleDiffDisplayProps {
  expected: ResourceRequirement[];
  actual: ActualResource[];
  diff: Diff;
}

export const BundleDiffDisplay: React.FC<BundleDiffDisplayProps> = ({
  expected,
  actual,
  diff
}) => {
  const [actualExpanded, setActualExpanded] = useState(actual.length <= 5);

  const getResourceLabel = (req: ResourceRequirement | ActualResource): string => {
    if (req.filter?.label) {
      return req.filter.label;
    }
    return req.resourceType;
  };

  const getRequiredText = (req: ResourceRequirement): string => {
    if (req.min === req.max) {
      return `Exactly ${req.min}`;
    }
    if (req.max === '*') {
      return `At least ${req.min}`;
    }
    return `${req.min} to ${req.max}`;
  };

  const getStatus = (actualRes: ActualResource): { icon: string; text: string; color: string } => {
    // Check if this resource is in missing list
    const isMissing = diff.missing.some(m => m.resourceType === actualRes.resourceType);
    if (isMissing) {
      return { icon: '❌', text: 'Missing required', color: 'text-red-700' };
    }

    // Check if this resource is in unexpected list
    const isUnexpected = diff.unexpected.some(u => u.resourceType === actualRes.resourceType);
    if (isUnexpected) {
      return { icon: '❌', text: 'Not allowed', color: 'text-red-700' };
    }

    // Otherwise it's OK
    return { icon: '✅', text: 'OK', color: 'text-green-700' };
  };

  return (
    <div className="space-y-4">
      {/* Expected Resources Table */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                Resource
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                Required
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expected.map((req, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-sm text-gray-900">
                  {getResourceLabel(req)}
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">
                  {getRequiredText(req)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actual Bundle Contents - Collapsible */}
      <div>
        <button
          onClick={() => setActualExpanded(!actualExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-900 uppercase tracking-wide hover:text-gray-700 transition-colors"
        >
          {actualExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span>Actual bundle contents</span>
        </button>
        {actualExpanded && (
          <div className="mt-2 border border-gray-200 rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                    Resource
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                    Count
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actual.map((actualRes, idx) => {
                  const status = getStatus(actualRes);
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {getResourceLabel(actualRes)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {actualRes.count}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <span className="inline-flex items-center gap-1">
                          <span>{status.icon}</span>
                          <span className={status.color}>{status.text}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Problems Detected - Simple list with inline icons */}
      {(diff.missing.length > 0 || diff.unexpected.length > 0) && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Problems detected</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {diff.missing.map((item, idx) => (
              <li key={`missing-${idx}`} className="flex items-start gap-2">
                <span className="flex-shrink-0">❌</span>
                <span>
                  {item.filterLabel || item.resourceType} is required (expected {item.expectedMin}, found {item.actualCount})
                </span>
              </li>
            ))}
            {diff.unexpected.map((item, idx) => (
              <li key={`unexpected-${idx}`} className="flex items-start gap-2">
                <span className="flex-shrink-0">❌</span>
                <span>
                  {item.resourceType} {item.count === 1 ? 'is' : `appears ${item.count} times but is`} not allowed in this bundle
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
