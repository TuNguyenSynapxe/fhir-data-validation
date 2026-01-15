/**
 * ElementDetailsPanel Component
 * 
 * Right-side panel showing full details of selected element.
 * 
 * Features:
 * - Element metadata display
 * - Cardinality editor
 * - Binding editor (Phase 4A refactored: ValueSet selection + inline strength control)
 * - Slicing configuration
 * - Extension management
 * 
 * CARDINALITY-FIRST DESIGN:
 * - Show base vs current cardinality
 * - No include/exclude toggle
 * - Cardinality editing controls "Not allowed" state
 * 
 * BINDING UX (Phase 4A):
 * - Wide drawer for ValueSet selection only
 * - Inline strength control (separate from drawer)
 * - Two independent actions: select ValueSet, adjust strength
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import { findNodeByPath } from '../../utils/treeBuilder';
import { buildTree } from '../../utils/treeBuilder';
import { 
  isBindingEligible, 
  getBaseBinding, 
  getCurrentBinding, 
  hasBindingOverride,
  type BindingStrength
} from '../../utils/bindingHelpers';
import { ValueSetSelectionDrawer } from './ValueSetSelectionDrawer';
import { BindingStrengthControl } from './BindingStrengthControl';

export const ElementDetailsPanel: React.FC = () => {
  const design = useSdBuilderStore((state) => state.design);
  const selectedPath = useSdBuilderStore((state) => state.selectedPath);
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  const [valueSetDrawerOpen, setValueSetDrawerOpen] = useState(false);

  // Find selected element
  const selectedElement = React.useMemo(() => {
    if (!design || !selectedPath) return null;
    
    const tree = buildTree(design.elements);
    return findNodeByPath(tree, selectedPath);
  }, [design, selectedPath]);
  
  const handleSelectValueSet = async (url: string) => {
    if (!selectedElement) return;
    
    const currentBinding = getCurrentBinding(selectedElement);
    const baseBinding = getBaseBinding(selectedElement);
    
    // Use current strength if exists, else base strength, else default to 'required'
    const strength = currentBinding?.strength || baseBinding?.strength || 'Required';
    
    try {
      await applyCommand({
        commandType: 'SetBinding',
        path: selectedElement.path,
        valueSetUrl: url,
        strength: strength,
      });
      
      toast.success(`ValueSet updated: ${selectedElement.name}`, {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '13px',
          padding: '8px 12px',
        },
      });
    } catch (err) {
      console.error('Failed to set ValueSet:', err);
      toast.error('Failed to update ValueSet', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };
  
  const handleClearBinding = async () => {
    if (!selectedElement) return;
    
    try {
      await applyCommand({
        commandType: 'ClearBindingOverride',
        path: selectedElement.path,
      });
      
      toast.success(`Binding override cleared: ${selectedElement.name}`, {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '13px',
          padding: '8px 12px',
        },
      });
    } catch (err) {
      console.error('Failed to clear binding:', err);
      toast.error('Failed to clear binding', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };

  if (!selectedElement) {
    return (
      <div className="element-details-panel-empty">
        <p>Select an element to view details</p>
      </div>
    );
  }

  const node = selectedElement;
  const element = node.elementDesign;
  
  // Binding info
  const bindingEligible = isBindingEligible(node);
  const baseBinding = getBaseBinding(node);
  const currentBinding = getCurrentBinding(node);
  const hasOverride = hasBindingOverride(node);

  // Derive semantic label from cardinality
  let semanticState = 'Optional';
  if (node.isNotAllowed) semanticState = 'Not allowed';
  else if (node.isRequired) semanticState = 'Required';

  return (
    <>
      <div className="element-details-panel">
      {/* Header */}
      <div className="details-header">
        <h3 className="details-title">{element.path}</h3>
        <span className={`semantic-state ${semanticState.toLowerCase().replace(' ', '-')}`}>
          {semanticState}
        </span>
      </div>

      {/* Metadata */}
      <div className="details-section">
        <h4>Cardinality</h4>
        <dl className="details-list">
          <dt>Base:</dt>
          <dd>{element.baseCardinality.min}..{element.baseCardinality.max}</dd>

          {element.overrideCardinality && (
            <>
              <dt>Current (Override):</dt>
              <dd className="cardinality-override">
                {element.overrideCardinality.min}..{element.overrideCardinality.max}
              </dd>
            </>
          )}
          
          {!element.overrideCardinality && (
            <>
              <dt>Current:</dt>
              <dd>{element.baseCardinality.min}..{element.baseCardinality.max}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Element Info */}
      <div className="details-section">
        <h4>Element Info</h4>
        <dl className="details-list">
          <dt>Path:</dt>
          <dd>{element.path}</dd>

          <dt>Role:</dt>
          <dd>{node.role}</dd>

          <dt>Repeatable:</dt>
          <dd>{node.isRepeatable ? 'Yes' : 'No'}</dd>
        </dl>
      </div>

      {/* Binding */}
      {bindingEligible && (
        <div className="details-section">
          <h4>Binding</h4>
          
          {/* No Binding Defined */}
          {!currentBinding && !baseBinding && (
            <>
              <p className="binding-none">None defined</p>
              <button 
                className="action-btn" 
                onClick={() => setValueSetDrawerOpen(true)}
              >
                Add Binding
              </button>
            </>
          )}
          
          {/* Base Binding Only (No Override) */}
          {baseBinding && !hasOverride && (
            <>
              <div className="binding-summary">
                <div className="binding-info">
                  <dl className="details-list compact">
                    <dt>ValueSet:</dt>
                    <dd>{baseBinding.valueSetUrl}</dd>
                  </dl>
                  <button 
                    className="action-btn-small" 
                    onClick={() => setValueSetDrawerOpen(true)}
                  >
                    Change ValueSet
                  </button>
                </div>
                {/* Inline Strength Control */}
                <BindingStrengthControl
                  elementPath={node.path}
                  elementName={node.name}
                  valueSetUrl={baseBinding.valueSetUrl}
                  currentStrength={baseBinding.strength.toLowerCase() as BindingStrength}
                  baseStrength={baseBinding.strength.toLowerCase() as BindingStrength}
                />
              </div>
            </>
          )}
          
          {/* Override Binding */}
          {currentBinding && hasOverride && (
            <>
              <div className="binding-summary">
                <div className="binding-info">
                  <dl className="details-list compact">
                    <dt>ValueSet:</dt>
                    <dd className="binding-override">{currentBinding.valueSetUrl}</dd>
                  </dl>
                  <div className="button-group-inline">
                    <button 
                      className="action-btn-small" 
                      onClick={() => setValueSetDrawerOpen(true)}
                    >
                      Change ValueSet
                    </button>
                    <button 
                      className="action-btn-small secondary" 
                      onClick={handleClearBinding}
                    >
                      Clear Override
                    </button>
                  </div>
                </div>
                {/* Inline Strength Control */}
                <BindingStrengthControl
                  elementPath={node.path}
                  elementName={node.name}
                  valueSetUrl={currentBinding.valueSetUrl}
                  currentStrength={currentBinding.strength.toLowerCase() as BindingStrength}
                  baseStrength={baseBinding?.strength.toLowerCase() as BindingStrength}
                />
              </div>
              {baseBinding && (
                <div className="base-binding-reference">
                  <small>Base: {baseBinding.valueSetUrl} ({baseBinding.strength})</small>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Slicing */}
      {element.slicing && (
        <div className="details-section">
          <h4>Slicing</h4>
          <dl className="details-list">
            <dt>Rules:</dt>
            <dd>{element.slicing.rules}</dd>

            <dt>Discriminators:</dt>
            <dd>{element.slicing.discriminators.length}</dd>
          </dl>
        </div>
      )}

      {/* Slices */}
      {element.slices.length > 0 && (
        <div className="details-section">
          <h4>Slices ({element.slices.length})</h4>
          <ul className="slice-list">
            {element.slices.map(slice => (
              <li key={slice.sliceName}>
                <strong>{slice.sliceName}</strong>
                {slice.cardinality && (
                  <span className="slice-cardinality">
                    {slice.cardinality.min}..{slice.cardinality.max}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="details-actions">
        <button className="action-btn" disabled>
          Set Cardinality
        </button>
        <button className="action-btn" disabled>
          Set Binding
        </button>
        {node.isRepeatable && (
          <button className="action-btn" disabled>
            Add Slice
          </button>
        )}
      </div>

      {/* Info Footer */}
      <div className="details-footer">
        <small>Element details and editing</small>
      </div>
    </div>
    
    {/* ValueSet Selection Drawer (Phase 4A) */}
    {bindingEligible && (
      <ValueSetSelectionDrawer
        elementPath={node.path}
        elementName={node.name}
        fhirType={element.baseTypeCode || 'unknown'}
        baseBinding={baseBinding}
        currentValueSetUrl={currentBinding?.valueSetUrl || null}
        open={valueSetDrawerOpen}
        onSelectValueSet={handleSelectValueSet}
        onClose={() => setValueSetDrawerOpen(false)}
      />
    )}
  </>
  );
};
