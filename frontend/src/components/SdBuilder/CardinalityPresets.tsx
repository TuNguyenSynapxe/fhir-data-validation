/**
 * CardinalityPresets Component
 * 
 * Icon-based cardinality preset controls for leaf nodes.
 * 
 * RULES:
 * - Only shown when Cardinality Mode is ON
 * - Only rendered for leaf nodes
 * - HARD STOP: Hidden if base = 1..1 (cardinality fixed)
 * - Icons only (no text labels)
 * - Controls visible on hover OR when selected
 * - All actions map to SetCardinality command
 */

import React, { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import toast from 'react-hot-toast';
import type { TreeNode } from '../../types/treeNode';
import { 
  getCardinalityPresets, 
  isCardinalityEqual,
  shouldEnableCardinalityMode 
} from '../../utils/cardinalityHelpers';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import { CustomCardinalityPopover } from './CustomCardinalityPopover';

interface CardinalityPresetsProps {
  node: TreeNode;
  isSelected: boolean;
}

export const CardinalityPresets: React.FC<CardinalityPresetsProps> = ({ node, isSelected }) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  const selectNode = useSdBuilderStore((state) => state.selectNode);
  
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  
  // Only show for leaf nodes
  if (node.role !== 'leaf') return null;
  
  // HARD STOP: Don't show if base.max = "0"
  if (node.baseCardinality.max === '0') return null;
  
  // Get valid presets (will be empty if base = 1..1)
  const presets = getCardinalityPresets(node.baseCardinality);
  
  // Hide if no presets available (e.g., base = 1..1)
  if (presets.length === 0) return null;
  
  const handlePresetClick = async (e: React.MouseEvent, preset: typeof presets[0]) => {
    e.stopPropagation();
    
    // Handle Custom option - open popover
    if (preset.label === 'Custom') {
      setCustomPopoverOpen(true);
      return;
    }
    
    try {
      await applyCommand({
        commandType: 'SetCardinalityOverride',
        path: node.path,
        min: preset.cardinality.min,
        max: preset.cardinality.max,
      });
      
      // Success toast
      toast.success(`${node.name}: ${preset.cardinality.min}..${preset.cardinality.max}`, {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '13px',
          padding: '8px 12px',
        },
      });
    } catch (error) {
      console.error('Failed to set cardinality:', error);
      toast.error('Failed to update cardinality', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };
  
  return (
    <Tooltip.Provider delayDuration={0}>
      <div className="cardinality-presets">
        {presets.map((preset) => {
          const isActive = preset.label !== 'Custom' && 
                          isCardinalityEqual(node.currentCardinality, preset.cardinality);
          const isCustom = preset.label === 'Custom';
          
          // Wrap Custom icon in popover
          if (isCustom) {
            return (
              <CustomCardinalityPopover
                key={preset.label}
                node={node}
                open={customPopoverOpen}
                onOpenChange={setCustomPopoverOpen}
                triggerElement={
                  <button
                    className={`preset-icon custom`}
                    aria-label={preset.description}
                    title="Custom cardinality…"
                  >
                    {preset.icon}
                  </button>
                }
              />
            );
          }
          
          return (
            <Tooltip.Root key={preset.label}>
              <Tooltip.Trigger asChild>
                <button
                  onClick={(e) => handlePresetClick(e, preset)}
                  className={`preset-icon ${isActive ? 'active' : ''}`}
                  aria-label={preset.description}
                >
                  {preset.icon}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50"
                  sideOffset={5}
                >
                  {preset.description}
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
};
