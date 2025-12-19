import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, Square, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { RuleIntent } from '../../types/ruleIntent';
import ArrayLengthControls from './ArrayLengthControls';
import ObservedValuesPanel from './ObservedValuesPanel';
import { isRuleEligibleNode, getIneligibilityReason } from '../../utils/schemaEligibility';
import type { SchemaElement } from '../FhirSchemaTreeRenderer';

interface ObservedValue {
  value: string;
  count?: number;
}

/**
 * TreeNodeWithRuleIntent - Enhanced tree node with "Required" checkbox and Array Length controls
 * 
 * Requirements:
 * - Show "Required" checkbox on hover for eligible nodes
 * - Show "Array Length" collapsible section for array nodes
 * - Three states: available, selected (pending), already exists
 * - Eligibility: not root, not system-only, no existing rule
 * - Interactions add/remove intents (do NOT create rules)
 * 
 * Props:
 * - element: Tree node data
 * - level: Indentation level
 * - existing rules: To check if rule already exists
 * - onToggleIntent: Callback to add/remove/update intent
 * - hasIntent: Check if intent is pending
 * - getIntent: Retrieve existing intent by path and type
 */
interface TreeNodeWithRuleIntentProps {
  element: SchemaElement;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  existingRules: Array<{ path: string; type: string }>;
  onToggleIntent: (intent: RuleIntent | null) => void;
  hasIntent: (path: string, type: RuleIntent['type']) => boolean;
  getIntent: (path: string, type: RuleIntent['type']) => RuleIntent | undefined;
  coverageBadge?: React.ReactNode;
  // Terminology support (optional)
  observedValues?: ObservedValue[]; // For coding.system or coding.code fields
  terminologyFieldType?: 'system' | 'code'; // Which terminology field this is
  parent?: SchemaElement | null; // Parent element for eligibility checking
}

const TreeNodeWithRuleIntent: React.FC<TreeNodeWithRuleIntentProps> = ({
  element,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  existingRules,
  onToggleIntent,
  hasIntent,
  getIntent,
  coverageBadge,
  observedValues,
  terminologyFieldType,
  parent,
}) => {
  const [isButtonMenuOpen, setIsButtonMenuOpen] = useState(false);
  const [isArraySectionExpanded, setIsArraySectionExpanded] = useState(false);
  const [isArrayEditorExpanded, setIsArrayEditorExpanded] = useState(true); // Editor expand/collapse
  const [isTerminologySectionExpanded, setIsTerminologySectionExpanded] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'right' | 'left'>('right');
  const buttonRef = useRef<HTMLButtonElement>(null);

  const hasChildren = element.children && element.children.length > 0;
  const typeDisplay = element.type && element.type.length > 0 
    ? element.type.join(' | ') 
    : 'Element';

  const cardinalityColor = element.cardinality.startsWith('1') 
    ? 'text-red-600' 
    : 'text-gray-500';

  // Check if node is an array type
  const isArrayNode = element.cardinality.includes('*') || element.cardinality.split('..')[1] !== '1';
  
  // Extract element type for array elements (for nonEmpty checkbox)
  const elementType = element.type?.[0]?.toLowerCase();

  // NEW: Schema eligibility filtering
  const isEligible = isRuleEligibleNode(element, parent);
  const ineligibilityReason = isEligible ? null : getIneligibilityReason(element, parent);

  // Existing rule checks
  const hasExistingRequiredRule = existingRules.some(
    (r) => r.path === element.path && r.type === 'Required'
  );
  const hasExistingArrayLengthRule = existingRules.some(
    (r) => r.path === element.path && r.type === 'ArrayLength'
  );
  const hasExistingCodeSystemRule = existingRules.some(
    (r) => r.path === element.path && r.type === 'CodeSystem'
  );
  const hasExistingAllowedCodesRule = existingRules.some(
    (r) => r.path === element.path && r.type === 'AllowedCodes'
  );

  // Intent checks
  const isPendingRequiredIntent = hasIntent(element.path, 'REQUIRED');
  const isPendingArrayLengthIntent = hasIntent(element.path, 'ARRAY_LENGTH');
  const isPendingCodeSystemIntent = hasIntent(element.path, 'CODE_SYSTEM');
  const isPendingAllowedCodesIntent = hasIntent(element.path, 'ALLOWED_CODES');
  
  const existingArrayIntent = getIntent(element.path, 'ARRAY_LENGTH');
  const existingSystemIntent = getIntent(element.path, 'CODE_SYSTEM');
  const existingCodesIntent = getIntent(element.path, 'ALLOWED_CODES');

  // Rule eligibility - MUST pass schema eligibility first
  const isEligibleForRequired = isEligible && !hasExistingRequiredRule;
  const isEligibleForArrayLength = isEligible && isArrayNode && !hasExistingArrayLengthRule;
  
  const hasTerminologyData = observedValues && observedValues.length > 0 && terminologyFieldType;
  const isEligibleForTerminology = isEligible && hasTerminologyData &&
    !hasExistingCodeSystemRule && !hasExistingAllowedCodesRule;

  const handleRequiredCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (hasExistingRequiredRule) {
      // Already has rule - do nothing (disabled state)
      return;
    }

    // Toggle Required intent
    if (isPendingRequiredIntent) {
      // Remove intent - pass special removal object
      onToggleIntent({ _action: 'remove', path: element.path, type: 'REQUIRED' } as any);
    } else {
      // Add intent
      onToggleIntent({
        type: 'REQUIRED',
        path: element.path,
        resourceType: element.path.split('.')[0],
      });
    }
  };

  const handleArrayIntentChange = (intent: RuleIntent | null) => {
    if (intent) {
      // Add or update intent
      onToggleIntent(intent);
    } else {
      // Remove intent - pass removal action
      onToggleIntent({ _action: 'remove', path: element.path, type: 'ARRAY_LENGTH' } as any);
    }
  };

  const handleTerminologyIntentChange = (intent: RuleIntent | null) => {
    if (intent) {
      onToggleIntent(intent);
    } else {
      onToggleIntent(null);
    }
  };

  const toggleTerminologySection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTerminologySectionExpanded(!isTerminologySectionExpanded);
  };

  // Auto-adjust dropdown position based on viewport
  useEffect(() => {
    if (isButtonMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 12rem = 192px
      const spaceOnRight = window.innerWidth - rect.right;
      
      // If not enough space on right, position on left
      setDropdownPosition(spaceOnRight < dropdownWidth ? 'left' : 'right');
    }
  }, [isButtonMenuOpen]);

  // Check if this is a technical/low-value node (for visual styling)
  const isTechnicalNode = ['id', 'meta', 'extension', 'modifierExtension'].includes(element.name);

  // Determine if user is actively editing Length constraint
  const isEditingLength = isPendingArrayLengthIntent && isArraySectionExpanded;

  // Determine if any rule actions should be visible
  const hasAnyPendingIntent = isPendingRequiredIntent || isPendingArrayLengthIntent || isPendingCodeSystemIntent || isPendingAllowedCodesIntent;
  const hasAnyExistingRule = hasExistingRequiredRule || hasExistingArrayLengthRule || hasExistingCodeSystemRule || hasExistingAllowedCodesRule;
  const hasEligibleActions = isEligibleForRequired || isEligibleForArrayLength || isEligibleForTerminology;
  
  // Show ineligibility indicator for nodes that have no rule actions
  const showIneligibilityIndicator = !isEligible && !hasEligibleActions;

  return (
    <div
      className={`group flex items-center py-1.5 pr-2 hover:bg-blue-50 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-100 border-l-2 border-blue-600' : ''
      }`}
      style={{ paddingLeft: `${level * 20 + 8}px` }}
      onClick={(e) => {
        e.stopPropagation();
        if (hasChildren) {
          onToggle();
        }
        onSelect();
      }}
    >
      {/* Expand/Collapse Icon */}
      {hasChildren ? (
        <span className="mr-2 text-gray-500 w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isExpanded ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      ) : (
        <span className="mr-2 w-4 h-4" />
      )}

      {/* Node Content */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {/* Name */}
        <span className={`font-mono text-sm truncate ${
          isTechnicalNode ? 'text-gray-500 text-xs' : 'text-gray-900'
        }`}>
          {element.name}
        </span>
        
        {/* Technical Node Indicator */}
        {isTechnicalNode && (
          <span 
            className="text-xs text-gray-400 italic"
            title="Advanced: System-level field"
          >
            (Advanced)
          </span>
        )}
        
        {/* Type */}
        <span className={`text-xs truncate ${
          isTechnicalNode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {typeDisplay}
        </span>
        
        {/* Cardinality */}
        <span className={`text-xs font-medium flex-shrink-0 ${
          isTechnicalNode ? 'text-gray-400' : cardinalityColor
        }`}>
          [{element.cardinality}]
        </span>

        {/* Rule State Indicators - Subtle badges */}
        {hasAnyPendingIntent && (
          <span 
            className="inline-flex items-center text-xs text-blue-700 flex-shrink-0"
            title="Pending rule (not applied yet)"
          >
            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mr-1"></span>
          </span>
        )}
        {hasAnyExistingRule && !hasAnyPendingIntent && (
          <span 
            className="inline-flex items-center text-xs text-green-700 flex-shrink-0"
            title="Rule exists for this field"
          >
            <Check className="w-3.5 h-3.5" />
          </span>
        )}
        
        {/* Ineligibility Indicator - Only for primitive internals */}
        {showIneligibilityIndicator && ineligibilityReason && (
          <span 
            className="inline-flex items-center text-xs text-gray-400 flex-shrink-0"
            title={ineligibilityReason}
          >
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">
              Read-only
            </span>
          </span>
        )}

        {/* Coverage Badge (if provided) */}
        {coverageBadge && <div className="flex-shrink-0">{coverageBadge}</div>}
      </div>

      {/* Add Rule Menu - Hidden during Length editing mode */}
      {hasEligibleActions && !isEditingLength && (
        <div className={`ml-auto flex-shrink-0 transition-opacity ${
          hasAnyPendingIntent || hasAnyExistingRule ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}>
          <div 
            className="relative h-7 flex items-center"
            onMouseEnter={() => setIsButtonMenuOpen(true)}
            onMouseLeave={() => setIsButtonMenuOpen(false)}
          >
            <button
              ref={buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsButtonMenuOpen(!isButtonMenuOpen); // Toggle menu
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-7"
              aria-label="Add rule"
            >
              <span className="text-blue-600">+</span>
              <span>Add Rule</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {/* Dropdown Menu - Auto-positions based on available space */}
            {isButtonMenuOpen && (
              <div 
                className={`absolute ${dropdownPosition === 'right' ? 'right-0' : 'left-0'} top-full w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10`}
                onMouseEnter={() => setIsButtonMenuOpen(true)}
                onMouseLeave={() => setIsButtonMenuOpen(false)}
              >
                {/* Required Option */}
                {isEligibleForRequired && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequiredCheckboxClick(e);
                      setIsButtonMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors"
                    disabled={hasExistingRequiredRule}
                  >
                    {hasExistingRequiredRule ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : isPendingRequiredIntent ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className={hasExistingRequiredRule ? 'text-green-700 font-medium' : 'text-gray-700'}>
                      Required
                    </span>
                    {hasExistingRequiredRule && (
                      <span className="ml-auto text-xs text-green-600">(Applied)</span>
                    )}
                  </button>
                )}

                {/* Array Length Option */}
                {isEligibleForArrayLength && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open section and expand editor immediately
                      setIsArraySectionExpanded(true);
                      setIsArrayEditorExpanded(true);
                      setIsButtonMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700">Length…</span>
                    {isPendingArrayLengthIntent && (
                      <span className="ml-auto inline-block w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    )}
                    {hasExistingArrayLengthRule && (
                      <Check className="ml-auto w-3.5 h-3.5 text-green-600" />
                    )}
                  </button>
                )}

                {/* Terminology Option */}
                {isEligibleForTerminology && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTerminologySection(e);
                      setIsButtonMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700">Terminology</span>
                    {(isPendingCodeSystemIntent || isPendingAllowedCodesIntent) && (
                      <span className="ml-auto inline-block w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    )}
                    {(hasExistingCodeSystemRule || hasExistingAllowedCodesRule) && (
                      <Check className="ml-auto w-3.5 h-3.5 text-green-600" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Array Length Controls - Two-phase interaction */}
      {isEligibleForArrayLength && isArraySectionExpanded && (
        <div 
          className="mt-2 ml-4"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <ArrayLengthControls
            path={element.path}
            elementType={elementType}
            existingIntent={existingArrayIntent}
            onIntentChange={handleArrayIntentChange}
            onRemove={() => {
              handleArrayIntentChange(null);
              setIsArraySectionExpanded(false);
              setIsArrayEditorExpanded(true); // Reset for next time
            }}
            isExpanded={isArrayEditorExpanded}
            onToggleExpand={() => setIsArrayEditorExpanded(!isArrayEditorExpanded)}
          />
        </div>
      )}

      {/* Terminology Controls (collapsible) */}
      {isEligibleForTerminology && isTerminologySectionExpanded && observedValues && terminologyFieldType && (
        <div 
          className="mt-2 ml-4"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <ObservedValuesPanel
            path={element.path}
            fieldType={terminologyFieldType}
            observedValues={observedValues}
            existingSystemIntent={existingSystemIntent}
            existingCodesIntent={existingCodesIntent}
            onIntentChange={handleTerminologyIntentChange}
          />
        </div>
      )}
    </div>
  );
};

export default TreeNodeWithRuleIntent;
