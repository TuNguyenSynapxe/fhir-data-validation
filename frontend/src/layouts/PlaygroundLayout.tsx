import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BundlePanel } from '../components/playground/Bundle/BundlePanel';
import { RightPanelMode } from '../types/rightPanel';

interface PlaygroundLayoutProps {
  // Bundle panel content
  bundleContent: React.ReactNode;
  
  // Main panel content (Rules/Validation/Observations modes)
  rulesContent: React.ReactNode;
  
  // Bundle visibility control
  isBundleOpen: boolean;
  onBundleToggle: () => void;
  
  // Bundle collapse control (split mode only)
  isBundleCollapsed?: boolean;
  onBundleCollapse?: () => void;
  
  // Current mode (to determine if bundle should be visible)
  currentMode?: RightPanelMode;
}

/**
 * Responsive Playground Layout
 * 
 * Desktop (>= 1280px):
 * - Split view with resizable panels
 * - Validation + Bundle visible together
 * - Optional collapse toggle
 * 
 * Mobile/Tablet (< 1280px):
 * - Drawer behavior (on-demand)
 * - Full-width validation by default
 * - Bundle opens as overlay
 */
export const PlaygroundLayout: React.FC<PlaygroundLayoutProps> = ({
  bundleContent,
  rulesContent,
  isBundleOpen,
  onBundleToggle,
  isBundleCollapsed = false,
  onBundleCollapse,
  currentMode,
}) => {
  // Detect desktop layout (>= 1280px)
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  
  // Only show bundle in Validation mode
  const shouldShowBundle = currentMode === RightPanelMode.Validation && isBundleOpen;
  
  // Desktop: Split Layout
  if (isDesktop && shouldShowBundle) {
    return (
      <div className="h-full flex overflow-hidden">
        {/* Main Content Panel */}
        <div className="flex-1 overflow-hidden min-w-0">
          {rulesContent}
        </div>

        {/* Bundle Panel - Split View */}
        {!isBundleCollapsed && (
          <div className="w-[40%] min-w-[360px] border-l flex flex-col overflow-hidden">
            <BundlePanel
              headerActions={
                onBundleCollapse && (
                  <button
                    onClick={onBundleCollapse}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Collapse bundle panel"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                )
              }
            >{bundleContent}</BundlePanel>
          </div>
        )}
      </div>
    );
  }

  // Mobile/Tablet: Drawer Layout
  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Main content - always visible */}
      <div className="flex-1 overflow-hidden">
        {rulesContent}
      </div>

      {/* Bundle Drawer - Mobile/Tablet only */}
      {shouldShowBundle && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-40 transition-opacity"
            onClick={onBundleToggle}
          />
          
          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-[90%] sm:w-[60%] md:w-[50%] bg-white shadow-2xl z-50 border-l">
            <BundlePanel
              headerActions={
                <button
                  onClick={onBundleToggle}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Close bundle"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              }
            >{bundleContent}</BundlePanel>
          </div>
        </>
      )}
    </div>
  );
};

export default PlaygroundLayout;
