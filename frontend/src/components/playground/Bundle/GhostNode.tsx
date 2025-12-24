/**
 * Phase 8: Ghost Node Component
 * 
 * Renders visual-only indicators for missing fields.
 * Used when validation error points to non-existent field.
 * 
 * RULES:
 * - Dashed border, muted color
 * - Italic "(missing)" label
 * - No editing capability (Phase 9+)
 * - No persistence
 * - Respects tree indentation
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface GhostNodeProps {
  /** Key/field name that is missing */
  fieldKey: string;
  /** Indentation level (matches tree depth) */
  depth: number;
  /** Expected type hint (optional) */
  typeHint?: 'object' | 'array' | 'string' | 'number' | 'boolean';
}

/**
 * Ghost Node - Visual indicator for missing field
 * 
 * Shows user where a field should exist but doesn't.
 * Used during error navigation when jsonPointer is null.
 */
export const GhostNode: React.FC<GhostNodeProps> = ({ fieldKey, depth, typeHint }) => {
  const indentClass = `pl-${Math.min(depth, 12) * 4}`;
  
  // Type-specific icon/indicator
  const typeIndicator = typeHint === 'array' ? '[]' : 
                        typeHint === 'object' ? '{}' : 
                        typeHint === 'string' ? '""' :
                        typeHint === 'number' ? '#' :
                        typeHint === 'boolean' ? 'true/false' :
                        '?';
  
  return (
    <div
      className={`${indentClass} py-1 px-2 border-l-2 border-dashed border-red-300 bg-red-50/30 opacity-70`}
      style={{ paddingLeft: `${depth * 1.5}rem` }}
      title="This field is missing in the bundle but is referenced by a validation error"
    >
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
        <span className="font-mono text-red-700 italic">
          {fieldKey}
        </span>
        <span className="text-xs text-gray-400 font-mono">{typeIndicator}</span>
        <span className="text-xs text-red-500 italic">(missing)</span>
      </div>
    </div>
  );
};

/**
 * Ghost Array Index - Shows missing array element
 * 
 * Example: "performer": [] → shows [0] (missing)
 */
export const GhostArrayIndex: React.FC<{ index: number; depth: number }> = ({ index, depth }) => {
  return (
    <div
      className="py-1 px-2 border-l-2 border-dashed border-amber-300 bg-amber-50/30 opacity-70"
      style={{ paddingLeft: `${depth * 1.5}rem` }}
      title="Array is empty but validation expects at least one element"
    >
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
        <span className="font-mono text-amber-700 italic">
          [{index}]
        </span>
        <span className="text-xs text-amber-500 italic">(missing)</span>
      </div>
    </div>
  );
};

/**
 * Ghost Object - Shows missing nested object with children
 * 
 * Example:
 * performer (missing)
 *   └── display (missing)
 */
export interface GhostObjectProps {
  fieldKey: string;
  depth: number;
  children?: React.ReactNode;
}

export const GhostObject: React.FC<GhostObjectProps> = ({ fieldKey, depth, children }) => {
  return (
    <>
      <div
        className="py-1 px-2 border-l-2 border-dashed border-red-300 bg-red-50/30 opacity-70"
        style={{ paddingLeft: `${depth * 1.5}rem` }}
        title="This object does not exist in the bundle"
      >
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <span className="font-mono text-red-700 italic">
            {fieldKey}
          </span>
          <span className="text-xs text-gray-400 font-mono">{'{}'}</span>
          <span className="text-xs text-red-500 italic">(missing)</span>
        </div>
      </div>
      {children}
    </>
  );
};
