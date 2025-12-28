/**
 * Editable Cell Component
 * Spreadsheet-like inline editing for table cells
 * Phase 3C: Double-click to edit, Tab to navigate, Enter/Escape to confirm/cancel
 */

import React, { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  /** Current value */
  value: string;
  /** Callback when value is committed */
  onCommit: (newValue: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Input type */
  type?: 'text' | 'textarea';
  /** CSS classes for display mode */
  displayClassName?: string;
  /** CSS classes for edit mode */
  editClassName?: string;
  /** Validation function (returns error message or undefined) */
  validate?: (value: string) => string | undefined;
}

export function EditableCell({
  value,
  onCommit,
  placeholder = '',
  type = 'text',
  displayClassName = '',
  editClassName = '',
  validate,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditValue(value);
    setError(undefined);
    setIsEditing(true);
  };

  const handleCommit = () => {
    // Validate
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Only commit if value changed
    if (editValue !== value) {
      onCommit(editValue);
    }

    setIsEditing(false);
    setError(undefined);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      // Allow Tab to commit and move to next field
      handleCommit();
    }
  };

  const handleBlur = () => {
    // Commit on blur (spreadsheet behavior)
    handleCommit();
  };

  if (!isEditing) {
    return (
      <div
        onDoubleClick={handleDoubleClick}
        className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${displayClassName}`}
        title="Double-click to edit"
      >
        {value || <span className="text-gray-400 italic">{placeholder || 'Empty'}</span>}
      </div>
    );
  }

  return (
    <div className="relative">
      {type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none ${editClassName} ${
            error ? 'border-red-500' : ''
          }`}
          rows={3}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none ${editClassName} ${
            error ? 'border-red-500' : ''
          }`}
        />
      )}
      {error && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded shadow-lg z-10">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Editable Table Row Component
 * Inline editing for entire rows
 */
interface EditableRowData {
  [key: string]: string | number | boolean;
}

interface EditableRowProps<T extends EditableRowData> {
  /** Row data */
  data: T;
  /** Column definitions */
  columns: Array<{
    key: keyof T;
    editable?: boolean;
    validate?: (value: string) => string | undefined;
  }>;
  /** Callback when row is updated */
  onUpdate: (newData: T) => void;
  /** Whether row is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Row renderer */
  children: (data: T, onCellCommit: (key: keyof T, value: string) => void) => React.ReactNode;
}

export function EditableRow<T extends EditableRowData>({
  data,
  columns: _columns,
  onUpdate,
  isSelected = false,
  onClick,
  children,
}: EditableRowProps<T>) {
  const handleCellCommit = (key: keyof T, value: string) => {
    const newData = { ...data, [key]: value };
    onUpdate(newData);
  };

  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-100 hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50' : ''
      }`}
    >
      {children(data, handleCellCommit)}
    </tr>
  );
}
