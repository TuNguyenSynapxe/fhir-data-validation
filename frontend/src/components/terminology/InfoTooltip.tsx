/**
 * InfoTooltip - Information icon with hover tooltip
 * Phase 3E: FHIR Explainability for non-technical users
 * 
 * Features:
 * - Hover to show tooltip
 * - Plain language explanations
 * - Positioned near labels
 */

import React, { useState, useRef } from 'react';

interface InfoTooltipProps {
  /** Tooltip content (can be multi-line) */
  content: string | React.ReactNode;
  /** Position relative to icon */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Max width of tooltip */
  maxWidth?: string;
}

export function InfoTooltip({
  content,
  position = 'top',
  maxWidth = '320px',
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="ml-1 text-gray-400 hover:text-blue-600 focus:outline-none cursor-help"
        aria-label="More information"
      >
        <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold border border-current rounded-full">
          ⓘ
        </span>
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[position]}`}
          style={{ maxWidth }}
        >
          <div className="px-3 py-2 bg-gray-900 text-white text-sm rounded shadow-lg">
            {typeof content === 'string' ? (
              <div className="whitespace-pre-line">{content}</div>
            ) : (
              content
            )}
          </div>
          {/* Arrow pointer */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top'
                ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'
                : position === 'bottom'
                ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'
                : position === 'left'
                ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2'
                : 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
            }`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Tooltip content library - Plain language explanations
 */
export const TooltipContent = {
  // CodeSystem concepts
  codeSystem: `A CodeSystem is a collection of codes that represent specific concepts.

Think of it like a dictionary of standardized terms that your organization uses. For example, a CodeSystem for "Patient Status" might contain codes like "active", "inactive", "pending".`,

  code: `A code is a unique identifier for a specific concept within a CodeSystem.

Codes should be short, computer-friendly identifiers (like "active" or "pending"). They are used in rules and data validation.`,

  display: `The display is the human-readable name for a code.

While the code might be "active", the display would be "Active Patient". This is what users see in forms and reports.`,

  definition: `The definition explains what a code means in detail.

This helps future maintainers understand the exact meaning and when to use this code. For example: "A patient who is currently receiving care."`,

  concept: `A concept represents a single term in your CodeSystem.

Each concept has a code (computer-friendly ID), a display (human-readable label), and optionally a definition (detailed explanation).`,

  hierarchy: `Concepts can have child concepts to create a hierarchy.

For example, "pending" might have children like "pending-approval" and "pending-review". This helps organize related concepts.`,

  // Constraint concepts
  constraint: `A constraint is a validation rule that checks if data matches your requirements.

For example: "Patient.status must be one of: active, inactive, or pending". Constraints ensure data quality.`,

  resourceType: `The resource type identifies which FHIR data structure this constraint applies to.

Examples: "Patient" (person receiving care), "Observation" (measurement or finding), "Medication" (drug information).`,

  fhirPath: `FHIRPath is an expression that points to a specific field in your data.

Think of it like an address: "Patient.status" means "the status field inside a Patient record". This tells the system where to apply the validation rule.`,

  constraintType: `The constraint type defines how the validation works.

• Binding: Field must use codes from allowed list
• Fixed: Field must have exact specified value
• Pattern: Field must match a specific structure`,

  bindingStrength: `Binding strength controls how strict the validation is.

• Required: MUST use one of the allowed codes (strict)
• Extensible: SHOULD use allowed codes, but can use others (flexible)
• Preferred: RECOMMENDED to use allowed codes (suggestion)
• Example: Just showing examples (no enforcement)`,

  allowedAnswers: `Allowed answers are the specific codes that are permitted for this field.

For example, if you're validating "Patient.status", you might allow codes: "active", "inactive", "pending". Any other value would fail validation.`,

  // Advisory concepts
  advisory: `An advisory is a warning about potential issues in your terminology setup.

Advisories don't block you from saving - they just alert you to problems like broken references or mismatched labels. You can fix them at your convenience.`,

  advisoryError: `Errors indicate serious problems that may cause validation to fail.

Example: A constraint references code "active-new", but your CodeSystem only has "active". This means the validation rule won't work correctly.`,

  advisoryWarning: `Warnings indicate potential issues that won't break validation.

Example: You wrote "Active" in a constraint, but the CodeSystem says "Active Status". The validation will still work, but the labels don't match.`,

  advisoryInfo: `Info messages are helpful suggestions for improvement.

Example: A concept is missing a display name. It will work, but adding a display makes it easier for humans to understand.`,

  nonBlocking: `Advisories are non-blocking, which means they never prevent you from saving.

You have full control to save your work even with errors present. This gives you flexibility to work incrementally and fix issues later.`,

  // General concepts
  save: `Clicking Save sends your changes to the server.

Until you save, changes only exist in your browser. Other users won't see them, and refreshing the page will lose them.`,

  unsavedChanges: `Unsaved changes are edits you've made that haven't been saved to the server yet.

The yellow bar at the top shows when you have unsaved work. Remember to save before leaving the page!`,

  system: `The system is the URL that uniquely identifies a CodeSystem.

Think of it like a web address for your terminology. Example: "http://example.org/fhir/CodeSystem/patient-status"`,

  projectId: `The project ID identifies which project this terminology belongs to.

Each project has its own set of CodeSystems, constraints, and validation rules. They don't interfere with each other.`,
};
