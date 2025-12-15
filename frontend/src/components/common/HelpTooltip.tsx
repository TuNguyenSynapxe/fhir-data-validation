import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  body: string;
  footer?: string;
  className?: string;
}

/**
 * HelpTooltip Component
 * 
 * Displays an (i) icon that shows a tooltip on hover.
 * Non-blocking, no modals or popups.
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  title, 
  body, 
  footer,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Info icon trigger */}
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        aria-label="Help information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip content */}
      {isVisible && (
        <div
          className="absolute z-50 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg left-0 top-6"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            {title}
          </h4>

          {/* Body - preserve line breaks */}
          <div className="text-xs text-gray-700 leading-relaxed space-y-2">
            {body.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Footer */}
          {footer && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                {footer}
              </p>
            </div>
          )}

          {/* Arrow pointer */}
          <div className="absolute -top-2 left-2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45" />
        </div>
      )}
    </div>
  );
};
