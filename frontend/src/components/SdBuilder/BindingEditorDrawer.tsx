/**
 * BindingEditorDrawer Component
 * 
 * Right-side drawer for editing FHIR terminology binding.
 * 
 * RULES:
 * - Only for eligible coded elements (code/Coding/CodeableConcept)
 * - Explicit action required to open (not automatic)
 * - ValueSet URL + Strength required
 * - Shows base binding as read-only reference
 */

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { TreeNode } from '../../types/treeNode';
import type { BindingConfig } from '../../api/sdBuilderApi';
import { 
  isValidCanonicalUrl, 
  BINDING_STRENGTHS, 
  type BindingStrength 
} from '../../utils/bindingHelpers';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';

interface BindingEditorDrawerProps {
  node: TreeNode;
  baseBinding: BindingConfig | null;
  currentBinding: BindingConfig | null;
  open: boolean;
  onClose: () => void;
}

export const BindingEditorDrawer: React.FC<BindingEditorDrawerProps> = ({
  node,
  baseBinding,
  currentBinding,
  open,
  onClose,
}) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  const [valueSetUrl, setValueSetUrl] = useState('');
  const [strength, setStrength] = useState<BindingStrength | ''>('');
  const [error, setError] = useState<string | null>(null);
  
  const valueSetInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize form when drawer opens
  useEffect(() => {
    if (open) {
      // Pre-fill from current binding, else from base, else empty
      if (currentBinding) {
        setValueSetUrl(currentBinding.valueSetUrl);
        setStrength(currentBinding.strength.toLowerCase() as BindingStrength);
      } else if (baseBinding) {
        setValueSetUrl(baseBinding.valueSetUrl);
        setStrength(baseBinding.strength.toLowerCase() as BindingStrength);
      } else {
        setValueSetUrl('');
        setStrength('');
      }
      
      setError(null);
      
      // Focus first input
      setTimeout(() => {
        valueSetInputRef.current?.focus();
      }, 0);
    }
  }, [open, currentBinding, baseBinding]);
  
  // Real-time validation
  useEffect(() => {
    // ValueSet URL required
    if (!valueSetUrl.trim()) {
      setError('ValueSet URL is required');
      return;
    }
    
    // ValueSet URL must be valid canonical format
    if (!isValidCanonicalUrl(valueSetUrl)) {
      setError('Invalid canonical URL format');
      return;
    }
    
    // Strength required
    if (!strength) {
      setError('Binding strength is required');
      return;
    }
    
    setError(null);
  }, [valueSetUrl, strength]);
  
  // Check if form has changes (no-op detection)
  const hasChanges = () => {
    if (!currentBinding && !valueSetUrl && !strength) {
      return false;
    }
    
    if (currentBinding) {
      return (
        valueSetUrl !== currentBinding.valueSetUrl ||
        strength !== currentBinding.strength.toLowerCase()
      );
    }
    
    return true;
  };
  
  const handleApply = async () => {
    if (error || !hasChanges()) return;
    
    try {
      await applyCommand({
        commandType: 'SetBinding',
        path: node.path,
        valueSetUrl: valueSetUrl.trim(),
        strength: strength.charAt(0).toUpperCase() + strength.slice(1), // Capitalize
      });
      
      toast.success(`Binding updated: ${node.name}`, {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '13px',
          padding: '8px 12px',
        },
      });
      
      onClose();
    } catch (err) {
      console.error('Failed to set binding:', err);
      toast.error('Failed to update binding', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };
  
  const handleCancel = () => {
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !error && hasChanges()) {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };
  
  if (!open) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="drawer-backdrop" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className="binding-editor-drawer"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="drawer-header">
          <h2>Edit Binding</h2>
          <button 
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>
        
        {/* Body */}
        <div className="drawer-body">
          {/* Editable Section */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="valueSetUrl">
                ValueSet <span className="required">*</span>
              </label>
              <input
                id="valueSetUrl"
                ref={valueSetInputRef}
                type="text"
                value={valueSetUrl}
                onChange={(e) => setValueSetUrl(e.target.value)}
                placeholder="http://hl7.org/fhir/ValueSet/..."
                className="form-input"
              />
              <span className="form-hint">
                Canonical URL of the ValueSet
              </span>
            </div>
            
            <div className="form-group">
              <label>
                Strength <span className="required">*</span>
              </label>
              <div className="radio-group">
                {BINDING_STRENGTHS.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="strength"
                      value={option.value}
                      checked={strength === option.value}
                      onChange={(e) => setStrength(e.target.value as BindingStrength)}
                    />
                    <div className="radio-content">
                      <span className="radio-label">{option.label}</span>
                      <span className="radio-description">{option.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {/* Base Binding Reference */}
          {baseBinding && (
            <>
              <div className="section-divider" />
              <div className="base-binding-section">
                <h3>Base Binding</h3>
                <div className="base-binding-info">
                  <div className="info-row">
                    <span className="info-label">ValueSet:</span>
                    <span className="info-value">{baseBinding.valueSetUrl}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Strength:</span>
                    <span className="info-value">{baseBinding.strength}</span>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="drawer-footer">
          <button
            onClick={handleApply}
            disabled={!!error || !hasChanges()}
            className="btn-primary"
          >
            Apply
          </button>
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};
