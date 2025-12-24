/**
 * Terminology Browser Drawer
 * 
 * Allows users to browse CodeSystems and Concepts to auto-populate
 * system, code, and display fields.
 * 
 * Rules:
 * - Assistive only (not enforced)
 * - Auto-populates fields on selection
 * - User can edit display after selection
 * - No validation at authoring time
 */

import React, { useState, useEffect } from 'react';
import { X, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { listCodeSystems, type CodeSetDto, type CodeSetConceptDto } from '../../../../api/terminologyApi';

interface TerminologyBrowserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (system: string, code: string, display: string) => void;
  projectId: string;
}

export const TerminologyBrowserDrawer: React.FC<TerminologyBrowserDrawerProps> = ({
  isOpen,
  onClose,
  onSelect,
  projectId,
}) => {
  const [codeSystems, setCodeSystems] = useState<CodeSetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCodeSystems();
    }
  }, [isOpen, projectId]);

  const loadCodeSystems = async () => {
    setLoading(true);
    setError(null);
    try {
      const systems = await listCodeSystems(projectId);
      setCodeSystems(systems);
    } catch (err: any) {
      setError(err.message || 'Failed to load code systems');
    } finally {
      setLoading(false);
    }
  };

  const handleConceptSelect = (system: string, concept: CodeSetConceptDto) => {
    onSelect(system, concept.code, concept.display || concept.code);
    onClose();
  };

  const toggleSystem = (systemUrl: string) => {
    setExpandedSystem(expandedSystem === systemUrl ? null : systemUrl);
  };

  const filteredCodeSystems = codeSystems.filter((cs) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    // Search in system URL and name
    if (cs.url.toLowerCase().includes(searchLower)) return true;
    if (cs.name?.toLowerCase().includes(searchLower)) return true;
    
    // Search in concepts
    return cs.concepts.some(
      (c) =>
        c.code.toLowerCase().includes(searchLower) ||
        c.display?.toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Browse Terminology</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a concept to auto-populate system, code, and display
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code systems or concepts..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <p>Loading code systems...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && filteredCodeSystems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">
                {searchTerm
                  ? 'No code systems or concepts match your search.'
                  : 'No code systems found. Create one in the Terminology Editor.'}
              </p>
            </div>
          )}

          {!loading && !error && filteredCodeSystems.length > 0 && (
            <div className="space-y-2">
              {filteredCodeSystems.map((codeSystem) => (
                <div key={codeSystem.url} className="border border-gray-200 rounded-md">
                  {/* Code System Header */}
                  <button
                    onClick={() => toggleSystem(codeSystem.url)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {expandedSystem === codeSystem.url ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {codeSystem.name || codeSystem.url}
                        </p>
                        {codeSystem.name && (
                          <p className="text-xs text-gray-500 truncate">{codeSystem.url}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {codeSystem.concepts.length} {codeSystem.concepts.length === 1 ? 'concept' : 'concepts'}
                    </span>
                  </button>

                  {/* Concepts List */}
                  {expandedSystem === codeSystem.url && (
                    <div className="border-t border-gray-200">
                      {codeSystem.concepts.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-500">
                          No concepts defined
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {codeSystem.concepts.map((concept) => (
                            <button
                              key={concept.code}
                              onClick={() => handleConceptSelect(codeSystem.url, concept)}
                              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-mono text-gray-900">
                                    {concept.code}
                                  </p>
                                  {concept.display && (
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      {concept.display}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> You can also enter system, code, and display manually without using this browser.
          </p>
        </div>
      </div>
    </>
  );
};
