import React, { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Wrench, AlertTriangle } from 'lucide-react';

interface ExplanationPanelProps {
  error: {
    path?: string;
    jsonPointer?: string;
    message: string;
    errorCode?: string;
    resourceType?: string;
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
    const { path, resourceType, message, errorCode } = error;
    
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
      content += message;
    }
    
    return content;
  };

  // Generate "How do I fix this?" content
  const getHowContent = (): string => {
    const { path, errorCode, details } = error;
    const field = getLastSegment(path);
    
    if (errorCode?.includes('REQUIRED')) {
      return `Add the field '${field}' to the matching resource.\n\nExample structure:\n{\n  "${field}": "value"\n}`;
    } else if (errorCode?.includes('INVALID')) {
      if (details?.expectedFormat) {
        return `Ensure the value matches the expected format: ${details.expectedFormat}`;
      }
      return `Verify the value meets the expected format and constraints for this field.`;
    } else if (errorCode?.includes('REFERENCE')) {
      if (details?.reference) {
        return `Ensure the referenced resource '${details.reference}' exists in the bundle.`;
      }
      return `Add the referenced resource to the bundle or update the reference to point to an existing resource.`;
    } else if (errorCode?.includes('CODE')) {
      if (details?.expectedCode || details?.expectedSystem) {
        return `Use a valid code from the required terminology system${details.expectedSystem ? `: ${details.expectedSystem}` : ''}.`;
      }
      return `Update the code value to match the expected terminology.`;
    } else if (errorCode?.includes('ARRAY_LENGTH') || errorCode?.includes('CARDINALITY')) {
      return `Adjust the number of elements to meet the cardinality requirements.`;
    }
    
    return `Review the validation message and adjust the resource structure accordingly.`;
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

          {/* Section 2: How do I fix this? */}
          <div className="bg-green-50/50 border border-green-100 rounded-md p-3">
            <div className="flex items-start gap-2 mb-2">
              <Wrench className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <h4 className="text-sm font-medium text-green-900">How to fix this</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line pl-6">
              {getHowContent()}
            </p>
          </div>

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
