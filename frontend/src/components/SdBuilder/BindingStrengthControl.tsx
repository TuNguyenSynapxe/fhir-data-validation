/**
 * BindingStrengthControl Component
 * 
 * Phase 4A Refactor: Lightweight inline control for adjusting binding strength.
 * 
 * RESPONSIBILITIES:
 * - Show current binding strength
 * - Allow override via small popover
 * - Explain each strength in plain language
 * 
 * LOCATION: Inline within ElementDetailsPanel (NOT in drawer)
 * 
 * RULES:
 * - Default to base binding strength
 * - Override only if user explicitly changes
 * - Changing strength does NOT reopen drawer
 * - Independent from ValueSet selection
 */

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import { BINDING_STRENGTHS, type BindingStrength } from '../../utils/bindingHelpers';

interface BindingStrengthControlProps {
  elementPath: string;
  elementName: string;
  valueSetUrl: string;
  currentStrength: BindingStrength;
  baseStrength?: BindingStrength;
}

export const BindingStrengthControl: React.FC<BindingStrengthControlProps> = ({
  elementPath,
  elementName,
  valueSetUrl,
  currentStrength,
  baseStrength,
}) => {
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isOverride = baseStrength && currentStrength !== baseStrength;

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

  const handleChangeStrength = async (newStrength: BindingStrength) => {
    if (newStrength === currentStrength) {
      setShowPopover(false);
      return;
    }

    try {
      await applyCommand({
        commandType: 'SetBinding',
        path: elementPath,
        valueSetUrl,
        strength: newStrength.charAt(0).toUpperCase() + newStrength.slice(1), // Capitalize
      });

      toast.success(`Binding strength updated: ${elementName}`, {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontSize: '13px',
          padding: '8px 12px',
        },
      });

      setShowPopover(false);
    } catch (err) {
      console.error('Failed to update binding strength:', err);
      toast.error('Failed to update binding strength', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };

  return (
    <div className="binding-strength-control">
      <div className="strength-display">
        <label>Strength:</label>
        <button
          ref={buttonRef}
          onClick={() => setShowPopover(!showPopover)}
          className={`strength-button ${isOverride ? 'override' : ''}`}
          title="Click to change binding strength"
        >
          {currentStrength}
          <span className="dropdown-icon">▼</span>
        </button>
        {isOverride && (
          <span className="override-indicator" title={`Base: ${baseStrength}`}>
            Override
          </span>
        )}
      </div>

      {/* Strength Popover */}
      {showPopover && (
        <div ref={popoverRef} className="strength-popover">
          <div className="popover-header">
            <h4>Select Binding Strength</h4>
          </div>
          <ul className="strength-options">
            {BINDING_STRENGTHS.map((option) => (
              <li
                key={option.value}
                className={`strength-option ${currentStrength === option.value ? 'selected' : ''}`}
                onClick={() => handleChangeStrength(option.value)}
              >
                <div className="strength-option-content">
                  <span className="strength-label">{option.label}</span>
                  <p className="strength-description">{option.description}</p>
                </div>
                {currentStrength === option.value && (
                  <span className="selected-icon">✓</span>
                )}
              </li>
            ))}
          </ul>
          {baseStrength && (
            <div className="popover-footer">
              <small>Base strength: {baseStrength}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
