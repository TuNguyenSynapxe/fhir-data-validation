import React from 'react';
import { X, Search, CheckSquare, Square } from 'lucide-react';
import { listCodeSystems, getCodeSystemByUrl } from '../../../../api/terminologyApi';
import type { CodeSetDto, CodeSetConceptDto } from '../../../../api/terminologyApi';

interface AddQuestionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestions: (concepts: CodeSetConceptDto[], terminologyUrl: string) => void;
  projectId: string;
}

export const AddQuestionsDrawer: React.FC<AddQuestionsDrawerProps> = ({
  isOpen,
  onClose,
  onAddQuestions,
  projectId,
}) => {
  const [codeSystems, setCodeSystems] = React.useState<CodeSetDto[]>([]);
  const [selectedSystemUrl, setSelectedSystemUrl] = React.useState<string>('');
  const [concepts, setConcepts] = React.useState<CodeSetConceptDto[]>([]);
  const [selectedConcepts, setSelectedConcepts] = React.useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loadingConcepts, setLoadingConcepts] = React.useState(false);

  // Load CodeSystems on mount
  React.useEffect(() => {
    if (isOpen) {
      loadCodeSystems();
    }
  }, [isOpen, projectId]);

  // Load concepts when system is selected
  React.useEffect(() => {
    if (selectedSystemUrl) {
      loadConcepts(selectedSystemUrl);
    } else {
      setConcepts([]);
    }
  }, [selectedSystemUrl]);

  const loadCodeSystems = async () => {
    setLoading(true);
    try {
      const systems = await listCodeSystems(projectId);
      setCodeSystems(systems);
    } catch (err) {
      console.error('Failed to load code systems:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConcepts = async (url: string) => {
    setLoadingConcepts(true);
    try {
      const system = await getCodeSystemByUrl(projectId, url);
      setConcepts(system.concepts || []);
    } catch (err) {
      console.error('Failed to load concepts:', err);
      setConcepts([]);
    } finally {
      setLoadingConcepts(false);
    }
  };

  const toggleConcept = (conceptCode: string) => {
    const newSelected = new Set(selectedConcepts);
    if (newSelected.has(conceptCode)) {
      newSelected.delete(conceptCode);
    } else {
      newSelected.add(conceptCode);
    }
    setSelectedConcepts(newSelected);
  };

  const handleAddSelected = () => {
    const selectedSystem = codeSystems.find(s => s.url === selectedSystemUrl);
    if (!selectedSystem) return;

    const conceptsToAdd = concepts.filter(c => selectedConcepts.has(c.code));
    onAddQuestions(conceptsToAdd, selectedSystem.url);
    handleClose();
  };

  const handleClose = () => {
    setSelectedSystemUrl('');
    setConcepts([]);
    setSelectedConcepts(new Set());
    setSearchTerm('');
    onClose();
  };

  const filteredConcepts = concepts.filter(concept => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      concept.code.toLowerCase().includes(search) ||
      (concept.display && concept.display.toLowerCase().includes(search))
    );
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Questions</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Section 1: Terminology Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terminology System <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="text-sm text-gray-500">Loading systems...</div>
            ) : (
              <select
                value={selectedSystemUrl}
                onChange={(e) => setSelectedSystemUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a terminology system...</option>
                {codeSystems.map((system) => (
                  <option key={system.url} value={system.url}>
                    {system.name || system.url} ({system.concepts?.length || 0} concepts)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Section 2: Search & Select */}
          {selectedSystemUrl && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Concepts
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by code or display..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Concepts ({selectedConcepts.size} selected)
                  </label>
                  {selectedConcepts.size > 0 && (
                    <button
                      onClick={() => setSelectedConcepts(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {loadingConcepts ? (
                  <div className="text-sm text-gray-500 py-8 text-center">
                    Loading concepts...
                  </div>
                ) : filteredConcepts.length === 0 ? (
                  <div className="text-sm text-gray-500 py-8 text-center">
                    {searchTerm ? 'No matching concepts found' : 'No concepts available'}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded max-h-96 overflow-y-auto">
                    {filteredConcepts.map((concept) => {
                      const isSelected = selectedConcepts.has(concept.code);
                      return (
                        <button
                          key={concept.code}
                          onClick={() => toggleConcept(concept.code)}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {concept.display}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              {concept.code}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddSelected}
            disabled={selectedConcepts.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Selected Questions ({selectedConcepts.size})
          </button>
        </div>
      </div>
    </>
  );
};
