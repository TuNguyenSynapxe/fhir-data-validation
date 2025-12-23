import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { listCodeSystems, type CodeSetDto } from '../../../../../api/terminologyApi';

interface QuestionSetSelectorProps {
  projectId: string;
  value: string;
  onChange: (codeSystemUrl: string) => void;
  error?: string;
}

export const QuestionSetSelector: React.FC<QuestionSetSelectorProps> = ({
  projectId,
  value,
  onChange,
  error,
}) => {
  const [codeSystems, setCodeSystems] = useState<CodeSetDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadCodeSystems();
  }, [projectId]);

  const loadCodeSystems = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const systems = await listCodeSystems(projectId);
      setCodeSystems(systems);
    } catch (err) {
      console.error('Failed to load code systems:', err);
      setLoadError('Failed to load question sets');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading question sets...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="w-4 h-4" />
        <span>{loadError}</span>
      </div>
    );
  }

  if (codeSystems.length === 0) {
    return (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">No question sets available</p>
            <p>Create a CodeSystem with allowed values to use this rule type.</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedSystem = codeSystems.find((cs) => cs.url === value);

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      >
        <option value="">Select a question set...</option>
        {codeSystems.map((cs) => (
          <option key={cs.url} value={cs.url}>
            {cs.name || cs.url} ({cs.concepts.length} allowed values)
          </option>
        ))}
      </select>
      
      {error && (
        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
      
      {selectedSystem && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-xs font-medium text-gray-700 mb-1">Selected Question Set:</div>
          <div className="text-xs text-gray-600">{selectedSystem.url}</div>
          {selectedSystem.concepts.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Allowed values: {selectedSystem.concepts.slice(0, 3).map((c: any) => c.code).join(', ')}
              {selectedSystem.concepts.length > 3 && ` +${selectedSystem.concepts.length - 3} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
