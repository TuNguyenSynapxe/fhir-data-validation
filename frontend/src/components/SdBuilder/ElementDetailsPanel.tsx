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
import { BindingDisplay } from './BindingDisplay';
import { SlicingRulesDrawer } from './SlicingRulesDrawer';
import { AddDiscriminatorDrawer } from './AddDiscriminatorDrawer';
import { AddSliceDrawer } from './AddSliceDrawer';
import { SliceConstraintDrawer } from './SliceConstraintDrawer';

export const ElementDetailsPanel: React.FC = () => {
  const design = useSdBuilderStore((state) => state.design);
  const selectedPath = useSdBuilderStore((state) => state.selectedPath);
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  const [valueSetDrawerOpen, setValueSetDrawerOpen] = useState(false);
  const [slicingRulesDrawerOpen, setSlicingRulesDrawerOpen] = useState(false);
  const [addSliceDrawerOpen, setAddSliceDrawerOpen] = useState(false);
  const [sliceConstraintDrawerOpen, setSliceConstraintDrawerOpen] = useState(false);
  const [selectedSliceName, setSelectedSliceName] = useState<string | null>(null);

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

      {/* EPIC 2: Progressive Disclosure Slicing UI */}
      {node.isRepeatable && (
        <div className="details-section">
          <h4>SLICING</h4>
          
          {/* STATE 1: No slicing configured */}
          {!element.slicing && (
            <>
              <p className="text-sm text-gray-600 mb-3">
                This element is repeatable and can be sliced.
              </p>
              <button
                onClick={() => setSlicingRulesDrawerOpen(true)}
                className="action-btn"
              >
                Enable Slicing
              </button>
            </>
          )}

          {/* STATE 2-4: Slicing enabled */}
          {element.slicing && (
            <>
              {/* Read-only summary */}
              <dl className="details-list text-sm mb-3">
                <dt>Matching:</dt>
                <dd>{element.slicing.rules}</dd>

                <dt>Order matters:</dt>
                <dd>{element.slicing.ordered ? 'Yes' : 'No'}</dd>
              </dl>

              {/* Discriminators */}
              <div className="mb-3">
                <dt className="text-sm font-medium text-gray-700">Discriminators:</dt>
                {(!element.slicing.discriminators || element.slicing.discriminators.length === 0) ? (
                  <dd className="text-sm text-gray-600 italic">None</dd>
                ) : (
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {element.slicing.discriminators.map((disc: any, idx: number) => (
                      <li key={idx}>
                        {disc.type.toLowerCase()} → {disc.path}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Slices */}
              {element.slices && Object.keys(element.slices).length > 0 && (
                <div className="mb-3">
                  <dt className="text-sm font-medium text-gray-700">Slices:</dt>
                  <ul className="text-sm text-gray-700 space-y-2">
                    {Object.keys(element.slices).sort().map((sliceName: string) => (
                      <li key={sliceName} className="flex items-center justify-between">
                        <span>• {sliceName}</span>
                        <button
                          onClick={() => {
                            setSelectedSliceName(sliceName);
                            setSliceConstraintDrawerOpen(true);
                          }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Configure
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-4">
                {/* STATE 2: No discriminators - only show Add Discriminator */}
                {(!element.slicing.discriminators || element.slicing.discriminators.length === 0) && (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Add at least one discriminator to define how slices are distinguished.
                      </p>
                    </div>
                    <button
                      onClick={() => setSlicingRulesDrawerOpen(true)}
                      className="action-btn"
                    >
                      Edit Slicing Rules
                    </button>
                  </>
                )}

                {/* STATE 3-4: Has discriminators - show all actions */}
                {element.slicing.discriminators && element.slicing.discriminators.length > 0 && (
                  <>
                    <button
                      onClick={() => setSlicingRulesDrawerOpen(true)}
                      className="action-btn"
                    >
                      Edit Slicing Rules
                    </button>
                    <button
                      onClick={() => setAddSliceDrawerOpen(true)}
                      className="action-btn"
                    >
                      Add Slice
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

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
            <BindingDisplay
              binding={baseBinding}
              variant="base"
              showActions={true}
              onChangeValueSet={() => setValueSetDrawerOpen(true)}
            >
              <BindingStrengthControl
                elementPath={node.path}
                elementName={node.name}
                valueSetUrl={baseBinding.valueSetUrl}
                currentStrength={baseBinding.strength.toLowerCase() as BindingStrength}
                baseStrength={baseBinding.strength.toLowerCase() as BindingStrength}
              />
            </BindingDisplay>
          )}
          
          {/* Override Binding */}
          {currentBinding && hasOverride && (
            <>
              {/* Current/Override Binding */}
              <BindingDisplay
                binding={currentBinding}
                variant="current"
                showActions={true}
                onChangeValueSet={() => setValueSetDrawerOpen(true)}
                onClearOverride={handleClearBinding}
              >
                <BindingStrengthControl
                  elementPath={node.path}
                  elementName={node.name}
                  valueSetUrl={currentBinding.valueSetUrl}
                  currentStrength={currentBinding.strength.toLowerCase() as BindingStrength}
                  baseStrength={baseBinding?.strength.toLowerCase() as BindingStrength}
                />
              </BindingDisplay>

              {/* Base Binding Reference (Read-Only, Muted) */}
              {baseBinding && (
                <div className="base-binding-reference-section">
                  <div className="base-binding-reference-label">
                    <span className="icon-info">ℹ️</span>
                    Base binding defined in StructureDefinition (overridden)
                  </div>
                  <BindingDisplay
                    binding={baseBinding}
                    variant="base"
                    showActions={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

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
        fhirType={element.typeCodes[0] || 'unknown'}
        baseBinding={baseBinding}
        currentValueSetUrl={currentBinding?.valueSetUrl || null}
        open={valueSetDrawerOpen}
        onSelectValueSet={handleSelectValueSet}
        onClose={() => setValueSetDrawerOpen(false)}
      />
    )}

    {/* EPIC 2: Slicing Rules Drawer */}
    {slicingRulesDrawerOpen && (
      <SlicingRulesDrawer
        isOpen={slicingRulesDrawerOpen}
        element={element}
        allElements={design?.elements || []}
        onClose={() => setSlicingRulesDrawerOpen(false)}
      />
    )}

    {/* EPIC 2: Add Slice Drawer */}
    {addSliceDrawerOpen && element.slicing && (
      <AddSliceDrawer
        isOpen={addSliceDrawerOpen}
        elementPath={element.path}
        discriminators={element.slicing.discriminators || []}
        existingSliceNames={element.slices ? Object.keys(element.slices) : []}
        onAdd={async (sliceName: string) => {
          console.log('[ElementDetailsPanel] onAdd called with sliceName:', sliceName);
          console.log('[ElementDetailsPanel] Current element.slices before command:', element.slices);
          try {
            await applyCommand({
              commandType: 'AddSlice',
              path: element.path,
              sliceName,
            });
            console.log('[ElementDetailsPanel] AddSlice command completed successfully');
            console.log('[ElementDetailsPanel] Current element.slices after command:', element.slices);
            console.log('[ElementDetailsPanel] design.elements after command:', design?.elements.find(e => e.path === element.path)?.slices);
            setAddSliceDrawerOpen(false);
          } catch (err) {
            console.error('[ElementDetailsPanel] AddSlice command failed:', err);
          }
        }}
        onClose={() => setAddSliceDrawerOpen(false)}
      />
    )}

    {/* EPIC 3: Slice Constraint Drawer */}
    {sliceConstraintDrawerOpen && selectedSliceName && (
      <SliceConstraintDrawer
        isOpen={sliceConstraintDrawerOpen}
        element={element}
        sliceName={selectedSliceName}
        onClose={() => {
          setSliceConstraintDrawerOpen(false);
          setSelectedSliceName(null);
        }}
      />
    )}
  </>
  );
};
