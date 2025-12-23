/**
 * FhirPathPicker - Mode-based FHIRPath Selection Component
 * 
 * Reusable drawer component supporting three selection modes:
 * 1. "node" - Select nodes/resources (e.g., Observation[0], component[*])
 * 2. "filter" - Build where(...) filters visually
 * 3. "field" - Select field paths (absolute or relative)
 * 
 * Architecture:
 * - Reuses BundleTreeView for tree navigation
 * - Mode-specific validation via utils
 * - Strict typed output contracts
 * - Backward compatible with existing FhirPathSelectorDrawer
 */

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import BundleTreeView from '../../BundleTreeView';
import type {
  FhirPathPickerProps,
  FhirPathPickerResult,
  FilterExpression,
  ValidationState,
} from './FhirPathPicker.types';
import {
  validateNodeSelection,
  validateFilterExpression,
  validateFieldSelection,
  buildNodeResult,
  buildFilterResult,
  buildFieldResult,
  composeFieldPath,
  isLeafField,
} from './FhirPathPicker.utils';

export const FhirPathPicker: React.FC<FhirPathPickerProps> = ({
  mode,
  isOpen,
  bundle,
  basePath,
  resourceType,
  allowAbsolute = false,
  onSelect,
  onCancel,
  // hl7Samples - reserved for future use
}) => {
  // Selection state
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [validation, setValidation] = useState<ValidationState>({ isValid: false });
  
  // Filter mode state
  const [filterExpression, setFilterExpression] = useState<FilterExpression>({
    left: '',
    operator: '=',
    right: '',
  });

  // Reset state when drawer opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPath('');
      setValidation({ isValid: false });
      setFilterExpression({ left: '', operator: '=', right: '' });
    }
  }, [isOpen, mode]);

  // Validate selection based on mode
  useEffect(() => {
    if (!selectedPath) {
      setValidation({ isValid: false });
      return;
    }

    let result: ValidationState;
    
    switch (mode) {
      case 'node':
        result = validateNodeSelection(selectedPath);
        break;
      
      case 'filter':
        // In filter mode, selectedPath is the left side of the filter
        result = validateFilterExpression(
          { ...filterExpression, left: selectedPath },
          basePath || resourceType || ''
        );
        break;
      
      case 'field':
        result = validateFieldSelection(selectedPath, basePath, allowAbsolute);
        break;
      
      default:
        result = { isValid: false, errorMessage: 'Invalid mode' };
    }
    
    setValidation(result);
  }, [selectedPath, mode, basePath, allowAbsolute, resourceType, filterExpression]);

  if (!isOpen) return null;

  // Handle path selection from tree
  const handleTreePathSelect = (path: string) => {
    // Mode-specific filtering
    if (mode === 'node' && isLeafField(path)) {
      setValidation({ 
        isValid: false, 
        errorMessage: 'Cannot select leaf fields in node mode. Use field mode instead.' 
      });
      return;
    }

    if (mode === 'field' && !isLeafField(path) && !path.includes('value[x]')) {
      setValidation({ 
        isValid: false, 
        errorMessage: 'Must select a leaf field or value[x] in field mode.' 
      });
      return;
    }

    setSelectedPath(path);
  };

  // Handle confirm button
  const handleConfirm = () => {
    if (!validation.isValid) return;

    let result: FhirPathPickerResult;

    switch (mode) {
      case 'node':
        result = buildNodeResult(selectedPath);
        break;

      case 'filter':
        if (!basePath && !resourceType) {
          setValidation({ isValid: false, errorMessage: 'basePath or resourceType required for filter mode' });
          return;
        }
        result = buildFilterResult(
          basePath || resourceType || '',
          { ...filterExpression, left: selectedPath }
        );
        break;

      case 'field':
        const absolutePath = basePath 
          ? composeFieldPath(basePath, selectedPath)
          : selectedPath;
        result = buildFieldResult(absolutePath, basePath);
        break;

      default:
        return;
    }

    onSelect(result);
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedPath('');
    setValidation({ isValid: false });
    setFilterExpression({ left: '', operator: '=', right: '' });
    onCancel();
  };

  // Get mode-specific title and description
  const getModeInfo = () => {
    switch (mode) {
      case 'node':
        return {
          title: 'Select Node',
          description: 'Choose a resource or array node (e.g., Observation[0], component[*])',
          example: 'Example: Observation.component[*]',
        };
      case 'filter':
        return {
          title: 'Build Filter',
          description: 'Select field to filter on, then specify the condition',
          example: 'Example: code.coding.code = "HEARING"',
        };
      case 'field':
        return {
          title: 'Select Field',
          description: basePath 
            ? `Select a field relative to ${basePath}`
            : 'Select an absolute field path',
          example: 'Example: value[x]',
        };
      default:
        return { title: 'Select Path', description: '', example: '' };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{modeInfo.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{modeInfo.description}</p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Mode badge */}
          <div className="mt-3 flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              mode === 'node' ? 'bg-blue-100 text-blue-700' :
              mode === 'filter' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              {mode.toUpperCase()} MODE
            </span>
            {resourceType && (
              <span className="text-xs text-gray-500">
                Resource: <span className="font-medium">{resourceType}</span>
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Example hint */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              <strong>Hint:</strong> {modeInfo.example}
            </p>
          </div>

          {/* Selected path preview */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {mode === 'filter' ? 'Filter Field:' : 'Selected Path:'}
            </label>
            <div className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
              {selectedPath || <span className="text-gray-400 italic">No path selected</span>}
            </div>
          </div>

          {/* Filter mode: additional inputs */}
          {mode === 'filter' && selectedPath && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-md space-y-3">
              <h4 className="text-sm font-semibold text-purple-900">Filter Condition</h4>
              
              {/* Operator */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Operator
                </label>
                <select
                  value={filterExpression.operator}
                  onChange={(e) => setFilterExpression({ 
                    ...filterExpression, 
                    operator: e.target.value as '=' | '!=' | 'in' 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value="in">in</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={String(filterExpression.right)}
                  onChange={(e) => setFilterExpression({ 
                    ...filterExpression, 
                    right: e.target.value 
                  })}
                  placeholder="Enter value..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Preview composed filter */}
              <div className="pt-2 border-t border-purple-300">
                <label className="block text-xs font-medium text-purple-900 mb-1">
                  Composed Filter:
                </label>
                <div className="font-mono text-xs bg-white px-3 py-2 rounded border border-purple-300 text-purple-900">
                  {basePath || resourceType}.where({selectedPath}{filterExpression.operator}
                  {typeof filterExpression.right === 'string' ? `'${filterExpression.right}'` : filterExpression.right})
                </div>
              </div>
            </div>
          )}

          {/* Validation status */}
          {selectedPath && (
            <div className={`mb-4 p-3 rounded-md flex items-start gap-2 ${
              validation.isValid 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {validation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  validation.isValid ? 'text-green-900' : 'text-red-900'
                }`}>
                  {validation.isValid ? 'Valid Selection' : 'Invalid Selection'}
                </p>
                {validation.errorMessage && (
                  <p className="text-xs text-red-700 mt-1">{validation.errorMessage}</p>
                )}
              </div>
            </div>
          )}

          {/* Bundle tree view */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <BundleTreeView
              bundleJson={JSON.stringify(bundle, null, 2)}
              onSelectPath={handleTreePathSelect}
              resourceTypeFilter={resourceType}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {selectedPath && (
                <span>
                  Mode: <code className="bg-gray-200 px-2 py-1 rounded">{mode}</code>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!validation.isValid || (mode === 'filter' && !filterExpression.right)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                  validation.isValid && (mode !== 'filter' || filterExpression.right)
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
