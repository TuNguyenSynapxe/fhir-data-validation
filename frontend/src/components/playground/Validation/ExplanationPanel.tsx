import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Wrench, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { explainError } from '../../../validation/explainError';

interface ExplanationPanelProps {
  error: {
    path?: string;
    jsonPointer?: string;
    errorCode?: string;
    resourceType?: string;
    source?: string;
    details?: Record<string, any>;
  };
  className?: string;
}

/**
 * ExplanationPanel Component
 * 
 * Phase 7: Collapsible explanation panel for validation errors
 * 
 * Provides three sub-sections:
 * 1. "Why am I seeing this?" - Rule context and scope
 * 2. "How do I fix this?" - Actionable guidance
 * 3. "Why can't I jump to this field?" - Navigation limitations (only if jsonPointer is null)
 * 
 * Features:
 * - Collapsed by default
 * - Neutral, non-blaming language
 * - Read-only information
 * - No backend changes or validation logic
 */
export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({ error, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract last path segment for fix guidance
  const getLastSegment = (path?: string): string => {
    if (!path) return 'this field';
    const cleaned = path.replace(/\.where\([^)]+\)/g, '');
    const segments = cleaned.split('.').filter(s => s);
    return segments[segments.length - 1] || 'this field';
  };

  // Generate "Why am I seeing this?" content
  const getWhyContent = (): string => {
    const { path, resourceType, errorCode } = error;
    const explanation = explainError(error);
    
    let content = '';
    
    if (resourceType && path) {
      content += `This rule applies to ${resourceType} resources`;
      
      // Check if path has where() clauses
      if (path.includes('.where(')) {
        content += ' matching the filter conditions shown above';
      }
      content += '.\n\n';
    }
    
    // Add context based on error code
    if (errorCode?.includes('REQUIRED')) {
      const field = getLastSegment(path);
      content += `The field '${field}' is required by this rule.`;
    } else if (errorCode?.includes('INVALID')) {
      content += `The value provided does not meet the expected format or constraints.`;
    } else if (errorCode?.includes('REFERENCE')) {
      content += `A referenced resource could not be found in the bundle.`;
    } else if (errorCode?.includes('CODE')) {
      content += `The code value does not match the expected terminology.`;
    } else {
      // Use explanation from registry
      content += explanation.reason || explanation.title;
    }
    
    return content;
  };

  // Generate "How do I fix this?" content - Context-aware and actionable
  const getHowToFix = (): ReactNode | null => {
    const { path, errorCode, source, jsonPointer, resourceType, details: _details } = error;
    const field = getLastSegment(path);
    
    // 1️⃣ LINT — UNKNOWN_ELEMENT
    if (source === 'LINT' && errorCode === 'UNKNOWN_ELEMENT') {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-green-900">NON-BLOCKING</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            The field <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">{path || field}</code> is not defined in HL7 FHIR R4.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Some permissive FHIR engines may accept this field, but strict validators and downstream systems may reject it.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
            <p className="text-xs font-medium text-blue-900 mb-2">FHIR-correct alternatives:</p>
            <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
              <li><code className="px-1 py-0.5 bg-white rounded font-mono">valueCodeableConcept</code> - for coded values</li>
              <li><code className="px-1 py-0.5 bg-white rounded font-mono">valueString</code> - for text values</li>
              <li><code className="px-1 py-0.5 bg-white rounded font-mono">valueInteger</code> - for numeric values</li>
              <li><code className="px-1 py-0.5 bg-white rounded font-mono">valueBoolean</code> - for true/false</li>
            </ul>
          </div>
          <p className="text-xs text-gray-600 italic mt-2">
            This is a quality check and will not prevent validation or rule editing.
          </p>
        </div>
      );
    }
    
    // 2️⃣ Business / ProjectRule — MANDATORY_MISSING
    if (source === 'Business' && errorCode === 'MANDATORY_MISSING') {
      const isFieldMissing = !jsonPointer;
      
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-red-900">BLOCKING</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Add the missing field <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">{field}</code> to the {resourceType || 'resource'}.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mt-2">
            <p className="text-xs font-medium text-gray-900 mb-2">Minimal JSON structure:</p>
            <pre className="text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
              {`{\n  "${field}": "<value>"\n}`}
            </pre>
          </div>
          
          {isFieldMissing && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-2">
              <p className="text-xs text-amber-800">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                This field does not exist yet. Click the error to navigate to the parent resource and add it manually.
              </p>
            </div>
          )}
          
          <p className="text-xs text-gray-600 italic mt-2">
            This field is required by your project rules and must be present for validation to pass.
          </p>
        </div>
      );
    }
    
    // 3️⃣ SPEC_HINT — FHIR advisory
    if (source === 'SPEC_HINT') {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-blue-900">ADVISORY ONLY</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            The field <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">{field}</code> is conditionally required by HL7 FHIR specifications.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            This field is required only when its parent element is present. You have two options:
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
            <p className="text-xs font-medium text-blue-900 mb-2">Resolution options:</p>
            <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside">
              <li>Add the missing field <code className="px-1 py-0.5 bg-white rounded font-mono">{field}</code> to the resource</li>
              <li>Remove the parent element if the field is not needed</li>
            </ol>
          </div>
          
          <p className="text-xs text-gray-600 italic mt-2">
            This is informational guidance and will not block validation or rule editing.
          </p>
        </div>
      );
    }
    
    // 4️⃣ Fallback: return null (no "How to fix this" section)
    return null;
  };

  // Phase 8: Navigation is now always available via fallback resolver
  // No need to show navigation limitation explanation
  const needsNavigationExplanation = false;

  return (
    <div className={`border-t border-gray-200 ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span>Why am I seeing this?</span>
        <span className="text-xs text-gray-500 ml-auto">Click to {isExpanded ? 'collapse' : 'expand'}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Section 1: Why am I seeing this? */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-md p-3">
            <div className="flex items-start gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <h4 className="text-sm font-medium text-blue-900">What this rule checks</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line pl-6">
              {getWhyContent()}
            </p>
          </div>

          {/* Section 2: How to fix this - Context-aware and actionable */}
          {getHowToFix() && (
            <div className="bg-green-50/50 border border-green-100 rounded-md p-3">
              <div className="flex items-start gap-2 mb-2">
                <Wrench className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <h4 className="text-sm font-medium text-green-900">How to fix this</h4>
              </div>
              <div className="pl-6">
                {getHowToFix()}
              </div>
            </div>
          )}

          {/* Section 3: Navigation explanation (only if jsonPointer is null) */}
          {needsNavigationExplanation && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-md p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <h4 className="text-sm font-medium text-amber-900">Why can't I jump to this field?</h4>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed pl-6">
                This field does not currently exist in the JSON payload. Navigation is only available for elements that already exist in the resource.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
