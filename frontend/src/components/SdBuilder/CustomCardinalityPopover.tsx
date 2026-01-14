/**
 * CustomCardinalityPopover Component
 * 
 * Inline popover for setting custom cardinality on repeatable leaf elements.
 * 
 * RULES:
 * - Only shown for leaf nodes with base.max === "*"
 * - Min: numeric input (integer, >= base.min)
 * - Max: numeric input + "Unbounded (*)" checkbox
 * - Real-time validation with Result preview
 * - Apply calls SetCardinality command
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import toast from 'react-hot-toast';
import type { TreeNode } from '../../types/treeNode';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';

interface CustomCardinalityPopoverProps {
  node: TreeNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerElement: React.ReactNode;
}

export const CustomCardinalityPopover: React.FC<CustomCardinalityPopoverProps> = ({
  node,
  open,
  onOpenChange,
  triggerElement,
}) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  const [min, setMin] = useState(node.currentCardinality.min.toString());
  const [maxInput, setMaxInput] = useState('');
  const [unbounded, setUnbounded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const minInputRef = useRef<HTMLInputElement>(null);
  
  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setMin(node.currentCardinality.min.toString());
      
      if (node.currentCardinality.max === '*') {
        setUnbounded(true);
        setMaxInput('');
      } else {
        setUnbounded(false);
        setMaxInput(node.currentCardinality.max);
      }
      
      setError(null);
      
      // Focus first input
      setTimeout(() => {
        minInputRef.current?.focus();
      }, 0);
    }
  }, [open, node.currentCardinality]);
  
  // Compute effective max value
  const effectiveMax = unbounded ? '*' : maxInput;
  
  // Validate cardinality in real-time
  useEffect(() => {
    const minNum = parseInt(min, 10);
    const baseMin = node.baseCardinality.min;
    const baseMax = node.baseCardinality.max;
    
    // Check if min is a valid integer
    if (isNaN(minNum) || !Number.isInteger(minNum)) {
      setError('Min must be an integer');
      return;
    }
    
    // Check min >= base.min
    if (minNum < baseMin) {
      setError('Cannot weaken base cardinality');
      return;
    }
    
    // Check Unbounded checkbox validation
    if (unbounded) {
      // Base must allow unbounded
      if (baseMax !== '*') {
        setError('Base does not allow unbounded');
        return;
      }
    } else {
      // Max must be a valid integer
      const maxNum = parseInt(maxInput, 10);
      if (isNaN(maxNum) || !Number.isInteger(maxNum)) {
        setError('Max must be an integer');
        return;
      }
      
      // Check max > 0
      if (maxNum <= 0) {
        setError('Max must be greater than 0');
        return;
      }
      
      // Check max >= min
      if (maxNum < minNum) {
        setError('Min must be ≤ Max');
        return;
      }
      
      // Check max <= base.max (if base.max is numeric)
      if (baseMax !== '*') {
        const baseMaxNum = parseInt(baseMax, 10);
        if (maxNum > baseMaxNum) {
          setError('Cannot weaken base cardinality');
          return;
        }
      }
    }
    
    setError(null);
  }, [min, maxInput, unbounded, node.baseCardinality]);
  
  // Check if current values match node's current cardinality (no-op)
  const isNoOp = () => {
    const minNum = parseInt(min, 10);
    return (
      minNum === node.currentCardinality.min &&
      effectiveMax === node.currentCardinality.max
    );
  };
  
  const handleApply = async () => {
    if (error || isNoOp()) return;
    
    const minNum = parseInt(min, 10);
    
    try {
      await applyCommand({
        commandType: 'SetCardinalityOverride',
        path: node.path,
        min: minNum,
        max: effectiveMax,
      });
      
      // Success toast
      toast.success(`${node.name}: ${minNum}..${effectiveMax}`, {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '13px',
          padding: '8px 12px',
        },
      });
      
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to set cardinality:', err);
      toast.error('Failed to update cardinality', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };
  
  const handleCancel = () => {
    onOpenChange(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !error && !isNoOp()) {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };
  
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        {triggerElement}
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="custom-cardinality-popover"
          align="start"
          sideOffset={5}
          onKeyDown={handleKeyDown}
        >
          <div className="popover-header">
            <h3>Custom Cardinality</h3>
          </div>
          
          <div className="popover-body">
            <div className="popover-inputs">
              <div className="input-group">
                <label htmlFor="min-input">Min</label>
                <input
                  id="min-input"
                  ref={minInputRef}
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  min={node.baseCardinality.min}
                  className="cardinality-input"
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="max-input">Max</label>
                <input
                  id="max-input"
                  type="number"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  disabled={unbounded}
                  min={1}
                  className="cardinality-input"
                />
              </div>
            </div>
            
            <div className="unbounded-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={unbounded}
                  onChange={(e) => setUnbounded(e.target.checked)}
                />
                <span>Unbounded (*)</span>
              </label>
            </div>
            
            <div className="result-preview">
              <span className="result-label">Result:</span>
              <span className="result-value">
                {min || '?'}..{effectiveMax || '?'}
              </span>
            </div>
            
            <div className="popover-context">
              <div className="context-row">
                <span className="context-label">Base:</span>
                <span className="context-value">
                  {node.baseCardinality.min}..{node.baseCardinality.max}
                </span>
              </div>
              <div className="context-row">
                <span className="context-label">Current:</span>
                <span className="context-value">
                  {node.currentCardinality.min}..{node.currentCardinality.max}
                </span>
              </div>
            </div>
            
            {error && (
              <div className="popover-error">
                {error}
              </div>
            )}
          </div>
          
          <div className="popover-actions">
            <button
              onClick={handleApply}
              disabled={!!error || isNoOp()}
              className="btn-apply"
            >
              Apply
            </button>
            <button
              onClick={handleCancel}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
          
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
