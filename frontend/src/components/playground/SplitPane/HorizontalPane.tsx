import React, { useState } from 'react';

interface HorizontalPaneProps {
  topContent: React.ReactNode;
  bottomContent: React.ReactNode;
  defaultTopHeight?: number;
  minTopHeight?: number;
  minBottomHeight?: number;
}

export const HorizontalPane: React.FC<HorizontalPaneProps> = ({
  topContent,
  bottomContent,
  defaultTopHeight = 60,
  minTopHeight = 30,
  minBottomHeight = 20,
}) => {
  const [topHeight, setTopHeight] = useState(defaultTopHeight);
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

    const containerHeight = container.clientHeight;
    const newTopHeight = (e.clientY / containerHeight) * 100;

    if (newTopHeight >= minTopHeight && newTopHeight <= 100 - minBottomHeight) {
      setTopHeight(newTopHeight);
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
      className="flex flex-col h-full w-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{ height: `${topHeight}%` }} className="overflow-hidden">
        {topContent}
      </div>
      <div
        className="h-1 bg-gray-300 hover:bg-blue-500 cursor-row-resize"
        onMouseDown={handleMouseDown}
      />
      <div style={{ height: `${100 - topHeight}%` }} className="overflow-hidden">
        {bottomContent}
      </div>
    </div>
  );
};
