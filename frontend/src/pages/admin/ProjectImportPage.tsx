import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, FileArchive } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import FileUploadDropzone from '../../components/projects/FileUploadDropzone';
import { useImportProject } from '../../hooks/useImportProject';
import type { ImportProjectError } from '../../api/projectImportApi';

type ImportState = 'idle' | 'uploading' | 'success' | 'error';

export default function ProjectImportPage() {
  const navigate = useNavigate();
  const importMutation = useImportProject();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importError, setImportError] = useState<ImportProjectError | null>(null);
  const [importedProjectId, setImportedProjectId] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImportState('uploading');
    setImportError(null);

    try {
      const result = await importMutation.mutateAsync(selectedFile);
      setImportState('success');
      setImportedProjectId(result.projectId);

      // Redirect to project detail page after 2 seconds
      setTimeout(() => {
        navigate(`/projects/${result.projectId}`);
      }, 2000);
    } catch (error: any) {
      setImportState('error');
      
      // Extract backend error response
      if (error.response?.data) {
        setImportError(error.response.data as ImportProjectError);
      } else {
        setImportError({
          error: 'UNEXPECTED_ERROR',
          message: error.message || 'An unexpected error occurred during import',
        });
      }
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportState('idle');
    setImportError(null);
    setImportedProjectId(null);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Projects</span>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Import FHIR Package
          </h2>
          <p className="text-gray-600">
            Upload a Simplifier R5 package to create a new validation project
          </p>
        </div>

        {/* Upload Section */}
        {importState === 'idle' && (
          <div className="space-y-6">
            <FileUploadDropzone
              onFileSelect={handleFileSelect}
              accept=".zip"
              maxSizeMB={50}
              disabled={false}
            />

            {selectedFile && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <FileArchive size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Ready to import
                  </p>
                  <p className="text-sm text-blue-700">
                    This will create a new validation project with the artifacts, bundles, and rules from this package.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={!selectedFile}
                className={`
                  flex-1 px-6 py-3 rounded-lg font-medium
                  transition-colors duration-200
                  ${
                    selectedFile
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Import Package
              </button>
              {selectedFile && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 rounded-lg font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Uploading State */}
        {importState === 'uploading' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 size={48} className="text-blue-600 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 mb-1">
                Importing package...
              </p>
              <p className="text-sm text-gray-600">
                Parsing artifacts, generating rules, and creating project
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {importState === 'success' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 mb-1">
                Import successful!
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Redirecting to project...
              </p>
              {importedProjectId && (
                <button
                  onClick={() => navigate(`/projects/${importedProjectId}`)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Go to project now →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {importState === 'error' && importError && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="text-red-900 font-semibold mb-1">
                    Import Failed
                  </h3>
                  <p className="text-red-800 text-sm mb-3">
                    {importError.message}
                  </p>
                  <div className="bg-red-100 rounded px-3 py-2">
                    <p className="text-xs font-mono text-red-900">
                      Error Code: {importError.error}
                    </p>
                  </div>
                </div>
              </div>

              {importError.context && (
                <details className="mt-4">
                  <summary className="text-sm text-red-800 cursor-pointer hover:text-red-900 font-medium">
                    Additional Details
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-auto text-red-900">
                    {JSON.stringify(importError.context, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-lg font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back to Projects
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
