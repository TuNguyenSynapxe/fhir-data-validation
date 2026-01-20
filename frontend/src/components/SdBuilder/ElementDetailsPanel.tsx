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
import { Layers, Key, Info, Edit, Plus, Scissors } from 'lucide-react';
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
  const selection = useSdBuilderStore((state) => state.selection); // EPIC 3.5: Use selection object
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  const [valueSetDrawerOpen, setValueSetDrawerOpen] = useState(false);
  const [slicingRulesDrawerOpen, setSlicingRulesDrawerOpen] = useState(false);
  const [addSliceDrawerOpen, setAddSliceDrawerOpen] = useState(false);
  const [sliceConstraintDrawerOpen, setSliceConstraintDrawerOpen] = useState(false);
  const [selectedSliceName, setSelectedSliceName] = useState<string | null>(null);

  // Find selected element based on selection
  const selectedElement = React.useMemo(() => {
    if (!design || !selection) return null;
    
    const path = selection.kind === 'slice' ? selection.path : selection.path;
    const tree = buildTree(design.elements);
    return findNodeByPath(tree, path);
  }, [design, selection]);
  
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

  // EPIC 3.5: Handle slice selection
  if (selection && selection.kind === 'slice') {
    const sliceName = selection.sliceName;
    
    // Special case: "other" slice (unsliced base elements in open matching)
    if (sliceName === 'other') {
      return (
        <div className="element-details-panel">
          {/* Header for "Other" node */}
          <div className="details-header">
            <h3 className="details-title flex items-center gap-2">
              <Scissors className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">Other (Unsliced)</span>
            </h3>
          </div>

          {/* Parent Element Reference */}
          <div className="details-section">
            <h4>Parent Element</h4>
            <dl className="details-list">
              <dt>Path:</dt>
              <dd className="text-sm">{element.path}</dd>
            </dl>
          </div>

          {/* Explanation */}
          <div className="details-section">
            <h4 className="flex items-center gap-2">
              <Info className="w-4 h-4" /> About This Node
            </h4>
            <p className="text-sm text-gray-600">
              This virtual node represents instances that don't match any defined slice. 
              The parent element uses <strong>open matching</strong>, allowing unsliced instances.
            </p>
          </div>

          {/* Base Cardinality */}
          <div className="details-section">
            <h4>Cardinality</h4>
            <dl className="details-list">
              <dt>Base:</dt>
              <dd>{element.baseCardinality.min}..{element.baseCardinality.max}</dd>
            </dl>
          </div>

          {/* Info Footer */}
          <div className="details-footer">
            <small>Configuration for unsliced instances</small>
          </div>
        </div>
      );
    }
    
    // Regular slice handling
    const slice = element.slices?.[sliceName];
    
    console.log('[ElementDetailsPanel] Slice selection:', { sliceName, slice });
    console.log('[ElementDetailsPanel] element.slices:', element.slices);
    
    if (!slice) {
      return (
        <div className="element-details-panel-empty">
          <p>Slice not found: {sliceName}</p>
        </div>
      );
    }
    
    const sliceLabel = slice.Metadata?.ShortLabel || sliceName;
    
    return (
      <>
        <div className="element-details-panel">
          {/* Slice Header */}
          <div className="details-header">
            <h3 className="details-title flex items-center gap-2">
              <Scissors className="w-5 h-5 text-purple-600" />
              <span className="text-purple-700">Slice: {sliceLabel}</span>
            </h3>
          </div>

          {/* Parent Element Reference */}
          <div className="details-section">
            <h4>Parent Element</h4>
            <dl className="details-list">
              <dt>Path:</dt>
              <dd className="text-sm">{element.path}</dd>
            </dl>
          </div>

          {/* Discriminators (Read-Only) */}
          <div className="details-section">
            <h4 className="flex items-center gap-2">
              <Key className="w-4 h-4" /> Discriminators
            </h4>
            {element.slicing?.discriminators && element.slicing.discriminators.length > 0 ? (
              <ul className="text-sm space-y-1">
                {element.slicing.discriminators.map((disc: any, idx: number) => (
                  <li key={idx} className="flex items-center gap-1.5 text-gray-700">
                    <Key className="w-3.5 h-3.5" /> {disc.type.toLowerCase()} → {disc.path}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">None defined</p>
            )}
          </div>

          {/* Slice Conditions */}
          <div className="details-section">
            <h4>Conditions</h4>
            {slice.Conditions && slice.Conditions.length > 0 ? (
              <ul className="text-sm space-y-2">
                {slice.Conditions.map((cond: any, idx: number) => (
                  <li key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="font-medium text-gray-700">{cond.DiscriminatorPath}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">{cond.Operator}</span>
                      {cond.Value && <span> → {cond.Value}</span>}
                      {cond.System && <span className="text-gray-500 ml-1">({cond.System})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No conditions defined</p>
            )}
          </div>

          {/* Slice Cardinality */}
          <div className="details-section">
            <h4>Cardinality</h4>
            <dl className="details-list">
              <dt>Base (element):</dt>
              <dd>{element.baseCardinality.min}..{element.baseCardinality.max}</dd>

              {slice.OverrideCardinality ? (
                <>
                  <dt>Slice (override):</dt>
                  <dd className="cardinality-override">
                    {slice.OverrideCardinality.Min}..{slice.OverrideCardinality.Max}
                  </dd>
                </>
              ) : (
                <>
                  <dt>Slice:</dt>
                  <dd className="text-gray-500 italic">Inherits from element</dd>
                </>
              )}
            </dl>
          </div>

          {/* Slice Metadata */}
          {(slice.Metadata?.ShortLabel || slice.Metadata?.Description) && (
            <div className="details-section">
              <h4>Metadata</h4>
              <dl className="details-list">
                {slice.Metadata.ShortLabel && (
                  <>
                    <dt>Short Label:</dt>
                    <dd>{slice.Metadata.ShortLabel}</dd>
                  </>
                )}
                {slice.Metadata.Description && (
                  <>
                    <dt>Description:</dt>
                    <dd className="text-sm">{slice.Metadata.Description}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* Action: Configure Slice */}
          <div className="details-section">
            <button
              onClick={() => {
                setSelectedSliceName(sliceName);
                setSliceConstraintDrawerOpen(true);
              }}
              className="action-btn w-full flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" /> Configure Slice
            </button>
          </div>

          {/* Info Footer */}
          <div className="details-footer">
            <small>Slice-level constraints and metadata</small>
          </div>
        </div>

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
  }

  // Regular element view
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
          <h4 className="flex items-center gap-2"><Layers className="w-4 h-4" /> Slicing</h4>
          
          {/* STATE 1: No slicing configured */}
          {!element.slicing && (
            <>
              <p className="text-sm text-gray-600 mb-3 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Defines how repeated elements are grouped and distinguished.</span>
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
                <dt className="text-sm font-medium text-gray-700 flex items-center gap-1"><Key className="w-3.5 h-3.5" /> Discriminators:</dt>
                {(!element.slicing.discriminators || element.slicing.discriminators.length === 0) ? (
                  <dd className="text-sm text-gray-600 italic">None</dd>
                ) : (
                  <ul className="text-sm text-gray-700 list-none pl-0 space-y-1">
                    {element.slicing.discriminators.map((disc: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" /> {disc.type.toLowerCase()} → {disc.path}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Slices */}
              {element.slices && Object.keys(element.slices).length > 0 && (
                <div className="mb-3">
                  <dt className="text-sm font-medium text-gray-700 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Slices:</dt>
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
                        ⚠️ Add at least one discriminator before creating slices.
                      </p>
                    </div>
                    <button
                      onClick={() => setSlicingRulesDrawerOpen(true)}
                      className="action-btn flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> Edit Slicing Rules
                    </button>
                  </>
                )}

                {/* STATE 3-4: Has discriminators - show all actions */}
                {element.slicing.discriminators && element.slicing.discriminators.length > 0 && (
                  <>
                    <button
                      onClick={() => setSlicingRulesDrawerOpen(true)}
                      className="action-btn flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> Edit Slicing Rules
                    </button>
                    <button
                      onClick={() => setAddSliceDrawerOpen(true)}
                      className="action-btn flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Slice
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
