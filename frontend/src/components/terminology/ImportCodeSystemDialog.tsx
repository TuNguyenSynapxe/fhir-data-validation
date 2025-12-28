/**
 * ImportCodeSystemDialog - Import CodeSystems from JSON or CSV
 * Phase 4B: Terminology Import
 * 
 * Features:
 * - File upload (drag & drop or click)
 * - Format detection (JSON or CSV)
 * - Preview before import
 * - Validation warnings (non-blocking)
 * - Create new or overwrite existing
 */

import { useState, useRef } from 'react';
import { Upload, X, AlertCircle, AlertTriangle, Info, FileText, CheckCircle } from 'lucide-react';
import type { CodeSystem } from '../../types/terminology';
import { parseCSV } from '../../utils/csvParser';
import {
  validateCodeSystem,
  validateFhirJson,
  parseImportFile,
  countConcepts,
} from '../../utils/codeSystemValidator';
import { saveCodeSystem } from '../../api/terminologyApi';

interface ImportCodeSystemDialogProps {
  projectId: string;
  existingCodeSystemUrls: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (codeSystem: CodeSystem) => void;
}

type ImportStep = 'upload' | 'preview' | 'bulk-preview' | 'importing' | 'success';

interface ParsedCodeSystem {
  codeSystem: Partial<CodeSystem>;
  format: 'json' | 'csv';
  warnings: string[];
  errors: string[];
}

interface BulkImportItem {
  codeSystem: Partial<CodeSystem>;
  selected: boolean;
  warnings: string[];
  errors: string[];
}

export function ImportCodeSystemDialog({
  projectId,
  existingCodeSystemUrls,
  isOpen,
  onClose,
  onSuccess,
}: ImportCodeSystemDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedCodeSystem | null>(null);
  const [bulkImportItems, setBulkImportItems] = useState<BulkImportItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setImportError(null);

    try {
      // Read file content
      const content = await readFileContent(file);

      // Parse file
      const parseResult = parseImportFile(file, content);

      if (parseResult.format === 'unknown') {
        setImportError(parseResult.error);
        return;
      }

      // Process based on format
      if (parseResult.format === 'json') {
        // Check if it's a bulk import format
        const isBulk = detectBulkFormat(parseResult.data);
        if (isBulk) {
          await processBulkJsonImport(parseResult.data);
        } else {
          await processJsonImport(parseResult.data);
        }
      } else if (parseResult.format === 'csv') {
        await processCsvImport(parseResult.data);
      }
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Failed to read file'
      );
    }
  };

  const processJsonImport = async (jsonData: any) => {
    // Validate FHIR JSON structure
    const validation = validateFhirJson(jsonData);

    // Extract CodeSystem (strip resourceType if present)
    const codeSystem: Partial<CodeSystem> = {
      url: jsonData.url,
      version: jsonData.version,
      name: jsonData.name,
      title: jsonData.title,
      status: jsonData.status || 'draft',
      description: jsonData.description,
      publisher: jsonData.publisher,
      content: jsonData.content || 'complete',
      count: jsonData.count,
      concept: jsonData.concept || [],
    };

    // Additional validation with existing URLs
    const fullValidation = validateCodeSystem(codeSystem, existingCodeSystemUrls);

    setParsedData({
      codeSystem,
      format: 'json',
      warnings: [...validation.warnings, ...fullValidation.warnings],
      errors: [...validation.errors, ...fullValidation.errors],
    });

    setStep('preview');
  };

  const processCsvImport = async (csvContent: string) => {
    // Parse CSV
    const parseResult = parseCSV(csvContent);

    if (!parseResult.success) {
      setImportError(
        `CSV parsing failed:\n${parseResult.errors?.join('\n') || 'Unknown error'}`
      );
      return;
    }

    // Build CodeSystem from concepts
    // Note: CSV doesn't include metadata, so we'll prompt for it
    const codeSystem: Partial<CodeSystem> = {
      url: '', // Will be filled in preview step
      name: '', // Will be filled in preview step
      title: '',
      status: 'draft',
      content: 'complete',
      concept: parseResult.concepts || [],
      count: countConcepts(parseResult.concepts || []),
    };

    setParsedData({
      codeSystem,
      format: 'csv',
      warnings: parseResult.warnings || [],
      errors: [],
    });

    setStep('preview');
  };

  const detectBulkFormat = (jsonData: any): boolean => {
    // Check for CodesMaster.CodeSystems format (validation-metadata.json)
    if (jsonData.CodesMaster?.CodeSystems && Array.isArray(jsonData.CodesMaster.CodeSystems)) {
      return true;
    }
    // Check for array of CodeSystems (PSS format with System field or FHIR format with url field)
    if (Array.isArray(jsonData) && jsonData.length > 0) {
      const firstItem = jsonData[0];
      // PSS format has System, FHIR format has url
      if (firstItem.System || firstItem.url) {
        return true;
      }
    }
    return false;
  };

  const processBulkJsonImport = async (jsonData: any) => {
    let codeSystems: any[] = [];

    // Extract CodeSystems from different formats
    if (jsonData.CodesMaster?.CodeSystems) {
      // validation-metadata.json format
      codeSystems = jsonData.CodesMaster.CodeSystems;
    } else if (Array.isArray(jsonData)) {
      codeSystems = jsonData;
    }

    if (codeSystems.length === 0) {
      setImportError('No CodeSystems found in the file');
      return;
    }

    // Convert each to FHIR format and validate
    const items: BulkImportItem[] = codeSystems.map((cs) => {
      // Check if already in FHIR format (has 'url' and 'concept') or PSS format (has 'System' and 'Concepts')
      const isFhirFormat = cs.url && cs.concept !== undefined;
      
      const codeSystem: Partial<CodeSystem> = isFhirFormat ? {
        // Already FHIR format - use as is (Phase 1: code + display only)
        url: cs.url,
        name: cs.name,
        concept: (cs.concept || []).map((c: any) => ({
          code: c.code,
          display: c.display,
        })),
      } : {
        // PSS format - convert to FHIR (Phase 1: code + display only)
        url: cs.System,
        name: cs.Id || cs.System?.split('/').pop(),
        concept: cs.Concepts?.map((c: any) => ({
          code: c.Code,
          display: c.Display,
        })) || [],
      };

      const validation = validateCodeSystem(codeSystem, existingCodeSystemUrls);

      return {
        codeSystem,
        selected: true, // All selected by default
        warnings: validation.warnings,
        errors: validation.errors,
      };
    });

    setBulkImportItems(items);
    setStep('bulk-preview');
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep('importing');
    setImportError(null);

    try {
      // Validate required fields are filled
      const { codeSystem } = parsedData;

      if (!codeSystem.url) {
        setImportError('Please provide a canonical URL');
        setStep('preview');
        return;
      }

      if (!codeSystem.name) {
        setImportError('Please provide a name');
        setStep('preview');
        return;
      }

      // Build complete CodeSystem
      const completeCodeSystem: CodeSystem = {
        url: codeSystem.url,
        version: codeSystem.version,
        name: codeSystem.name,
        title: codeSystem.title || codeSystem.name,
        status: codeSystem.status || 'draft',
        description: codeSystem.description,
        publisher: codeSystem.publisher,
        content: codeSystem.content || 'complete',
        count: codeSystem.count || countConcepts(codeSystem.concept || []),
        concept: codeSystem.concept || [],
      };

      // Save via API
      const result = await saveCodeSystem(projectId, completeCodeSystem);

      if (!result.success) {
        setImportError(result.error.message || 'Failed to import CodeSystem');
        setStep('preview');
        return;
      }

      // Success
      setStep('success');
      setTimeout(() => {
        onSuccess(completeCodeSystem);
        onClose();
        resetDialog();
      }, 1500);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Failed to import'
      );
      setStep('preview');
    }
  };

  const handleBulkImport = async () => {
    const selectedItems = bulkImportItems.filter(item => item.selected);
    if (selectedItems.length === 0) return;

    setStep('importing');
    setImportError(null);
    setImportProgress({ current: 0, total: selectedItems.length });

    const results: { success: boolean; item: BulkImportItem; error?: string }[] = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setImportProgress({ current: i + 1, total: selectedItems.length });

      try {
        // Build complete CodeSystem from partial
        const completeCodeSystem: CodeSystem = {
          url: item.codeSystem.url!,
          version: item.codeSystem.version,
          name: item.codeSystem.name!,
          title: item.codeSystem.title || item.codeSystem.name!,
          status: item.codeSystem.status || 'draft',
          description: item.codeSystem.description,
          publisher: item.codeSystem.publisher,
          content: item.codeSystem.content || 'complete',
          count: item.codeSystem.count || countConcepts(item.codeSystem.concept || []),
          concept: item.codeSystem.concept || [],
        };

        // Save via API
        const result = await saveCodeSystem(projectId, completeCodeSystem);

        if (!result.success) {
          results.push({ 
            success: false, 
            item, 
            error: result.error.message || 'Failed to import' 
          });
        } else {
          results.push({ success: true, item });
        }
      } catch (error) {
        results.push({
          success: false,
          item,
          error: error instanceof Error ? error.message : 'Failed to import',
        });
      }
    }

    // Check results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    if (failureCount > 0) {
      const errorMessages = results
        .filter(r => !r.success)
        .map(r => `${r.item.codeSystem.name}: ${r.error}`)
        .join('\n');
      setImportError(
        `Imported ${successCount} of ${selectedItems.length} CodeSystems.\n\nFailed:\n${errorMessages}`
      );
      setStep('bulk-preview');
      setImportProgress(null);
    } else {
      // All succeeded
      setStep('success');
      setTimeout(() => {
        onSuccess(null as any); // Trigger refresh
        onClose();
        resetDialog();
      }, 1500);
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setParsedData(null);
    setBulkImportItems([]);
    setFileName('');
    setImportError(null);
    setImportProgress(null);
  };

  const handleClose = () => {
    onClose();
    resetDialog();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Import CodeSystem
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload FHIR JSON or CSV file
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <UploadStep
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              importError={importError}
            />
          )}

          {step === 'preview' && parsedData && (
            <PreviewStep
              parsedData={parsedData}
              fileName={fileName}
              onUpdateMetadata={(updates) => {
                setParsedData({
                  ...parsedData,
                  codeSystem: { ...parsedData.codeSystem, ...updates },
                });
              }}
              importError={importError}
            />
          )}

          {step === 'bulk-preview' && bulkImportItems.length > 0 && (
            <BulkPreviewStep
              items={bulkImportItems}
              onToggleSelection={(index) => {
                setBulkImportItems(items => 
                  items.map((it, idx) => 
                    idx === index ? { ...it, selected: !it.selected } : it
                  )
                );
              }}
              onSelectAll={() => setBulkImportItems(items => items.map(i => ({ ...i, selected: true })))}
              onDeselectAll={() => setBulkImportItems(items => items.map(i => ({ ...i, selected: false })))}
              importError={importError}
            />
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">
                {importProgress ? 'Importing CodeSystems...' : 'Importing CodeSystem...'}
              </p>
              {importProgress && (
                <div className="w-full max-w-md px-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{importProgress.current} of {importProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
              <p className="text-lg font-semibold text-gray-900">
                Import Successful!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {importProgress ? 
                  `${importProgress.total} CodeSystem${importProgress.total !== 1 ? 's have' : ' has'} been imported and saved.` :
                  'CodeSystem has been imported and saved.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'preview' || step === 'bulk-preview') && (
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>

            {step === 'preview' && (
              <>
                <button
                  onClick={() => {
                    setStep('upload');
                    setParsedData(null);
                    setFileName('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={
                    !parsedData?.codeSystem.url || !parsedData?.codeSystem.name
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Import CodeSystem
                </button>
              </>
            )}

            {step === 'bulk-preview' && (
              <>
                <button
                  onClick={() => {
                    setBulkImportItems([]);
                    setStep('upload');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Back
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={bulkImportItems.filter(i => i.selected).length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Import {bulkImportItems.filter(i => i.selected).length} CodeSystem{bulkImportItems.filter(i => i.selected).length !== 1 ? 's' : ''}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Upload Step Component
 */
function UploadStep({
  fileInputRef,
  onFileSelect,
  importError,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
  importError: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop file here or click to browse
        </p>
        <p className="text-sm text-gray-600">
          Supported formats: FHIR JSON (.json) or CSV (.csv)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {importError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Import Error</p>
            <p className="text-sm text-red-700 whitespace-pre-line mt-1">
              {importError}
            </p>
          </div>
        </div>
      )}

      {/* Format Documentation */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Supported Formats</h3>

        <div className="space-y-3">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">FHIR JSON</span>
            </div>
            <p className="text-sm text-gray-600">
              Standard FHIR CodeSystem resource format. Must include{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">url</code>,{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">status</code>,
              and{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">concept</code>{' '}
              array.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900">CSV</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Simple table format with required columns:{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">code</code>,{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">display</code>.
            </p>
            <p className="text-xs text-gray-500">
              Phase 1: Only code and display are supported. CSV imports require metadata (url, name) to be entered in the next step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Preview Step Component
 */
function PreviewStep({
  parsedData,
  fileName,
  onUpdateMetadata,
  importError,
}: {
  parsedData: ParsedCodeSystem;
  fileName: string;
  onUpdateMetadata: (updates: Partial<CodeSystem>) => void;
  importError: string | null;
}) {
  const { codeSystem, format, warnings, errors } = parsedData;
  const conceptCount = countConcepts(codeSystem.concept || []);
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <FileText className="w-5 h-5 text-gray-600" />
        <div className="flex-1">
          <p className="font-medium text-gray-900">{fileName}</p>
          <p className="text-sm text-gray-600">
            Format: {format.toUpperCase()} • {conceptCount} concept
            {conceptCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Validation Messages */}
      {hasErrors && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-900 font-medium">
            <AlertCircle className="w-4 h-4" />
            Errors Found ({errors.length})
          </div>
          <div className="space-y-1">
            {errors.map((error, idx) => (
              <div
                key={idx}
                className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200"
              >
                {error}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            ⚠️ Errors must be fixed before importing. Please correct the file and
            try again.
          </p>
        </div>
      )}

      {hasWarnings && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-yellow-900 font-medium">
            <AlertTriangle className="w-4 h-4" />
            Warnings ({warnings.length})
          </div>
          <div className="space-y-1">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200"
              >
                {warning}
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p>
              Warnings are non-blocking. You can proceed with import, but
              consider addressing these issues.
            </p>
          </div>
        </div>
      )}

      {/* Metadata Form */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold text-gray-900">CodeSystem Metadata</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Canonical URL *
          </label>
          <input
            type="text"
            value={codeSystem.url || ''}
            onChange={(e) => onUpdateMetadata({ url: e.target.value })}
            placeholder="http://example.org/fhir/CodeSystem/my-codes"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={format === 'json'} // JSON already has URL
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={codeSystem.name || ''}
            onChange={(e) => onUpdateMetadata({ name: e.target.value })}
            placeholder="my-codes"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={format === 'json'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={codeSystem.title || ''}
            onChange={(e) => onUpdateMetadata({ title: e.target.value })}
            placeholder="My Custom Codes"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            value={codeSystem.status || 'draft'}
            onChange={(e) =>
              onUpdateMetadata({
                status: e.target.value as CodeSystem['status'],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* Import Error */}
      {importError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Import Failed</p>
            <p className="text-sm text-red-700 mt-1">{importError}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bulk Preview Step - Show multiple CodeSystems for selection
 */
interface BulkPreviewStepProps {
  items: BulkImportItem[];
  onToggleSelection: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  importError: string | null;
}

function BulkPreviewStep({
  items,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  importError,
}: BulkPreviewStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Bulk Import Preview</h3>
          <p className="text-sm text-gray-600 mt-1">
            Found {items.length} CodeSystems. Select which ones to import.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Select All
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={onDeselectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 rounded p-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`border rounded p-3 transition-colors ${
              item.selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => onToggleSelection(index)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {item.codeSystem.title || item.codeSystem.name || 'Untitled'}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({item.codeSystem.concept?.length || 0} concepts)
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-mono truncate mt-1">
                  {item.codeSystem.url}
                </p>

                {item.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.errors.map((error, i) => (
                      <div key={i} className="flex items-start space-x-2 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.warnings.slice(0, 2).map((warning, i) => (
                      <div key={i} className="flex items-start space-x-2 text-sm text-yellow-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </div>
                    ))}
                    {item.warnings.length > 2 && (
                      <p className="text-xs text-gray-500 ml-6">
                        +{item.warnings.length - 2} more warnings
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">Import Failed</p>
              <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{importError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Read file content as text
 */
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
