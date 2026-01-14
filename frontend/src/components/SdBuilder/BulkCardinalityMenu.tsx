/**
 * BulkCardinalityMenu Component
 * 
 * Provides bulk cardinality actions for leaf elements.
 * 
 * RULES:
 * - Only operates on leaf nodes
 * - Respects base cardinality boundaries
 * - Requires confirmation before execution
 * - Shows preview of affected elements
 */

import React, { useState, useMemo } from 'react';
import { MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSdBuilderStore } from '../../stores/useSdBuilderStore';
import type { TreeNode } from '../../types/treeNode';
import { getBulkActions, type BulkActionType, type BulkActionPreview } from '../../utils/bulkCardinalityHelpers';

interface BulkCardinalityMenuProps {
  treeNodes: TreeNode[];
}

export const BulkCardinalityMenu: React.FC<BulkCardinalityMenuProps> = ({ treeNodes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BulkActionType | null>(null);
  const [preview, setPreview] = useState<BulkActionPreview | null>(null);
  
  const applyCommand = useSdBuilderStore((state) => state.applyCommand);
  
  // Get available bulk actions
  const bulkActions = useMemo(() => getBulkActions(treeNodes), [treeNodes]);
  
  const handleActionClick = (actionType: BulkActionType) => {
    const action = bulkActions.find(a => a.type === actionType);
    if (!action) return;
    
    setSelectedAction(actionType);
    setPreview(action.preview);
    setShowConfirmDialog(true);
    setIsOpen(false);
  };
  
  const handleConfirm = async () => {
    if (!selectedAction || !preview) return;
    
    setShowConfirmDialog(false);
    
    try {
      // Execute all commands
      for (const element of preview.affectedElements) {
        await applyCommand({
          commandType: 'SetCardinalityOverride',
          path: element.path,
          min: element.targetCardinality.min,
          max: element.targetCardinality.max,
        });
      }
      
      // Success toast
      toast.success(
        `${preview.affectedElements.length} elements updated${preview.skippedCount > 0 ? `, ${preview.skippedCount} skipped` : ''}`,
        {
          duration: 3000,
          position: 'bottom-right',
        }
      );
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast.error('Failed to apply bulk action', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
    
    setSelectedAction(null);
    setPreview(null);
  };
  
  const handleCancel = () => {
    setShowConfirmDialog(false);
    setSelectedAction(null);
    setPreview(null);
  };
  
  if (bulkActions.length === 0) {
    return null; // No eligible actions
  }
  
  return (
    <>
      {/* Bulk Actions Menu Button */}
      <div className="bulk-actions-menu">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bulk-actions-trigger"
          title="Bulk cardinality actions"
          aria-label="Bulk actions"
        >
          <MoreVertical size={16} />
        </button>
        
        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div className="bulk-actions-backdrop" onClick={() => setIsOpen(false)} />
            <div className="bulk-actions-dropdown">
              {bulkActions.map((action) => (
                <button
                  key={action.type}
                  onClick={() => handleActionClick(action.type)}
                  className="bulk-action-item"
                  disabled={action.preview.affectedElements.length === 0}
                >
                  <span className="action-label">{action.label}</span>
                  <span className="action-count">
                    ({action.preview.affectedElements.length})
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && preview && (
        <>
          <div className="bulk-confirmation-backdrop" onClick={handleCancel} />
          <div className="bulk-confirmation-dialog">
            <h3>Bulk Cardinality Update</h3>
            
            <div className="confirmation-details">
              <div className="detail-row">
                <span className="detail-label">Action:</span>
                <span className="detail-value">
                  {bulkActions.find(a => a.type === selectedAction)?.label}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Will update:</span>
                <span className="detail-value">{preview.affectedElements.length} elements</span>
              </div>
              
              {preview.skippedCount > 0 && (
                <div className="detail-row warning">
                  <span className="detail-label">Skipped (base restricted):</span>
                  <span className="detail-value">{preview.skippedCount}</span>
                </div>
              )}
            </div>
            
            <div className="confirmation-actions">
              <button onClick={handleCancel} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleConfirm} className="btn-apply">
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
