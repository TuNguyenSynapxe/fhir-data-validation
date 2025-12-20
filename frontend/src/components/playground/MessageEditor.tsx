import React, { useRef, useState } from 'react';
import { InformationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import {
  getAvailableTokens,
  resolveMessageTokens,
  formatTokenDisplay,
  generateDefaultMessage,
  type RuleContext,
  type Token,
} from '../../utils/ruleMessageTemplates';

interface MessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  onResetToDefault?: () => void; // Called when user resets to default
  ruleContext: RuleContext;
  className?: string;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  value,
  onChange,
  onResetToDefault,
  ruleContext,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null);
  
  const availableTokens = getAvailableTokens(ruleContext.ruleType);
  const resolvedPreview = resolveMessageTokens(value, ruleContext);

  const handleResetToDefault = () => {
    const defaultMessage = generateDefaultMessage(ruleContext);
    onChange(defaultMessage);
    if (onResetToDefault) {
      onResetToDefault();
    }
  };

  const insertToken = (tokenName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const tokenText = formatTokenDisplay(tokenName);

    const newValue = before + tokenText + after;
    onChange(newValue);

    // Set cursor position after the inserted token
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + tokenText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Message Editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Error Message
          </label>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="Reset to default template"
          >
            <ArrowPathIcon className="w-3 h-3" />
            Reset to default
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          rows={3}
          placeholder="Enter a custom error message or use tokens..."
        />
      </div>

      {/* Available Tokens */}
      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
        <div className="flex items-center gap-1 mb-2">
          <InformationCircleIcon className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">
            Available tokens (click to insert):
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {availableTokens.map((token) => (
            <div
              key={token.name}
              className="relative inline-block"
              onMouseEnter={() => setHoveredToken(token)}
              onMouseLeave={() => setHoveredToken(null)}
            >
              <button
                type="button"
                onClick={() => insertToken(token.name)}
                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
              >
                {formatTokenDisplay(token.name)}
              </button>
              
              {/* Tooltip */}
              {hoveredToken?.name === token.name && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64">
                  <div className="bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg">
                    <div className="font-semibold mb-1">{token.description}</div>
                    <div className="text-gray-300">
                      Example: <span className="font-mono">{token.example}</span>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
        <div className="text-xs font-medium text-blue-700 mb-1">
          Preview:
        </div>
        <div className="text-sm text-gray-800 break-words">
          {resolvedPreview || (
            <span className="text-gray-400 italic">
              Enter a message to see preview...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
