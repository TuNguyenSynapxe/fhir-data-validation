import { useRef, useState, useCallback, useEffect } from 'react';

interface ValidationSplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

/**
 * Shared split layout for validation pages.
 * Left panel (default 30%): Bundle input + tree view
 * Right panel (default 70%): Validation results
 * Draggable splitter with constraints (20-50%)
 */
export function ValidationSplitLayout({
  left,
  right,
}: ValidationSplitLayoutProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(30); // 30% default
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 20% and 50%
    if (newWidth >= 20 && newWidth <= 50) {
      setLeftPanelWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden border border-gray-200 rounded-lg bg-white"
      style={{ userSelect: isDragging.current ? 'none' : 'auto' }}
    >
      {/* LEFT PANEL: Bundle / Tree */}
      <div
        className="overflow-hidden border-r border-gray-200"
        style={{ width: `${leftPanelWidth}%` }}
      >
        {left}
      </div>

      {/* SPLITTER */}
      <div
        className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-500 transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* RIGHT PANEL: Validation Results */}
      <div className="overflow-hidden" style={{ width: `${100 - leftPanelWidth - 0.1}%` }}>
        {right}
      </div>
    </div>
  );
}
