import React from 'react';

interface BundlePanelProps {
  /**
   * Bundle content (BundleTabs component)
   */
  children: React.ReactNode;
  
  /**
   * Optional header controls (close button, etc.)
   */
  headerActions?: React.ReactNode;
  
  /**
   * Whether to show the header
   * @default true
   */
  showHeader?: boolean;
  
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * Reusable Bundle Panel Component
 * 
 * Used in both split layout (desktop) and drawer (mobile)
 * Provides consistent styling and structure
 */
export const BundlePanel: React.FC<BundlePanelProps> = ({
  children,
  headerActions,
  showHeader = true,
  className = '',
}) => {
  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">Bundle JSON</h3>
          {headerActions}
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
