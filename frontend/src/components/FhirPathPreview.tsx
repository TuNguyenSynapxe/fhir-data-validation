import React, { useState } from 'react';

/**
 * FhirPathPreview - Read-only preview with copy functionality
 * 
 * Shows the final refined FHIRPath string.
 * Always visible, copyable, no validation.
 */
interface FhirPathPreviewProps {
  path: string;
}

const FhirPathPreview: React.FC<FhirPathPreviewProps> = ({ path }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (path) {
      navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-blue-900">
          Final FHIRPath:
        </label>
        {path && (
          <button
            onClick={handleCopy}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        )}
      </div>
      <div className="font-mono text-sm text-blue-900 bg-white px-3 py-2 rounded border border-blue-300 break-all">
        {path || <span className="text-gray-400 italic">No path generated</span>}
      </div>
    </div>
  );
};

export default FhirPathPreview;
