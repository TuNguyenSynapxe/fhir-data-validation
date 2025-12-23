import React, { useState, memo } from 'react';
import { ChevronDownIcon, ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { 
  PencilIcon, 
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ValidationIcon } from '../../../ui/icons/ValidationIcons';
import { RuleCardExpanded } from './RuleCardExpanded';
import type { RuleReviewIssue } from '../../../playground/rule-review';
import { isInternalRule } from './ruleHelpers';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  origin?: string; // Compatible with AddRuleModal and RulesPanel
  explainability?: any;
  enabled?: boolean;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  isMessageCustomized?: boolean;
}

interface RuleRowProps {
  rule: Rule;
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
  onToggle?: (ruleId: string) => void;
  onNavigateToPath?: (path: string) => void;
  isObserved?: boolean;
  advisoryIssues?: RuleReviewIssue[];
  projectBundle?: object;
}

/**
 * Get origin display text and color
 */
const getOriginInfo = (rule: Rule) => {
  const isInternal = isInternalRule(rule);
  
  if (isInternal) {
    return { text: 'System', color: 'text-gray-400' };
  }
  
  if (rule.origin === 'ai-suggested') {
    return { text: 'AI', color: 'text-purple-600' };
  }
  
  if (rule.origin === 'system-suggested') {
    return { text: 'System', color: 'text-blue-600' };
  }
  
  return { text: 'Project', color: 'text-gray-600' };
};

/**
 * Get validation source for icon display
 */
const getValidationSource = (rule: Rule): 'ProjectRule' | 'Lint' | 'HL7Advisory' => {
  if (isInternalRule(rule)) {
    return 'Lint';
  }
  
  if (rule.origin === 'system-suggested') {
    return 'HL7Advisory';
  }
  
  return 'ProjectRule';
};

const RuleRowComponent: React.FC<RuleRowProps> = ({
  rule,
  onEdit,
  onDelete,
  onNavigateToPath,
  isObserved,
  advisoryIssues = [],
  projectBundle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const enabled = rule.enabled !== false;
  
  const hasAdvisoryIssues = advisoryIssues.length > 0;
  const originInfo = getOriginInfo(rule);
  const validationSource = getValidationSource(rule);

  return (
    <div className={`group ${!enabled ? 'opacity-50' : ''}`}>
      {/* Compact Collapsed Row - Single Line Layout */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Chevron - Collapse/Expand Indicator */}
        {isExpanded ? (
          <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        
        {/* Left Icon - Validation Source */}
        <ValidationIcon
          source={validationSource}
          severity={rule.severity}
          className="w-4 h-4 flex-shrink-0"
        />
        
        {/* Path - Monospace FHIRPath */}
        <span 
          className="font-mono text-xs font-medium text-gray-900 truncate flex-shrink"
          title={rule.path}
          style={{ minWidth: '180px', maxWidth: '280px' }}
        >
          {rule.path || 'No path'}
        </span>
        
        {/* Rule Type Chip */}
        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded flex-shrink-0">
          {rule.type}
        </span>
        
        {/* Severity Chip */}
        <span 
          className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
            rule.severity === 'error' 
              ? 'bg-red-50 text-red-700' 
              : rule.severity === 'warning'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {rule.severity}
        </span>
        
        {/* Origin Label */}
        <span className={`text-xs ${originInfo.color} flex-shrink-0`}>
          {originInfo.text}
        </span>
        
        {/* Spacer */}
        <div className="flex-1 min-w-0"></div>
        
        {/* Right Icons - Advisory & Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Advisory Information Icon */}
          {hasAdvisoryIssues && (
            <div 
              className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
              title={`${advisoryIssues.length} advisory issue(s)`}
              onClick={(e) => e.stopPropagation()}
            >
              <InformationCircleIcon className="w-4 h-4" />
            </div>
          )}
          
          {/* Edit Action - Visible on Hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(rule);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Edit rule"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          
          {/* Delete Action - Visible on Hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this rule?')) {
                onDelete(rule.id);
              }
            }}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Delete rule"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
        
        {/* Save State Indicator - Overlays when active */}
        {rule.saveState === 'saving' && (
          <div className="flex items-center gap-1 text-xs text-blue-600 flex-shrink-0 ml-2">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        {rule.saveState === 'saved' && (
          <div className="flex items-center text-xs text-green-600 flex-shrink-0 ml-2">
            <span>✓</span>
          </div>
        )}
        {rule.saveState === 'error' && (
          <div className="flex items-center text-xs text-red-600 flex-shrink-0 ml-2">
            <span>!</span>
          </div>
        )}
      </div>

      {/* Expanded Card */}
      {isExpanded && (
        <RuleCardExpanded
          rule={rule}
          onEdit={onEdit}
          onDelete={onDelete}
          onNavigateToPath={onNavigateToPath}
          isObserved={isObserved}
          advisoryIssues={advisoryIssues}
          projectBundle={projectBundle}
        />
      )}
    </div>
  );
};

// Memoize to prevent re-renders on hover of other rows
export const RuleRow = memo(RuleRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.rule.id === nextProps.rule.id &&
    prevProps.rule.enabled === nextProps.rule.enabled &&
    prevProps.rule.path === nextProps.rule.path &&
    prevProps.rule.type === nextProps.rule.type &&
    prevProps.rule.params === nextProps.rule.params &&
    prevProps.isObserved === nextProps.isObserved &&
    prevProps.advisoryIssues?.length === nextProps.advisoryIssues?.length
  );
});
