/**
 * ElementDetailsPanel Component
 * 
 * Right-side panel showing full details of selected element.
 * 
 * Features:
 * - Element metadata display
 * - Cardinality editor
 * - Binding editor
 * - Slicing configuration
 * - Extension management
 * 
 * CARDINALITY-FIRST DESIGN:
 * - Show base vs current cardinality
 * - No include/exclude toggle
 * - Cardinality editing controls "Not allowed" state
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
  hasBindingOverride 
} from '../../utils/bindingHelpers';
import { BindingEditorDrawer } from './BindingEditorDrawer';

export const ElementDetailsPanel: React.FC = () => {
  const design = useSdBuilderStore((state) => state.design);
  const selectedPath = useSdBuilderStore((state) => state.selectedPath);
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  const [bindingDrawerOpen, setBindingDrawerOpen] = useState(false);

  // Find selected element
  const selectedElement = React.useMemo(() => {
    if (!design || !selectedPath) return null;
    
    const tree = buildTree(design.elements);
    return findNodeByPath(tree, selectedPath);
  }, [design, selectedPath]);
  
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
          
          {!currentBinding && !baseBinding && (
            <>
              <p className="binding-none">None defined</p>
              <button 
                className="action-btn" 
                onClick={() => setBindingDrawerOpen(true)}
              >
                Add Binding
              </button>
            </>
          )}
          
          {baseBinding && !hasOverride && (
            <>
              <div className="binding-summary">
                <div className="binding-base">
                  <strong>Base:</strong>
                  <dl className="details-list compact">
                    <dt>ValueSet:</dt>
                    <dd>{baseBinding.valueSetUrl}</dd>
                    <dt>Strength:</dt>
                    <dd>{baseBinding.strength}</dd>
                  </dl>
                </div>
                <div className="binding-current">
                  <strong>Current:</strong>
                  <p className="binding-inherited">Inherited from base</p>
                </div>
              </div>
              <button 
                className="action-btn" 
                onClick={() => setBindingDrawerOpen(true)}
              >
                Change Binding
              </button>
            </>
          )}
          
          {currentBinding && hasOverride && (
            <>
              <div className="binding-summary">
                {baseBinding && (
                  <div className="binding-base">
                    <strong>Base:</strong>
                    <dl className="details-list compact">
                      <dt>ValueSet:</dt>
                      <dd>{baseBinding.valueSetUrl}</dd>
                      <dt>Strength:</dt>
                      <dd>{baseBinding.strength}</dd>
                    </dl>
                  </div>
                )}
                <div className="binding-current">
                  <strong>Current:</strong>
                  <dl className="details-list compact">
                    <dt>ValueSet:</dt>
                    <dd className="binding-override">{currentBinding.valueSetUrl}</dd>
                    <dt>Strength:</dt>
                    <dd className="binding-override">{currentBinding.strength}</dd>
                  </dl>
                </div>
              </div>
              <div className="button-group">
                <button 
                  className="action-btn" 
                  onClick={() => setBindingDrawerOpen(true)}
                >
                  Edit Binding
                </button>
                <button 
                  className="action-btn secondary" 
                  onClick={handleClearBinding}
                >
                  Clear Override
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Old Binding Section - Remove this */}
      {!bindingEligible && element.binding && (
        <div className="details-section">
          <h4>Binding</h4>
          <dl className="details-list">
            <dt>Strength:</dt>
            <dd>{element.binding.strength}</dd>

            <dt>ValueSet:</dt>
            <dd>{element.binding.valueSetUrl}</dd>
          </dl>
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
    
    {/* Binding Editor Drawer */}
    {bindingEligible && (
      <BindingEditorDrawer
        node={node}
        baseBinding={baseBinding}
        currentBinding={currentBinding}
        open={bindingDrawerOpen}
        onClose={() => setBindingDrawerOpen(false)}
      />
    )}
  </>
  );
};
