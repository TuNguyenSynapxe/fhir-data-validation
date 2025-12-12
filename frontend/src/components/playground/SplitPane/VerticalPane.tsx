import React, { useState } from 'react';

interface VerticalPaneProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export const VerticalPane: React.FC<VerticalPaneProps> = ({
  leftContent,
  rightContent,
  defaultLeftWidth = 40,
  minLeftWidth = 20,
  minRightWidth = 30,
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const container = e.currentTarget.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;

    if (newLeftWidth >= minLeftWidth && newLeftWidth <= 100 - minRightWidth) {
      setLeftWidth(newLeftWidth);
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp as any);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp as any);
      };
    }
  }, [isDragging]);

  return (
    <div
      className="flex h-full w-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{ width: `${leftWidth}%` }} className="overflow-hidden">
        {leftContent}
      </div>
      <div
        className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize"
        onMouseDown={handleMouseDown}
      />
      <div style={{ width: `${100 - leftWidth}%` }} className="overflow-hidden">
        {rightContent}
      </div>
    </div>
  );
};
